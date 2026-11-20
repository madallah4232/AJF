/* ---------- التعاميم: نص مكتوب + ملفات PDF، بحث عربي/إنجليزي، وربط مع فحص وثائق الراكب ----------
   البحث يتم في Supabase (ajf_circ_search) بكلمات الموظف + مرادفاتها وترجمتها من القاموس.
   الملفات في مخزن خاص، ولا تُفتح إلا برابط مؤقت من دالة ajf-files بعد التحقق من الدخول. */
(function(){
const FN=SB_URL+"/functions/v1/ajf-files";
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const isAdm=()=>!!(AUTH.me&&AUTH.me.admin);

/* ---------- توحيد النص ---------- */
const AN=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[ً-ْـ]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ء/g,"")
  .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d));
/* "لا" تنقرأ من بعض ملفات PDF مقلوبة "ال" (حالات ← حاالت) — نوحّدها في النص والبحث */
const NORM=s=>AN(s).replace(/لا/g,"ال").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
const isAr=w=>/[؀-ۿ]/.test(w);
const enStem=w=>{if(w.length<=4)return w;return w.replace(/(ations?|ings?|ments?|ness|ies|ied|ers?|ed|es|s)$/,m=>m==="ies"||m==="ied"?"y":"")};
const arStem=w=>{w=w.replace(/^(وال|بال|فال|كال|لل|ال)/,"");if(w.length>4)w=w.replace(/(ات|ين|ون|ها|هم|يه|يا)$/,"");return w};
const SK=w=>{if(isAr(w)){const s=arStem(w),k=s.replace(/[اوي]/g,"").replace(/ه$/,"");return k.length>=2?k:s}return enStem(w)};
const STOP=new Set("وش ايش كيف متى هل اذا لو في من على الى عن ما اللي التي الذي ابي ابغى وقت عند مع او و يا هذا هذي هذه ذلك كل بعد قبل the a an of to for and or in on at by is are be with from as".split(" "));

/* ---------- قاموس مصطلحات المطار: كل سطر = كلمات بنفس المعنى (عربي وإنجليزي) ---------- */
const DICT=`عفش شنط شنطه حقيبه حقائب امتعه baggage bag luggage checked
عفش يدوي شنطه يد cabin hand carry-on
كرسي متحرك معاق اعاقه ذوي الاعاقه wchr wchs wchc wheelchair prm reduced mobility
بوابه قيت gate
صعود بوردنق ركوب boarding board embark
نزول deplaning disembark
تاخير تاخر تاخيرات delay delayed dly
الغاء ملغي ملغيه cancel cancelled cancellation
تحويل تحويله diversion divert
جواز جوازات سفر passport passports
تاشيره فيزا visa visas
اقامه هويه مقيم iqama residence resident permit id
خروج وعوده exit reentry re-entry
ترانزيت عبور transit connection twov
تذكره تكت ticket tickets eticket
حجز booking reservation pnr
راكب ركاب مسافر مسافرين pax passenger passengers traveler travellers
طفل اطفال رضيع قاصر قاصرين infant child children minor minors umnr
حامل حمل pregnant pregnancy expectant
مريض مرضى طبي medical medif patient stretcher
دواء ادويه medicine medication drugs
مواد خطره بضائع خطره dangerous goods dgr hazardous
بطاريه بطاريات ليثيوم battery batteries lithium powerbank
سلاح اسلحه ذخيره weapon weapons firearm ammunition
حيوان حيوانات اليف قطط كلاب pet pets avih animal animals
جثمان جثه متوفي human remains hum deceased
وزن اوزان زياده weight excess overweight
حموله شحن كارقو بضايع cargo freight
بريد mail
كاونتر كاونترات تسجيل check-in counter checkin
اغلاق الكاونتر closing close cutoff deadline
طاقم crew cabin crew
كابتن طيار pilot captain cockpit
ضيافه مضيف cabin crew attendant
تنظيف cleaning
وقود fuel fuelling refuel
تطعيم لقاح تطعيمات vaccination vaccine vaccinated yellow fever
مرض وباء عدوي disease outbreak epidemic infection
ايبولا ebola
كورونا كوفيد covid coronavirus
اقرار تعهد نموذج attestation declaration form
امن امني تفتيش security screening search
جمارك customs
هجره ترحيل مرحل immigration deport deportee inad inadmissible
ممنوع منع حظر prohibited ban banned not allowed restriction
شركه طيران ناقل airline carrier
السعوديه السعودي saudia sv
طيران ناس ناس flynas xy
طيران اديل اديل flyadeal f3
مصر للطيران egyptair ms
اير كايرو air cairo sm
النيل nile air np
العربيه للطيران air arabia g9
ابوظبي abu dhabi auh
دبي dubai dxb
امريكا امريكي الولايات المتحده usa united states america american us
الكونغو congo drc
بريطانيا المملكه المتحده uk united kingdom britain
الهند هندي india indian
باكستان باكستاني pakistan
مصر مصري egypt egyptian
الفلبين فلبيني philippines filipino
بنغلاديش بنغالي bangladesh
اثيوبيا اثيوبي ethiopia
السودان سوداني sudan
اليمن يمني yemen
سوريا سوري syria
تركيا تركي turkey turkiye
الامارات اماراتي uae emirates
قطر qatar
الكويت kuwait
البحرين bahrain
عمان oman
الاردن jordan
لبنان lebanon
العراق iraq
ايران iran
اندونيسيا indonesia
نيبال nepal
سريلانكا sri lanka
اوروبا شنغن europe schengen
كندا canada
استراليا australia
نموذج استماره form`;
let GRP=null,ADMSYN=null;
function groupsBase(){if(GRP)return GRP;GRP=[];
  const add=line=>{const w=NORM(line).split(" ").filter(x=>x.length>1);if(w.length>1)GRP.push(new Set(w))};
  DICT.split("\n").forEach(add);
  try{(window.TIM&&TIM.countries||[]).forEach(c=>add(c.ar+" "+c.en+" "+c.a3))}catch(e){}
  (ADMSYN||[]).forEach(add);return GRP}
/* شريط الرئيسية: المشرف يختار التعاميم الخاصة بمطار الجوف فقط (مفتاح tick) */
let TKI=null;async function loadTk(){if(TKI)return;try{const j=await rpc("ajf_cfg_get",{p_token:AUTH.tok,p_device:AUTH.dev,p_k:"tick"});TKI=j&&j.v&&Array.isArray(j.v.ids)?j.v.ids:[]}catch(e){TKI=[]}paintRes()}
async function loadSyn(){if(ADMSYN)return;try{const j=await rpc("ajf_cfg_get",{p_token:AUTH.tok,p_device:AUTH.dev,p_k:"syn"});ADMSYN=j&&j.v&&Array.isArray(j.v.l)?j.v.l:[];GRP=null}catch(e){ADMSYN=[]}}
/* الكلمات + بدائلها → مجموعات للبحث */
function qGroups(q){const words=NORM(q).split(" ").filter(w=>w.length>1&&!STOP.has(w));const G=groupsBase(),out=[],terms=[];
  for(const w of words){const alt=new Set([w]);const k=SK(w);
    G.forEach(g=>{if(g.has(w)||[...g].some(x=>SK(x)===k&&k.length>2))g.forEach(x=>alt.add(x))});
    const arr=[...alt].slice(0,30).map(n=>({n,k:SK(n)}));out.push(arr);arr.forEach(a=>terms.push(a.n))}
  return{groups:out,terms}}
/* نص البحث المخزّن مع كل تعميم */
const AI=r=>{try{const j=typeof r.ai==="string"&&r.ai?JSON.parse(r.ai):null;return j&&(j.t||j.s)?j:null}catch(e){return null}};
function indexText(o){const a=AI(o);const n=NORM([o.title,o.tags,o.body,o.ftext,a?a.t+" "+a.s+" "+a.k:""].join(" "));const k=" "+[...new Set(n.split(" "))].map(SK).join(" ")+" ";return{ntext:n,ktext:k}}

/* ---------- تمييز الكلمات والمقتطف ---------- */
function rx(terms){const fl=t=>t.split("").map(ch=>({"ا":"[اأإآٱء]","ه":"[هة]","ي":"[يىئ]","و":"[وؤ]"})[ch]||ch.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\u064B-\\u0652\\u0640]*");
  const ts=[...new Set(terms)].filter(t=>t.length>1).sort((a,b)=>b.length-a.length).slice(0,40);if(!ts.length)return null;
  try{return new RegExp("("+ts.map(fl).join("|")+")","gi")}catch(e){return null}}
