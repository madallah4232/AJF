// ajf-dc — المساعد الذكي لأكواد التأخير (كل شركة على دليلها فقط) + مساعد فحص وثائق الراكب (kind:"tim")
// التحديث: Edge Functions ← ajf-dc ← Code ← امسح الكود والصق هذا الملف كامل ← Deploy
// الإعداد: Edge Functions ← Deploy a new function ← الاسم ajf-dc ← الصق هذا الملف ← Deploy
//          ثم من إعدادات الدالة: أطفئ "Verify JWT" (التطبيق يتحقق بالرقم الوظيفي والجلسة)
// يستخدم نفس مفتاح Gemini المجاني الموجود في Secrets باسم GEMINI_KEY
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (b: unknown, st = 200) => new Response(JSON.stringify(b), { status: st, headers: { ...cors, "Content-Type": "application/json" } });

const GK = Deno.env.get("GEMINI_KEY") || "";
const GM = (Deno.env.get("GEMINI_MODEL_ASK") || "gemini-3.5-flash,gemini-flash-lite-latest").split(",");
async function gem(text: string, sys: string): Promise<string> {
  let last = "";
  for (const m of GM) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.trim()}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(50000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.1 } }),
    });
    if (r.ok) { const j = await r.json(); return (j.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || "").join(""); }
    last = r.status + " " + (await r.text()).slice(0, 200);
  }
  throw new Error("gemini " + last);
}

const SYS = (air: string) => `أنت خبير أكواد تأخير الرحلات لموظفي SGS (الخدمات الأرضية) في مطار الجوف AJF.
عندك دليل أكواد التأخير الرسمي لشركة ${air} فقط. استخدم هذا الدليل وحده ولا تخلطه بأكواد شركة ثانية ولا بأكواد IATA العامة إذا الدليل يختلف.
الموظف يوصف وش صار للرحلة بكلامه (عامي غالباً). افهم السبب الحقيقي للتأخير ومين المتسبب فيه، ثم اختر الكود الأدق من الدليل.
شكل الجواب (عربي مبسط ومختصر):
1) **الكود المقترح:** اكتب الكود بين أقواس مربعة بالضبط كما في الدليل مثل [32M] أو [41-A] — وسطر يشرح ليش هذا الكود.
2) **أكواد قريبة:** كود أو كودين بديلة بين أقواس مربعة مع متى تُستخدم بدل المقترح (فقط إذا فيه احتمال فعلي).
3) **انتبه:** ملاحظة قصيرة إذا يلزم معلومة إضافية (SI) أو إذا التأخير تبعي من رحلة قادمة متأخرة أو إذا الكود مو على المناولة.
قواعد مهمة:
- لا تخترع كود مو موجود في الدليل أبداً. كل كود تكتبه لازم يكون حرفياً من الدليل.
- إذا الوصف ناقص ويغيّر الكود (مثلاً: مين اللي تأخر؟ الموظف أو الراكب أو المعدة؟) اسأل سؤال توضيحي واحد قصير مع اقتراح مبدئي.
- هذي محادثة متصلة: إذا رسالة الموظف توضيح أو تصحيح لما قبلها، اربطها وعدّل اقتراحك.
- إذا فيه سببين للتأخير اقترح كود لكل سبب ووضّح أيهما الأساسي.`;

