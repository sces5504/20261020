import type { Pack } from "../content/schema";
const verified = new Set<string>();
export async function verifyMedia(p: Pack) {
  for (const a of p.assets) {
    const key = a.hash + ":" + a.src;
    if (verified.has(key)) continue;
    const response = await fetch(a.src);
    if (!response.ok) throw Error(`素材無法載入：${a.name}`);
    const blob = await response.blob();
    if (blob.size > 8 * 1024 * 1024) throw Error(`素材超過8MiB：${a.name}`);
    const bytes = await blob.arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    if (a.hash !== hash)
      throw Error(`素材校驗不符：${a.name}，請重新匯入圖片。`);
    const image = await createImageBitmap(blob);
    const ok = image.width === a.width && image.height === a.height;
    image.close();
    if (!ok) throw Error(`素材尺寸不符：${a.name}`);
    verified.add(key);
  }
}