const hl=(s,re)=>{const h=E(s);return re?h.replace(re,"<mark>$1</mark>"):h};
function snip(txt,re,len=260){txt=String(txt||"").replace(/\s+/g," ").trim();if(!re)return txt.slice(0,len)+(txt.length>len?"…":"");re.lastIndex=0;const m=re.exec(txt);re.lastIndex=0;
  if(!m)return txt.slice(0,len)+(txt.length>len?"…":"");const a=Math.max(0,m.index-90);return(a?"…":"")+txt.slice(a,a+len)+(a+len<txt.length?"…":"")}
const fDate=d=>{if(!d)return"";const[y,m,dd]=String(d).slice(0,10).split("-");return dd+"/"+m+"/"+y};
const kb=n=>n>=1048576?(n/1048576).toFixed(1)+"MB":Math.max(1,Math.round(n/1024))+"KB";

/* ---------- الخادم ---------- */
async function R(fn,a){const j=await rpc(fn,Object.assign({p_token:AUTH.tok||"",p_device:AUTH.dev},a||{}));if(j&&j.s==="out"){authOut();throw new Error("out")}if(!j||j.s!=="ok")throw new Error(j&&j.s||"err");return j}
async function F(a){const r=await fetch(FN,{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},body:JSON.stringify(Object.assign({token:AUTH.tok||"",device:AUTH.dev},a))});
  if(!r.ok)throw new Error(r.status===404?"nofn":"fn"+r.status);const j=await r.json();if(j.s==="out"){authOut();throw new Error("out")}if(j.s!=="ok"){const x=new Error(j.s);x.d=j.e||"";throw x}return j}
const errTxt=e=>/PGRST202|404|nofn/.test(e.message)?"تحتاج تشغيل إعداد التعاميم في Supabase (circ.sql ودالة ajf-files) — راجع المشرف.":e.message==="denied"?"للمشرف فقط":e.message==="out"?"سجّل دخولك أول":"تعذّر الاتصال، تأكد من الإنترنت";

/* ---------- قراءة ملفات PDF ---------- */
let pdfP=null;
function pdfLib(){if(window.pdfjsLib)return Promise.resolve(pdfjsLib);return pdfP||(pdfP=new Promise((ok,no)=>{const s=document.createElement("script");s.src=PDFJS+"pdf.min.js";
  s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";ok(pdfjsLib)};s.onerror=()=>{pdfP=null;no(new Error("lib"))};document.head.appendChild(s)}))}
async function pdfText(file,onp){const lib=await pdfLib();const doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;const n=doc.numPages,parts=[];let thin=0;
  for(let i=1;i<=n;i++){onp&&onp(`قراءة الصفحة ${i}/${n}`);const pg=await doc.getPage(i),tc=await pg.getTextContent();let s="",lastY=null;
    for(const it of tc.items){const y=it.transform[5];if(lastY!=null&&Math.abs(y-lastY)>4)s+="\n";else if(s&&!s.endsWith(" "))s+=" ";s+=it.str;lastY=y}
    if(s.replace(/\s/g,"").length<40)thin++;parts.push(`[صفحة ${i}]\n`+s)}
  let text=parts.join("\n\n"),ocr=false;
  /* ملف مصوّر (سكانر): نقرأ الصور عربي + إنجليزي — أول 12 صفحة */
  if(thin>=Math.ceil(n*.6)){ocr=true;text="";const max=Math.min(n,12);
    if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement("script");s.src=(window.TESS_BASE||"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/")+"tesseract.min.js";s.onload=ok;s.onerror=()=>no(new Error("lib"));document.head.appendChild(s)});
    const w=await Tesseract.createWorker(["ara","eng"],1,window.TESS_LOCAL||{});
    try{for(let i=1;i<=max;i++){onp&&onp(`قراءة صورة الصفحة ${i}/${max} (ملف مصوّر)`);const pg=await doc.getPage(i),vp=pg.getViewport({scale:2}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;text+=`[صفحة ${i}]\n`+(await w.recognize(cv)).data.text+"\n\n"}}finally{await w.terminate()}}
  return{text:fixAr(text.normalize("NFKC")).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim(),pages:n,ocr}}
/* بعض ملفات PDF العربية تطلع حروفها مقلوبة (ﺔﻴﺑﺮﻌﻟﺍ ← ةيبرعلا): نكتشفها ونعدلها */
function fixAr(t){const w=t.match(/[\u0600-\u06FF]{3,}/g)||[];if(w.length<20)return t;
  const fw=w.filter(x=>/^ال/.test(x)).length,bw=w.filter(x=>/لا$/.test(x)).length;if(bw<=fw*1.5||bw<5)return t;
  return t.split("\n").map(l=>{const ar=(l.match(/[\u0600-\u06FF]/g)||[]).length;if(ar<l.replace(/\s/g,"").length*.5)return l;
    return l.split(/(\s+)/).reverse().map(x=>/[\u0600-\u06FF]/.test(x)?[...x].reverse().join(""):x).join("")}).join("\n")}
const EN_M={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function guessDate(t,name){const s=String(t).slice(0,4000);let m;const iso=(y,mo,d)=>y>2000&&y<2100&&mo>=1&&mo<=12&&d>=1&&d<=31?`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`:"";
  if((m=s.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d\d)\b/i)))return iso(+m[3],EN_M[m[1].toLowerCase()],+m[2]);
  if((m=s.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?,?\s+(20\d\d)\b/i)))return iso(+m[3],EN_M[m[2].toLowerCase()],+m[1]);
  if((m=AN(s).match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d\d)\b/)))return iso(+m[3],+m[2],+m[1]);
  if((m=AN(s).match(/\b(20\d\d)[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/)))return iso(+m[1],+m[2],+m[3]);
  if((m=String(name).match(/(20\d\d)(\d\d)(\d\d)/)))return iso(+m[1],+m[2],+m[3]);return""}
const cleanName=n=>String(n).replace(/\.pdf$/i,"").replace(/[_\-]+/g," ").replace(/\b20\d{6}\b/,"").replace(/\s+/g," ").trim();
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- الحالة والواجهة ---------- */
const S={th:(()=>{try{return JSON.parse(localStorage.getItem("ajf_ax_th")||"[]")}catch(e){return[]}})(),aq:(()=>{try{return localStorage.getItem("ajf_ax_q")||""}catch(e){return""}})(),ans:"",abusy:false,asrc:[],q:"",rows:null,list:null,n:0,busy:false,up:[],upBusy:false,usage:null,edit:null,err:""};
let root=null,qT=null;
function mount(el,q){root=el;if(q!=null)S.q=q;paint();loadSyn().then(()=>{if(S.q)search();else recent()});if(isAdm())F({action:"usage"}).then(j=>{S.usage=j;paintUp()}).catch(()=>{})}
function paint(){if(!root)return;const adm=isAdm();if(adm)loadTk();
  root.innerHTML=`<div class="ax"><div class="ax-h"><i>🤖</i><div><b>اسأل المساعد</b><small>اكتب سؤالك بالعربي، ويجاوبك من التعاميم المرفوعة</small></div></div>
    <div id="axA">${thHTML()}</div>
    <textarea id="axQ" rows="2" placeholder="${(S.th||[]).length?"اكتب سؤال متابعة أو توضيح…":"مثال: راكب مسافر أمريكا وش يحتاج؟ · الرحلة تأخرت بسبب الطقس وش نسوي؟"}">${E(S.aq||"")}</textarea>
    <button class="tx-go" id="axGo" ${S.abusy?"disabled":""}>${S.abusy?"… يقرأ التعاميم":(S.th||[]).length?"أرسل":"اسأل"}</button></div>
${adm?`    <div class="bd-sec"><span>أو ابحث بكلمة</span></div>
    <div class="cq"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="cxQ" type="search" placeholder="ابحث بالعربي أو الإنجليزي: كلمة أو كلمتين…" value="${E(S.q)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="bd-h" id="cxHint">${S.q?"":"مثال: <b>إيبولا</b> · <b>كرسي متحرك</b> · <b>أمريكا</b> · <b>بطاريات</b> · <b>تأخير البوردنق</b>"}</div>
    ${adm?`<div class="cx-adm"><label class="cx-up"><input type="file" id="cxFiles" accept="application/pdf,.pdf" multiple hidden><span>📎 رفع تعاميم PDF</span><small>تقدر تختار أكثر من ملف</small></label><button class="cx-up" id="cxNew"><span>✍︎ تعميم مكتوب</span><small>بدون ملف</small></button></div><button class="cx-more" id="cxSumAll">🤖 تلخيص التعاميم بالعربي (اللي ما تلخصت)</button><button class="cx-more" id="cxReidx">🔄 إعادة قراءة كل الملفات (بعد أي تحديث للبحث)</button><div id="cxUp"></div>`:""}
    <div id="cxRes"></div>`:""}`;paintUp();paintRes()}