const SYS_TIM = `أنت خبير متطلبات وثائق السفر (TIMATIC) لموظفي كاونتر SGS في مطار الجوف AJF، تساعد الموظف يقرر هل يقبل الراكب للسفر.
عندك: نص شاشة TIMATIC كما قرأه التطبيق (قد يكون فيه أخطاء قراءة بسيطة)، وبيانات الوثائق اللي قرأها التطبيق، وملاحظات التحليل الآلي.
الموظف يكمل لك البيانات الناقصة أو يصحح الغلط بكلامه (مثلاً: معه تأشيرة عمل للإمارات سارية لين كذا، جوازه ساري لين كذا).
قواعد:
- كلام الموظف عن الوثائق اللي بيده هو الأصح؛ يقدَّم على قراءة التطبيق الآلية إذا تعارضت.
- مصادر الحكم: نص TIMATIC المعطى + تعاميم المحطة المرفقة تحت (تعاميم SGS/شركات الطيران في مطار الجوف). لا تخترع شروط مو موجودة فيهما. إذا ما يغطيان الحالة قل ذلك بوضوح واطلب التأكد من أماديوس.
- تعاميم المحطة ملزمة وتُقدَّم على TIMATIC إذا كانت أشد: مثلاً إذا TIMATIC يسمح بالترانزيت بدون تأشيرة والتعميم يمنع قبول المواصلين عبر أبوظبي بدون تأشيرة دخول للإمارات، فالحكم حسب التعميم.
- طبّق التعميم على الراكب بالمعنى حتى لو ما ذكر جنسيته بالحرف، واربط المطارات بدولها والعربي بالإنجليزي: أبوظبي=AUH ودبي=DXB والشارقة=SHJ (الإمارات)، الدوحة=DOH، القاهرة=CAI، إسطنبول=IST، الجوف=AJF، الرياض=RUH، جدة=JED، القصيم=ELQ.
- راجع التعاميم في كل رسالة: إذا الموظف أضاف معلومة جديدة (مسار، ترانزيت، نوع تأشيرة) شوف هل فيه تعميم ينطبق بعدها.
- إذا بنيت الحكم أو شرط على تعميم اكتب سطر 📢 التعميم: عنوانه وش يقول باختصار.
- قارن صلاحية الجواز بالمدة المطلوبة في النص وبتاريخ السفر، واحسب الأشهر المتبقية.
- إذا "منع دخول لفئة" في النص، وضّح وش الفئة ولا تعتبرها مانع إلا إذا الراكب منها.
- عربي مبسط ومختصر بدون مقدمات.
شكل الجواب:
لكل مستند سطر: ✓ صح أو ✗ خطأ أو ⚠️ تأكد — ثم الشرح القصير. (🛂 الجواز · 🪪 التأشيرة/الإقامة · 🎫 الحجز · وأي شرط إضافي مثل التأمين أو تذكرة العودة)
ثم سطر 📢 التعاميم: التعميم اللي ينطبق وأثره على الحكم، أو "لا يوجد تعميم يخص هذا الراكب".
ثم آخر سطر لازم يبدأ بـ **الخلاصة:** وواحد من ثلاثة فقط:
"✅ يُسمح له بالسفر" أو "⚠️ يُسمح له بالسفر إذا معه: ..." أو "⛔ لا يُسمح له بالسفر: السبب".
- إذا ناقصك معلومة تغيّر الحكم، اسأل سؤال واحد قصير قبل الخلاصة.
- هذي محادثة متصلة: إذا رسالة الموظف توضيح أو تصحيح، عدّل الحكم.`;


