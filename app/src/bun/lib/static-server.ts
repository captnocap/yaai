// =============================================================================
// STATIC FILE SERVER
// =============================================================================
// Serves static assets (HTML, CSS, JS) for browser mode.

import { resolve } from "path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

/**
 * Get MIME type for a file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Check if a path is safe (no directory traversal attacks)
 */
function isSafePath(basePath: string, requestedPath: string): boolean {
  const full = resolve(basePath, requestedPath);
  return full.startsWith(resolve(basePath));
}

/**
 * Serve a static file from disk
 */
export async function serveStaticFile(
  basePath: string,
  urlPath: string
): Promise<Response | null> {
  try {
    // Remove leading slash and normalize
    let filePath = urlPath.startsWith("/") ? urlPath.substring(1) : urlPath;

    // Default to index.html for root or directory requests
    if (filePath === "" || filePath.endsWith("/")) {
      filePath = "index.html";
    }

    // Security check
    if (!isSafePath(basePath, filePath)) {
      return new Response("Forbidden", { status: 403 });
    }

    const fullPath = resolve(basePath, filePath);

    // Try to read the file
    const file = Bun.file(fullPath);
    const exists = await file.exists();

    if (!exists) {
      // Try index.html if it's a directory request
      if (!filePath.endsWith("/") && !filePath.includes(".")) {
        return serveStaticFile(basePath, `${urlPath}/index.html`);
      }
      return null;
    }

    const mimeType = getMimeType(filePath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": filePath.includes(".") ? "max-age=3600" : "no-cache",
      },
    });
  } catch (err) {
    console.error("[Static] Error serving file:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Check if a URL path looks like a static asset request
 */
export function isStaticAssetRequest(urlPath: string): boolean {
  // Don't serve WebSocket upgrades as static
  if (urlPath === "/" || urlPath === "") {
    return false;
  }

  const path = urlPath.split("?")[0].toLowerCase();

  // Check for file extensions
  return /\.(html|css|js|mjs|json|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|map)$/.test(
    path
  );
}
