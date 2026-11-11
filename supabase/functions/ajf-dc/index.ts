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
- ابنِ الحكم على نص TIMATIC المعطى فقط. لا تخترع شروط مو موجودة فيه. إذا النص ما يغطي الحالة (مثلاً نوع التأشيرة) قل ذلك بوضوح واطلب التأكد من أماديوس.
- قارن صلاحية الجواز بالمدة المطلوبة في النص وبتاريخ السفر، واحسب الأشهر المتبقية.
- إذا "منع دخول لفئة" في النص، وضّح وش الفئة ولا تعتبرها مانع إلا إذا الراكب منها.
- عربي مبسط ومختصر بدون مقدمات.
شكل الجواب:
لكل مستند سطر: ✓ صح أو ✗ خطأ أو ⚠️ تأكد — ثم الشرح القصير. (🛂 الجواز · 🪪 التأشيرة/الإقامة · 🎫 الحجز · وأي شرط إضافي مثل التأمين أو تذكرة العودة)
ثم آخر سطر لازم يبدأ بـ **الخلاصة:** وواحد من ثلاثة فقط:
"✅ يُسمح له بالسفر" أو "⚠️ يُسمح له بالسفر إذا معه: ..." أو "⛔ لا يُسمح له بالسفر: السبب".
- إذا ناقصك معلومة تغيّر الحكم، اسأل سؤال واحد قصير قبل الخلاصة.
- هذي محادثة متصلة: إذا رسالة الموظف توضيح أو تصحيح، عدّل الحكم.`;

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
    const q = String(a.q || "").slice(0, 1500).trim(), ctx = String(a.ctx || "").slice(0, 30000);
    if (q.length < 2) return out({ s: "bad" });
    const H = (Array.isArray(a.h) ? a.h : []).slice(-6).map((t: any) => `الموظف: ${String(t.q || "").slice(0, 1500)}\nأنت: ${String(t.a || "").slice(0, 3000)}`).join("\n\n");
    try {
      const ans = await gem(`${ctx}\n\n=====\n${H ? "المحادثة السابقة:\n" + H + "\n\n=====\n" : ""}رسالة الموظف الآن: ${q}`, SYS_TIM);
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