function paintRes(){const el=root&&root.querySelector("#cxRes");if(!el)return;
  if(S.err){el.innerHTML=`<div class="bd-empty">${E(S.err)}</div>`;return}
  const rows=S.q.trim()?S.rows:S.list;if(rows==null){el.innerHTML=`<div class="bd-empty">… جاري البحث</div>`;return}
  const t=S.q.trim()?qGroups(S.q).terms:[],re=rx(t);
  if(!rows.length){el.innerHTML=S.q.trim()?`<div class="bd-empty">ما لقيت تعميم بهالكلمات. جرّب كلمة ثانية أو بالإنجليزي.</div>`:`<div class="bd-empty">ما فيه تعاميم مرفوعة${isAdm()?" — ارفعها من الزر فوق":""}</div>`;return}
  el.innerHTML=`<div class="bd-sec"><span>${S.q.trim()?"النتائج":"آخر التعاميم"}</span><small>${S.q.trim()?rows.length:S.n}</small></div>`+rows.map(r=>card(r,re,S.q.trim()&&r.full)).join("")+
    (!S.q.trim()&&S.list.length<S.n?`<button class="cx-more" id="cxMore">عرض المزيد</button>`:"")}
function card(r,re,partial){const ed=S.edit===r.id;
  const a=AI(r);
  return`<div class="ci cx ${r.miss?"near":""}" data-id="${E(r.id)}"><div class="h"><div>${a&&a.t?`<b>${hl(a.t,re)}</b><small class="cx-en" dir="auto">${hl(r.title,re)}</small>`:`<b>${hl(r.title,re)}</b>`}<small>${r.cd?fDate(r.cd):fDate(r.at)}${r.lang==="en"?" · English":""}${r.pages?" · "+r.pages+" ص":""}${r.by_name?" · "+E(r.by_name):""}</small></div>${r.has_file?'<span class="cx-pdf">PDF</span>':""}</div>
    ${r.tags?`<div class="cx-tags">${r.tags.split(/[،,]/).map(x=>x.trim()).filter(Boolean).map(x=>`<span>${hl(x,re)}</span>`).join("")}</div>`:""}
    ${a&&a.s?`<div class="cx-sum">${hl(a.s,re).replace(/\n/g,"<br>")}</div>`:""}<p class="sn ${a&&a.s?"en":""}">${hl(snip(r.txt,re),re)}</p>${r.miss?`<small class="cx-miss">فيه بعض كلماتك فقط</small>`:""}
    <div class="cact">${r.has_file?`<button class="cx-open" data-open="${E(r.id)}">📄 فتح الملف</button>`:""}<button class="ed" data-full="${E(r.id)}">النص كامل</button>${isAdm()?`${TKI?`<button class="ed" data-tk="${E(r.id)}" style="${TKI.includes(r.id)?"color:var(--amber);border-color:var(--amber)":""}">${TKI.includes(r.id)?"✓ في الشريط":"📌 للشريط"}</button>`:""}<button class="ed" data-edit="${E(r.id)}">تعديل</button><button class="x" data-del="${E(r.id)}">حذف</button>`:""}</div>
    ${ed?editForm(r):""}<div class="cx-full" id="full_${E(r.id)}" hidden></div></div>`}
function editForm(r){return`<div class="ci-f cx-ed"><input data-f="title" value="${E(r.title)}" placeholder="العنوان"><input data-f="tags" value="${E(r.tags||"")}" placeholder="وسوم: كلمات بحث مفصولة بفاصلة"><input data-f="cd" type="date" value="${E((r.cd||"").slice(0,10))}">${r.has_file?"":`<textarea data-f="body" placeholder="نص التعميم">${E(r.body||"")}</textarea>`}<button data-save="${E(r.id)}">حفظ</button><span class="m" id="edM"></span></div>`}
async function search(){const q=S.q.trim();if(!q){S.rows=null;recent();return}S.err="";S.rows=null;paintRes();
  try{const{groups}=qGroups(q);if(!groups.length){S.rows=[];paintRes();return}
    const j=await R("ajf_circ_search",{p_groups:groups,p_limit:40});if(S.q.trim()!==q)return;
    const re=rx(groups[0].map(a=>a.n));
    S.rows=(j.rows||[]).map(r=>({...r,miss:r.hit<groups.length,sc:r.hit*10+(re&&re.test(NORM(r.title+" "+r.tags))?5:0)})).sort((a,b)=>b.hit-a.hit||b.sc-a.sc);paintRes()}
  catch(e){S.err=errTxt(e);paintRes()}}
async function recent(more){S.err="";try{const j=await R("ajf_circ_list",{p_offset:more?S.list.length:0,p_limit:30});S.n=j.n;try{CIRCN=j.n;if(j.rows[0])CIRCLAST=j.rows[0].id}catch(x){}S.list=more?S.list.concat(j.rows):j.rows;if(!S.q.trim())paintRes();window.CIRC_N=j.n}catch(e){S.err=errTxt(e);S.list=[];paintRes()}}

/* ---------- رفع الملفات (للمشرف) ---------- */
function paintUp(){const el=root&&root.querySelector("#cxUp");if(!el)return;if(!S.up.length&&!S.usage){el.innerHTML="";return}
  const u=S.usage?`<div class="cx-use"><i style="width:${Math.min(100,S.usage.used/1073741824*100).toFixed(1)}%"></i><span>المساحة المستخدمة ${kb(S.usage.used||0)} من 1GB · ${S.usage.n} تعميم</span></div>`+(S.usage.emb&&S.usage.emb.total?`<p class="m">🧠 تجهيز البحث بالمعنى: ${S.usage.emb.done>=S.usage.emb.total?"جاهز ✓":`${S.usage.emb.done} من ${S.usage.emb.total} جزء (${Math.floor(S.usage.emb.done/S.usage.emb.total*100)}%) — يكمل لحاله في الخلفية`}</p>`:""):"";
  if(!S.up.length){el.innerHTML=u;return}
  const ready=S.up.filter(x=>x.st==="ready").length;
  el.innerHTML=u+`<div class="cx-q">${S.up.map((x,i)=>`<div class="cx-qi ${x.st}"><div class="h"><b>📄 ${E(x.file.name)}</b><small>${kb(x.file.size)}${x.pages?" · "+x.pages+" ص":""}${x.ocr?" · مصوّر":""}${x.lang==="en"?" · English":x.lang==="ar"?" · عربي":""}</small></div>
      ${x.st==="read"?`<p class="m">⏳ ${E(x.msg||"قراءة…")}</p>`:x.st==="up"?`<p class="m">⬆︎ ${E(x.msg||"رفع…")}</p>`:x.st==="done"?`<p class="m ok">✓ انرفع وصار يطلع بالبحث</p>`:x.st==="err"?`<p class="m err">✕ ${E(x.msg)}</p>`:x.st==="wait"?`<p class="m">بالانتظار…</p>`:""}
      ${x.st==="ready"||x.st==="err"&&x.text!=null?`<input data-u="${i}" data-k="title" value="${E(x.title)}" placeholder="العنوان (يفضّل عربي)"><input data-u="${i}" data-k="tags" value="${E(x.tags)}" placeholder="وسوم: كلمات بحث مثل إيبولا، أمريكا، إقرار"><label class="cx-d"><span>تاريخ التعميم</span><input data-u="${i}" data-k="cd" type="date" value="${E(x.cd)}"></label>
        ${x.text?`<details><summary>النص المقروء (${x.text.length} حرف)</summary><pre>${E(x.text.slice(0,1500))}${x.text.length>1500?"…":""}</pre></details>`:`<p class="m err">ما انقرأ نص من الملف — اكتب العنوان والوسوم عشان يطلع بالبحث</p>`}<button class="x" data-urm="${i}">إزالة</button>`:""}</div>`).join("")}</div>
    ${ready?`<button class="tx-go" id="cxUpGo" ${S.upBusy?"disabled":""}>⬆︎ رفع ${ready} ${ready>2&&ready<11?"ملفات":"ملف"}</button>`:""}${S.up.every(x=>x.st==="done")?`<button class="cx-more" id="cxUpClr">تم — إخفاء القائمة</button>`:""}`}
async function addFiles(files){const big=[];for(const f of files){if(!/\.pdf$/i.test(f.name)&&f.type!=="application/pdf")continue;if(f.size>50*1048576){big.push(f.name);continue}
    S.up.push({file:f,st:"wait",title:cleanName(f.name),tags:"",cd:"",text:null})}
  if(big.length)alert("أكبر من 50MB وما ينرفع: "+big.join("، "));paintUp();
  for(const x of S.up.filter(x=>x.st==="wait")){x.st="read";paintUp();
    try{const r=await pdfText(x.file,m=>{x.msg=m;paintUp()});x.text=r.text;x.pages=r.pages;x.ocr=r.ocr;
      const ar=(r.text.match(/[؀-ۿ]/g)||[]).length,la=(r.text.match(/[A-Za-z]/g)||[]).length;x.lang=ar>la?"ar":la?"en":"";
      x.cd=guessDate(r.text,x.file.name);
      /* عنوان التعميم العربي إن وجد أول سطر واضح */
      if(x.lang==="ar"){const l=r.text.split("\n").map(s=>s.trim()).find(s=>s.length>=8&&s.length<=120&&/[؀-ۿ]/.test(s)&&!/^\d/.test(s));if(l)x.title=l}
      x.st="ready"}
    catch(e){x.st="err";x.text="";x.msg=e.message==="lib"?"تعذّر تحميل قارئ PDF — تأكد من الإنترنت":"تعذّرت قراءة الملف (قد يكون محمي بكلمة سر)"}paintUp()}}
