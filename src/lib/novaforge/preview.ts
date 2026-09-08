/** Compile the generated multi-file app into a single HTML document for the live preview iframe. */
export function compilePreviewHtml(files: Record<string, string>, storagePrefix: string): string {
  const html = files["www/index.html"] || files["index.html"] || "<!DOCTYPE html><html><body></body></html>";
  const css = [files["www/css/theme.css"] || "", files["www/css/app.css"] || ""].join("\n");
  const js = [
    `window.__NF_STORAGE_PREFIX = ${JSON.stringify(storagePrefix)};`,
    files["www/js/runtime.js"] || "",
    files["www/js/config.js"] || "",
    files["www/js/custom.js"] || "",
    files["www/js/app.js"] || "",
  ].join("\n;\n");

  let out = html;
  out = out.replace(/<link[^>]+href="css\/[^"]+"[^>]*>/g, "");
  out = out.replace(/<script[^>]+src="js\/[^"]+"[^>]*><\/script>/g, "");
  const inject = `<style>${css}</style>\n<script>${js}\n<\/script>`;
  if (out.includes("</head>")) out = out.replace("</head>", `${inject}\n</head>`);
  else out += inject;
  return out;
}

export function fileTree(files: Record<string, string>): string[] {
  return Object.keys(files).sort();
}