// ---------- تعاميم المحطة لمساعد فحص الوثائق (نفس طريقة ajf-files) ----------
const AN = (s: string) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ء/g, "")
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const NORM = (s: string) => AN(s).replace(/لا/g, "ال").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const isAr = (w: string) => /[\u0600-\u06FF]/.test(w);
const enStem = (w: string) => w.length <= 4 ? w : w.replace(/(ations?|ings?|ments?|ness|ies|ied|ers?|ed|es|s)$/, (m) => (m === "ies" || m === "ied" ? "y" : ""));
const arStem = (w: string) => { w = w.replace(/^(وال|بال|فال|كال|لل|ال)/, ""); if (w.length > 4) w = w.replace(/(ات|ين|ون|ها|هم|يه|يا)$/, ""); return w; };
const SK = (w: string) => { if (isAr(w)) { const s = arStem(w), k = s.replace(/[اوي]/g, "").replace(/ه$/, ""); return k.length >= 2 ? k : s; } return enStem(w); };
const BASEKW = ["transit", "transfer", "ترانزيت", "مواصل", "visa", "تاشيره", "entry", "دخول", "منع", "not allowed", "passport", "جواز", "timatic", "INAD", "deport", "AUH", "ابوظبي", "abu dhabi", "الامارات", "UAE", "DXB", "دبي"];
async function circDocs(sb: any, ctx: string, q: string): Promise<string> {
  const { data: meta } = await sb.rpc("ajf_circ_meta");
  const M = (meta || []) as Record<string, any>[];
  if (!M.length) return "";
  const small = M.filter((r) => r.n <= 25000 || !r.chunks), big = M.filter((r) => !(r.n <= 25000 || !r.chunks));
  const texts = new Map<string, string>();
  if (small.length) {
    const { data: st } = await sb.from("ajf_circ").select("id,body,ftext").in("id", small.map((r) => r.id));
    (st || []).forEach((r: any) => texts.set(r.id, (String(r.body || "") + "\n" + String(r.ftext || "")).slice(0, 40000)));
  }
  const pick = new Map<string, string[]>();
  if (big.length) {
    // كلمات البحث: رأس السياق (الجنسية/الترانزيت/الوجهة/التأشيرة) + رسالة الموظف + كلمات ثابتة للترانزيت والتأشيرات
    const head = ctx.split("نص شاشة TIMATIC")[0].slice(0, 3000);
    const kw = [...new Set([...BASEKW, ...NORM(head + " " + q).split(" ").filter((w) => w.length > 2)])].slice(0, 40);
    const groups = kw.map((k) => { const n = NORM(k); return [{ n, k: n.includes(" ") ? "" : SK(n) }]; }).filter((g) => g[0].n.length > 2);
    const { data: ch } = await sb.rpc("ajf_chunk_search", { p_groups: groups, p_limit: 30 });
    const bigIds = new Set(big.map((r) => r.id)); let tot = 0;
    for (const c of (ch || []) as any[]) { if (!bigIds.has(c.cid) || tot > 90000) continue; tot += c.txt.length; (pick.get(c.cid) || pick.set(c.cid, []).get(c.cid)!).push(c.txt); }
  }
  const rows = M.filter((r) => texts.has(r.id) || pick.has(r.id) || r.ai);
  return rows.map((r, i) => `[ت${i + 1}] ${r.title} (${r.cd || ""})\n${r.ai ? "ملخص: " + r.ai + "\n" : ""}` +
    (texts.has(r.id) ? texts.get(r.id) : pick.has(r.id) ? "مقتطفات:\n" + pick.get(r.id)!.join("\n…\n") : "")).join("\n\n-----\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ s: "bad" }, 405);
  let a: Record<string, any> = {};
  try { a = await req.json(); } catch { return out({ s: "bad" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: me } = await sb.rpc("ajf_me", { p_token: a.token || "", p_device: a.device || "" });
  if (!me || !me.emp || me.s === "out") return out({ s: "out" });
  if (!GK) return out({ s: "nokey" });
  if (a.kind === "tim") {
    const q = String(a.q || "").slice(0, 1500).trim(), ctx = String(a.ctx || "").slice(0, 40000);
    if (q.length < 2) return out({ s: "bad" });
    const H = (Array.isArray(a.h) ? a.h : []).slice(-6).map((t: any) => `الموظف: ${String(t.q || "").slice(0, 1500)}\nأنت: ${String(t.a || "").slice(0, 3000)}`).join("\n\n");
    try {
      let cd = ""; try { cd = await circDocs(sb, ctx, q); } catch { cd = ""; }
      const ans = await gem(`${ctx}\n\n=====\n${cd ? "تعاميم المحطة المرفوعة (ملزمة):\n\n" + cd + "\n\n=====\n" : ""}${H ? "المحادثة السابقة:\n" + H + "\n\n=====\n" : ""}رسالة الموظف الآن: ${q}`, SYS_TIM);
      return out({ s: "ok", answer: ans });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  const q = String(a.q || "").slice(0, 600).trim();
  const guide = String(a.guide || "").slice(0, 120000);
  const air = String(a.air || "").slice(0, 80);
  if (q.length < 2 || guide.length < 100) return out({ s: "bad" });
  const H = (Array.isArray(a.h) ? a.h : []).slice(-6).map((t: any) => ({ q: String(t.q || "").slice(0, 600), a: String(t.a || "").slice(0, 2000) }));
  const hist = H.map((t: any) => `الموظف: ${t.q}\nأنت: ${t.a}`).join("\n\n");
  try {
    const ans = await gem(`دليل أكواد التأخير — ${air}\n(كل سطر: الكود | الشرح بالعربي | النص الرسمي بالإنجليزي | ملاحظات)\n\n${guide}\n\n=====\n${hist ? "المحادثة السابقة:\n" + hist + "\n\n=====\n" : ""}رسالة الموظف الآن: ${q}`, SYS(air));
    return out({ s: "ok", answer: ans });
  } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
});