async function uploadAll(){if(S.upBusy)return;S.upBusy=true;paintUp();
  for(const x of S.up.filter(x=>x.st==="ready"||x.st==="err"&&x.text!=null&&x.retry)){x.st="up";x.msg="تجهيز…";paintUp();
    try{const id=newId(),path=id+".pdf";const u=await F({action:"upload",path});x.msg="رفع الملف…";paintUp();
      const put=await fetch(u.url,{method:"PUT",headers:{"Content-Type":"application/pdf","x-upsert":"true",apikey:SB_KEY},body:x.file});if(!put.ok)throw new Error("put"+put.status);
      x.msg="حفظ للبحث…";paintUp();const o={id,title:x.title.trim()||cleanName(x.file.name),tags:x.tags.trim(),body:"",ftext:x.text||"",lang:x.lang,cdate:x.cd,file_path:path,file_name:x.file.name,file_size:x.file.size,pages:x.pages};
      Object.assign(o,indexText(o));await R("ajf_circ_save",{p:o});x.msg="تلخيص بالعربي…";paintUp();await F({action:"sum",id}).catch(()=>{});x.st="done"}
    catch(e){x.st="err";x.retry=1;x.msg=/put/.test(e.message)?"تعذّر رفع الملف — جرّب مرة ثانية":errTxt(e)}paintUp()}
  S.upBusy=false;paintUp();recent();F({action:"usage"}).then(j=>{S.usage=j;paintUp()}).catch(()=>{});if(window.hubPaint)try{hubPaint()}catch(e){}}

async function reindex(btn){/* تأكيد بضغطتين بدل نافذة confirm (بعض المتصفحات تمنعها) */if(!btn.dataset.sure){btn.dataset.sure="1";btn.textContent="⚠︎ اضغط مرة ثانية للتأكيد: إعادة قراءة الملفات اللي بدون أرقام صفحات (عدة دقائق)";setTimeout(()=>{if(btn.dataset.sure&&!btn.disabled){delete btn.dataset.sure;btn.textContent="🔄 إعادة قراءة كل الملفات (بعد أي تحديث للبحث)"}},8000);return}delete btn.dataset.sure;btn.disabled=true;
  try{let all=[],off=0;for(;;){const j=await R("ajf_circ_list",{p_offset:off,p_limit:100});all=all.concat(j.rows);off+=100;if(off>=j.n)break}
    const fl=all.filter(r=>r.has_file);let i=0,bad=0,skip=0;
    for(const r of fl){i++;btn.textContent=`🔄 ${i}/${fl.length}: ${r.title.slice(0,30)}`;
      try{const g=(await R("ajf_circ_get",{p_id:r.id})).row;if(/\[صفحة \d+\]/.test(g.ftext||"")){skip++;continue}/* ملف مقروء بأرقام صفحاته: ما يحتاج */const u=await F({action:"get",path:r.id+".pdf"}),blob=await(await fetch(u.url)).blob();
        const x=await pdfText(blob,m=>{btn.textContent=`🔄 ${i}/${fl.length}: ${m}`});
        const o={id:r.id,title:g.title,tags:g.tags,body:g.body||"",ftext:x.text,lang:g.lang,cdate:g.cd||"",pages:x.pages,ai:g.ai};Object.assign(o,indexText(o));delete o.ai;await R("ajf_circ_save",{p:o});await F({action:"chunk",id:r.id}).catch(()=>{})}catch(e){bad++}}
    btn.textContent=`✓ تمت إعادة قراءة ${fl.length-bad-skip} ملف${skip?" (و"+skip+" سليمة ما احتاجت)":""}${bad?" — تعذّر "+bad:""}`}
  catch(e){btn.textContent=errTxt(e)}btn.disabled=false;S.q.trim()?search():recent()}

/* ---------- المساعد ---------- */
/* "4، ص 251، «نص منسوخ»، 7، ؟" → وحدات مصادر: رقم + صفحة + النص المنسوخ (للتحقق والتظليل) */
function citeUnits(inner){const Q=[];const t=String(inner).replace(/«([^»]*)»/g,(m,q)=>"\u0001"+(Q.push(q.trim())-1)+"\u0001");const U=[];
  t.split(/[,،]/).forEach(tok=>{tok=tok.trim();let m;const u=U[U.length-1];
    if((m=tok.match(/^\u0001(\d+)\u0001$/))){if(u)u.q=Q[+m[1]]}
    else if((m=tok.match(/^(?:ص|صفحة|صفحه|p\.?|page)\s*(\d{1,4})$/i))){if(u)u.p=m[1]}
    else if(/^[؟?]$/.test(tok)){if(u)u.bad=1}
    else if(tok==="≈"){if(u)u.ap=1}
    else if(/^\d{1,2}$/.test(tok)&&!(u&&u.p&&!u.q&&+tok>9))U.push({n:+tok,p:"",q:""})});return U}
const CITE_RX=/\[(\d{1,2}(?:[^\[\]]{0,700}?))\]/g;
function fmtAns(t){let h=E(String(t).replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm,"").replace(/\n{3,}/g,"\n\n")).replace(/^\s*#{1,4}\s*(.+)$/gm,"<b>$1</b>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[*-]\s+/gm,"• ");
  h=h.replace(CITE_RX,(m,inner)=>{const U=citeUnits(inner);if(!U.length)return m;
    return U.map(u=>{const bad=u.bad,old=!u.q&&!u.bad;
      return`<button class="ax-c${bad?" bad":u.ap?" ap":""}" data-asrc="${u.n-1}"${u.p?` data-pg="${u.p}"`:""}${u.q?` data-q="${u.q}"`:""}${u.bad?` data-bad="1"`:""}${u.ap?` data-ap="1"`:""}${old?` data-old="1"`:""}>${u.n}${u.p&&!u.bad?" · ص"+u.p:""}${u.bad?" ⚠︎":u.ap?" ≈":""}</button>`}).join("")});
  return h.replace(/\n/g,"<br>")}
/* المصادر اللي ذكرها الجواب فقط */
const cited=t=>{const c=new Set();String(t).replace(CITE_RX,(m,inner)=>{citeUnits(inner).forEach(u=>c.add(u.n-1));return m});return c}
/* المحادثة: كل الأسئلة والأجوبة مربوطة ببعض لين يضغط "محادثة جديدة" — وتنحفظ على الجوال */
function thSave(){try{localStorage.setItem("ajf_ax_th",JSON.stringify((S.th||[]).slice(-8)))}catch(e){}}
function thHTML(){const T=S.th||[];if(!T.length&&!S.abusy&&!S.aerr)return"";
  return`<div class="ax-th">${T.length?`<div class="ax-top"><small>المحادثة (${T.length})</small><button class="ax-new" id="axNew">＋ محادثة جديدة</button></div>`:""}`+T.map((t,ti)=>{const cs=cited(t.a);
    const fa=fmtAns(t.a),nb=(fa.match(/data-bad="1"/g)||[]).length;
    return`<div class="ax-q">${E(t.q)}</div><div class="ax-a">${fa.replace(/data-asrc="(\d+)"/g,`data-asrc="${ti}:$1"`)}</div>`+(t.tm&&isAdm()?`<p class="tx-note" dir="rtl" style="opacity:.7">⏱ تجهيز ${(t.tm.prep/1e3).toFixed(1)}ث · بحث ${((t.tm.search-t.tm.prep)/1e3).toFixed(1)}ث · جواب ${((t.tm.answer-t.tm.search)/1e3).toFixed(1)}ث · تحقق ${((t.tm.total-t.tm.answer)/1e3).toFixed(1)}ث = ${(t.tm.total/1e3).toFixed(1)}ث</p>`:"")+(nb?`<p class="tx-note" style="color:#ffb4a6">⚠︎ ${nb} معلومة ما انلقى لها نص يثبتها في التعميم — لا تعتمد عليها قبل ما تتأكد.</p>`:"")+
      ((t.src||[]).some((r,i)=>!cs.size||cs.has(i))?`<div class="ax-s"><small>المصادر:</small>${(t.src||[]).map((r,i)=>{if(cs.size&&!cs.has(i))return"";const a=AI(r);return`<button class="ax-sr" data-asrc="${ti}:${i}"><i>${i+1}</i><span>${E(a&&a.t||r.title)}</span>${r.has_file?"<em>📄</em>":""}</button>`}).join("")}</div>`:"")}).join("")+
    (S.abusy?`<div class="ax-q">${E(S.pending||"")}</div>${S.partial?`<div class="ax-a">${fmtAns(S.partial.replace(CITE_RX,""))}<span class="ax-cur">▍</span></div>`:`<div class="bd-empty">… المساعد يبحث في التعاميم ويبدأ يكتب خلال ثواني</div>`}`:"")+
    (S.aerr?`<div class="bd-empty">${S.aerr}</div>`:"")+
    (T.length?`<p class="tx-note">جواب آلي من التعاميم — تأكد من المصدر قبل أي قرار مهم. اكتب تحت سؤال متابعة أو توضيح وبيربطه بما قبله.</p>`:"")+`</div>`}
