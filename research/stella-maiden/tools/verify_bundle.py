"""Verify this portable handoff against file hashes and source-derived identities."""
from pathlib import Path
import hashlib,json,struct
from decode_bxml import serialize
from reconstruction import damage_known_path
ROOT=Path(__file__).resolve().parents[1]
FORMATS={'i32':'i','u32':'I','u64':'Q','f32':'f','vec2i':'2i','vec2f':'2f','vec3f':'3f','vec4f':'4f'}

def sha(data):return hashlib.sha256(data).hexdigest()
def main():
    manifest=json.loads((ROOT/'MANIFEST.json').read_text())
    actual={str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and p.name!='MANIFEST.json' and not any(part in ['generated','__pycache__'] for part in p.relative_to(ROOT).parts)}
    assert actual=={item['path'] for item in manifest['files']},'Manifest file coverage mismatch'
    for item in manifest['files']:
        path=ROOT/item['path']
        assert path.resolve().is_relative_to(ROOT.resolve()),item['path']
        data=path.read_bytes()
        assert len(data)==item['bytes'] and sha(data)==item['sha256'],item['path']
    checks=json.loads((ROOT/'index/source_table_checks.json').read_text())['tables'];total=0
    for name,expected in checks.items():
        doc=json.loads((ROOT/'tables'/(name+'.json')).read_text());payload=bytearray()
        assert len(doc['rows'])==doc['_row_count']==expected['rows']
        for row_index,row in enumerate(doc['rows']):
            assert row['_row']==row_index
            assert len(row['_field_offsets'])==len(doc['fields'])
            for field in doc['fields']:
                value=row[field['name']]
                if field['type']=='str':
                    raw=value.encode('utf-8');payload.extend(struct.pack('<H',len(raw)));payload.extend(raw)
                else:payload.extend(struct.pack('<'+FORMATS[field['type']],*(value if isinstance(value,list) else [value])))
        assert sha(payload)==expected['decoded_payload_sha256'],name
        header=bytes.fromhex(doc['_header_hex'])+struct.pack('<II',doc['_row_count'],int(doc['_schema_fingerprint'],16))
        assert sha(header+payload)==expected['decoded_file_sha256'],name
        total+=len(doc['rows'])
    assert len(checks)==67 and total==37723
    scenes=json.loads((ROOT/'scenes/manifest.json').read_text())
    for scene in scenes['files']:
        path=ROOT/scene['json'];doc=json.loads(path.read_text())
        assert sha(serialize(doc))==scene['sha256']==doc['input_sha256']
    assert len(scenes['files'])==370 and scenes['files_failed']==0
    for case in json.loads((ROOT/'index/combat_evidence.json').read_text())['examples']:
        result=damage_known_path(case['input_damage'],case['defense'],case['critical_event'],case['evasion_event'],case['crit_bonus_getter'],case['evade_reduction_getter'],case['armor_K'])
        assert result['damage']==case['return_damage'] and result['q16_after_each_step']==case['q16_after_each_step']
    events=json.loads((ROOT/'index/event_semantics.json').read_text())
    assert len(events['opcodes'])==124
    assert all(x['entry_script_rows'] for x in events['eventspot_entry_links'] if x['entry_label'])
    print(json.dumps({'status':'pass','manifest_files':len(manifest['files']),'tables_reencoded_against_source_hash':67,'table_rows':total,'bxml_rebuilt_against_source_hash':370,'native_opcodes':124,'damage_formula_cases':4,'original_apk_or_game_executed':False,'scope':'Portable handoff integrity; not game validation or original-APK byte verification.'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
