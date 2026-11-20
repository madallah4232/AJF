// ajf-files — روابط مؤقتة لملفات التعاميم (PDF) في المخزن الخاص circ
// ما يعطي رابط إلا لموظف مسجّل دخول من جوال معتمد، والرفع والحذف للمشرف فقط.
// الإعداد: Edge Functions ← Deploy a new function ← الاسم ajf-files ← الصق هذا الملف ← Deploy
//          ثم من إعدادات الدالة: أطفئ "Verify JWT" (التطبيق يتحقق بالرقم الوظيفي والجلسة بدل JWT)
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (b: unknown, st = 200) => new Response(JSON.stringify(b), { status: st, headers: { ...cors, "Content-Type": "application/json" } });

// ---------- المساعد الذكي (Gemini) — المفتاح في Secrets باسم GEMINI_KEY ----------
const GK = Deno.env.get("GEMINI_KEY") || "";
const GM = (Deno.env.get("GEMINI_MODEL") || "gemini-flash-lite-latest,gemini-3.5-flash-lite").split(",");
const GM_STRONG = (Deno.env.get("GEMINI_MODEL_ASK") || "gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest").split(",");
// كل نموذج: محاولتين إذا كان مزحوم (429/5xx) أو تأخر، ثم ننتقل للي بعده — بدل ما نطلع "مشغول" من أول رفض
async function gem(text: string, sys: string, json = false, strong = false): Promise<string> {
  let last = "";
  for (const m of (strong ? GM_STRONG : GM)) {
    // التفكير الطويل هو أكبر سبب للبطء: نخليه قليل (وإذا النموذج ما يدعم الإعداد نعيد بدونه)
    let think = true;
    for (let t = 0; t < 2; t++) {
      const tc = !think ? {} : /2\.5/.test(m) ? { thinkingConfig: { thinkingBudget: strong ? 1024 : 0 } } : { thinkingConfig: { thinkingLevel: "low" } };
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.trim()}:generateContent`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(40000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text }] }],
            generationConfig: { temperature: 0.2, ...tc, ...(json ? { responseMimeType: "application/json" } : {}) } }),
        });
        if (r.ok) { const j = await r.json(); const o = (j.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || "").join(""); if (o.trim()) return o; last = m + " empty"; break; }
        const et = (await r.text()).slice(0, 300); last = m + " " + r.status + " " + et.slice(0, 160);
        if (r.status === 400 && think && /think/i.test(et)) { think = false; t--; continue; }
        if (r.status !== 429 && r.status < 500) break;
      } catch (e) { last = m + " " + String(e).slice(0, 120); break; }
      if (t === 0) await new Promise((ok) => setTimeout(ok, 2500));
    }
  }
  throw new Error("gemini " + last);
}
// نفس gem لكن يرسل الجواب أول بأول (streaming) عشان الموظف يشوف الكلام خلال ثواني بدل ما ينتظر الجواب كامل
async function gemStream(text: string, sys: string, onD: (d: string) => void): Promise<string> {
  let last = "";
  for (const m of GM_STRONG) {
    let think = true;
    for (let t = 0; t < 2; t++) {
      const tc = !think ? {} : /2\.5/.test(m) ? { thinkingConfig: { thinkingBudget: 512 } } : { thinkingConfig: { thinkingLevel: "low" } };
      let got = "";
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.trim()}:streamGenerateContent?alt=sse`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(45000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2500, ...tc } }),
        });
        if (!r.ok || !r.body) {
          const et = (await r.text()).slice(0, 300); last = m + " " + r.status + " " + et.slice(0, 160);
          if (r.status === 400 && think && /think/i.test(et)) { think = false; t--; continue; }
          if (r.status !== 429 && r.status < 500) break;
        } else {
          const rd = r.body.pipeThrough(new TextDecoderStream()).getReader(); let buf = "";
          for (;;) {
            const { value, done } = await rd.read(); if (done) break; buf += value;
            let k; while ((k = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
              if (!line.startsWith("data:")) continue;
              try { const j = JSON.parse(line.slice(5)); for (const x of (j.candidates?.[0]?.content?.parts || [])) if (x.text && !x.thought) { got += x.text; onD(x.text); } } catch (_) { /* سطر ناقص */ }
            }
          }
          if (got.trim()) return got; last = m + " empty"; break;
        }
      } catch (e) { if (got.trim()) return got; last = m + " " + String(e).slice(0, 120); break; }
      if (t === 0) await new Promise((ok) => setTimeout(ok, 2000));
    }
  }
  throw new Error("gemini " + last);
}
// شرح الكلمات الإنجليزية: [{t,ar}] نظيف ومحدود
function glClean(v: unknown): { t: string; ar: string }[] {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).map((x: any) => ({ t: String(x?.t || "").trim().slice(0, 60), ar: String(x?.ar || "").trim().slice(0, 160) }))
    .filter((x) => x.t && x.ar && /[A-Za-z]/.test(x.t) && !seen.has(x.t.toLowerCase()) && seen.add(x.t.toLowerCase())).slice(0, 15);
}
// ---------- بصمة المعنى (Gemini embeddings — مجاني) للبحث بالمعنى بدل تطابق الكلمات ----------
const EM = Deno.env.get("GEMINI_EMBED_MODEL") || "gemini-embedding-001";
class Busy extends Error {}
async function embed(texts: string[], task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EM}:batchEmbedContents`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ requests: texts.map((t) => ({ model: "models/" + EM, content: { parts: [{ text: t.slice(0, 7000) }] }, taskType: task, outputDimensionality: 768 })) }),
  });
  if (r.status === 429) throw new Busy("embed 429");
  if (!r.ok) throw new Error("embed " + r.status + " " + (await r.text()).slice(0, 160));
  const j = await r.json(); const E = (j.embeddings || []).map((e: { values: number[] }) => e.values);
  if (E.length !== texts.length) throw new Error("embed count");
  return E;
}
const vstr = (v: number[]) => "[" + v.map((x) => +x.toFixed(6)).join(",") + "]";
// نفس توحيد النص في التطبيق (circ.js) عشان البحث يطابق
const AN = (s: string) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ء/g, "")
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const NORM = (s: string) => AN(s).replace(/لا/g, "ال").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const isAr = (w: string) => /[\u0600-\u06FF]/.test(w);
const enStem = (w: string) => { if (w.length <= 4) return w; w = w.replace(/(ations?|ings?|ments?|ness|ies|ied|ers?|ed|es|s)$/, (m) => (m === "ies" || m === "ied" ? "y" : "")); return w.length > 4 ? w.replace(/e$/, "") : w; };
const arStem = (w: string) => { w = w.replace(/^(وال|بال|فال|كال|لل|ال)/, ""); if (w.length > 4) w = w.replace(/(ات|ين|ون|ها|هم|يه|يا)$/, ""); return w; };
const SK = (w: string) => { if (isAr(w)) { const s = arStem(w), k = s.replace(/[اوي]/g, "").replace(/ه$/, ""); return k.length >= 2 ? k : s; } return enStem(w); };
// تقسيم الملف لأجزاء (~3500 حرف) عند حدود الفقرات/الصفحات — للأدلة الكبيرة
async function chunkify(sb: any, c: { id: string; body: string; ftext: string }) {
  const t = (String(c.body || "") + "\n\n" + String(c.ftext || "")).trim();
  const parts: string[] = []; let cur = "", pg = 0;
  for (const para of t.split(/\n{2,}/)) {
    const mk = () => (pg ? `[صفحة ${pg}] ` : "");
    if (cur.length + para.length > 3500 && cur.length > 800) { parts.push(cur); cur = mk() + cur.slice(-300); }
    cur += (cur ? "\n\n" : "") + para;
    const pm = [...para.matchAll(/\[صفحة (\d+)\]/g)]; if (pm.length) pg = +pm[pm.length - 1][1];
    while (cur.length > 5000) { parts.push(cur.slice(0, 3500)); cur = mk() + cur.slice(3200); }
  }
  if (cur.trim()) parts.push(cur);
  await sb.from("ajf_circ_chunk").delete().eq("cid", c.id);
  const rows = parts.map((txt, n) => ({ cid: c.id, n, txt, ntext: " " + NORM(txt) + " " }));
  for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from("ajf_circ_chunk").insert(rows.slice(i, i + 200)); if (error) throw new Error(error.message); }
  return rows.length;
}
const SYS_SUM = "أنت مساعد لموظفي الخدمات الأرضية في مطار سعودي. تلخّص التعاميم التشغيلية بالعربي الفصيح المبسط. لا تخترع معلومة غير موجودة في النص.";
const SYS_ASK = `أنت مساعد عمليات خبير لموظفي SGS (الخدمات الأرضية السعودية) في مطار الجوف AJF: كاونتر، بوابة، تحكم بالحمولة، مشرفين.
عندك أقرب الأجزاء لسؤال الموظف من كل التعاميم والأدلة المرفوعة للمحطة (النظام بحث فيها كلها بالمعنى). اقرأها كاملة وافهمها مثل خبير، ثم جاوب سؤال الموظف بذكاء:
- افهم وضع الراكب من السؤال: الجنسية، المسار ومحطات الترانزيت (مثلاً: الجوف → القصيم → أبوظبي)، شركة الطيران، نوع الحجز، أي مشكلة.
- طبّق التعاميم على حالته حتى لو التعميم ما ذكر جنسيته أو حالته بالحرف: إذا التعميم عن الترانزيت في أبوظبي والراكب مواصل عبر أبوظبي فهو ينطبق عليه.
- اربط الأسماء بالرموز: أبوظبي=AUH، الجوف=AJF، القصيم=ELQ، الرياض=RUH، جدة=JED، دبي=DXB، أمريكا=USA... والعربي بالإنجليزي.
شكل الجواب (عربي مبسط، مختصر وعملي):
1) **الخلاصة** في سطر: يُقبل / يُقبل بشروط / لا يُقبل / الإجراء المطلوب.
2) **المطلوب من الراكب** • نقاط.
3) **تحقق منه أنت** • نقاط (وثائق، أنظمة، مراسلة محطة...).
جاوب من التعاميم بكل التفاصيل اللي تخص الحالة (أعمار، شروط، نماذج، رسوم، إجراءات) مثل ما هي مكتوبة، ولا تختصر أو تعمم إذا التعميم فيه تفصيل.
التوثيق: بعد كل معلومة من تعميم اكتب مصدرها هكذا: [رقم التعميم، «جملة قصيرة منسوخة كما هي من نص التعميم المرفق»] مثل [2، «Unaccompanied minors are not accepted»].
- انسخ الجملة من النص نفسه بلغتها الأصلية (إنجليزي إذا الأصل إنجليزي) بدون ترجمة ولا إعادة صياغة، ومن الموضع اللي فيه المعلومة — مو من عنوان أو فهرس. لا تكتب رقم صفحة (النظام يحددها تلقائياً).
- إذا ما قدرت تنسخ جملة اكتب الرقم فقط مثل [2] — ولا تحذف أي معلومة من التعميم بسبب التوثيق أبداً.
لا تستخدم خطوط فاصلة (--- أو ***) ولا مقدمات مثل "إليك الإجراءات"؛ ابدأ بالخلاصة مباشرة، واذكر فقط اللي يخص حالة الموظف.
- لا تخلط سياسة شركة طيران بشركة ثانية، ولا تخترع أرقام (أعمار، أوزان، مدد) غير مكتوبة في التعاميم.
إذا يحتاج الجواب معلومة مو موجودة في التعاميم (مثل تأشيرة دخول دولة لجنسية معينة)، اذكر ما تعرفه بإيجاز تحت عنوان **خارج التعاميم (تأكد من TIMATIC)** ولا تنسبه لتعميم.
هذي محادثة متصلة: إذا رسالة الموظف توضيح أو تصحيح أو تكملة لسؤال سابق، اربطها بما قبلها وجاوب السؤال الأصلي بعد التوضيح، ولا تبدأ موضوع جديد ولا تكرر جواب سابق بدون داعي. إذا ما فهمت قصده اسأله سؤال توضيحي واحد قصير.
لا تقل "ما لقيت" إذا فيه تعميم ينطبق ولو جزئياً. وإذا فعلاً ما فيه أي تعميم له علاقة قل ذلك بسطر واحد ثم أعط التوجيه العام المفيد تحت "خارج التعاميم".`;


// ---------- التحقق من المصادر: كل [رقم، «نص»] لازم النص يكون موجود فعلاً في التعميم — ونحدد صفحته الحقيقية ----------
function pagesOf(full: string) {
  const a = String(full || "").split(/\[صفحة (\d+)\]/); const P: { p: number; n: string; r: string }[] = [];
  if (a[0].trim()) P.push({ p: 0, n: " " + NORM(a[0]) + " ", r: a[0] });
  for (let i = 1; i < a.length; i += 2) P.push({ p: +a[i], n: " " + NORM(a[i + 1] || "") + " ", r: a[i + 1] || "" });
  return P;
}
function locate(P: { p: number; n: string }[], quote: string): { p: number; ok: boolean } | null {
  const q = NORM(quote); if (q.length < 8) return null;
  for (const x of P) if (x.n.includes(q)) return { p: x.p, ok: true };
  for (let i = 0; i + 1 < P.length; i++) if ((P[i].n + P[i + 1].n).replace(/\s+/g, " ").includes(q)) return { p: P[i].p, ok: true };
  // تقريبي: أغلب كلمات النص متتالية في نفس الصفحة (اختلاف بسيط في القراءة من PDF)
  const w = q.split(" ").filter((x) => x.length > 1); if (w.length < 4) return null;
  const grams: string[] = []; for (let i = 0; i + 3 <= w.length; i++) grams.push(w.slice(i, i + 3).join(" "));
  let best = 0, bp = 0;
  for (const x of P) { let h = 0; for (const g of grams) if (x.n.includes(g)) h++; const r = h / grams.length; if (r > best) { best = r; bp = x.p; } }
  return best >= 0.6 ? { p: bp, ok: true } : null;
}
// المساعد غيّر الصياغة: نلقى أقرب مقطع فعلي في الملف (أغلب كلمات النص في نفس المكان) ونرجع نصه الأصلي كما هو
const QSTOP = new Set("the a an of to for and or in on at by is are be with from as that this it shall must will not any".split(" "));
function nearest(P: { p: number; r: string }[], quote: string): { p: number; t: string } | null {
  const QS = new Set(NORM(quote).split(" ").filter((w) => w.length > 2 && !QSTOP.has(w)).map(SK)); if (QS.size < 4) return null;
  const L = NORM(quote).split(" ").length + 6; let best = 0, bp = -1, bi = 0;
  P.forEach((x, pi) => {
    const tok = String(x.r).split(/\s+/).filter(Boolean), nw = tok.map((t) => NORM(t).split(" ").filter(Boolean).map(SK));
    const cnt = new Map<string, number>(); let hits = 0;
    const add = (i: number, d: number) => { for (const w of nw[i]) if (QS.has(w)) { const c = (cnt.get(w) || 0) + d; cnt.set(w, c); if (d > 0 && c === 1) hits++; if (d < 0 && c === 0) hits--; } };
    for (let i = 0; i < tok.length; i++) { add(i, 1); if (i >= L) add(i - L, -1); if (hits > best) { best = hits; bp = pi; bi = Math.max(0, i - L + 1); } }
  });
  if (bp < 0 || best < 5 || best / QS.size < 0.45) return null;
  const tok = String(P[bp].r).split(/\s+/).filter(Boolean);
  // نقص الأطراف اللي ما فيها كلمات من النص
  let a = bi, b = Math.min(tok.length, bi + L) - 1; const has = (i: number) => NORM(tok[i]).split(" ").some((w) => QS.has(SK(w)));
  while (a < b && !has(a)) a++; while (b > a && !has(b)) b--;
  return { p: P[bp].p, t: tok.slice(a, b + 1).join(" ").replace(/[«»\[\]]/g, "").slice(0, 400) };
}
// "4، ص 251، «نص»، 7" → [{n:4,q:"نص"},{n:7}]
function citeUnits(inner: string) {
  const Q: string[] = []; const t = inner.replace(/«([^»]*)»/g, (_m, q) => "\u0001" + (Q.push(q.trim()) - 1) + "\u0001");
  const U: { n: number; q: string }[] = [];
  for (let tok of t.split(/[،,]/)) { tok = tok.trim(); let m;
    if ((m = tok.match(/^\u0001(\d+)\u0001$/))) { if (U.length) U[U.length - 1].q = Q[+m[1]]; }
    else if (/^\d{1,2}$/.test(tok)) U.push({ n: +tok, q: "" });
  }
  return U;
}
// أقرب صفحات للمعلومة (كلمات النص المنسوخ + جملة الجواب) — للتصحيح التلقائي
function topPages(P: { p: number; r: string; n: string }[], words: string, k = 3) {
  const QS = new Set(NORM(words).split(" ").filter((w) => w.length > 2 && !QSTOP.has(w)).map(SK)); if (QS.size < 3) return [];
  return P.map((x) => { const st = new Set(x.n.split(" ").filter(Boolean).map(SK)); let h = 0; QS.forEach((w) => { if (st.has(w)) h++; }); return { x, h }; })
    .filter((o) => o.h >= Math.min(4, QS.size)).sort((a, b) => b.h - a.h).slice(0, k).map((o) => o.x);
}
// المساعد نسخ نص مو موجود حرفياً: نعطيه صفحات الدليل الأقرب ونطلب منه ينسخ الجملة الفعلية منها، ثم نتحقق منها مرة ثانية
async function repairCites(items: { key: number; claim: string; quote: string; pages: { p: number; r: string }[] }[]) {
  if (!items.length) return new Map<number, string>();
  const body = items.map((it) => `### بند ${it.key}\nالمعلومة في الجواب: ${it.claim}\n${it.quote ? "النص اللي كتبه المساعد (غير موجود حرفياً): " + it.quote + "\n" : ""}` +
    it.pages.map((x) => `--- [صفحة ${x.p}] ---\n${String(x.r).slice(0, 5000)}`).join("\n")).join("\n\n");
  const j = JSON.parse(await gem(`${body}\n\n=====\nلكل بند: ابحث في صفحات الدليل المرفقة تحته عن الجملة اللي تثبت المعلومة نفسها، وانسخها حرف بحرف كما هي في الصفحة (6 إلى 25 كلمة، بنفس لغتها، بدون تعديل ولا ترجمة ولا اختصار). إذا ما فيه جملة تثبت المعلومة فعلاً حط "". أرجع JSON بالشكل {"r":[{"k":رقم البند,"q":"النص المنسوخ"}]}`,
    "تنسخ نصوص حرفية من مستند لإثبات معلومات. لا تخترع ولا تعيد صياغة.", true));
  const m = new Map<number, string>(); for (const x of (Array.isArray(j.r) ? j.r : [])) if (x && typeof x.q === "string" && x.q.trim()) m.set(+x.k, x.q.trim());
  return m;
}
// التحقق يكون على نفس النص اللي قرأه المساعد (مو الدليل كامل 2MB) — أسرع بكثير وما يثقل الخادم
async function verifyCites(_sb: any, ans: string, rows: Record<string, any>[], t0 = Date.now(), given = new Map<string, string>()) {
  const re = /\[([^\[\]]{1,700}?)\]/g;
  const full = new Map<string, ReturnType<typeof pagesOf>>();
  for (const r of rows) if (given.has(r.id)) full.set(r.id, pagesOf(given.get(r.id)!));
  const idx = new Map(rows.map((r, i) => [r.id, i + 1]));
  // المرحلة 1: نحدد كل مصدر — بالتعميم المذكور، أو بتعميم ثاني من المذكورين لو المساعد غلط بالرقم
  type U = { n: number; q: string; s: string; p?: number; ap?: boolean; bad?: boolean };
  const cites: { m: string; U: U[] }[] = []; let fix: { key: number; u: U; claim: string; pages: { p: number; r: string }[] }[] = [];
  const findAny = (q: string, prefer: string) => { for (const [id, P] of full) { if (id === prefer) continue; const L = locate(P, q); if (L && L.ok) return { n: idx.get(id)!, p: L.p }; } return null; };
  for (const m of ans.matchAll(re)) {
    const inner = m[1]; if (!/^\s*\d{1,2}\s*([،,]|$)/.test(inner) && !/^\s*\d{1,2}\s*$/.test(inner)) continue;
    const claim = ans.slice(Math.max(0, (m.index || 0) - 260), m.index || 0).split(/\n|\]/).filter((x) => x.trim()).pop() || "";
    const L2: U[] = [];
    for (const u0 of citeUnits(inner)) {
      const r = rows[u0.n - 1]; if (!r) continue; const u: U = { n: u0.n, q: u0.q, s: "" };
      const P = full.get(r.id);
      if (!u.q) { u.bad = true; L2.push(u); if (P) { const pg = topPages(P, claim); if (pg.length) fix.push({ key: fix.length + 1, u, claim, pages: pg }); } continue; } const L = P ? locate(P, u.q) : null;
      if (L && L.ok) { u.p = L.p; L2.push(u); continue; }
      const o = findAny(u.q, r.id); if (o) { u.n = o.n; u.p = o.p; L2.push(u); continue; }
      const N = P ? nearest(P, u.q) : null;
      if (N) { u.p = N.p; u.q = N.t; u.ap = true; L2.push(u); continue; }
      u.bad = true; L2.push(u);
      if (P) { const pg = topPages(P, u.q + " " + claim); if (pg.length) fix.push({ key: fix.length + 1, u, claim, pages: pg }); }
    }
    cites.push({ m: m[0], U: L2 });
  }
  // المرحلة 2: اللي ما انلقى — نطلب النص الفعلي من صفحاته ونتحقق منه
  fix = fix.slice(0, 6);
  // التصحيح طلب إضافي للمساعد: نسويه بس إذا الوقت يسمح (عشان ما يتأخر الجواب أو يطلع "مشغول")
  if (fix.length && Date.now() - t0 < 25000) {
    try {
      const R = await repairCites(fix.map((f) => ({ key: f.key, claim: f.claim, quote: f.u.q, pages: f.pages })));
      for (const f of fix) {
        const q = R.get(f.key); if (!q) continue; const P = full.get(rows[f.u.n - 1].id)!; const L = locate(P, q);
        if (L && L.ok) { f.u.q = q; f.u.p = L.p; f.u.bad = false; f.u.ap = true; }
      }
    } catch (_) { /* لو فشل التصحيح تبقى غير مؤكدة */ }
  }
  let ok = 0, bad = 0, ci = 0;
  const outTxt = ans.replace(re, (m, inner) => {
    if (!/^\s*\d{1,2}\s*([،,]|$)/.test(inner) && !/^\s*\d{1,2}\s*$/.test(inner)) return m;
    const c = cites[ci++]; if (!c || c.m !== m || !c.U.length) return m;
    return c.U.map((u) => { if (u.bad) { bad++; return u.q ? `[${u.n}، ؟، «${u.q}»]` : `[${u.n}، ؟]`; } ok++;
      return `[${u.n}، ${u.p ? "ص " + u.p + "، " : ""}${u.ap ? "≈، " : ""}«${u.q}»]`; }).join("");
  });
  return { text: outTxt, ok, bad };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ s: "bad" }, 405);
  let a: Record<string, string> = {};
  try { a = await req.json(); } catch { return out({ s: "bad" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  // التجهيز التلقائي كل دقيقة (من Supabase نفسه بمفتاح داخلي): يقسّم الملفات اللي ما تقسمت، ويحسب بصمة المعنى للأجزاء الجديدة
  if (a.action === "embed_tick") {
    const { data: K } = await sb.from("ajf_sec").select("v").eq("k", "cron_k").single();
    if (!K || !a.key || a.key !== K.v || !GK) return out({ s: "denied" });
    const t0 = Date.now(); let done = 0, chunked = 0;
    try {
      const { data: meta } = await sb.rpc("ajf_circ_meta");
      for (const c of ((meta || []) as any[]).filter((r) => !r.chunks && r.n > 0).slice(0, 2)) {
        const { data: f } = await sb.from("ajf_circ").select("id,body,ftext").eq("id", c.id).single(); if (f) { await chunkify(sb, f); chunked++; }
      }
      const T = new Map(((meta || []) as any[]).map((r) => [r.id, r.title]));
      // الحد المجاني: ~30 ألف توكن بالدقيقة — دفعة وحدة صغيرة كل دقيقة
      {
        const { data: P } = await sb.from("ajf_circ_chunk").select("cid,n,txt").is("emb", null).limit(15);
        if (P && P.length) {
        const V = await embed(P.map((x: any) => `title: ${T.get(x.cid) || ""} | text: ${String(x.txt).slice(0, 4000)}`), "RETRIEVAL_DOCUMENT");
        for (let i = 0; i < P.length; i++) await sb.from("ajf_circ_chunk").update({ emb: vstr(V[i]) }).eq("cid", P[i].cid).eq("n", P[i].n);
        done += P.length; }
      }
    } catch (e) { return out({ s: e instanceof Busy ? "busy" : "err", done, chunked, e: String(e).slice(0, 200) }); }
    return out({ s: "ok", done, chunked });
  }
  const { data: me } = await sb.rpc("ajf_me", { p_token: a.token || "", p_device: a.device || "" });
  if (!me || !me.emp || me.s === "out") return out({ s: "out" });
  const admin = !!me.admin, B = sb.storage.from("circ");
  const okPath = (p: string) => /^[a-z0-9_-]{4,40}\.pdf$/.test(p || "");

  if (a.action === "get") {
    if (!okPath(a.path)) return out({ s: "bad" });
    const { data, error } = await B.createSignedUrl(a.path, 600, a.dl ? { download: a.dl } : undefined);
    return error ? out({ s: "err", e: error.message }) : out({ s: "ok", url: data.signedUrl });
  }
  if (a.action === "ask") {
    const runAsk = async (onD?: (d: string) => void): Promise<any> => {
    if (!GK) return ({ s: "nokey" });
    const q = String(a.q || "").slice(0, 600).trim();
    if (q.length < 2) return ({ s: "bad" });
    const t0 = Date.now(); const tm: Record<string, number> = {};
    try {
      const H = (Array.isArray(a.h) ? a.h : []).slice(-6).map((t: any) => ({ q: String(t.q || "").slice(0, 600), a: String(t.a || "").slice(0, 2500) }));
      // 1) طلب واحد سريع: السؤال كامل (لو متابعة) + صيغته بالإنجليزي بمصطلحات الأدلة + كلمات بحث
      let full = q, en = "", kw: string[] = [];
      try {
        const j = JSON.parse(await gem(`${H.length ? "المحادثة السابقة:\n" + H.map((t, i) => `(${i + 1}) الموظف: ${t.q}\nالمساعد: ${t.a.slice(0, 600)}`).join("\n\n") + "\n\n" : ""}رسالة موظف الخدمات الأرضية الآن: ${q}\n\nأرجع JSON بالشكل {"full":"...","en":"...","kw":[...]}:\n- full: السؤال كامل ومستقل بالعربي (إذا الرسالة تكملة أو توضيح لما قبلها اجمع فيه كل التفاصيل المهمة: الراكب، العمر، الجنسية، المسار، شركة الطيران...؛ وإذا موضوع جديد اكتبه كما هو).\n- en: نفس السؤال بالإنجليزي بالمصطلحات المستخدمة في أدلة الخدمات الأرضية وشركات الطيران (مثل unaccompanied minor, young passenger, UMNR, NOTOC, dangerous goods, INAD, deportee, WCHR, load sheet, check-in closure).\n- kw: 8 إلى 16 كلمة أو عبارة بحث قصيرة عربي وإنجليزي، مع اسم ورمز شركة الطيران إذا مذكورة.`, "تجهز سؤال للبحث في أدلة تشغيل طيران. JSON فقط.", true));
        full = String(j.full || q).slice(0, 800) || q; en = String(j.en || "").slice(0, 800); kw = Array.isArray(j.kw) ? j.kw.map(String) : [];
      } catch { /* نكمل بالسؤال كما هو */ }
      tm.prep = Date.now() - t0;
      const { data: meta } = await sb.rpc("ajf_circ_meta");
      const M = (meta || []) as Record<string, any>[];
      const byId = new Map(M.map((r) => [r.id, r]));
      // 2) البحث بالمعنى في كل التعاميم والأدلة + البحث بالكلمات (للأرقام والرموز مثل XY أو SV)
      const hits: { cid: string; n: number; txt: string; s: number }[] = [];
      try {
        const V = await embed([full, en || full], "RETRIEVAL_QUERY");
        const R = await Promise.all(V.map((v) => sb.rpc("ajf_chunk_match", { p_q: vstr(v), p_k: 24 })));
        R.forEach((r, qi) => ((r.data || []) as any[]).forEach((c, i) => hits.push({ cid: c.cid, n: c.n, txt: c.txt, s: i + qi * 0.5 })));
      } catch { /* لو البصمة ما جهزت أو مزحومة نعتمد على البحث بالكلمات */ }
      {
        kw = [...new Set([...kw, ...NORM(full).split(" ").filter((w) => w.length > 2)])].slice(0, 24);
        const groups = kw.map((k) => { const n = NORM(k); return [{ n, k: n.includes(" ") ? "" : SK(n) }]; }).filter((g) => g[0].n.length > 2);
        const { data: ch } = await sb.rpc("ajf_chunk_search", { p_groups: groups, p_limit: hits.length ? 12 : 30 });
        ((ch || []) as any[]).forEach((c, i) => hits.push({ cid: c.cid, n: c.n, txt: c.txt, s: (hits.length ? 6 : 0) + i * 1.5 }));
      }
      // 3) نرتب ونجمع: التعميم الصغير يروح كامل، والدليل الكبير أقرب أجزائه فقط — بحد أقصى ~70 ألف حرف عشان يكون سريع
      hits.sort((x, y) => x.s - y.s);
      const seen = new Set<string>(), texts = new Map<string, string>(), pick = new Map<string, string[]>(), order: string[] = []; let tot = 0;
      const smallIds: string[] = [];
      for (const h of hits) {
        const key = h.cid + ":" + h.n; if (seen.has(key)) continue; seen.add(key);
        const r = byId.get(h.cid); if (!r) continue;
        if (!order.includes(h.cid)) { if (order.length >= 6) continue; order.push(h.cid); }
        if (r.n <= 12000) { if (!smallIds.includes(h.cid)) { if (tot + r.n > 45000) continue; smallIds.push(h.cid); tot += r.n; } continue; }
        if (tot > 40000) continue; tot += h.txt.length; (pick.get(h.cid) || pick.set(h.cid, []).get(h.cid)!).push(h.txt);
      }
      if (smallIds.length) {
        const { data: st } = await sb.from("ajf_circ").select("id,body,ftext").in("id", smallIds);
        (st || []).forEach((r: any) => texts.set(r.id, (String(r.body || "") + "\n" + String(r.ftext || "")).slice(0, 12000)));
      }
      const rows = order.map((id) => byId.get(id)!).filter((r) => texts.has(r.id) || pick.has(r.id));
      if (!M.length) return ({ s: "ok", answer: "ما فيه تعاميم مرفوعة للحين.", src: [] });
      const docs = rows.length ? rows.map((r, i) => `[${i + 1}] العنوان: ${r.title}\nالتاريخ: ${r.cd || ""}\n` +
        (texts.has(r.id) ? `النص كامل:\n${texts.get(r.id)}` : `أقرب أجزاء الدليل للسؤال (من كامل صفحاته، و[صفحة N] تبين رقم الصفحة):\n${pick.get(r.id)!.join("\n…\n")}`)).join("\n\n-----\n\n")
        : "(ما فيه أي جزء من التعاميم له علاقة بالسؤال)";
      const given = new Map<string, string>(rows.map((r) => [r.id, texts.has(r.id) ? texts.get(r.id)! : pick.get(r.id)!.join("\n\n")]));
      tm.search = Date.now() - t0;
      const hist = H.map((t) => `الموظف: ${t.q}\nأنت: ${t.a}`).join("\n\n");
      const P_ASK = `أقرب ما في التعاميم والأدلة المرفوعة لسؤال الموظف (تم البحث في كل الملفات بالمعنى):\n\n${docs}\n\n=====\n${hist ? "المحادثة السابقة مع نفس الموظف (مرتبطة بسؤاله الحالي):\n" + hist + "\n\n=====\n" : ""}رسالة الموظف الآن: ${q}${full !== q ? "\n(المقصود بالكامل: " + full + ")" : ""}`;
      const ans = onD ? await gemStream(P_ASK, SYS_ASK, onD) : await gem(P_ASK, SYS_ASK, false, true);
      tm.answer = Date.now() - t0;
      let fin = ans, vs = { ok: 0, bad: 0 };
      try { const v = await verifyCites(sb, ans, rows, t0, given); fin = v.text; vs = { ok: v.ok, bad: v.bad }; } catch (_) { /* لو فشل التحقق نرجع الجواب كما هو */ }
      tm.total = Date.now() - t0;
      return ({ s: "ok", answer: fin, ver: vs, tm, src: rows.map((r) => ({ id: r.id, title: r.title, cd: r.cd, has_file: !!r.has_file, ai: r.ai })) });
    } catch (e) { return ({ s: "aierr", e: String(e).slice(0, 300) }); }
      };
    // stream: سطور JSON — {d:"..."} أثناء الكتابة، ثم النتيجة النهائية الموثّقة
    if (a.stream) {
      const enc = new TextEncoder();
      const st = new ReadableStream({ async start(c) {
        const send = (o: unknown) => { try { c.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch (_) { /* أغلق الاتصال */ } };
        try { send(await runAsk((d) => send({ d }))); } catch (e) { send({ s: "aierr", e: String(e).slice(0, 300) }); }
        try { c.close(); } catch (_) { /* */ }
      } });
      return new Response(st, { headers: { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
    }
    return out(await runAsk());
  }
  if (!admin) return out({ s: "denied" });
  // ---------- تحدي التشغيل: توليد أسئلة من التعاميم والأدلة (تنحفظ بانتظار اعتماد المشرف) ----------
  if (a.action === "quizgen") {
    if (!GK) return out({ s: "nokey" });
    try {
      const want = Math.max(3, Math.min(15, Number(a.n) || 10));
      const { data: meta } = await sb.rpc("ajf_circ_meta");
      const M = ((meta || []) as Record<string, any>[]).filter((r) => r.n > 300);
      if (!M.length) return out({ s: "nosrc" });
      // المجال: كاونتر / بوابة / ساحة / لود كنترول. "mix" = واحد عشوائي كل مرة
      const TOP: Record<string, [string, string, string[]]> = {
        chk: ["الكاونتر وإنهاء إجراءات الركاب", "موظف الكاونتر (إنهاء إجراءات السفر)", ["check-in", "checkin", "counter", "acceptance", "passport", "visa", "iqama", "travel document", "baggage allowance", "excess baggage", "free baggage", "infant", "unaccompanied", "umnr", "wchr", "wchs", "wchc", "prm", "pregnan", "medif", "stretcher", "seat", "exit row", "ticket", "pnr", "dcs", "bag tag", "cabin baggage", "hand baggage", "dangerous goods", "lithium", "power bank", "inad", "deportee", "avih", "petc", "pet", "closing time", "check-in closure", "كاونتر", "اجراءات السفر", "قبول الركاب", "جواز", "تاشيره", "اقامه", "امتعه", "عفش", "وزن زائد", "رضيع", "كرسي متحرك", "حامل", "تذكره", "حجز", "مقعد"]],
        gate: ["بوابة التصعيد", "موظف بوابة التصعيد (Boarding Gate)", ["boarding", "gate", "boarding pass", "gate closure", "final call", "offload", "off-load", "no-show", "no show", "headcount", "head count", "pax count", "priority boarding", "standby", "upgrade", "denied boarding", "overbook", "misconnect", "deplan", "delay", "cancellation", "compensation", "ambulift", "bus", "jet bridge", "cabin baggage", "gate baggage", "boarding sequence", "unruly", "disruptive", "بوابه", "تصعيد", "صعود", "بطاقه صعود", "اغلاق البوابه", "انزال", "تاخير", "الغاء", "تعويض"]],
        ramp: ["الساحة (Ramp)", "موظف الساحة والتحميل (Ramp)", ["ramp", "apron", "loading", "unloading", "offloading", "hold", "bulk", "uld", "container", "baggage loading", "belt loader", "high loader", "pushback", "push back", "tow", "chock", "cone", "gpu", "ground power", "fod", "marshal", "wing walker", "refuel", "fuelling", "aircraft damage", "turnaround", "turn around", "lir", "loading instruction", "notoc", "dangerous goods", "avih", "hum", "lightning", "wind", "safety", "ppe", "engine", "door", "cargo door", "ساحه", "تحميل", "تنزيل", "عنبر", "سلامه", "دفع", "معدات", "اضرار"]],
        lc: ["اللود كنترول (Load Control)", "موظف التحكم بالحمولة (Load Control)", ["load sheet", "loadsheet", "load control", "weight and balance", "balance", "trim", "index", "mzfw", "mtow", "mlw", "zfw", "lir", "loading instruction", "notoc", "lmc", "last minute change", "standard weight", "pax weight", "crew weight", "fuel", "cpm", "ldm", "mvt", "dry operating", "doi", "dow", "captain", "underload", "cg", "centre of gravity", "center of gravity", "لود شيت", "لودشيت", "الحموله", "التوازن", "وزن", "الطاقم"]],
      };
      const tk = TOP[a.topic] ? a.topic : Object.keys(TOP)[Math.floor(Math.random() * 4)];
      const [tName, tRole, kws] = TOP[tk];
      let c: Record<string, any> | null = a.src ? M.find((r) => r.id === a.src) || null : null;
      let txt = "";
      if (!c) {
        // نجيب أجزاء الأدلة اللي تتكلم عن هذا المجال فعلاً، ونختار منها عشوائياً حتى تتنوع الأسئلة
        const groups = kws.map((k) => { const n = NORM(k); return [{ n, k: n.includes(" ") ? "" : SK(n) }]; }).filter((g) => g[0].n.length > 2);
        const { data: ch } = await sb.rpc("ajf_chunk_search", { p_groups: groups, p_limit: 60 });
        const L = ((ch || []) as any[]).filter((x) => x.hit >= 3);
        if (L.length) {
          const top = L.slice(0, 30).sort(() => Math.random() - 0.5);
          const first = top[0], same = top.filter((x) => x.cid === first.cid).slice(0, 3);
          c = M.find((r) => r.id === first.cid) || { id: first.cid, title: "" };
          txt = same.map((x) => x.txt).join("\n\n…\n\n");
        }
      }
      if (!c) { const w = M.map((r) => Math.sqrt(r.n)), t = w.reduce((x, y) => x + y, 0); let p = Math.random() * t; c = M[M.length - 1]; for (let i = 0; i < M.length; i++) { p -= w[i]; if (p <= 0) { c = M[i]; break; } } }
      if (!txt && c.chunks > 0) {
        const k = Math.floor(Math.random() * c.chunks);
        const { data: ch } = await sb.from("ajf_circ_chunk").select("n,txt").eq("cid", c.id).in("n", [k, k + 1, k + 2]).order("n");
        txt = (ch || []).map((x: any) => x.txt).join("\n\n");
      }
      if (txt.length < 400) {
        const { data: r } = await sb.from("ajf_circ").select("body,ftext").eq("id", c.id).single();
        const all = (String(r?.body || "") + "\n\n" + String(r?.ftext || ""));
        const st = all.length > 14000 ? Math.floor(Math.random() * (all.length - 12000)) : 0;
        txt = all.slice(st, st + 12000);
      }
      const { data: old } = await sb.from("ajf_quiz_q").select("q").order("id", { ascending: false }).limit(150);
      const avoid = (old || []).map((x: any) => "- " + String(x.q).slice(0, 140)).join("\n");
      const SYS_QZ = `أنت مدرّب خبير في الخدمات الأرضية (SGS) والخطوط السعودية (Saudia). تكتب أسئلة اختيار من متعدد لتحدي يومي لموظفي محطة مطار الجوف AJF.
واقع محطة الجوف: مطار صغير، رحلات داخلية أغلبها (السعودية، طيران ناس، طيران أديل) إلى الرياض وجدة والدمام وغيرها، وبعض الرحلات الدولية لمصر (Air Cairo، Nile Air). طائرات ضيقة البدن (عائلة A320/A321). ما فيه صالات ترانزيت ولا تحويل أمتعة بين رحلات ولا طائرات عريضة ولا مبنى شحن كبير.
الموظفين: كاونتر إنهاء الإجراءات، بوابة التصعيد، الساحة (Ramp)، اللود كنترول، ومشرفين.
دقتك ووضوح السؤال وفائدته للموظف أهم من عدد الأسئلة.`;
      const prompt = `المجال المطلوب: ${tName} — الأسئلة موجهة لـ ${tRole} في محطة الجوف.
المصدر: ${c.title || ""}${c.cd ? " (" + c.cd + ")" : ""}\nالنص:\n${txt}\n\n=====\nاكتب حتى ${want} أسئلة من هذا النص فقط، بهذه الشروط:
- كل سؤال عن شي يسويه أو يقرره ${tRole} بيده في شغله اليومي في الجوف. اسأل نفسك: "هل موظف الجوف بيواجه هذا الموقف فعلاً؟" إذا لا، لا تكتب السؤال.
- ممنوع: أي شي خاص بمحطات كبيرة أو دولية (الترانزيت والتحويل، الصالات، الطائرات العريضة، مستودعات الشحن، مكاتب التذاكر، مراكز التحكم، الإدارة)، وتعاريف المصطلحات، وأرقام النماذج والمراجع، وتواريخ الإصدار، وأسماء الإدارات والأشخاص، والمسؤوليات الإدارية.
- كل سؤال مبني على معلومة مكتوبة صراحة في النص، والجواب الصحيح مؤكد منه 100%. لا تخترع ولا تعتمد على معلوماتك العامة.
- اكتب السؤال كموقف تشغيلي واضح وقصير بلغة الشغل اليومية، مثل: "راكب على رحلة الرياض معه ... وش تسوي؟" أو "قبل إغلاق البوابة بـ ... وش الإجراء الصحيح؟". سطر أو سطرين، بدون غموض، والموظف يفهمه من أول قراءة.
- عربي مبسط، والمصطلح الفني بالإنجليزي بين قوسين إذا لزم (مثل WCHR، Load Sheet).
- 4 خيارات قصيرة ومتقاربة الطول، واحد فقط صحيح، والخاطئة معقولة لكنها خاطئة بوضوح حسب النص. ممنوع "كل ما سبق" و"لا شيء مما سبق".
- d: 1 سهل، 2 متوسط، 3 صعب — نوّع بينها.
- why: سطر أو سطرين يشرح ليش الجواب صحيح حسب النص.
- page: رقم الصفحة إذا ظاهر في النص مثل [صفحة 214]، وإلا "".
- gl: كل كلمة أو عبارة أو اختصار بالإنجليزي ظاهر في q أو o أو why، مع شرح عربي مختصر (من 2 إلى 10 كلمات) يفهمه موظف ما يعرف إنجليزي. مثل {"t":"CUTE","ar":"نظام أجهزة الكاونتر المشتركة بين شركات الطيران"}. إذا ما فيه إنجليزي أرجع [].
- rel: من 1 إلى 5، كم السؤال مفيد فعلاً لـ ${tRole} في الجوف (5 = موقف يتكرر ولازم يعرفه). كن صارم.
- لا تكرر ولا تعيد صياغة هذه الأسئلة الموجودة:\n${avoid || "(ما فيه)"}
- إذا النص ما فيه معلومات تنفع هذا المجال، أرجع قائمة فاضية. أسئلة أقل وقوية أفضل من كثيرة وضعيفة.
أرجع JSON فقط: {"qs":[{"q":"...","o":["...","...","...","..."],"a":0,"d":1,"why":"...","page":"","rel":5,"gl":[{"t":"...","ar":"..."}]}]}`;
      const j = JSON.parse(await gem(prompt, SYS_QZ, true, true));
      const seen = new Set((old || []).map((x: any) => NORM(x.q)));
      const rows: Record<string, unknown>[] = [];
      for (const x of (Array.isArray(j.qs) ? j.qs : []) as any[]) {
        const q = String(x.q || "").trim(), o = (Array.isArray(x.o) ? x.o : []).map((t: unknown) => String(t || "").trim()), ai = Number(x.a);
        if (Number(x.rel) < 4 || q.length < 8 || o.length !== 4 || o.some((t: string) => !t) || new Set(o).size !== 4 || !(ai >= 0 && ai <= 3) || seen.has(NORM(q))) continue;
        seen.add(NORM(q));
        // نخلط الخيارات حتى الجواب الصحيح ما يكون دايم الأول
        const idx = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        rows.push({ q: q.slice(0, 600), o: idx.map((i) => o[i].slice(0, 200)), a: idx.indexOf(ai), d: [1, 2, 3].includes(Number(x.d)) ? Number(x.d) : 2,
          why: String(x.why || "").slice(0, 800), page: String(x.page || "").slice(0, 20), gl: glClean(x.gl), src_id: c.id, src_title: String(c.title || "").slice(0, 200), st: "pending", by_ai: true });
      }
      if (rows.length) { const { error } = await sb.from("ajf_quiz_q").insert(rows); if (error) return out({ s: "err", e: error.message }); }
      return out({ s: "ok", n: rows.length, src: c.title, topic: tName });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  // ---------- 📖 شرح الكلمات الإنجليزية بالعربي للأسئلة القديمة (20 سؤال كل مرة، والجوال يكرر لين تخلص) ----------
  if (a.action === "qzgl") {
    if (!GK) return out({ s: "nokey" });
    try {
      const { data: L, error } = await sb.from("ajf_quiz_q").select("id,q,o,why").is("gl", null).neq("st", "no").order("id").limit(20);
      if (error) return out({ s: "err", e: error.message });
      if (L && L.length) {
        const list = (L as any[]).map((x) => `#${x.id}\nس: ${x.q}\nخيارات: ${(x.o || []).join(" | ")}\nشرح: ${x.why || ""}`).join("\n\n");
        const j = JSON.parse(await gem(`لكل سؤال من هذه الأسئلة، طلّع كل كلمة أو عبارة أو اختصار بالإنجليزي ظاهر فيه (في السؤال أو الخيارات أو الشرح)، واكتب لها شرح عربي مختصر من 2 إلى 10 كلمات يفهمه موظف ما يعرف إنجليزي، بمعناها في شغل المطار والخدمات الأرضية.
مثال: {"t":"CUTE","ar":"نظام أجهزة الكاونتر المشتركة بين شركات الطيران"}، {"t":"Backup procedure","ar":"الإجراء البديل وقت تعطل النظام"}.
السؤال اللي ما فيه إنجليزي: gl = [].
\n${list}\n\nأرجع JSON فقط: {"items":[{"id":123,"gl":[{"t":"...","ar":"..."}]}]}`, "أنت خبير في الخدمات الأرضية بالمطارات، تشرح المصطلحات الإنجليزية بالعربي بدقة واختصار.", true));
        const got = new Map<number, unknown>(((j.items || []) as any[]).map((x) => [Number(x.id), x.gl]));
        for (const x of L as any[]) {
          if (!got.has(x.id)) continue;
          await sb.from("ajf_quiz_q").update({ gl: glClean(got.get(x.id)) }).eq("id", x.id);
        }
      }
      const { count } = await sb.from("ajf_quiz_q").select("id", { count: "exact", head: true }).is("gl", null).neq("st", "no");
      return out({ s: "ok", done: (L || []).length, left: count || 0 });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  if (a.action === "upload") {
    if (!okPath(a.path)) return out({ s: "bad" });
    const { data, error } = await B.createSignedUploadUrl(a.path, { upsert: true });
    return error ? out({ s: "err", e: error.message }) : out({ s: "ok", url: data.signedUrl, token: data.token });
  }
  if (a.action === "del") {
    if (!okPath(a.path)) return out({ s: "bad" });
    const { error } = await B.remove([a.path]);
    return error ? out({ s: "err", e: error.message }) : out({ s: "ok" });
  }
  if (a.action === "sum") {
    if (!GK) return out({ s: "nokey" });
    const { data: c } = await sb.from("ajf_circ").select("id,title,tags,body,ftext").eq("id", a.id || "").single();
    if (!c) return out({ s: "bad" });
    try {
      const txt = (c.body + "\n" + c.ftext).slice(0, 60000);
      const j = JSON.parse(await gem(`عنوان الملف: ${c.title}\nنص التعميم:\n${txt}\n\nأرجع JSON بالشكل:\n{"t":"عنوان عربي قصير وواضح للتعميم","s":"ملخص عربي من 3 إلى 6 نقاط تبدأ كل نقطة بـ • : وش المطلوب من الموظف، على مين ينطبق، من متى، أي شروط أو استثناءات أو أرقام مهمة","k":"15 إلى 30 كلمة بحث عربية وإنجليزية مفصولة بمسافة (مرادفات، أسماء دول ومطارات وشركات، مصطلحات)"}`, SYS_SUM, true));
      const ai = JSON.stringify({ t: String(j.t || "").slice(0, 200), s: String(j.s || "").slice(0, 3000), k: String(j.k || "").slice(0, 1000) });
      const n = NORM([c.title, c.tags, c.body, c.ftext, j.t, j.s, j.k].join(" "));
      const k = " " + [...new Set(n.split(" "))].map(SK).join(" ") + " ";
      await sb.from("ajf_circ").update({ ai, ntext: n, ktext: k }).eq("id", c.id);
      const nc = await chunkify(sb, c);
      return out({ s: "ok", ai, chunks: nc });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  if (a.action === "chunk") {
    const { data: c } = await sb.from("ajf_circ").select("id,body,ftext").eq("id", a.id || "").single();
    if (!c) return out({ s: "bad" });
    try { return out({ s: "ok", chunks: await chunkify(sb, c) }); } catch (e) { return out({ s: "err", e: String(e).slice(0, 300) }); }
  }
  if (a.action === "usage") {
    // مجموع أحجام الملفات المرفوعة (للتنبيه قبل الوصول لحد 1GB)
    const { data } = await sb.from("ajf_circ").select("file_size");
    const used = (data || []).reduce((t: number, r: { file_size: number | null }) => t + (r.file_size || 0), 0);
    const { data: es } = await sb.rpc("ajf_emb_stat").then((x: any) => x, () => ({ data: null }));
    return out({ s: "ok", used, n: (data || []).length, emb: es || null });
  }
  return out({ s: "bad" });
});
