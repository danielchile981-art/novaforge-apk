import { initials } from "./id.ts";

export function projectThumbnail(name: string, color: string): string {
  const ini = initials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <rect width="640" height="400" rx="36" fill="#111318"/>
  <rect x="24" y="24" width="592" height="352" rx="28" fill="#181b22"/>
  <circle cx="120" cy="200" r="56" fill="${color}"/>
  <text x="120" y="212" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="28" fill="#042f2e" font-weight="600">${ini}</text>
  <text x="200" y="190" font-family="Segoe UI,sans-serif" font-size="28" fill="#eceef2" font-weight="600">${escapeXml(name.slice(0, 22))}</text>
  <text x="200" y="226" font-family="Segoe UI,sans-serif" font-size="16" fill="#9aa0ab">NovaForge</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