/* الجواب يوصل أول بأول (stream) — والدالة القديمة اللي ترجع JSON كامل تشتغل بعد */
async function askStream(q,h){const r=await fetch(FN,{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},body:JSON.stringify({token:AUTH.tok||"",device:AUTH.dev,action:"ask",q,h,stream:1})});
  if(!r.ok)throw new Error(r.status===404?"nofn":"fn"+r.status);
  const fin=j=>{if(j.s==="out"){authOut();throw new Error("out")}if(j.s!=="ok"){const x=new Error(j.s);x.d=j.e||"";throw x}return j};
  if(!/ndjson/.test(r.headers.get("content-type")||"")||!r.body)return fin(await r.json());
  const rd=r.body.getReader(),dec=new TextDecoder();let buf="",last=null,pt=0;
  for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let k;
    while((k=buf.indexOf("\n"))>=0){const ln=buf.slice(0,k);buf=buf.slice(k+1);if(!ln.trim())continue;let j;try{j=JSON.parse(ln)}catch(e){continue}
      if(j.d!=null){S.partial=(S.partial||"")+j.d;const n=Date.now();if(n-pt>220){pt=n;paint()}}else last=j}}
  if(buf.trim())try{last=JSON.parse(buf)}catch(e){}
  if(!last)throw new Error("aierr");return fin(last)}
async function ask(){const q=(S.aq||"").trim();if(q.length<2||S.abusy)return;S.abusy=true;S.aerr="";S.pending=q;S.aq="";try{localStorage.removeItem("ajf_ax_q")}catch(x){}paint();
  try{const h=(S.th||[]).slice(-6).map(t=>({q:t.q,a:t.a}));S.partial="";const j=await askStream(q,h);S.partial="";
    S.th=(S.th||[]).concat([{q,a:j.answer||"",src:j.src||[],tm:j.tm||null}]);thSave()}
  catch(e){S.partial="";S.aq=q;S.aerr=e.message==="nokey"?"المساعد غير مفعّل بعد (مفتاح Gemini ناقص).":e.message==="aierr"?"المساعد مشغول أو وصل الحد المجاني بالدقيقة — جرّب بعد شوي."+(AUTH.me&&AUTH.me.admin&&e.d?`<br><small dir="ltr" style="opacity:.7;word-break:break-all">${E(e.d)}</small>`:""):E(errTxt(e))}
  S.abusy=false;paint()}
async function sumAll(btn){btn.disabled=true;try{let all=[],off=0;for(;;){const j=await R("ajf_circ_list",{p_offset:off,p_limit:100});all=all.concat(j.rows);off+=100;if(off>=j.n)break}
    const todo=all.filter(r=>!AI(r));let i=0,bad=0;for(const r of todo){i++;btn.textContent=`🤖 ${i}/${todo.length}: ${r.title.slice(0,30)}`;
      try{await F({action:"sum",id:r.id})}catch(e){bad++;if(e.message==="nokey"){btn.textContent="مفتاح Gemini ناقص";btn.disabled=false;return}await new Promise(o=>setTimeout(o,4000))}}
    btn.textContent=`✓ تلخّص ${todo.length-bad} تعميم${bad?" — تعذّر "+bad+" (جرّب مرة ثانية)":""}`}catch(e){btn.textContent=errTxt(e)}btn.disabled=false;S.q.trim()?search():recent()}

/* ---------- عارض التعميم: يفتح على صفحة البند نفسه ويظلّله بالأصفر ---------- */
const VW={doc:null,pg:1,n:0,z:1,G:[],tok:0,url:"",title:""};
function vwCss(){if(document.getElementById("cxvCss"))return;const st=document.createElement("style");st.id="cxvCss";st.textContent=`
.cxv{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:#120d09;direction:rtl;color:var(--ink,#f3e9dc)}
.cxv-h,.cxv-f{display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--panel,#1c1510);border-bottom:1px solid var(--line,#3a2e24)}
.cxv-h{padding-top:calc(env(safe-area-inset-top) + 8px)}.cxv-f{border:0;border-top:1px solid var(--line,#3a2e24);justify-content:center;padding-bottom:calc(env(safe-area-inset-bottom) + 8px)}
.cxv-h b{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cxv button,.cxv a.cxv-x{min-width:40px;height:40px;padding:0 10px;border-radius:11px;border:1px solid var(--line,#3a2e24);background:transparent;color:inherit;font:600 14px system-ui;display:inline-grid;place-items:center;text-decoration:none}
.cxv button:disabled{opacity:.35}.cxv-f span{min-width:96px;text-align:center;font:700 14px var(--mono,monospace)}
.cxv-n{padding:8px 12px;font-size:13px;line-height:1.55;background:#3b2a10;color:#ffdc8f;text-align:center;max-height:30vh;overflow:auto}.cxv-n.warn{background:#4a1612;color:#ffc9bf}.cxv-tr{margin-top:6px;padding-top:6px;border-top:1px dashed #ffdc8f55;color:#fff3d6;font-size:14px;line-height:1.6;direction:rtl;text-align:right}.cxv-tr small{color:#ffdc8f;font-weight:700}
.cxv-n q{display:block;margin-top:4px;font-style:italic;color:#fff3d6;quotes:'«' '»'}
.cxv-b{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;background:#2b2520}
.cxv-p{position:relative;margin:8px auto;background:#fff;box-shadow:0 2px 14px #000a}.cxv-p canvas{display:block;width:100%;height:100%}
.cxv-m{position:absolute;background:rgba(255,212,0,.42);mix-blend-mode:multiply;border-radius:3px;box-shadow:0 0 0 2px rgba(235,150,0,.85);animation:cxvF 1s ease 2}
@keyframes cxvF{50%{background:rgba(255,140,0,.6)}}
.cxv [hidden]{display:none!important}
.cxv-t{background:#fffaf0;color:#1b130c;margin:8px;padding:14px 16px;border-radius:10px;font:15px/1.9 system-ui;white-space:pre-wrap;word-break:break-word}.cxv-t mark{background:#ffd84d;color:#000;border-radius:3px;box-shadow:0 0 0 2px #e89a00}
.cxv-l{text-align:center;margin-top:30vh;font:15px/1.7 system-ui;color:#ddd;padding:0 20px}`;document.head.appendChild(st)}
/* صفحات النص المقروء من الملف */
function vwPages(ft){const a=String(ft||"").split(/\[صفحة (\d+)\]/),P=[];for(let i=1;i<a.length;i+=2)P.push({p:+a[i],n:" "+NORM(a[i+1]||"")+" "});return P}
/* نحدد صفحة النص المنسوخ بالضبط (أو تقريبياً إذا القراءة من PDF فيها اختلاف بسيط) */
function vwLocate(P,q){q=NORM(q);if(q.length<8||!P.length)return 0;
  for(const x of P)if(x.n.includes(q))return x.p;for(let i=0;i+1<P.length;i++)if((P[i].n+P[i+1].n).replace(/\s+/g," ").includes(q))return P[i].p;
  const w=q.split(" ").filter(x=>x.length>1);if(w.length<4)return 0;const G=[];for(let i=0;i+3<=w.length;i++)G.push(w.slice(i,i+3).join(" "));
  let best=0,bp=0;P.forEach(x=>{let h=0;G.forEach(g=>{if(x.n.includes(g))h++});const r=h/G.length;if(r>best){best=r;bp=x.p}});return best>=.6?bp:0}
