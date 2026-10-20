import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
export async function serveBuilt() {
  const root = resolve("dist"),
    prefix = "/m1-review/";
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
  };
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://localhost").pathname;
      if (!pathname.startsWith(prefix)) return res.writeHead(404).end();
      const file = resolve(
        root,
        decodeURIComponent(pathname.slice(prefix.length)) || "index.html",
      );
      if (!file.startsWith(root + "/") || !(await stat(file)).isFile())
        return res.writeHead(404).end();
      res.setHeader(
        "Content-Type",
        types[extname(file)] ?? "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}${prefix}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
