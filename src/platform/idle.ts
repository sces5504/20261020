// 首載只抓本體；次要素材在瀏覽器閒置時才開始下載，避免和首屏搶頻寬。
export function whenIdle(task: () => void, timeout = 2500) {
  const w = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  if (w.requestIdleCallback) w.requestIdleCallback(task, { timeout });
  else setTimeout(task, Math.min(timeout, 600));
}

// 依序低優先度預載圖片；同一網址只抓一次，失敗不影響遊戲。
const queued = new Set<string>();
const backlog: string[] = [];
let running = 0;
export function prefetchImages(urls: Iterable<string>) {
  for (const url of urls)
    if (url && !url.startsWith("data:") && !queued.has(url)) {
      queued.add(url);
      backlog.push(url);
    }
  pump();
}
function pump() {
  while (running < 2 && backlog.length) {
    const url = backlog.shift()!;
    running++;
    whenIdle(() => {
      const image = new Image();
      (image as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
        "low";
      image.decoding = "async";
      image.onload = image.onerror = () => {
        running--;
        pump();
      };
      image.src = url;
    });
  }
}
