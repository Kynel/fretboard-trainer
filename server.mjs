import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function resolveFilePath(urlPath) {
  const pathname = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const resolvedPath = path.normalize(path.join(rootDir, requestedPath));

  if (!resolvedPath.startsWith(rootDir)) {
    return null;
  }

  return resolvedPath;
}

async function readFileFromRequest(urlPath) {
  const resolvedPath = resolveFilePath(urlPath);

  if (!resolvedPath) {
    return { statusCode: 403 };
  }

  try {
    const stat = await fs.stat(resolvedPath);

    if (stat.isDirectory()) {
      const indexPath = path.join(resolvedPath, "index.html");
      return {
        body: await fs.readFile(indexPath),
        filePath: indexPath,
        statusCode: 200
      };
    }

    return {
      body: await fs.readFile(resolvedPath),
      filePath: resolvedPath,
      statusCode: 200
    };
  } catch {
    const fallbackPath = path.join(rootDir, "index.html");

    try {
      return {
        body: await fs.readFile(fallbackPath),
        filePath: fallbackPath,
        statusCode: 200
      };
    } catch {
      return { statusCode: 404 };
    }
  }
}

const server = createServer(async (request, response) => {
  const result = await readFileFromRequest(request.url);

  if (!result.body || !result.filePath) {
    response.writeHead(result.statusCode || 500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(result.statusCode === 403 ? "Forbidden" : "Not found");
    return;
  }

  const extension = path.extname(result.filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  response.writeHead(result.statusCode, { "Content-Type": contentType });
  response.end(result.body);
});

server.listen(port, () => {
  console.log(`Fretboard Trainer is running at http://localhost:${port}`);
});
