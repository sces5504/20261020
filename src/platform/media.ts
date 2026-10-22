import type { Pack } from "../content/schema";
const verified = new Set<string>();
export async function verifyMedia(p: Pack) {
  // Bound decode memory while avoiding one network/decode round trip per asset.
  for (let i = 0; i < p.assets.length; i += 4)
    await Promise.all(
      p.assets.slice(i, i + 4).map(async (a) => {
        const key = a.hash + ":" + a.src + ":" + a.width + ":" + a.height;
        if (verified.has(key)) return;
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
      }),
    );
}