function vwClose(){const o=document.getElementById("cxv");if(o)o.remove();document.documentElement.style.overflow="";VW.tok++;try{VW.doc&&VW.doc.destroy()}catch(e){}VW.doc=null}
async function viewFile(id,o){o=o||{};vwCss();vwClose();const tok=++VW.tok;
  Object.assign(VW,{pg:1,n:0,z:1,q:o.q||"",o,url:"",title:o.title||"التعميم"});
  const ov=document.createElement("div");ov.id="cxv";ov.className="cxv";
  ov.innerHTML=`<div class="cxv-h"><button data-v="x" aria-label="إغلاق">✕</button><b>${E(VW.title)}</b><button data-v="zo">−</button><button data-v="zi">＋</button></div>
    <div class="cxv-n" hidden></div><div class="cxv-b"><p class="cxv-l">… جاري فتح صفحة التعميم${o.pg?" (ص "+E(o.pg)+")":""}</p></div>
    <div class="cxv-f"><button data-v="pv">› السابقة</button><span>—</span><button data-v="nx">التالية ‹</button><a class="cxv-x" hidden target="_blank" rel="noopener">الملف كامل ↗</a></div>`;
  document.body.appendChild(ov);document.documentElement.style.overflow="hidden";
  ov.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const v=b.dataset.v;
    if(v==="x")vwClose();else if(v==="pv"&&VW.pg>1){VW.pg--;vwRender(1)}else if(v==="nx"&&VW.pg<VW.n){VW.pg++;vwRender(1)}
    else if(v==="zi"&&VW.z<3){VW.z=Math.min(3,VW.z+.5);vwRender(0)}else if(v==="zo"&&VW.z>1){VW.z=Math.max(1,VW.z-.5);vwRender(0)}});
  try{const[g,u,lib]=await Promise.all([R("ajf_circ_get",{p_id:id}).catch(()=>null),F({action:"get",path:id+".pdf"}),pdfLib()]);if(tok!==VW.tok)return;
    VW.url=u.url;const ft=g&&g.row?String(g.row.body||"")+"\n\n"+String(g.row.ftext||""):"";const lp=o.q?vwLocate(vwPages(ft),o.q):0;VW.found=!!lp;const pg=lp||+o.pg||1;
    const doc=await lib.getDocument({url:u.url,cMapUrl:PDFJS+"cmaps/",cMapPacked:true}).promise;if(tok!==VW.tok){doc.destroy();return}
    VW.doc=doc;VW.n=doc.numPages;VW.pg=Math.min(Math.max(1,pg),VW.n);
    /* الملف ما فيه أرقام صفحات محفوظة: ندور على النص داخل الـ PDF نفسه صفحة صفحة (ونحفظ النتيجة) */
    if(!lp&&!+o.pg&&o.q&&!o.bad){const ck="ajf_pgc_"+id+"_"+NORM(o.q).slice(0,60);let hp=0;try{hp=+localStorage.getItem(ck)||0}catch(e){}
      if(!hp){const L=ov.querySelector(".cxv-l");for(let i=1;i<=doc.numPages&&tok===VW.tok;i++){if(L&&i%10===1)L.textContent=`… أدور على النص في الملف (صفحة ${i} من ${doc.numPages})`;
          try{const tc=await(await doc.getPage(i)).getTextContent();if(vwLocate([{p:i,n:" "+NORM(tc.items.map(x=>x.str).join(" "))+" "}],o.q)){hp=i;break}}catch(e){}}
        if(tok!==VW.tok)return;if(hp)try{localStorage.setItem(ck,String(hp))}catch(e){}}
      if(hp){VW.found=true;VW.pg=hp;const a=ov.querySelector(".cxv-x");a.href=u.url+"#page="+hp;a.hidden=false;await vwRender(1,1);return}}
    if(!lp&&!+o.pg){const n=ov.querySelector(".cxv-n");n.hidden=false;n.className="cxv-n warn";n.innerHTML=vwNote(o,false,0,0);vwTr(n,o);
      ov.querySelector(".cxv-f span").textContent=`${VW.n} صفحة`;ov.querySelector(".cxv-b").innerHTML=`<p class="cxv-l">ما قدرت أحدد مكان هذي المعلومة في الملف.<br>اعتبرها غير مؤكدة وتأكد من المشرف أو من الدليل.<br><br><button data-v="go1">اعرض الملف من البداية</button></p>`;
      ov.querySelector(".cxv-b").onclick=e=>{if(e.target.closest('[data-v="go1"]'))vwRender(1,1)};const a=ov.querySelector(".cxv-x");a.href=u.url;a.hidden=false;return}
    const a=ov.querySelector(".cxv-x");a.href=u.url+"#page="+VW.pg;a.hidden=false;await vwRender(1,1)}
  catch(e){if(tok!==VW.tok)return;ov.querySelector(".cxv-b").innerHTML=`<p class="cxv-l">${e.message==="lib"?"تعذّر تحميل عارض الملفات — تأكد من الإنترنت":E(errTxt(e))}</p>`}}
async function vwRender(scroll,first){const ov=document.getElementById("cxv");if(!ov||!VW.doc)return;const tok=VW.tok,rt=VW.rt=(VW.rt||0)+1;
  const body=ov.querySelector(".cxv-b"),pgEl=ov.querySelector(".cxv-f span");pgEl.textContent=`ص ${VW.pg} / ${VW.n}`;
  ov.querySelector('[data-v="pv"]').disabled=VW.pg<=1;ov.querySelector('[data-v="nx"]').disabled=VW.pg>=VW.n;
  const ratio=body.scrollHeight?body.scrollTop/body.scrollHeight:0;
  const page=await VW.doc.getPage(VW.pg),w0=page.getViewport({scale:1}).width,vp=page.getViewport({scale:Math.max(.3,(body.clientWidth-16)/w0*VW.z)});
  const dpr=Math.min(window.devicePixelRatio||1,2),cv=document.createElement("canvas");cv.width=Math.floor(vp.width*dpr);cv.height=Math.floor(vp.height*dpr);
  await page.render({canvasContext:cv.getContext("2d"),viewport:vp,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null}).promise;if(tok!==VW.tok||rt!==VW.rt)return;
  const box=document.createElement("div");box.className="cxv-p";box.style.width=vp.width+"px";box.style.height=vp.height+"px";box.appendChild(cv);
  body.innerHTML="";body.appendChild(box);
  /* تظليل النص المنسوخ نفسه: نلقى أقرب تتابع لكلماته في أسطر الصفحة */
  let top=null,hit=0;
  if(VW.q){try{const tc=await page.getTextContent();const L=[];
    for(const it of tc.items){if(!it.str||!it.str.trim())continue;const y=it.transform[5];let l=L.find(x=>Math.abs(x.y-y)<=3);if(!l)L.push(l={y,it:[],s:""});l.it.push(it);l.s+=" "+it.str}
    L.sort((a,b)=>b.y-a.y);const qw=NORM(VW.q).split(" ").filter(Boolean),QS=new Set(qw);
    const W=[];L.forEach((l,li)=>{const a=NORM(l.s).split(" "),b=NORM([...l.s].reverse().join("")).split(" ");const sc=x=>x.filter(w=>QS.has(w)).length;(sc(b)>sc(a)?b:a).forEach(w=>w&&W.push({w,li}))});
    let bs=0,bi=-1;const n=qw.length;for(let i=0;i<W.length;i++){let h=0;const seen=new Set();for(let j=i;j<Math.min(W.length,i+n+2);j++)if(QS.has(W[j].w)&&!seen.has(W[j].w)){seen.add(W[j].w);h++}if(h>bs){bs=h;bi=i}}
    if(bi>=0&&bs>=Math.max(3,Math.ceil(QS.size*.6))){const sel=new Set();for(let j=bi;j<Math.min(W.length,bi+n+2);j++)if(QS.has(W[j].w))sel.add(W[j].li);
      [...sel].map(i=>L[i]).forEach(l=>{let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;l.it.forEach(it=>{const m=pdfjsLib.Util.transform(vp.transform,it.transform),h=Math.hypot(m[2],m[3]);
          x1=Math.min(x1,m[4]);x2=Math.max(x2,m[4]+it.width*vp.scale);y1=Math.min(y1,m[5]-h);y2=Math.max(y2,m[5]+h*.25)});
        const d=document.createElement("i");d.className="cxv-m";d.style.cssText=`left:${x1-3}px;top:${y1-2}px;width:${x2-x1+6}px;height:${y2-y1+4}px`;box.appendChild(d);hit++;top=top==null?y1:Math.min(top,y1)})}}catch(e){}}
  body.scrollTop=scroll?(top!=null?Math.max(0,top-90):0):ratio*body.scrollHeight;
  const n=ov.querySelector(".cxv-n");if(first){n.hidden=false;const o=VW.o||{};
    n.className="cxv-n"+(VW.found&&!o.ap?"":" warn");n.innerHTML=vwNote(o,VW.found,hit,VW.pg);vwTr(n,o)}  else n.hidden=true}

