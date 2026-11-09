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
const GM_STRONG = (Deno.env.get("GEMINI_MODEL_ASK") || "gemini-3.5-flash,gemini-flash-lite-latest").split(",");
async function gem(text: string, sys: string, json = false, strong = false): Promise<string> {
  let last = "";
  for (const m of (strong ? GM_STRONG : GM)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.trim()}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GK }, signal: AbortSignal.timeout(50000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: "application/json" } : {}) } }),
    });
    if (r.ok) { const j = await r.json(); return (j.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || "").join(""); }
    last = r.status + " " + (await r.text()).slice(0, 200);
  }
  throw new Error("gemini " + last);
}
// نفس توحيد النص في التطبيق (circ.js) عشان البحث يطابق
const AN = (s: string) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ء/g, "")
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const NORM = (s: string) => AN(s).replace(/لا/g, "ال").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const isAr = (w: string) => /[\u0600-\u06FF]/.test(w);
const enStem = (w: string) => w.length <= 4 ? w : w.replace(/(ations?|ings?|ments?|ness|ies|ied|ers?|ed|es|s)$/, (m) => (m === "ies" || m === "ied" ? "y" : ""));
const arStem = (w: string) => { w = w.replace(/^(وال|بال|فال|كال|لل|ال)/, ""); if (w.length > 4) w = w.replace(/(ات|ين|ون|ها|هم|يه|يا)$/, ""); return w; };
const SK = (w: string) => { if (isAr(w)) { const s = arStem(w), k = s.replace(/[اوي]/g, "").replace(/ه$/, ""); return k.length >= 2 ? k : s; } return enStem(w); };
const SYS_SUM = "أنت مساعد لموظفي الخدمات الأرضية في مطار سعودي. تلخّص التعاميم التشغيلية بالعربي الفصيح المبسط. لا تخترع معلومة غير موجودة في النص.";
const SYS_ASK = `أنت مساعد عمليات خبير لموظفي SGS (الخدمات الأرضية السعودية) في مطار الجوف AJF: كاونتر، بوابة، تحكم بالحمولة، مشرفين.
عندك كل التعاميم والملفات المرفوعة للمحطة. اقرأها كاملة وافهمها مثل خبير، ثم جاوب سؤال الموظف بذكاء:
- افهم وضع الراكب من السؤال: الجنسية، المسار ومحطات الترانزيت (مثلاً: الجوف → القصيم → أبوظبي)، شركة الطيران، نوع الحجز، أي مشكلة.
- طبّق التعاميم على حالته حتى لو التعميم ما ذكر جنسيته أو حالته بالحرف: إذا التعميم عن الترانزيت في أبوظبي والراكب مواصل عبر أبوظبي فهو ينطبق عليه.
- اربط الأسماء بالرموز: أبوظبي=AUH، الجوف=AJF، القصيم=ELQ، الرياض=RUH، جدة=JED، دبي=DXB، أمريكا=USA... والعربي بالإنجليزي.
شكل الجواب (عربي مبسط، مختصر وعملي):
1) **الخلاصة** في سطر: يُقبل / يُقبل بشروط / لا يُقبل / الإجراء المطلوب.
2) **المطلوب من الراكب** • نقاط.
3) **تحقق منه أنت** • نقاط (وثائق، أنظمة، مراسلة محطة...).
بعد كل معلومة من تعميم اكتب رقمه بين قوسين مثل [1] أو [1, 3].
إذا يحتاج الجواب معلومة مو موجودة في التعاميم (مثل تأشيرة دخول دولة لجنسية معينة)، اذكر ما تعرفه بإيجاز تحت عنوان **خارج التعاميم (تأكد من TIMATIC)** ولا تنسبه لتعميم.
لا تقل "ما لقيت" إذا فيه تعميم ينطبق ولو جزئياً. وإذا فعلاً ما فيه أي تعميم له علاقة قل ذلك بسطر واحد ثم أعط التوجيه العام المفيد تحت "خارج التعاميم".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ s: "bad" }, 405);
  let a: Record<string, string> = {};
  try { a = await req.json(); } catch { return out({ s: "bad" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
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
    if (!GK) return out({ s: "nokey" });
    const q = String(a.q || "").slice(0, 600).trim();
    if (q.length < 2) return out({ s: "bad" });
    try {
      // كل التعاميم للمساعد مثل ما ترفق مستندات لمحادثة؛ وإذا كبرت المكتبة نختار الأقرب بالبحث
      const { data: all } = await sb.from("ajf_circ").select("id,title,cdate,ai,body,ftext,file_path").order("at", { ascending: false });
      let docsRows = (all || []) as Record<string, any>[];
      const size = docsRows.reduce((t, r) => t + (r.body?.length || 0) + (r.ftext?.length || 0), 0);
      if (size > 600000) {
        let kw: string[] = [];
        try { const j = JSON.parse(await gem(`السؤال: ${q}\nأعطني JSON بالشكل {"kw":[...]} فيه من 6 إلى 14 كلمة أو عبارة قصيرة للبحث في تعاميم طيران مكتوبة بالعربي أو الإنجليزي: الكلمات المهمة، مرادفاتها، ترجمتها الإنجليزية، أسماء الدول والمطارات ورموزها. بدون شرح.`, "تستخرج كلمات بحث فقط.", true)); kw = Array.isArray(j.kw) ? j.kw : []; } catch { /* */ }
        kw = [...new Set([...kw.map(String), ...NORM(q).split(" ").filter((w) => w.length > 2)])].slice(0, 24);
        const groups = kw.map((k) => { const n = NORM(k); return [{ n, k: n.includes(" ") ? "" : SK(n) }]; }).filter((g) => g[0].n.length > 1);
        const { data: sr } = await sb.rpc("ajf_circ_search", { p_token: a.token, p_device: a.device, p_groups: groups, p_limit: 12 });
        const ids = new Set(((sr && sr.rows) || []).map((r: any) => r.id));
        docsRows = docsRows.filter((r) => ids.has(r.id));
        let tot = 0; docsRows = docsRows.filter((r) => (tot += (r.body?.length || 0) + Math.min(r.ftext?.length || 0, 60000)) < 600000);
      }
      if (!docsRows.length) return out({ s: "ok", answer: "ما فيه تعاميم مرفوعة للحين.", src: [] });
      const rows = docsRows;
      const docs = rows.map((r, i) => `[${i + 1}] العنوان: ${r.title}\nالتاريخ: ${r.cdate || ""}\n${r.ai ? "ملخص: " + r.ai + "\n" : ""}النص:\n${(String(r.body || "") + "\n" + String(r.ftext || "")).slice(0, 60000)}`).join("\n\n-----\n\n");
      const hist = (Array.isArray(a.h) ? a.h : []).slice(-3).map((t: any) => `سؤال سابق: ${String(t.q || "").slice(0, 400)}\nجوابك: ${String(t.a || "").slice(0, 1500)}`).join("\n\n");
      const ans = await gem(`التعاميم والملفات المرفوعة (${rows.length}):\n\n${docs}\n\n=====\n${hist ? "المحادثة السابقة:\n" + hist + "\n\n=====\n" : ""}سؤال الموظف الآن: ${q}`, SYS_ASK, false, true);
      return out({ s: "ok", answer: ans, src: rows.map((r) => ({ id: r.id, title: r.title, cd: r.cdate, has_file: !!r.file_path, ai: r.ai })) });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  if (!admin) return out({ s: "denied" });
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
      return out({ s: "ok", ai });
    } catch (e) { return out({ s: "aierr", e: String(e).slice(0, 300) }); }
  }
  if (a.action === "usage") {
    // مجموع أحجام الملفات المرفوعة (للتنبيه قبل الوصول لحد 1GB)
    const { data } = await sb.from("ajf_circ").select("file_size");
    const used = (data || []).reduce((t: number, r: { file_size: number | null }) => t + (r.file_size || 0), 0);
    return out({ s: "ok", used, n: (data || []).length });
  }
  return out({ s: "bad" });
});
