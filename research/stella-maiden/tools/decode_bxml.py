#!/usr/bin/env python3
"""Decode the shipped Stella bXML v1 tree, retaining exact typed payloads.

Standard library only. The byte-identical reconstruction check uses the JSON
tree, not a saved copy of the input bytes. No APK/native code is executed.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import struct


class FormatError(ValueError):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decode_text(data):
    """Encoding candidates are observations/inferences, never discard bytes."""
    for encoding in ("utf-8", "cp949"):
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            pass
    return data.decode("utf-8", errors="replace"), "unknown"


class Decoder:
    def __init__(self, data):
        self.data = data
        self.ranges = []
        self.seen = set()
        self.types = {}
        self.statistics = Counter()
        self.type_sizes = defaultdict(Counter)
        self.issues = []

    def u32(self, offset):
        if offset < 0 or offset + 4 > len(self.data):
            raise FormatError(f"out-of-bounds u32 at {offset:#x}")
        return struct.unpack_from("<I", self.data, offset)[0]

    def cstring(self, offset):
        try:
            end = self.data.index(0, offset)
        except ValueError as exc:
            raise FormatError(f"unterminated string at {offset:#x}") from exc
        raw = self.data[offset:end]
        text, encoding = decode_text(raw)
        return text, encoding, end + 1

    def value(self, type_id, raw, offset):
        type_name = self.types.get(type_id)
        if type_name == "string":
            terminated = raw.endswith(b"\0")
            text, encoding = decode_text(raw[:-1] if terminated else raw)
            return {"value": text, "encoding": encoding,
                    "encoding_status": "observed-valid-utf8" if encoding == "utf-8" else "inferred-cp949" if encoding == "cp949" else "unknown",
                    "nul_terminated": terminated}
        formats = {"int": ("i", 4), "byte": ("B", 1), "word": ("H", 2),
                   "bool": ("I", 4), "float": ("f", 4),
                   "dword": ("I", 4), "uint": ("I", 4)}
        if type_name not in formats:
            self.issues.append({"offset": offset, "issue": "unknown-type", "type_id": type_id})
            return {"value": None, "decode_status": "unknown-type"}
        code, width = formats[type_name]
        if len(raw) % width:
            self.issues.append({"offset": offset, "issue": "invalid-element-width", "type_id": type_id})
            return {"value": None, "decode_status": "invalid-element-width"}
        values = list(struct.unpack("<" + code * (len(raw) // width), raw))
        if type_name == "bool":
            if any(value not in (0, 1) for value in values):
                self.issues.append({"offset": offset, "issue": "noncanonical-bool"})
            else:
                values = [bool(value) for value in values]
        if type_name == "float":
            values = [value if math.isfinite(value) else {"nonfinite": str(value)} for value in values]
        return {"value": values[0] if len(values) == 1 else values,
                "element_count": len(values), "element_width": width}

    def node(self, offset, name=None, depth=0):
        if depth > 512:
            raise FormatError("tree depth exceeds 512")
        if offset in self.seen:
            raise FormatError(f"shared/cyclic node offset {offset:#x}")
        self.seen.add(offset)
        self.statistics["nodes"] += 1
        self.statistics["max_depth"] = max(depth, self.statistics["max_depth"])
        start = offset
        size = self.u32(offset)
        offset += 4
        node = {"name": name, "offset": start, "payload_length": size,
                "type_id": None, "type": None, "value": None}
        if size:
            type_id = self.u32(offset)
            offset += 4
            if offset + size > len(self.data):
                raise FormatError(f"payload outside input at {start:#x}")
            raw = self.data[offset:offset + size]
            offset += size
            node.update({"type_id": type_id, "type": self.types.get(type_id),
                         "payload_hex": raw.hex()})
            node.update(self.value(type_id, raw, start))
            self.statistics["typed_nodes"] += 1
            self.statistics["type:" + str(node["type"])] += 1
            self.type_sizes[str(node["type"])][size] += 1
            if node.get("encoding"):
                self.statistics["string_encoding:" + node["encoding"]] += 1
        count = self.u32(offset)
        offset += 4
        if count > len(self.data) // 5:
            raise FormatError(f"implausible child count at {start:#x}")
        children = []
        for _ in range(count):
            child_name, encoding, offset = self.cstring(offset)
            if encoding != "utf-8":
                raise FormatError(f"non-UTF8 node name at {offset:#x}")
            child_offset = self.u32(offset)
            offset += 4
            children.append((child_name, child_offset))
        self.ranges.append((start, offset))
        node["record_end"] = offset
        node["children"] = [self.node(pos, child_name, depth + 1) for child_name, pos in children]
        return node

    def parse(self):
        if self.data[:4] != b"bXML":
            raise FormatError("not bXML")
        version, count = self.u32(4), self.u32(8)
        if version != 1 or count > 1024:
            raise FormatError(f"unsupported header: version={version}, types={count}")
        offset, descriptors = 12, []
        for _ in range(count):
            type_id = self.u32(offset)
            offset += 4
            name, encoding, offset = self.cstring(offset)
            if encoding != "utf-8" or offset >= len(self.data):
                raise FormatError("invalid type name")
            # Every shipped descriptor has this extra zero byte. Its semantic
            # meaning is not established; preserve it as an opaque marker.
            marker = self.data[offset]
            offset += 1
            if type_id in self.types:
                raise FormatError("duplicate type id")
            self.types[type_id] = name
            descriptors.append({"id": type_id, "name": name, "marker": marker})
        self.ranges.append((0, offset))
        root = self.node(offset)
        end = 0
        for start, stop in sorted(self.ranges):
            if start != end:
                raise FormatError(f"gap/overlap in input coverage: {start:#x} != {end:#x}")
            end = stop
        if end != len(self.data):
            raise FormatError(f"trailing bytes: parsed={end}, length={len(self.data)}")
        result = {"format": "Stella bXML", "version": version,
                  "byte_order": "little-endian", "input_size": len(self.data),
                  "input_sha256": digest(self.data), "type_descriptors": descriptors,
                  "root": root, "statistics": dict(self.statistics),
                  "coverage": {"bytes": end, "complete": True, "gaps": 0, "overlaps": 0},
                  "issues": self.issues}
        rebuilt = serialize(result)
        result["validation"] = {"roundtrip_byte_identical": rebuilt == self.data,
                                "roundtrip_sha256": digest(rebuilt)}
        if rebuilt != self.data:
            raise FormatError("tree serialization differs from input")
        return result


def serialize(document):
    """Recreate the full binary from descriptors/tree/raw payloads.

    Offsets are freshly assigned in preorder; saved offset fields are not used.
    This verifies every name, child link, type, payload and record boundary.
    """
    header = bytearray(b"bXML" + struct.pack("<II", document["version"], len(document["type_descriptors"])))
    for item in document["type_descriptors"]:
        header += struct.pack("<I", item["id"]) + item["name"].encode("utf-8") + bytes([0, item["marker"]])
    records = []
    cursor = len(header)

    def assign(node):
        nonlocal cursor
        start = cursor
        raw = bytes.fromhex(node.get("payload_hex", ""))
        if len(raw) != node["payload_length"]:
            raise FormatError("JSON payload length mismatch")
        record = bytearray(struct.pack("<I", len(raw)))
        if raw:
            record += struct.pack("<I", node["type_id"]) + raw
        record += struct.pack("<I", len(node["children"]))
        patch_positions = []
        for child in node["children"]:
            record += child["name"].encode("utf-8") + b"\0"
            patch_positions.append(len(record))
            record += b"\0\0\0\0"
        cursor += len(record)
        records.append((start, record))
        for child, patch in zip(node["children"], patch_positions):
            struct.pack_into("<I", record, patch, assign(child))
        return start

    assign(document["root"])
    output = bytearray(header)
    for start, record in records:
        if len(output) != start:
            raise FormatError("noncontiguous serialization")
        output += record
    return bytes(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="decoded asset directory or one bXML file")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--schema", type=Path)
    args = parser.parse_args()
    paths = sorted(args.input.rglob("*")) if args.input.is_dir() else [args.input]
    base = args.input if args.input.is_dir() else args.input.parent
    args.output.mkdir(parents=True, exist_ok=True)
    summaries, failures, all_stats, type_sizes = [], [], Counter(), defaultdict(Counter)
    for path in paths:
        if not path.is_file():
            continue
        data = path.read_bytes()
        if not data.startswith(b"bXML"):
            continue
        try:
            decoder = Decoder(data)
            document = decoder.parse()
            relative = path.relative_to(base)
            document["source_path"] = str(path)
            destination = args.output / (str(relative) + ".json")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(json.dumps(document, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n")
            summaries.append({"source": str(path), "json": str(destination),
                              "sha256": document["input_sha256"], "bytes": len(data),
                              "statistics": document["statistics"],
                              "roundtrip_byte_identical": True, "issues": document["issues"]})
            for key, value in decoder.statistics.items():
                if key == "max_depth":
                    all_stats[key] = max(all_stats[key], value)
                else:
                    all_stats[key] += value
            for key, sizes in decoder.type_sizes.items():
                type_sizes[key].update(sizes)
        except (FormatError, ValueError, UnicodeError, struct.error) as exc:
            failures.append({"source": str(path), "error": str(exc)})
    manifest = {"format": "Stella bXML v1 decoded assets", "files_decoded": len(summaries),
                "files_failed": len(failures), "statistics": dict(all_stats),
                "files": summaries, "failures": failures}
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if args.schema:
        schema = {"scope": "observed shipped Stella Maiden 4.3.2 bXML resources",
                  "header": ["ASCII bXML (4 bytes)", "version u32 LE (=1)", "type count u32 LE (=9)",
                             "type descriptors repeated: id u32 LE, NUL terminated UTF8 name, opaque marker u8 (=0)"],
                  "node": ["payload byte count u32 LE", "if count > 0: type id u32 LE, then exactly count payload bytes",
                           "child count u32 LE", "for each child: NUL terminated UTF8 name, absolute file offset u32 LE",
                           "child records serialized in preorder"],
                  "types": {"1": "string: NUL terminated bytes; normally UTF8, some font names infer CP949", "2": "int32 signed LE",
                            "3": "uint8", "4": "uint16 LE", "5": "bool encoded as uint32 LE, observed 0/1",
                            "6": "IEEE754 float32 LE", "7": "uint32 LE (named dword)", "8": "uint32 LE (named uint)"},
                  "arrays": "Numeric payload count is payload_length / element_width; scalar value when count=1, otherwise array. Semantics of vector/matrix dimensions come from consuming code, not this generic serializer.",
                  "preservation": "Duplicate child names, order, tree, type ids, raw payload hex, original offsets and decoded values retained. Reconstruction recomputes offsets from tree and matches every input byte.",
                  "limitations": ["Opaque type-descriptor marker semantics unknown.", "Generic tree grammar is observed and byte-roundtrip verified; gameplay/UI field semantics require code or runtime evidence.", "CP949 interpretation is an inference based on valid Korean font names; original bytes remain in payload_hex.", "No runtime behavior or server data is established."],
                  "validation": {"files_decoded": len(summaries), "files_failed": len(failures),
                                 "all_byte_identical": not failures and all(x["roundtrip_byte_identical"] for x in summaries),
                                 "statistics": dict(all_stats),
                                 "payload_length_histogram": {t: dict(sorted(c.items())) for t, c in type_sizes.items()}}}
        args.schema.parent.mkdir(parents=True, exist_ok=True)
        args.schema.write_text(json.dumps(schema, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"files_decoded": len(summaries), "files_failed": len(failures), "statistics": dict(all_stats)}, ensure_ascii=False))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