/* تعميم مكتوب (بدون ملف PDF): نعرض نصه ونظلّل الجملة اللي اعتمد عليها المساعد */
/* ترجمة عربية للنص الإنجليزي اللي اعتمد عليه المساعد — تظهر تحته أعلى الصفحة، وتنحفظ على الجوال */
const TRC=(()=>{try{return JSON.parse(localStorage.getItem("ajf_trc")||"{}")}catch(e){return{}}})();
function vwTr(n,o){const q=String((o&&o.q)||"").trim();if(!q||!/[A-Za-z]{3}/.test(q)||/[\u0600-\u06FF]{6}/.test(q)||!n.querySelector("q"))return;
  const box=document.createElement("div");box.className="cxv-tr";n.appendChild(box);
  const show=t=>{box.innerHTML=`<small>الترجمة:</small> ${E(t)}`};
  if(TRC[q]){show(TRC[q]);return}box.innerHTML="<small>… جاري الترجمة</small>";
  F({action:"tr",t:q}).then(j=>{const t=String(j.ar||"").trim();if(!t){box.remove();return}TRC[q]=t;
    try{const k=Object.keys(TRC);if(k.length>200)delete TRC[k[0]];localStorage.setItem("ajf_trc",JSON.stringify(TRC))}catch(e){}show(t)}).catch(()=>box.remove())}
function vwNote(o,found,hit,pg){return found&&o.ap?`⚠︎ ${pg?"ص "+pg+" — ":""}صياغة المساعد مختلفة عن الدليل. ${hit?"المظلّل بالأصفر":"هذا"} هو النص الفعلي — اقرأه وقارنه بالجواب قبل ما تعتمد:<q dir="auto">${E(o.q)}</q>`:found?`📍 ${pg?"ص "+pg+" — ":""}${hit?"المظلّل بالأصفر":"في هذا التعميم"} النص اللي اعتمد عليه المساعد:<q dir="auto">${E(o.q)}</q>`
  :o.q?`⚠︎ ما لقيت هذا النص في التعميم — المعلومة غير مؤكدة، لا تعتمد عليها قبل ما تتأكد:<q dir="auto">${E(o.q)}</q>`
  :o.bad?`⚠︎ المساعد ما أعطى نص من التعميم يثبت هذي المعلومة — غير مؤكدة، تأكد بنفسك.`
  :`هذا الجواب بدون موضع محدد — اضغط «محادثة جديدة» واسأل مرة ثانية عشان يحدد البند.`}
async function viewText(id,o){o=o||{};vwCss();vwClose();const tok=++VW.tok;
  const ov=document.createElement("div");ov.id="cxv";ov.className="cxv";
  ov.innerHTML=`<div class="cxv-h"><button data-v="x" aria-label="إغلاق">✕</button><b>${E(o.title||"التعميم")}</b></div><div class="cxv-n" hidden></div><div class="cxv-b"><p class="cxv-l">… جاري فتح التعميم</p></div>`;
  document.body.appendChild(ov);document.documentElement.style.overflow="hidden";
  ov.addEventListener("click",e=>{const b=e.target.closest("button");if(b&&b.dataset.v==="x")vwClose()});
  try{const g=await R("ajf_circ_get",{p_id:id});if(tok!==VW.tok)return;const r=g.row||{};
    const lines=[r.body,r.ftext].filter(Boolean).join("\n\n").split("\n");
    const qw=o.q?NORM(o.q).split(" ").filter(Boolean):[],QS=new Set(qw);let sel=new Set();
    if(QS.size){const sc=lines.map(l=>{const w=new Set(NORM(l).split(" "));let h=0;QS.forEach(x=>{if(w.has(x))h++});return h});
      let best=0,bi=-1;for(let i=0;i<lines.length;i++){const w=new Set();for(let j=i;j<Math.min(lines.length,i+3);j++)NORM(lines[j]).split(" ").forEach(x=>QS.has(x)&&w.add(x));if(w.size>best){best=w.size;bi=i}}
      if(bi>=0&&best>=Math.max(3,Math.ceil(QS.size*.6)))for(let j=bi;j<Math.min(lines.length,bi+3);j++)if(sc[j])sel.add(j)}
    const body=ov.querySelector(".cxv-b");
    body.innerHTML=`<div class="cxv-t" dir="auto">${lines.map((l,i)=>sel.has(i)?`<mark>${E(l)}</mark>`:E(l)).join("<br>")}</div>`;
    const m=body.querySelector("mark");if(m)body.scrollTop=Math.max(0,m.offsetTop-90);
    const n=ov.querySelector(".cxv-n");n.hidden=false;n.className="cxv-n"+(sel.size&&!o.ap?"":(o.q||o.bad?" warn":""));n.innerHTML=vwNote(o,!!sel.size,sel.size,0);vwTr(n,o)}
  catch(e){if(tok!==VW.tok)return;ov.querySelector(".cxv-b").innerHTML=`<p class="cxv-l">${E(errTxt(e))}</p>`}}
/* ---------- فتح الملف ---------- */
async function openFile(id,btn){
  /* iOS يمنع فتح نافذة بعد انتظار، فنفتحها أول ثم نحط الرابط */
  const w=window.open("","_blank");if(w)w.document.write('<p style="font:16px system-ui;text-align:center;margin-top:40vh">… جاري فتح الملف</p>');btn&&(btn.textContent="…");
  try{const j=await F({action:"get",path:id+".pdf"});if(w)w.location.href=j.url;else location.href=j.url}
  catch(e){if(w)w.close();alert(errTxt(e))}finally{btn&&(btn.textContent="📄 فتح الملف")}}
async function showFull(id,btn){const el=document.getElementById("full_"+id);if(!el)return;if(!el.hidden){el.hidden=true;btn.textContent="النص كامل";return}
  el.hidden=false;el.innerHTML="…";try{const g=await R("ajf_circ_get",{p_id:id});const r=g.row||{};const re=rx(S.q.trim()?qGroups(S.q).terms:[]);
    el.innerHTML=`<pre>${hl([r.body,r.ftext].filter(Boolean).join("\n\n"),re)}</pre>`;btn.textContent="إخفاء النص";const c=(S.rows||[]).concat(S.list||[]).find(x=>x.id===id);if(c)c.body=r.body}
  catch(e){el.textContent=errTxt(e)}}

