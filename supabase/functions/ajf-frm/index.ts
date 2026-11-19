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
const GM = [...new Set([...(Deno.env.get("GEMINI_MODEL_ASK") || "").split(","), "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"].map((x) => x.trim()).filter(Boolean))];

const SYS = "أنت تقرأ صورة فيها بيانات رحلة طيران (خاصة أو SPA أو VIP أو تشارتر) وصلت مطار الجوف AJF وغادرت منه.\nأرجع JSON فقط بهذي المفاتيح (أي معلومة مو موجودة في الصورة خلّها \"\" أو 0 — لا تخمّن أبداً):\n{\"al\":\"\",\"fin\":\"\",\"fout\":\"\",\"dest\":\"\",\"reg\":\"\",\"typ\":\"\",\"sta\":\"\",\"std\":\"\",\"utc\":false,\"aj\":0,\"ay\":0,\"ai\":0,\"dj\":0,\"dy\":0,\"di\":0,\"ab\":0,\"db\":0,\"cgo\":0,\"note\":\"\"}\n- al: رمز المشغّل إذا مكتوب (مثل SPA)، وإلا \"\".\n- fin رقم رحلة الوصول، fout رقم رحلة المغادرة، كما هي مكتوبة بالضبط (مثل 55028-3). إذا رقم واحد للرحلتين حطه في الاثنين.\n- إذا رقم الرحلة مكتوب \"-\" أو فاضي: استخدم أرقام REF number بدون حروف المدينة (مثال: REF number: RUH-99301 ← fin و fout = 99301).\n- dest: رمز IATA ثلاث حروف. الأولوية لوجهة المغادرة (TO / Outbound)، وإذا ما فيه مغادرة خذ مطار القدوم (FROM). حوّل ICAO لـ IATA (OEDR=DHA, OERK=RUH, OEJN=JED, OEDF=DMM, OEMA=MED, OESH=SHW, OEGN=GIZ, OEAB=AHB, OETB=TUU, OEHL=HAS, OEPA=AQI, OERF=RAH, OETF=TIF, OENG=EAM, OEBH=BHH, OEWJ=EJH, OEGS=ELQ, OEAO=ULH). إذا مطار مو في القائمة ومو متأكد من رمزه اكتب رمز ICAO كما هو).\n- الإيميل قد يكون فيه وقتين (LT محلي و UTC): خذ وقت LT المحلي و utc=false. utc=true فقط إذا ما فيه إلا UTC/Z.\n- ETA/STA = وقت الوصول المجدول، ETD/STD = وقت المغادرة المجدول.\n- رسائل الأسطول الملكي (ROYAL OPS) شكلها مثل: \"SET UP ROYAL FLIGHT SV7057 EQPT 739 REG HZ-MF6\" ثم سطر المسار \"ETD JED 0720 AJF 0900/1000 JED 1135Z\":\n  · رقم الرحلة بدون حروف الشركة (SV7057 ← fin و fout = 7057). EQPT = نوع الطائرة (739). REG = التسجيل (HZMF6).\n  · \"AJF 0900/1000\" يعني وصول AJF 09:00 ومغادرة AJF 10:00 (sta=09:00، std=10:00). إذا AJF بوقت واحد فقط: لو هي آخر محطة فهو وصول، ولو أول محطة فهو مغادرة.\n  · إذا أي وقت في سطر المسار منتهي بـ Z فكل أوقات السطر UTC (utc=true).\n  · dest = المطار اللي بعد AJF في المسار (هنا JED)، وإذا AJF آخر محطة فالمطار اللي قبلها.\n  · \"SCTR AJF-JED 10 PAX\" = ركاب المغادرة (dy=10)، و \"SCTR JED-AJF\" = ركاب الوصول (ay). \"XX\" يعني بدون رقم.\n- reg: تسجيل الطائرة بدون شرطة (مثل HZA4). typ: نوع الطائرة كما مكتوب (مثل A319 أو C550 أو 320).\n- sta وقت الوصول المجدول، std وقت المغادرة المجدول، بصيغة HH:MM. لا تكتب الأوقات الفعلية (ATA/ATD/ON BLOCK/OFF BLOCK).\n- utc: true إذا الأوقات مكتوبة UTC أو Z أو GMT، وإلا false.\n- aj/ay/ai ركاب الوصول (أعمال، سياحي، رضع)، dj/dy/di ركاب المغادرة. إذا مكتوب عدد ركاب بدون درجة (مثل Pax: 1) حطه في ay أو dy. الطاقم (Crew) ما ينحسب أبداً.\n- ab/db عدد قطع عفش الوصول/المغادرة، cgo الشحن بالكيلو.\n- note: سطر قصير بالعربي إذا فيه شي غير واضح، وإلا \"\".";

// يجرب أكثر من نموذج: إذا واحد مزحوم (429) أو تأخر ينتقل للي بعده، وإذا رفض إعداد التفكير أو JSON يعيد بدونه
async function readImg(b64: string, mime: string): Promise<string> {
  const errs: string[] = [];
  for (const m of GM) {
    let think = true, jsonMode = true;
    for (let t = 0; t < 3; t++) {
      const tc = !think ? {} : /2\.5/.test(m) ? { thinkingConfig: { thinkingBudget: 0 } } : { thinkingConfig: { thinkingLevel: "low" } };
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent";
        const r = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(45000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] },
            contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: "اقرأ بيانات الرحلة من الصورة." }] }],
            generationConfig: { temperature: 0, ...tc, ...(jsonMode ? { responseMimeType: "application/json" } : {}) } }),
        });
        if (r.ok) {
          const j = await r.json();
          const o = (j.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || "").join("").trim();
          if (o) return o;
          errs.push(m + " empty"); break;
        }
        const et = (await r.text()).slice(0, 300);
        errs.push(m + " " + r.status + " " + et.slice(0, 120));
        if (r.status === 400 && think && /think/i.test(et)) { think = false; continue; }
        if (r.status === 400 && jsonMode && /mime|json/i.test(et)) { jsonMode = false; continue; }
        if (r.status !== 429 && r.status < 500) break;
        if (t < 1) { await new Promise((ok) => setTimeout(ok, 2000)); continue; }
        break;
      } catch (e) { errs.push(m + " " + String(e).slice(0, 80)); break; }
    }
  }
  throw new Error(errs.join(" | ").slice(0, 600));
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
    const i0 = t.indexOf("{"), i1 = t.lastIndexOf("}");
    if (i0 >= 0 && i1 > i0) t = t.slice(i0, i1 + 1);
    let d: Record<string, unknown> = {};
    try { d = JSON.parse(t); } catch { return out({ s: "aierr", e: "json: " + t.slice(0, 120) }); }
    return out({ s: "ok", d });
  } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
});
