export const APP_CSS = `
:root {
  --bg: #f6f4f0;
  --fg: #16161c;
  --muted: #5c5c66;
  --line: color-mix(in oklab, var(--fg) 12%, transparent);
  --card: #fffcf7;
  --p: #0f766e;
  --pfg: #f8fafc;
  --danger: #b42318;
  --radius: 16px;
  --font: "Segoe UI", system-ui, -apple-system, sans-serif;
}
html[data-theme="dark"] {
  --bg: #0b0d10;
  --fg: #eceef2;
  --muted: #9aa0ab;
  --line: color-mix(in oklab, var(--fg) 14%, transparent);
  --card: #14181f;
  --danger: #f97066;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--fg); font-family: var(--font); }
body { padding-bottom: env(safe-area-inset-bottom); }
button, [role="button"] { cursor: pointer; }
#app { min-height: 100%; display: flex; flex-direction: column; }
.top {
  display: grid; grid-template-columns: 44px 1fr 44px; align-items: center;
  padding: 12px 12px 8px; gap: 8px;
}
.top h1 { margin: 0; font-size: 1.05rem; font-weight: 600; text-align: center; letter-spacing: -0.02em; text-wrap: balance; }
.brand-dot { width: 10px; height: 10px; margin: 0 auto; border-radius: 99px; background: var(--p); }
.icon-btn {
  width: 44px; height: 44px; border: 0; background: transparent; color: var(--fg);
  display: grid; place-items: center; border-radius: 12px;
}
.icon-btn:active { transform: scale(0.96); }
.ico { width: 22px; height: 22px; }
.page { flex: 1; padding: 8px 16px 96px; }
.lede { color: var(--muted); margin: 0 0 16px; line-height: 1.5; text-wrap: pretty; }
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.kpi {
  background: var(--card); border-radius: 20px; padding: 14px;
  box-shadow: 0 0 0 1px var(--line);
}
.kpi-label { display: block; color: var(--muted); font-size: 0.75rem; font-weight: 500; }
.kpi-val { display: block; margin-top: 6px; font-size: 1.15rem; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.card-btn {
  min-height: 52px; border: 0; border-radius: 16px; background: var(--p); color: var(--pfg);
  display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600;
}
.card-btn.ghost { background: var(--card); color: var(--fg); box-shadow: 0 0 0 1px var(--line); }
.card-btn:active { transform: scale(0.96); }
.h2 { font-size: 0.85rem; font-weight: 600; color: var(--muted); margin: 18px 0 8px; letter-spacing: 0.04em; text-transform: uppercase; }
.empty { color: var(--muted); line-height: 1.5; }
.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  width: 100%; text-align: left; border: 0; background: var(--card); color: var(--fg);
  border-radius: 16px; padding: 14px; min-height: 52px;
  display: flex; justify-content: space-between; gap: 12px; align-items: center;
  box-shadow: 0 0 0 1px var(--line);
}
.row em { color: var(--muted); font-style: normal; font-variant-numeric: tabular-nums; }
.search {
  display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 14px;
  padding: 0 12px; margin-bottom: 12px; box-shadow: 0 0 0 1px var(--line);
}
.search input { flex: 1; height: 44px; border: 0; background: transparent; color: var(--fg); font: inherit; outline: none; }
.fld { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 500; }
.fld input, .fld textarea, .fld select {
  min-height: 44px; border-radius: 12px; border: 0; padding: 10px 12px;
  background: var(--card); color: var(--fg); font: inherit; box-shadow: 0 0 0 1px var(--line);
}
.fld textarea { min-height: 96px; resize: vertical; }
.chk { display: flex; align-items: center; gap: 8px; min-height: 44px; font-weight: 400; }
.btn {
  width: 100%; min-height: 48px; border: 0; border-radius: 14px; background: var(--p); color: var(--pfg);
  font: inherit; font-weight: 600; margin-top: 8px;
}
.btn:active { transform: scale(0.96); }
.btn.ghost { background: var(--card); color: var(--fg); box-shadow: 0 0 0 1px var(--line); }
.btn.danger { background: var(--danger); color: #fff; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.kv { margin: 0 0 16px; }
.kv div { padding: 10px 0; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 12px; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; font-weight: 500; }
.card { background: var(--card); border-radius: 20px; padding: 16px; box-shadow: 0 0 0 1px var(--line); margin-bottom: 12px; }
.muted { color: var(--muted); }
.tiny { font-size: 0.75rem; line-height: 1.4; }
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; justify-content: space-around;
  padding: 6px 8px calc(8px + env(safe-area-inset-bottom));
  background: color-mix(in oklab, var(--bg) 92%, transparent);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(8px);
}
.tab {
  flex: 1; border: 0; background: transparent; color: var(--muted);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  font-size: 0.65rem; min-height: 48px; font-weight: 500;
}
.tab.on { color: var(--p); }
.toast {
  position: fixed; left: 50%; bottom: 88px; transform: translate(-50%, 8px);
  background: var(--fg); color: var(--bg); padding: 10px 14px; border-radius: 999px;
  opacity: 0; pointer-events: none; transition: opacity 150ms ease, transform 150ms ease;
  font-size: 0.85rem; z-index: 20;
}
.toast.show { opacity: 1; transform: translate(-50%, 0); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile { background: var(--card); border-radius: 18px; padding: 14px; box-shadow: 0 0 0 1px var(--line); }
.tile h3 { margin: 0 0 6px; font-size: 0.95rem; }
.tile p { margin: 0 0 10px; color: var(--muted); font-size: 0.8rem; }
.cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 12px; }
.dow { text-align: center; color: var(--muted); font-size: 0.7rem; padding: 4px 0; }
.day {
  min-height: 40px; border: 0; background: var(--card); color: var(--fg); border-radius: 10px;
}
.day.today { box-shadow: 0 0 0 1px var(--p); }
.day.has { background: color-mix(in oklab, var(--p) 18%, var(--card)); }
.cal-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.habit {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  background: var(--card); border-radius: 16px; padding: 14px; margin-bottom: 8px;
  box-shadow: 0 0 0 1px var(--line);
}
.habit .muted { display: block; font-size: 0.75rem; margin-top: 4px; }
.chip { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 0; background: var(--card); color: var(--fg); box-shadow: 0 0 0 1px var(--line); font-weight: 600; }
.chip.on { background: var(--p); color: var(--pfg); box-shadow: none; }
.calc-screen {
  background: var(--card); border-radius: 20px; padding: 18px; text-align: right; margin-bottom: 12px;
  box-shadow: 0 0 0 1px var(--line);
}
.calc-screen span { display: block; color: var(--muted); min-height: 1.2em; font-variant-numeric: tabular-nums; }
.calc-screen strong { font-size: 2rem; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.calc-keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.k {
  min-height: 52px; border: 0; border-radius: 14px; background: var(--card); color: var(--fg);
  font-size: 1.1rem; font-weight: 600; box-shadow: 0 0 0 1px var(--line);
}
.k.eq { background: var(--p); color: var(--pfg); grid-column: span 2; }
.bar { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; margin: 6px 0; }
.bar i { display: block; height: 100%; background: var(--p); }
.rep { padding: 8px 0 12px; }
.rep-h { display: flex; justify-content: space-between; }
@media (prefers-reduced-motion: reduce) {
  .btn, .card-btn, .icon-btn, .toast { transition: none; transform: none; }
}
`.trim();
