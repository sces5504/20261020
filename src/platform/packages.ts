import { ARCHIVE_BYTES, EXPANDED_BYTES, ENTRY_BYTES } from "./budgets";
import { zipSync, unzipSync, strToU8, strFromU8, type Zippable } from "fflate";
import { validatePack, type Pack } from "../content/schema";
/** Native encoding avoids large intermediate binary strings in modern browsers.
 * Keep the same bounded, byte-exact fallback for runtimes without this API.
 */
function encodeMedia(bytes: Uint8Array) {
  const encode = (bytes as Uint8Array & { toBase64?: () => string }).toBase64;
  if (typeof encode === "function") return encode.call(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function exportPack(
  pack: Pack,
  loadAsset: (path: string) => Promise<Uint8Array> = async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw Error(`素材讀取失敗 ${path}`);
    return new Uint8Array(await response.arrayBuffer());
  },
): Promise<Uint8Array> {
  const p = structuredClone(pack),
    files: Zippable = {};
  const media = new Map<string, string>();
  for (const a of p.assets) {
    let bytes: Uint8Array;
    let ext: string;
    if (a.src.startsWith("data:")) {
      const [head, data] = a.src.split(",");
      ext = head.includes("jpeg")
        ? "jpg"
        : head.includes("webp")
          ? "webp"
          : "png";
      bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } else {
      bytes = await loadAsset(a.src);
      ext = a.src.endsWith(".webp")
        ? "webp"
        : a.src.endsWith(".jpg")
          ? "jpg"
          : "png";
    }
    // Deduplicate by actual bytes, including uploaded copies of shipped artwork.
    // Short archive-local names leave the fixed media budget for artwork, not paths.
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>),
      ),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    const key = `${digest}.${ext}`;
    let path = media.get(key);
    if (!path) {
      path = `assets/${media.size}.${ext}`;
      media.set(key, path);
      // PNG/JPEG/WebP are already compressed. Re-deflating the full world art
      // blocks the workshop without meaningfully shrinking the portable ZIP.
      files[path] = [bytes, { level: 0 }];
    }
    a.src = path;
  }
  files["pack.json"] = strToU8(JSON.stringify(p));
  const result = zipSync(files, { level: 6 });
  if (result.length > ARCHIVE_BYTES)
    throw Error("內容包壓縮檔超過 96 MiB，請拆分內容包。");
  return result;
}
export function importPack(bytes: Uint8Array): Pack {
  if (bytes.length > ARCHIVE_BYTES) throw Error("內容包壓縮檔超過 96 MiB。");
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (
        f.originalSize > ENTRY_BYTES ||
        (total += f.originalSize) > EXPANDED_BYTES
      )
        throw Error("內容包解壓大小超出限制。");
      if (f.name.includes("..") || f.name.startsWith("/"))
        throw Error("非法檔案路徑。");
      return true;
    },
  });
  if (!files["pack.json"]) throw Error("缺少 pack.json。");
  const raw = JSON.parse(strFromU8(files["pack.json"]));
  const first = validatePack(raw);
  if (!first.pack) throw Error(first.errors.join("\n"));
  const embedded = new Map<string, string>();
  for (const a of first.pack.assets) {
    if (a.src.startsWith("data:")) continue;
    const path = a.src.replace(/^\.\//, "");
    const cached = embedded.get(path);
    if (cached) {
      a.src = cached;
      continue;
    }
    const file = files[path];
    if (!file) throw Error(`缺少媒體 ${a.src}`);
    a.src = `data:image/${path.endsWith(".jpg") ? "jpeg" : path.endsWith(".webp") ? "webp" : "png"};base64,${encodeMedia(file)}`;
    embedded.set(path, a.src);
  }
  return first.pack;
}
