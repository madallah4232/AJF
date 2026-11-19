// ajf-frm — قراءة صورة بيانات رحلة غير مجدولة (SPA / ALPHA STAR / ROYAL FLEET) للتقرير اليومي
// للمالك فقط (15024232)، والصورة ما تنحفظ. يستخدم نفس مفتاح Gemini المجاني (Secrets: GEMINI_KEY)
// الإعداد: Edge Functions ← Deploy a new function ← الاسم ajf-frm ← الصق هذا الملف ← Deploy
//          ثم من إعدادات الدالة: أطفئ "Verify JWT"
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
const GK = Deno.env.get("GEMINI_KEY") || "";
const GM = (Deno.env.get("GEMINI_MODEL_ASK") || "gemini-3.5-flash,gemini-flash-lite-latest").split(",");

const SYS = "أنت تقرأ صورة فيها بيانات رحلة طيران (خاصة أو SPA أو VIP أو تشارتر) وصلت مطار الجوف AJF وغادرت منه.\nأرجع JSON فقط بهذي المفاتيح (أي معلومة مو موجودة في الصورة خلّها \"\" أو 0 — لا تخمّن أبداً):\n{\"al\":\"\",\"fin\":\"\",\"fout\":\"\",\"dest\":\"\",\"reg\":\"\",\"typ\":\"\",\"sta\":\"\",\"std\":\"\",\"utc\":false,\"aj\":0,\"ay\":0,\"ai\":0,\"dj\":0,\"dy\":0,\"di\":0,\"ab\":0,\"db\":0,\"cgo\":0,\"note\":\"\"}\n- al: رمز المشغّل إذا مكتوب (مثل SPA)، وإلا \"\".\n- fin رقم رحلة الوصول، fout رقم رحلة المغادرة، كما هي مكتوبة بالضبط (مثل 55028-3). إذا رقم واحد للرحلتين حطه في الاثنين.\n- إذا رقم الرحلة مكتوب \"-\" أو فاضي: استخدم أرقام REF number بدون حروف المدينة (مثال: REF number: RUH-99301 ← fin و fout = 99301).\n- dest: رمز IATA ثلاث حروف. الأولوية لوجهة المغادرة (TO / Outbound)، وإذا ما فيه مغادرة خذ مطار القدوم (FROM). حوّل ICAO لـ IATA (OEDR=DHA, OERK=RUH, OEJN=JED, OEDF=DMM, OEMA=MED, OESH=SHW, OEGN=GIZ, OEAB=AHB, OETB=TUU, OEHL=HAS, OEPA=AQI, OERF=RAH, OETF=TIF, OENG=EAM, OEBH=BHH, OEWJ=EJH, OEGS=ELQ, OEAO=ULH). إذا مطار مو في القائمة ومو متأكد من رمزه اكتب رمز ICAO كما هو).\n- الإيميل قد يكون فيه وقتين (LT محلي و UTC): خذ وقت LT المحلي و utc=false. utc=true فقط إذا ما فيه إلا UTC/Z.\n- ETA/STA = وقت الوصول المجدول، ETD/STD = وقت المغادرة المجدول.\n- رسائل الأسطول الملكي (ROYAL OPS) شكلها مثل: \"SET UP ROYAL FLIGHT SV7057 EQPT 739 REG HZ-MF6\" ثم سطر المسار \"ETD JED 0720 AJF 0900/1000 JED 1135Z\":\n  · رقم الرحلة بدون حروف الشركة (SV7057 ← fin و fout = 7057). EQPT = نوع الطائرة (739). REG = التسجيل (HZMF6).\n  · \"AJF 0900/1000\" يعني وصول AJF 09:00 ومغادرة AJF 10:00 (sta=09:00، std=10:00). إذا AJF بوقت واحد فقط: لو هي آخر محطة فهو وصول، ولو أول محطة فهو مغادرة.\n  · إذا أي وقت في سطر المسار منتهي بـ Z فكل أوقات السطر UTC (utc=true).\n  · dest = المطار اللي بعد AJF في المسار (هنا JED)، وإذا AJF آخر محطة فالمطار اللي قبلها.\n  · \"SCTR AJF-JED 10 PAX\" = ركاب المغادرة (dy=10)، و \"SCTR JED-AJF\" = ركاب الوصول (ay). \"XX\" يعني بدون رقم.\n- reg: تسجيل الطائرة بدون شرطة (مثل HZA4). typ: نوع الطائرة كما مكتوب (مثل A319 أو C550 أو 320).\n- sta وقت الوصول المجدول، std وقت المغادرة المجدول، بصيغة HH:MM. لا تكتب الأوقات الفعلية (ATA/ATD/ON BLOCK/OFF BLOCK).\n- utc: true إذا الأوقات مكتوبة UTC أو Z أو GMT، وإلا false.\n- aj/ay/ai ركاب الوصول (أعمال، سياحي، رضع)، dj/dy/di ركاب المغادرة. إذا مكتوب عدد ركاب بدون درجة (مثل Pax: 1) حطه في ay أو dy. الطاقم (Crew) ما ينحسب أبداً.\n- ab/db عدد قطع عفش الوصول/المغادرة، cgo الشحن بالكيلو.\n- note: سطر قصير بالعربي إذا فيه شي غير واضح، وإلا \"\".";

async function readImg(b64: string, mime: string): Promise<string> {
  let last = "";
  for (const m of GM) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + m.trim() + ":generateContent";
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(50000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] },
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: "اقرأ بيانات الرحلة من الصورة." }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
    });
    if (r.ok) {
      const j = await r.json();
      const o = (j.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || "").join("").trim();
      if (o) return o;
      last = m + " empty"; continue;
    }
    last = r.status + " " + (await r.text()).slice(0, 200);
  }
  throw new Error("gemini " + last);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let a: Record<string, any> = {};
  try { a = await req.json(); } catch { return out({ s: "bad" }); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: me } = await sb.rpc("ajf_me", { p_token: a.token || "", p_device: a.device || "" });
  if (!me || !me.emp || me.s === "out") return out({ s: "out" });
  if (String(me.emp) !== "15024232") return out({ s: "denied" });
  if (!GK) return out({ s: "nokey" });
  const img = String(a.img || "");
  const mime = ["image/jpeg", "image/png", "image/webp"].includes(String(a.mime)) ? String(a.mime) : "image/jpeg";
  if (img.length < 1000 || img.length > 7000000) return out({ s: "bad" });
  try {
    let t = await readImg(img, mime);
    t = t.trim();
    t = t.replace(/^\x60{3}(json)?/, "").replace(/\x60{3}$/, "").trim();
    let d: Record<string, unknown> = {};
    try { d = JSON.parse(t); } catch { return out({ s: "aierr", e: "json" }); }
    return out({ s: "ok", d });
  } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
});
