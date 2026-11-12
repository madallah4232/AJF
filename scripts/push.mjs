// تنبيهات وصول الرحلات على الجوال (Web Push) — يستدعيها وسيط ADS-B كل 30 ثانية.
// المراحل لكل رحلة وصول: قبل 10 دقائق ← قبل 5 دقائق ← هبطت. كل تنبيه يحل محل اللي قبله (نفس tag).
// يحتاج أسرار GitHub: SB_SERVICE_KEY و VAPID_PRIVATE. بدونها ما يسوي شيء.

const SB_URL = "https://izhrblrbjdaujshzqqrp.supabase.co";
const VAPID_PUBLIC = "BMomC-1J0x_63i0lye7d6qV8aAH5loPmXSaC_xGo7ktQWBpgdcuSsBTwjRb62gbG1VUQIHWTaScBS0QpvooTufI";
const SCHED = "https://docs.google.com/spreadsheets/d/15lfKxUHljob3uZ2xaSbvXE3L813g4apDTVQHhQshPn8/gviz/tq?tqx=out:csv&headers=1&sheet=SCHED";
const KEY = process.env.SB_SERVICE_KEY, PRIV = process.env.VAPID_PRIVATE;

const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => { const m = String(t || "").match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const fmt = (m) => pad(Math.floor((((m % 1440) + 1440) % 1440) / 60)) + ":" + pad(((m % 60) + 60) % 60);

let wp = null, ready = null, sched = null, schedAt = 0;
async function init() {
  if (!KEY || !PRIV) { console.log("push: secrets missing, disabled"); return false; }
  try { wp = (await import("web-push")).default; } catch { console.log("push: web-push not installed"); return false; }
  wp.setVapidDetails("https://madallah4232.github.io/AJF/", VAPID_PUBLIC, PRIV);
  return true;
}
async function rpc(fn, args) {
  const r = await fetch(SB_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: KEY, ...(KEY.startsWith("eyJ") ? { Authorization: "Bearer " + KEY } : {}), "Content-Type": "application/json" }, body: JSON.stringify(args || {}), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(fn + " " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}
// جدول الرحلات من Google Sheet (نفس مصدر التطبيق)، كل 30 دقيقة، وإلا جدول index.html
async function loadSched(fallback) {
  if (sched && Date.now() - schedAt < 30 * 60e3) return sched;
  try {
    const t = await (await fetch(SCHED + "&t=" + Date.now(), { signal: AbortSignal.timeout(10000) })).text();
    const m = t.match(/"(\{""reviewed""[\s\S]*\})"/);
    const j = m && JSON.parse(m[1].replace(/""/g, '"'));
    if (j && Array.isArray(j.flights) && j.flights.length >= 3) { sched = j.flights; schedAt = Date.now(); return sched; }
  } catch (e) { console.log("push: sched", e.message); }
  return sched || fallback;
}
function arrivals(F, iso, dow) {
  return F.filter((f) => f.inNo && f.days.includes(dow) && (!f.until || iso <= f.until) && (!f.start || iso >= f.start))
    .map((f) => ({ ino: (f.inAltNo && f.inAltNo[dow]) || f.inNo, ia: (f.inAlt && f.inAlt[dow]) || f.inArr,
      n: (f.altNo && f.altNo[dow]) || f.no, t: (f.alt && f.alt[dow]) || f.time, from: f.dest, airline: f.airline }));
}
// المرحلة الحالية لرحلة وصول، أو null
export function stageOf(f, state, nowMin) {
  const fr = (state.fr || {})[f.ino], ata = (state.ata || {})[f.ino];
  if (fr && (fr.s === "canceled" || fr.s === "diverted")) return null;
  if (ata || (fr && fr.s === "landed" && fr.t)) {
    const t = String(ata || fr.t).replace(/[~@]/g, ""), m = toMin(t);
    if (m == null || nowMin - m > 20 || nowMin - m < -5) return null; // هبوط قديم (مثلاً بعد إعادة تشغيل الوسيط)
    return { stage: "land", t };
  }
  const airborne = (fr && fr.s === "departed") || (state.air || {})[f.ino];
  if (!airborne) return null; // ما أقلعت من مطارها، فما تقدر توصل خلال 10 دقائق
  const eta = toMin((fr && fr.s === "departed" && fr.t) || "") ?? toMin(f.ia);
  if (eta == null) return null;
  const left = eta - nowMin;
  if (left < -10 || left > 10) return null;
  return { stage: left <= 5 ? "5" : "10", t: fmt(eta), left: Math.max(1, left) };
}
function payload(f, s, iso) {
  const head = `${f.ino} من ${f.from}`;
  const next = f.n && f.t ? ` · المغادرة ${f.n} ${f.t}` : "";
  const body = s.stage === "land" ? `هبطت الساعة ${s.t}${next}`
    : `تصل خلال ${s.left === 1 ? "دقيقة" : s.left === 2 ? "دقيقتين" : s.left + " دقائق"} · المتوقع ${s.t}${next}`;
  return JSON.stringify({ title: (s.stage === "land" ? "🛬 " : "✈️ ") + head, body, tag: "ajf-" + iso + "-" + f.ino, url: "./" });
}
// تنبيه المشرف: طلب دخول جديد بانتظار الموافقة (كل دقيقة تقريباً، مرة لكل عدد جديد في اليوم)
let admAt = 0;
async function adminTick(N) {
  if (Date.now() - admAt < 55e3) return; admAt = Date.now();
  let rows; try { rows = await rpc("ajf_admin_alerts"); } catch (e) { if (!/404|PGRST202/.test(e.message)) console.log("push: admin", e.message); return; }
  for (const x of rows || []) {
    const id = x.endpoint.slice(-24);
    if (!(await rpc("ajf_push_claim", { p_day: N.iso, p_flight: "ADM", p_stage: id + "-" + x.pending }).catch(() => false))) continue;
    const msg = JSON.stringify({ title: "👤 طلب دخول جديد", body: x.pending === 1 ? "موظف بانتظار موافقتك على الدخول للوحة — اضغط للمراجعة" : `${x.pending} طلبات بانتظار موافقتك على الدخول للوحة — اضغط للمراجعة`, tag: "ajf-admin", url: "./?acct" });
    try { await wp.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, msg, { TTL: 6 * 3600, urgency: "high", topic: "adminreq" }); console.log("push: admin pending", x.pending); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await rpc("ajf_push_drop", { p_endpoint: x.endpoint }).catch(() => {}); else console.log("push: admin send", e.statusCode || e.message); }
  }
}
// 📻 تنبيهات المشرف المكتوبة (من صفحة الراديو في التطبيق) ← كل الموظفين المشتركين، حتى والجوال مقفل
async function bcTick(N) {
  let rows; try { rows = await rpc("ajf_bc_due"); } catch (e) { if (!/404|PGRST202/.test(e.message)) console.log("push: bc", e.message); return; }
  for (const x of rows || []) {
    if (!(await rpc("ajf_push_claim", { p_day: N.iso, p_flight: "BC", p_stage: String(x.id) }).catch(() => false))) continue;
    const body = String(x.body || "").slice(0, 300);
    const msg = JSON.stringify({ title: (x.urgent ? "🚨 عاجل · " : "📢 ") + (x.name || "المشرف"), body, tag: "ajf-bc-" + x.id, url: "./?bc", ri: !!x.urgent });
    const subs = await rpc("ajf_push_targets");
    let ok = 0;
    await Promise.all(subs.map(async (s) => {
      try { await wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 6 * 3600, urgency: "high", topic: ("bc" + x.id).slice(0, 32) }); ok++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await rpc("ajf_push_drop", { p_endpoint: s.endpoint }).catch(() => {}); else console.log("push: bc send", e.statusCode || e.message); }
    }));
    console.log(`push: BC ${x.id} → ${ok}/${subs.length}`);
  }
}
let busy = false;
export async function pushTick(state, N, fallbackFlights) {
  if (busy) return; busy = true;
  try {
    if (ready === null) ready = await init();
    if (!ready) return;
    await adminTick(N).catch((e) => console.log("push: admin", e.message));
    await bcTick(N).catch((e) => console.log("push: bc", e.message));
    const F = await loadSched(fallbackFlights);
    // وقت الهبوط اللي اعتمده موظف من التطبيق يتقدّم على الرصد التلقائي
    const man = await rpc("ajf_ata_day", { p_day: N.iso }).catch(() => null);
    // تنبيه تجريبي يطلبه المشرف من صفحة الحساب (يُسجَّل كـ PUSHTEST بوقت الطلب)
    if (man && man.PUSHTEST) {
      const tm = toMin(man.PUSHTEST), age = tm == null ? 99 : N.mins - tm;
      if (age >= 0 && age <= 5 && (await rpc("ajf_push_claim", { p_day: N.iso, p_flight: "PUSHTEST", p_stage: man.PUSHTEST }).catch(() => false))) {
        const subs = await rpc("ajf_push_targets"), msg = JSON.stringify({ title: "🔔 تنبيه تجريبي · رحلات الجوف", body: "هذا شكل تنبيه وصول الرحلة: يوصلك قبل الوصول بـ10 دقائق، ثم 5، ثم عند الهبوط.", tag: "ajf-test", url: "./" });
        let ok = 0;
        await Promise.all(subs.map(async (x) => { try { await wp.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, msg, { TTL: 600, urgency: "high", topic: "pushtest" }); ok++; } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await rpc("ajf_push_drop", { p_endpoint: x.endpoint }).catch(() => {}); else console.log("push: test send", e.statusCode || e.message); } }));
        console.log(`push: TEST → ${ok}/${subs.length}`);
      }
      delete man.PUSHTEST;
    }
    const st = man && Object.keys(man).length ? { ...state, ata: { ...(state.ata || {}), ...man } } : state;
    for (const f of arrivals(F, N.iso, N.dow)) {
      const s = stageOf(f, st, N.mins);
      if (!s) continue;
      if (!(await rpc("ajf_push_claim", { p_day: N.iso, p_flight: f.ino, p_stage: s.stage }))) continue;
      if (s.stage === "5") await rpc("ajf_push_claim", { p_day: N.iso, p_flight: f.ino, p_stage: "10" }); // لو تأخر الرصد ما نرجع لمرحلة 10
      const subs = await rpc("ajf_push_targets"), msg = payload(f, s, N.iso);
      let ok = 0, gone = 0;
      await Promise.all(subs.map(async (x) => {
        try { await wp.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, msg, { TTL: s.stage === "land" ? 1800 : 300, urgency: "high", topic: ("a" + f.ino).slice(0, 32) }); ok++; }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { gone++; await rpc("ajf_push_drop", { p_endpoint: x.endpoint }).catch(() => {}); } else console.log("push: send", e.statusCode || e.message); }
      }));
      console.log(`push: ${f.ino} ${s.stage} → ${ok}/${subs.length}${gone ? " (dropped " + gone + ")" : ""}`);
    }
  } catch (e) { console.log("push:", e.message); }
  finally { busy = false; }
}
