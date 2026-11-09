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
  if(!r.ok)throw new Error(r.status===404?"nofn":"fn"+r.status);const j=await r.json();if(j.s==="out"){authOut();throw new Error("out")}if(j.s!=="ok")throw new Error(j.s);return j}
const errTxt=e=>/PGRST202|404|nofn/.test(e.message)?"تحتاج تشغيل إعداد التعاميم في Supabase (circ.sql ودالة ajf-files) — راجع المشرف.":e.message==="denied"?"للمشرف فقط":e.message==="out"?"سجّل دخولك أول":"تعذّر الاتصال، تأكد من الإنترنت";

/* ---------- قراءة ملفات PDF ---------- */
let pdfP=null;
function pdfLib(){if(window.pdfjsLib)return Promise.resolve(pdfjsLib);return pdfP||(pdfP=new Promise((ok,no)=>{const s=document.createElement("script");s.src=PDFJS+"pdf.min.js";
  s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";ok(pdfjsLib)};s.onerror=()=>{pdfP=null;no(new Error("lib"))};document.head.appendChild(s)}))}
async function pdfText(file,onp){const lib=await pdfLib();const doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;const n=doc.numPages,parts=[];let thin=0;
  for(let i=1;i<=n;i++){onp&&onp(`قراءة الصفحة ${i}/${n}`);const pg=await doc.getPage(i),tc=await pg.getTextContent();let s="",lastY=null;
    for(const it of tc.items){const y=it.transform[5];if(lastY!=null&&Math.abs(y-lastY)>4)s+="\n";else if(s&&!s.endsWith(" "))s+=" ";s+=it.str;lastY=y}
    if(s.replace(/\s/g,"").length<40)thin++;parts.push(s)}
  let text=parts.join("\n\n"),ocr=false;
  /* ملف مصوّر (سكانر): نقرأ الصور عربي + إنجليزي — أول 12 صفحة */
  if(thin>=Math.ceil(n*.6)){ocr=true;text="";const max=Math.min(n,12);
    if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement("script");s.src=(window.TESS_BASE||"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/")+"tesseract.min.js";s.onload=ok;s.onerror=()=>no(new Error("lib"));document.head.appendChild(s)});
    const w=await Tesseract.createWorker(["ara","eng"],1,window.TESS_LOCAL||{});
    try{for(let i=1;i<=max;i++){onp&&onp(`قراءة صورة الصفحة ${i}/${max} (ملف مصوّر)`);const pg=await doc.getPage(i),vp=pg.getViewport({scale:2}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;text+=(await w.recognize(cv)).data.text+"\n\n"}}finally{await w.terminate()}}
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
const S={aq:(()=>{try{return localStorage.getItem("ajf_ax_q")||""}catch(e){return""}})(),ans:"",abusy:false,asrc:[],q:"",rows:null,list:null,n:0,busy:false,up:[],upBusy:false,usage:null,edit:null,err:""};
let root=null,qT=null;
function mount(el,q){root=el;if(q!=null)S.q=q;paint();loadSyn().then(()=>{if(S.q)search();else recent()});if(isAdm())F({action:"usage"}).then(j=>{S.usage=j;paintUp()}).catch(()=>{})}
function paint(){if(!root)return;const adm=isAdm();
  root.innerHTML=`<div class="ax"><div class="ax-h"><i>🤖</i><div><b>اسأل المساعد</b><small>اكتب سؤالك بالعربي، ويجاوبك من التعاميم المرفوعة</small></div></div>
    <textarea id="axQ" rows="2" placeholder="مثال: راكب مسافر أمريكا وش يحتاج؟ · الرحلة تأخرت بسبب الطقس وش نسوي؟">${E(S.aq||"")}</textarea>
    <button class="tx-go" id="axGo" ${S.abusy?"disabled":""}>${S.abusy?"… يقرأ التعاميم":"اسأل"}</button><div id="axA">${S.ans||""}</div></div>
    <div class="bd-sec"><span>أو ابحث بكلمة</span></div>
    <div class="cq"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="cxQ" type="search" placeholder="ابحث بالعربي أو الإنجليزي: كلمة أو كلمتين…" value="${E(S.q)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="bd-h" id="cxHint">${S.q?"":"مثال: <b>إيبولا</b> · <b>كرسي متحرك</b> · <b>أمريكا</b> · <b>بطاريات</b> · <b>تأخير البوردنق</b>"}</div>
    ${adm?`<div class="cx-adm"><label class="cx-up"><input type="file" id="cxFiles" accept="application/pdf,.pdf" multiple hidden><span>📎 رفع تعاميم PDF</span><small>تقدر تختار أكثر من ملف</small></label><button class="cx-up" id="cxNew"><span>✍︎ تعميم مكتوب</span><small>بدون ملف</small></button></div><button class="cx-more" id="cxSumAll">🤖 تلخيص التعاميم بالعربي (اللي ما تلخصت)</button><button class="cx-more" id="cxReidx">🔄 إعادة قراءة كل الملفات (بعد أي تحديث للبحث)</button><div id="cxUp"></div>`:""}
    <div id="cxRes"></div>`;paintUp();paintRes()}
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
    <div class="cact">${r.has_file?`<button class="cx-open" data-open="${E(r.id)}">📄 فتح الملف</button>`:""}<button class="ed" data-full="${E(r.id)}">النص كامل</button>${isAdm()?`<button class="ed" data-edit="${E(r.id)}">تعديل</button><button class="x" data-del="${E(r.id)}">حذف</button>`:""}</div>
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
  const u=S.usage?`<div class="cx-use"><i style="width:${Math.min(100,S.usage.used/1073741824*100).toFixed(1)}%"></i><span>المساحة المستخدمة ${kb(S.usage.used||0)} من 1GB · ${S.usage.n} تعميم</span></div>`:"";
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

async function reindex(btn){if(!confirm("إعادة قراءة كل ملفات PDF وتحديث البحث؟ تاخذ دقيقة أو أكثر حسب عدد الملفات."))return;btn.disabled=true;
  try{let all=[],off=0;for(;;){const j=await R("ajf_circ_list",{p_offset:off,p_limit:100});all=all.concat(j.rows);off+=100;if(off>=j.n)break}
    const fl=all.filter(r=>r.has_file);let i=0,bad=0;
    for(const r of fl){i++;btn.textContent=`🔄 ${i}/${fl.length}: ${r.title.slice(0,30)}`;
      try{const g=(await R("ajf_circ_get",{p_id:r.id})).row,u=await F({action:"get",path:r.id+".pdf"}),blob=await(await fetch(u.url)).blob();
        const x=await pdfText(blob,m=>{btn.textContent=`🔄 ${i}/${fl.length}: ${m}`});
        const o={id:r.id,title:g.title,tags:g.tags,body:g.body||"",ftext:x.text,lang:g.lang,cdate:g.cd||"",pages:x.pages};Object.assign(o,indexText(o));await R("ajf_circ_save",{p:o})}catch(e){bad++}}
    btn.textContent=`✓ تمت إعادة قراءة ${fl.length-bad} ملف${bad?" — تعذّر "+bad:""}`}
  catch(e){btn.textContent=errTxt(e)}btn.disabled=false;S.q.trim()?search():recent()}

/* ---------- المساعد ---------- */
function fmtAns(t){let h=E(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[*-]\s+/gm,"• ");
  h=h.replace(/\[(\d{1,2}(?:\s*[,،]\s*\d{1,2})*)\]/g,(m,ns)=>ns.split(/[,،]/).map(n=>`<button class="ax-c" data-asrc="${+n.trim()-1}">${+n.trim()}</button>`).join(""));return h.replace(/\n/g,"<br>")}
/* المصادر اللي ذكرها الجواب فقط */
const cited=t=>{const c=new Set();(String(t).match(/\[(\d{1,2}(?:\s*[,،]\s*\d{1,2})*)\]/g)||[]).forEach(m=>m.replace(/[\[\]]/g,"").split(/[,،]/).forEach(n=>c.add(+n.trim()-1)));return c}
async function ask(){const q=(S.aq||"").trim();if(q.length<3||S.abusy)return;S.abusy=true;S.ans=`<div class="bd-empty">… المساعد يقرأ التعاميم ويجهز الجواب (عادة 5–15 ثانية)</div>`;paint();
  try{const j=await F({action:"ask",q});S.asrc=j.src||[];
    S.ans=`<div class="ax-a">${fmtAns(j.answer||"")}</div>`+(S.asrc.length?`<div class="ax-s"><small>المصادر:</small>${S.asrc.map((r,i)=>{const cs=cited(j.answer);if(cs.size&&!cs.has(i))return"";const a=AI(r);return`<button class="ax-sr" data-asrc="${i}"><i>${i+1}</i><span>${E(a&&a.t||r.title)}</span>${r.has_file?"<em>📄</em>":""}</button>`}).join("")}</div>`:"")+
      `<p class="tx-note">جواب آلي من التعاميم — تأكد من التعميم الأصلي قبل أي قرار مهم.</p>`}
  catch(e){S.ans=`<div class="bd-empty">${e.message==="nokey"?"المساعد غير مفعّل بعد (مفتاح Gemini ناقص).":e.message==="aierr"?"المساعد مشغول أو وصل الحد المجاني بالدقيقة — جرّب بعد شوي.":E(errTxt(e))}</div>`}
  S.abusy=false;paint()}
async function sumAll(btn){btn.disabled=true;try{let all=[],off=0;for(;;){const j=await R("ajf_circ_list",{p_offset:off,p_limit:100});all=all.concat(j.rows);off+=100;if(off>=j.n)break}
    const todo=all.filter(r=>!AI(r));let i=0,bad=0;for(const r of todo){i++;btn.textContent=`🤖 ${i}/${todo.length}: ${r.title.slice(0,30)}`;
      try{await F({action:"sum",id:r.id})}catch(e){bad++;if(e.message==="nokey"){btn.textContent="مفتاح Gemini ناقص";btn.disabled=false;return}await new Promise(o=>setTimeout(o,4000))}}
    btn.textContent=`✓ تلخّص ${todo.length-bad} تعميم${bad?" — تعذّر "+bad+" (جرّب مرة ثانية)":""}`}catch(e){btn.textContent=errTxt(e)}btn.disabled=false;S.q.trim()?search():recent()}

/* ---------- فتح الملف ---------- */
async function openFile(id,btn){const r=(S.rows||[]).concat(S.list||[],REL||[]).find(x=>x.id===id);
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
    if(b.dataset.open){openFile(b.dataset.open,b);return}
    if(b.dataset.full){showFull(b.dataset.full,b);return}
    if(b.id==="cxMore"){recent(true);return}
    if(b.id==="cxReidx"){reindex(b);return}
    if(b.id==="cxSumAll"){sumAll(b);return}
    if(b.id==="axGo"){ask();return}
    if(b.dataset.asrc){const r=(S.asrc||[])[+b.dataset.asrc];if(r&&r.has_file)openFile(r.id,b);return}
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
        await R("ajf_circ_save",{p:o});if(isNew){try{localStorage.removeItem("ajf_cx_draft")}catch(x){}box.parentElement.remove()}S.edit=null;S.q="";const qi=root.querySelector("#cxQ");if(qi)qi.value="";recent()}
      catch(x){b.disabled=false;b.textContent="حفظ";box.querySelector(".m").textContent=errTxt(x)}return}
    if(b.dataset.del){if(!confirm("حذف هذا التعميم نهائياً؟"))return;try{const j=await R("ajf_circ_del",{p_id:b.dataset.del});if(j.file_path)await F({action:"del",path:j.file_path}).catch(()=>{});
      S.rows=S.rows&&S.rows.filter(x=>x.id!==b.dataset.del);S.list=S.list&&S.list.filter(x=>x.id!==b.dataset.del);S.n=Math.max(0,S.n-1);paintRes()}catch(x){alert(errTxt(x))}}});
  /* مسودة التعميم المكتوب تنحفظ أول بأول */
  el.addEventListener("input",e=>{const box=e.target.closest(".cx-ed");if(!box||!box.querySelector('[data-save="__new"]'))return;const o={};box.querySelectorAll("[data-f]").forEach(i=>o[i.dataset.f]=i.value);try{localStorage.setItem("ajf_cx_draft",JSON.stringify(o))}catch(x){}})}

