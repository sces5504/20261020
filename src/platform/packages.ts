import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { validatePack, type Pack } from "../content/schema";
export async function exportPack(
  pack: Pack,
  loadAsset: (path: string) => Promise<Uint8Array> = async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw Error(`素材讀取失敗 ${path}`);
    return new Uint8Array(await response.arrayBuffer());
  },
): Promise<Uint8Array> {
  const p = structuredClone(pack),
    files: Record<string, Uint8Array> = {};
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
      files[path] = bytes;
    }
    a.src = path;
  }
  files["pack.json"] = strToU8(JSON.stringify(p));
  return zipSync(files, { level: 6 });
}
export function importPack(bytes: Uint8Array): Pack {
  if (bytes.length > 25 * 1024 * 1024) throw Error("內容包壓縮檔超過 25 MB。");
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (
        f.originalSize > 30 * 1024 * 1024 ||
        (total += f.originalSize) > 60 * 1024 * 1024
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
  for (const a of first.pack.assets) {
    if (a.src.startsWith("data:")) continue;
    const file = files[a.src.replace(/^\.\//, "")];
    if (!file) throw Error(`缺少媒體 ${a.src}`);
    let data = "";
    for (let i = 0; i < file.length; i += 8192)
      data += String.fromCharCode(...file.subarray(i, i + 8192));
    a.src = `data:image/${a.src.endsWith(".jpg") ? "jpeg" : a.src.endsWith(".webp") ? "webp" : "png"};base64,${btoa(data)}`;
  }
  return first.pack;
}
