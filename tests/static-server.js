"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = path.resolve(__dirname, "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

http.createServer(function serve(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://" + host).pathname);
  } catch (error) {
    response.writeHead(400).end("Bad request");
    return;
  }

  const relativePath = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  const filePath = path.resolve(root, "." + relativePath);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, function sendFile(error, body) {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Content-Length": body.length
    });
    response.end(body);
  });
}).listen(port, host);