/* ---------- ربط مع فحص وثائق الراكب ---------- */
let REL=null;
async function related(ctx,el){if(!el||!AUTH.tok)return;el.innerHTML=`<div class="bd-sec"><span>📢 تعاميم تخص هذا الراكب</span></div><div class="bd-empty">… جاري البحث في التعاميم</div>`;
  const T=ctx.T,B=ctx.B,P=ctx.P,cs=new Map();const addC=c=>{if(c&&c.a2)cs.set(c.a2,c)};
  if(T){["nat","tr","dst","emb"].forEach(k=>{if(k!=="emb"||!T.hdr.dst)addC(T.hdr[k])});T.secs.forEach(s=>addC(s.c))}
  if(P&&window.TIM){addC(TIM.countries.find(c=>c.a3===P.nat))}
  cs.delete("SA");/* المغادرة من السعودية: ما نبحث بكلمة السعودية لأنها في كل التعاميم */
  const words=[];cs.forEach(c=>{words.push(c.ar,c.en,c.a3)});if(B){B.codes.filter(x=>!["AJF","RUH","JED","DMM","MED","ELQ"].includes(x)).forEach(x=>words.push(x))}
  if(!words.length){el.innerHTML="";return}
  await loadSyn();const G=groupsBase(),alt=new Set();words.forEach(w=>{const n=NORM(w);if(!n)return;alt.add(n);G.forEach(g=>{if(g.has(n)||n.split(" ").every(p=>g.has(p)))g.forEach(x=>alt.add(x))})});
  const grp=[[...alt].filter(n=>n.length>2).slice(0,60).map(n=>({n,k:SK(n)}))];
  try{const j=await R("ajf_circ_search",{p_groups:grp,p_limit:8});REL=j.rows||[];
    const td=T&&T.hdr.date?parseTd(T.hdr.date):null,re=rx(grp[0].map(a=>a.n));
    el.innerHTML=`<div class="bd-sec"><span>📢 تعاميم تخص هذا الراكب</span><small>${REL.length}</small></div>`+(REL.length?REL.map(r=>{const nw=td&&r.cd&&new Date(r.cd+"T00:00:00Z")>=td;
      const a=AI(r);return`<div class="ci cx ${nw?"new":""}"><div class="h"><div><b>${hl(a&&a.t||r.title,re)}</b><small>${fDate(r.cd||r.at)}</small></div>${nw?'<span class="cx-nw">أحدث من تيماتيك ⚠️</span>':r.has_file?'<span class="cx-pdf">PDF</span>':""}</div>${a&&a.s?`<div class="cx-sum">${E(a.s).replace(/\n/g,"<br>")}</div>`:`<p class="sn">${hl(snip(r.txt,re,220),re)}</p>`}
        <div class="cact">${r.has_file?`<button class="cx-open" data-ropen="${E(r.id)}">📄 فتح الملف</button>`:""}</div></div>`}).join(""):`<div class="bd-empty">ما فيه تعاميم مرفوعة تخص ${[...cs.values()].map(c=>c.ar).join(" / ")}</div>`);
    if(!el.__r){el.__r=1;el.addEventListener("click",e=>{const b=e.target.closest("[data-ropen]");if(b){e.stopPropagation();openFile(b.dataset.ropen,b)}})}}
  catch(e){el.innerHTML=`<div class="bd-sec"><span>📢 التعاميم</span></div><div class="bd-empty">${E(errTxt(e))}</div>`}}
const MO={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
function parseTd(s){const m=String(s).replace(/O/g,"0").match(/^(\d{2})([A-Z0]{3})(\d{2})$/);if(!m)return null;const mo=MO[m[2].replace(/0/g,"O")];return mo==null?null:new Date(Date.UTC(2000+ +m[3],mo,+m[1]))}

window.CIRCM={mount:(el,q)=>{bind(el);mount(el,q)},related,count:async()=>{const j=await R("ajf_circ_list",{p_offset:0,p_limit:1});return{n:j.n,last:j.rows[0]&&j.rows[0].id}},
  _t:{qGroups,indexText,NORM,SK,guessDate,pdfText}};
})();