/* ---------- الأحداث ---------- */
function bind(el){if(el.__cx)return;el.__cx=1;
  el.addEventListener("input",e=>{const t=e.target;if(t.id==="axQ"){S.aq=t.value;try{localStorage.setItem("ajf_ax_q",t.value)}catch(x){}return}if(t.id==="cxQ"){S.q=t.value;const h=root.querySelector("#cxHint");if(h)h.style.display=S.q?"none":"";clearTimeout(qT);qT=setTimeout(search,350);return}
    if(t.dataset.u!=null){S.up[+t.dataset.u][t.dataset.k]=t.value}});
  el.addEventListener("change",e=>{const t=e.target;if(t.id==="cxFiles"){addFiles([...t.files]);t.value=""}if(t.dataset.u!=null)S.up[+t.dataset.u][t.dataset.k]=t.value});
  el.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;e.stopPropagation();
    if(b.dataset.open){const r=(S.rows||[]).concat(S.list||[]).find(x=>x.id===b.dataset.open),ai=r&&AI(r);viewFile(b.dataset.open,{title:r&&(ai&&ai.t||r.title)});return}
    if(b.dataset.full){showFull(b.dataset.full,b);return}
    if(b.dataset.tk){const id=b.dataset.tk,r=(S.rows||[]).concat(S.list||[]).find(x=>x.id===id),on=TKI.includes(id);
      if(!on&&!(AI(r||{})||{}).s){alert("هذا التعميم ما له ملخص عربي بعد — سوّ له ملخص أول عشان يطلع واضح في الشريط");return}
      const nx=on?TKI.filter(x=>x!==id):[id,...TKI].slice(0,12);b.disabled=true;
      try{await cfgSet("tick",{ids:nx});TKI=nx;try{localStorage.removeItem("ajf_tick2")}catch(x){}if(window.tickReset)tickReset()}catch(x){alert("تعذّر الحفظ، تأكد من الاتصال")}paintRes();return}
    if(b.id==="cxMore"){recent(true);return}
    if(b.id==="cxReidx"){reindex(b);return}
    if(b.id==="cxSumAll"){sumAll(b);return}
    if(b.id==="axGo"){ask();return}
    if(b.id==="axNew"){S.th=[];S.aerr="";S.aq="";thSave();try{localStorage.removeItem("ajf_ax_q")}catch(x){}paint();return}
    if(b.dataset.asrc){const[ti,i]=b.dataset.asrc.split(":").map(Number);const r=((S.th||[])[ti]||{}).src;const x=r&&r[i];if(!x){alert("ما لقيت هذا المصدر — اضغط «محادثة جديدة» واسأل مرة ثانية");return}
      let c=b;
      /* زر المصدر تحت الجواب: نفتح على أول نص مؤكد ذكره المساعد من هذا الملف */
      if(!b.classList.contains("ax-c")){const a=b.closest(".ax-s"),p=a&&a.previousElementSibling,k=`.ax-c[data-asrc="${ti}:${i}"]`;c=p&&(p.querySelector(k+"[data-q]:not([data-bad])")||p.querySelector(k))||b}
      const ai=AI(x);(x.has_file?viewFile:viewText)(x.id,{pg:c.dataset.pg,q:c.dataset.q,bad:c.dataset.bad,ap:c.dataset.ap,title:ai&&ai.t||x.title});return}
    if(b.id==="cxUpGo"){uploadAll();return}
    if(b.id==="cxUpClr"){S.up=[];paintUp();return}
    if(b.dataset.urm!=null){S.up.splice(+b.dataset.urm,1);paintUp();return}
    if(b.id==="cxNew"){S.edit="__new";const el2=root.querySelector("#cxUp");const nw={id:"__new",title:"",tags:"",cd:new Date(Date.now()+108e5).toISOString().slice(0,10),has_file:false,body:""};
      try{const d=JSON.parse(localStorage.getItem("ajf_cx_draft")||"null");if(d)Object.assign(nw,d)}catch(x){}
      el2.insertAdjacentHTML("afterbegin",`<div class="ci">${editForm(nw)}</div>`);return}
    if(b.dataset.edit){S.edit=S.edit===b.dataset.edit?null:b.dataset.edit;const r=(S.rows||[]).concat(S.list||[]).find(x=>x.id===b.dataset.edit);
      if(r&&!r.has_file&&r.body==null){try{const g=await R("ajf_circ_get",{p_id:r.id});r.body=g.row.body}catch(x){}}paintRes();return}
    if(b.dataset.save){const box=b.closest(".cx-ed"),v=k=>{const i=box.querySelector(`[data-f="${k}"]`);return i?i.value.trim():""};const isNew=b.dataset.save==="__new";
      const old=isNew?{}:(S.rows||[]).concat(S.list||[]).find(x=>x.id===b.dataset.save)||{};
      if(!v("title")){box.querySelector(".m").textContent="اكتب العنوان";return}
      b.disabled=true;b.textContent="…";
      try{let ftext;if(!isNew&&old.has_file){const g=await R("ajf_circ_get",{p_id:old.id});ftext=g.row.ftext}
        const o={id:isNew?newId():old.id,title:v("title"),tags:v("tags"),body:old.has_file?"":v("body"),cdate:v("cd"),lang:old.lang||""};if(ftext!=null)o.ftext=ftext;
        const ix=indexText(Object.assign({},o,{ftext:ftext||""}));o.ntext=ix.ntext;o.ktext=ix.ktext;
        await R("ajf_circ_save",{p:o});F({action:isNew||!AI(old)?"sum":"chunk",id:o.id}).catch(()=>{});if(isNew){try{localStorage.removeItem("ajf_cx_draft")}catch(x){}box.parentElement.remove()}S.edit=null;S.q="";const qi=root.querySelector("#cxQ");if(qi)qi.value="";recent()}
      catch(x){b.disabled=false;b.textContent="حفظ";box.querySelector(".m").textContent=errTxt(x)}return}
    if(b.dataset.del){if(!confirm("حذف هذا التعميم نهائياً؟"))return;try{const j=await R("ajf_circ_del",{p_id:b.dataset.del});if(j.file_path)await F({action:"del",path:j.file_path}).catch(()=>{});
      S.rows=S.rows&&S.rows.filter(x=>x.id!==b.dataset.del);S.list=S.list&&S.list.filter(x=>x.id!==b.dataset.del);S.n=Math.max(0,S.n-1);paintRes()}catch(x){alert(errTxt(x))}}});
  /* مسودة التعميم المكتوب تنحفظ أول بأول */
  el.addEventListener("input",e=>{const box=e.target.closest(".cx-ed");if(!box||!box.querySelector('[data-save="__new"]'))return;const o={};box.querySelectorAll("[data-f]").forEach(i=>o[i.dataset.f]=i.value);try{localStorage.setItem("ajf_cx_draft",JSON.stringify(o))}catch(x){}})}

/* ---------- ربط مع فحص وثائق الراكب ---------- */
let REL=null;const RELC=new Map();
/* بدل عرض التعاميم: نسأل المساعد عن حالة الراكب ونعرض الخلاصة فقط */
async function related(ctx,el){if(!el||!AUTH.tok)return;
  const T=ctx.T,B=ctx.B,P=ctx.P,nm=c=>c&&(c.ar||c.en)||"";const cs=new Map();const addC=c=>{if(c&&c.a2)cs.set(c.a2,c)};
  const nat=(P&&window.TIM&&TIM.countries.find(c=>c.a3===P.nat))||(T&&T.hdr.nat)||null;
  if(T){["nat","tr","dst","emb"].forEach(k=>{if(k!=="emb"||!T.hdr.dst)addC(T.hdr[k])});T.secs.forEach(s=>addC(s.c))}addC(nat);
  const vs=(ctx.V||[]).filter(v=>v.type!=="passport").map(v=>`${v.type==="res"?"إقامة":"تأشيرة"}${v.kind?" "+v.kind:""} ${nm(v.c)}`.trim());
  const parts=[];if(nat)parts.push("الجنسية "+nm(nat));if(T&&T.hdr.dst)parts.push("الوجهة "+nm(T.hdr.dst));if(T&&T.hdr.tr)parts.push("ترانزيت "+nm(T.hdr.tr));
  if(T&&T.hdr.res)parts.push("مقيم في "+nm(T.hdr.res));if(vs.length)parts.push("معه "+vs.join(" و"));
  if(B&&B.codes.length)parts.push("المسار "+B.codes.slice(0,6).join("-"));if(ctx.date)parts.push("تاريخ السفر "+ctx.date);if(ctx.note)parts.push("ملاحظة الموظف: "+ctx.note);
  if(!cs.size&&!parts.length){el.innerHTML="";return}
  const head=`<div class="bd-sec"><span>📢 خلاصة التعاميم لهذا الراكب</span></div>`;
  const q=`راكب مسافر من مطار الجوف: ${parts.join("، ")}. هل فيه تعميم ينطبق عليه (جنسيته أو وجهته أو مطار/دولة الترانزيت أو نوع تأشيرته) مثل منع قبول أو اشتراط تأشيرة دخول لدولة الترانزيت؟ تجاهل التعاميم اللي ما تخصه. إذا فيه: ابدأ بسطر **الخلاصة:** يُقبل أو يُقبل بشرط كذا أو لا يُقبل، ثم المطلوب باختصار. إذا ما فيه قل بسطر واحد: لا يوجد تعميم يخص هذا الراكب. بدون قسم خارج التعاميم وبدون نقل نص التعميم.`.slice(0,600);
  if(RELC.has(q)){const c=RELC.get(q);el.innerHTML=c.h;return c.r}
  el.innerHTML=head+`<div class="bd-empty">… جاري البحث في التعاميم (عادة 10–25 ثانية)</div>`;
  try{const j=await F({action:"ask",q});
    const t=String(j.answer||"").replace(/\s*\[[^\[\]]{1,700}\]/g,"").replace(/\*\*خارج التعاميم[\s\S]*$/,"").trim()||"لا يوجد تعميم يخص هذا الراكب.";
    const none=/لا يوجد تعميم|ما فيه تعميم|ما فيه تعاميم/.test(t)&&t.length<160;
    const h=head+`<div class="ci cx"><div class="cx-sum">${none?"✓ لا يوجد تعميم يخص هذا الراكب":fmtAns(t)}</div><p class="tx-note">خلاصة آلية من التعاميم — للتفاصيل اسأل مساعد التعاميم.</p></div>`;
    /* r: نص الخلاصة للمساعد الذكي تحت التحليل (يُبنى عليه الحكم) — none: ما فيه تعميم يخصه */
    const res={none,t,q};RELC.set(q,{h,r:res});if(el.isConnected)el.innerHTML=h;return res}
  catch(e){el.innerHTML=head+`<div class="bd-empty">${e.message==="nokey"?"مساعد التعاميم غير مفعّل":e.message==="aierr"?"المساعد مشغول — أعد التحليل بعد شوي":E(errTxt(e))}</div>`;return null}}
const MO={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
function parseTd(s){const m=String(s).replace(/O/g,"0").match(/^(\d{2})([A-Z0]{3})(\d{2})$/);if(!m)return null;const mo=MO[m[2].replace(/0/g,"O")];return mo==null?null:new Date(Date.UTC(2000+ +m[3],mo,+m[1]))}

window.CIRCM={mount:(el,q)=>{bind(el);mount(el,q)},related,count:async()=>{const j=await R("ajf_circ_list",{p_offset:0,p_limit:1});return{n:j.n,last:j.rows[0]&&j.rows[0].id}},
  _t:{citeUnits,vwLocate,vwPages,qGroups,indexText,NORM,SK,guessDate,pdfText,fmtAns,cited}};
})();
