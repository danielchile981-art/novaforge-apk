import JSZip from "jszip";

export async function zipProject(name: string, files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  const root = sanitizeFolder(name);
  for (const [path, content] of Object.entries(files)) {
    const clean = path.replace(/^\/+/, "").replace(/\.\./g, "");
    if (!clean || clean.split("/").some((p) => p === "..")) continue;
    zip.file(`${root}/${clean}`, content);
  }
  return zip.generateAsync({ type: "blob" });
}

export function sanitizeFolder(name: string): string {
  return name.replace(/[^A-Za-z0-9_\-]+/g, "-").replace(/(^-|-$)/g, "") || "app";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
