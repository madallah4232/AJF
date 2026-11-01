// وسيط ADS-B: مواقع الطائرات الحية من adsb.lol (لا يسمح للمتصفح مباشرة)
// يكتب adsb.json في فرع live كل ~30 ثانية، ويرصد وقت الهبوط الفعلي (ATA) والإقلاع (ATD) في الجوف.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const html = readFileSync("index.html", "utf8");
const grab = (re) => { const m = html.match(re); if (!m) throw new Error("parse " + re); return m[0]; };
const C = Function(grab(/const C=\{[^}]*\};/) + "return C;")();
const FLIGHTS = Function("C", grab(/const FLIGHTS=\[[\s\S]*?\n\];/) + "return FLIGHTS;")(C);
const ICAO = Function(grab(/const ICAO=\{[^}]*\};/) + "return ICAO;")();
const AJF = [29.7851, 40.1];
const RUN_MS = (+process.env.RUN_MIN || 175) * 60e3, STEP = 30e3, t0 = Date.now();

const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmt = (m) => pad(Math.floor(((m % 1440) + 1440) % 1440 / 60)) + ":" + pad(((m % 60) + 60) % 60);
const cs = (n) => (ICAO[n.slice(0, 2)] || n.slice(0, 2)) + n.slice(2);
const R = Math.PI / 180;
const dist = (a, b) => 6371 * 2 * Math.asin(Math.sqrt(Math.sin((b[0] - a[0]) * R / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin((b[1] - a[1]) * R / 2) ** 2));
function riyadh(ms = Date.now()) { const d = new Date(ms + 3 * 3600e3); return { iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), mins: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
function flightsOn(iso, dow) {
  return FLIGHTS.filter((f) => f.days.includes(dow) && (!f.until || iso <= f.until) && (!f.start || iso >= f.start))
    .map((f) => ({ n: (f.altNo && f.altNo[dow]) || f.no, t: (f.alt && f.alt[dow]) || f.time, ino: (f.inAltNo && f.inAltNo[dow]) || f.inNo, ia: (f.inAlt && f.inAlt[dow]) || f.inArr, dur: f.dur }));
}
async function get(c) {
  for (const u of ["https://api.adsb.lol/v2/callsign/", "https://opendata.adsb.fi/api/v2/callsign/"]) {
    try { const r = await fetch(u + c, { signal: AbortSignal.timeout(8000) }); if (!r.ok) continue; const j = await r.json(); const a = (j.ac || [])[0]; if (a && a.lat != null) return a; if (j.ac) return null; } catch {}
  }
  return null;
}
const sh = (c) => execSync(c, { stdio: ["ignore", "pipe", "inherit"] }).toString();
// استرجاع بيانات اليوم السابقة (ATA/ATD) إن وجدت
let state = { date: "", ata: {}, atd: {}, low: {}, air: {} };
try { const old = JSON.parse(sh("git show origin/live:adsb.json 2>/dev/null || echo '{}'")); if (old.date === riyadh().iso) state = { ...state, ...old }; } catch {}
let lastOut = "";
while (Date.now() - t0 < RUN_MS) {
  const loop = Date.now(), N = riyadh();
  if (state.date !== N.iso) state = { date: N.iso, ata: {}, atd: {}, low: {}, air: {} };
  const want = [];
  for (const f of flightsOn(N.iso, N.dow)) {
    if (f.ino && f.ia && !state.ata[f.ino] && N.mins >= toMin(f.ia) - 200 && N.mins <= toMin(f.ia) + 90) want.push({ no: f.ino, kind: "in" });
    if (N.mins >= toMin(f.t) - 40 && N.mins <= toMin(f.t) + f.dur + 30) want.push({ no: f.n, kind: "out" });
  }
  const ac = {};
  for (const w of want) {
    const a = await get(cs(w.no)); if (!a) continue;
    const seenMs = loop - (a.seen_pos != null ? a.seen_pos : a.seen || 0) * 1000;
    const alt = a.alt_baro === "ground" ? 0 : +a.alt_baro || 0, d = dist([a.lat, a.lon], AJF), gs = a.gs || 0;
    ac[cs(w.no)] = { lat: +a.lat.toFixed(4), lon: +a.lon.toFixed(4), alt_baro: a.alt_baro, gs: Math.round(gs), track: a.track != null ? Math.round(a.track) : null, t: a.t || "", r: a.r || "", ts: Math.round(seenMs / 1000) };
    const tl = riyadh(seenMs).mins;
    if (w.kind === "in") {
      if (alt > 3000) state.air[w.no] = 1;
      if (state.air[w.no] && d < 12 && (a.alt_baro === "ground" || (alt < 800 && gs < 100))) state.ata[w.no] = fmt(tl);          // على الأرض في الجوف
      else if (state.air[w.no] && d < 25 && alt < 3500) state.low[w.no] = { m: tl, d: Math.round(d) };                      // في الاقتراب النهائي
    } else if (!state.atd[w.no] && d < 30 && alt > 300 && alt < 8000 && gs > 120) state.atd[w.no] = fmt(tl - Math.round(d / (gs * 1.852) * 60) - 1); // أقلعت للتو
  }
  // اختفت الإشارة في الاقتراب النهائي أكثر من 4 دقائق = هبطت (تقريبي مبني على آخر رصد)
  for (const [no, L] of Object.entries(state.low)) if (!state.ata[no] && !ac[cs(no)] && riyadh().mins - L.m >= 4) state.ata[no] = "~" + fmt(L.m + Math.max(1, Math.round(L.d / 4)));
  const body = { date: state.date, ata: state.ata, atd: state.atd, low: state.low, air: state.air, want: want.map((w) => cs(w.no)), ac };
  const out = JSON.stringify(body);
  if (out !== lastOut || Date.now() - (state.pushed || 0) > 3 * 60e3) {
    writeFileSync("adsb.json", JSON.stringify({ updated: Math.round(Date.now() / 1000), ...body }));
    try {
      sh("git add -f adsb.json && git commit -q --amend -m 'adsb live' --allow-empty && git push -q -f origin HEAD:live");
      lastOut = out; state.pushed = Date.now();
    } catch (e) { console.log("push failed", e.message); }
  }
  console.log(new Date().toISOString(), want.map((w) => w.no).join(","), Object.keys(ac).join(","), JSON.stringify(state.ata));
  await new Promise((r) => setTimeout(r, Math.max(2000, STEP - (Date.now() - loop))));
}
