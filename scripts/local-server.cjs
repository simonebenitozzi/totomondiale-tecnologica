const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
    const filePath = path.join(root, pathname === "/" ? "index.html" : pathname);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "content-type": mime[path.extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Totomondiale pronto su http://${host}:${port}`);
  });
