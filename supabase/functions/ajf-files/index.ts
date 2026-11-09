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
// تقسيم الملف لأجزاء (~3500 حرف) عند حدود الفقرات/الصفحات — للأدلة الكبيرة
async function chunkify(sb: any, c: { id: string; body: string; ftext: string }) {
  const t = (String(c.body || "") + "\n\n" + String(c.ftext || "")).trim();
  const parts: string[] = []; let cur = "";
  for (const para of t.split(/\n{2,}/)) {
    if (cur.length + para.length > 3500 && cur.length > 800) { parts.push(cur); cur = cur.slice(-300); }
    cur += (cur ? "\n\n" : "") + para;
    while (cur.length > 5000) { parts.push(cur.slice(0, 3500)); cur = cur.slice(3200); }
  }
  if (cur.trim()) parts.push(cur);
  await sb.from("ajf_circ_chunk").delete().eq("cid", c.id);
  const rows = parts.map((txt, n) => ({ cid: c.id, n, txt, ntext: " " + NORM(txt) + " " }));
  for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from("ajf_circ_chunk").insert(rows.slice(i, i + 200)); if (error) throw new Error(error.message); }
  return rows.length;
}
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
بعد كل معلومة من تعميم اكتب رقمه بين قوسين مثل [1] أو [1, 3]، وإذا المقتطف فيه رقم صفحة مثل [صفحة 214] اذكره بعد الرقم مثل [2، ص 214] حتى يرجع له الموظف.
إذا يحتاج الجواب معلومة مو موجودة في التعاميم (مثل تأشيرة دخول دولة لجنسية معينة)، اذكر ما تعرفه بإيجاز تحت عنوان **خارج التعاميم (تأكد من TIMATIC)** ولا تنسبه لتعميم.
هذي محادثة متصلة: إذا رسالة الموظف توضيح أو تصحيح أو تكملة لسؤال سابق، اربطها بما قبلها وجاوب السؤال الأصلي بعد التوضيح، ولا تبدأ موضوع جديد ولا تكرر جواب سابق بدون داعي. إذا ما فهمت قصده اسأله سؤال توضيحي واحد قصير.
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
      const H = (Array.isArray(a.h) ? a.h : []).slice(-6).map((t: any) => ({ q: String(t.q || "").slice(0, 600), a: String(t.a || "").slice(0, 2500) }));
      // سؤال متابعة/توضيح: نكتبه كسؤال كامل يجمع تفاصيل المحادثة، ونبحث ونجاوب على أساسه
      let full = q;
      if (H.length) {
        try { full = (await gem(`المحادثة السابقة:\n${H.map((t, i) => `(${i + 1}) الموظف: ${t.q}\nالمساعد: ${t.a.slice(0, 800)}`).join("\n\n")}\n\nرسالة الموظف الجديدة: ${q}\n\nإذا الرسالة الجديدة تكملة أو توضيح أو تصحيح أو سؤال متابعة لما قبلها، أعد كتابتها كسؤال واحد كامل مستقل يجمع كل التفاصيل المهمة (الراكب، الجنسية، المسار، الحالة...) مع التوضيح الجديد. وإذا موضوعها جديد تماماً أعدها كما هي. اكتب السؤال فقط.`, "تعيد صياغة سؤال المتابعة كسؤال كامل. سطر واحد.")).trim().slice(0, 800) || q; } catch { full = q; }
      }
      // التعاميم الصغيرة كاملة، والأدلة الكبيرة: الأجزاء الأقرب للسؤال من كامل صفحاتها
      const { data: meta } = await sb.rpc("ajf_circ_meta");
      const M = (meta || []) as Record<string, any>[];
      const small = M.filter((r) => r.n <= 25000 || !r.chunks);
      const big = M.filter((r) => !(r.n <= 25000 || !r.chunks));
      const texts = new Map<string, string>();
      if (small.length) {
        const { data: st } = await sb.from("ajf_circ").select("id,body,ftext").in("id", small.map((r) => r.id));
        (st || []).forEach((r: any) => texts.set(r.id, (String(r.body || "") + "\n" + String(r.ftext || "")).slice(0, 60000)));
      }
      const pick = new Map<string, string[]>();
      if (big.length) {
        let kw: string[] = [];
        try { const j = JSON.parse(await gem(`سؤال موظف خدمات أرضية: ${full}\nأعطني JSON بالشكل {"kw":[...]} فيه 10 إلى 20 كلمة أو عبارة قصيرة للبحث في أدلة تشغيل طيران مكتوبة بالإنجليزي غالباً وبعضها عربي: المصطلحات الفنية الإنجليزية المستخدمة في أدلة الخدمات الأرضية (مثل boarding, PRM, WCHR, MAAS, misconnection, deportee, INAD, dangerous goods, load sheet)، ومرادفاتها، وترجمتها العربية، وأسماء الدول والمطارات ورموزها. بدون شرح.`, "تستخرج كلمات بحث فقط.", true)); kw = Array.isArray(j.kw) ? j.kw : []; } catch { /* */ }
        kw = [...new Set([...kw.map(String), ...NORM(full).split(" ").filter((w) => w.length > 2)])].slice(0, 26);
        const groups = kw.map((k) => { const n = NORM(k); return [{ n, k: n.includes(" ") ? "" : SK(n) }]; }).filter((g) => g[0].n.length > 2);
        const { data: ch } = await sb.rpc("ajf_chunk_search", { p_groups: groups, p_limit: 40 });
        const bigIds = new Set(big.map((r) => r.id)); let tot = 0;
        for (const c of (ch || []) as any[]) { if (!bigIds.has(c.cid) || tot > 160000) continue; tot += c.txt.length; (pick.get(c.cid) || pick.set(c.cid, []).get(c.cid)!).push(c.txt); }
      }
      const rows = M.filter((r) => texts.has(r.id) || pick.has(r.id) || r.ai);
      if (!rows.length) return out({ s: "ok", answer: "ما فيه تعاميم مرفوعة للحين.", src: [] });
      const docs = rows.map((r, i) => `[${i + 1}] العنوان: ${r.title}\nالتاريخ: ${r.cd || ""}\n${r.ai ? "ملخص: " + r.ai + "\n" : ""}` +
        (texts.has(r.id) ? `النص:\n${texts.get(r.id)}` : pick.has(r.id) ? `مقتطفات من أجزاء الدليل الأقرب للسؤال (الدليل كامل ${r.n} حرف):\n${pick.get(r.id)!.join("\n…\n")}` : "(دليل كبير: ما فيه أجزاء مطابقة للسؤال، عندك ملخصه فقط)")).join("\n\n-----\n\n");
      const hist = H.map((t) => `الموظف: ${t.q}\nأنت: ${t.a}`).join("\n\n");
      const ans = await gem(`التعاميم والملفات المرفوعة (${rows.length}):\n\n${docs}\n\n=====\n${hist ? "المحادثة السابقة مع نفس الموظف (مرتبطة بسؤاله الحالي):\n" + hist + "\n\n=====\n" : ""}رسالة الموظف الآن: ${q}${full !== q ? "\n(المقصود بالكامل: " + full + ")" : ""}`, SYS_ASK, false, true);
      return out({ s: "ok", answer: ans, src: rows.map((r) => ({ id: r.id, title: r.title, cd: r.cd, has_file: !!r.has_file, ai: r.ai })) });
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
    return out({ s: "ok", used, n: (data || []).length });
  }
  return out({ s: "bad" });
});
