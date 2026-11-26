/* ---------- اشتراطات السفر (تيماتيك بالعربي) ----------
   الموظف يدخل: الجنسية، الإقامة، المسار والناقلين، نوع التذكرة، والوثائق اللي معه.
   المحرك يطبّق: قاعدة التأشيرات العامة (199 دولة) + قواعد مفصلة من tvkb.js (مصادر رسمية وشركات طيران) + التعاميم عبر المساعد.
   النتيجة: بطاقة لكل محطة (الخروج، الترانزيت، العفش، الوجهة، الجواز) + الخلاصة. */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const K=window.TVKB,GCC=K.GCC;
let PI=null,PIP=null,root=null;
/* مطارات العالم (OurAirports): رمز → [عربي، مدينة، اسم، دولة، حجم] */
let WA={},WAR={},WL={};const carN=c=>K.CAR[c]||(WL[c]?WL[c][1]:c);
const loadPI=()=>PI?Promise.resolve(PI):PIP||(PIP=Promise.all([fetch("tvpi.json?v=1").then(r=>{if(!r.ok)throw new Error("pi");return r.json()}),fetch("tvap.json?v=1").then(r=>r.ok?r.json():{a:[]}).catch(()=>({a:[]}))]).then(([j,w])=>{const ix={};j.c.forEach((c,i)=>ix[c]=i);
  (w.a||[]).forEach(x=>{WA[x[0]]=x});Object.assign(WAR,w.ar||{});(w.al||[]).forEach(x=>{WL[x[0]]=x});PI={...j,ix};return PI}).catch(e=>{PIP=null;throw e}));
let DN=null;try{DN=new Intl.DisplayNames(["ar"],{type:"region"})}catch(e){}
const FIX={SA:"السعودية",PS:"فلسطين",AE:"الإمارات",US:"أمريكا",GB:"بريطانيا",KR:"كوريا الجنوبية",CD:"الكونغو الديمقراطية",CG:"الكونغو",XK:"كوسوفو"};
const cn=c=>!c?"—":FIX[c]||(DN?DN.of(c):c)||c;
const apN=a=>K.AP[a]?K.AP[a][0]:WA[a]?(WA[a][1]||WA[a][2]||WA[a][3]):a,apC=a=>a&&a.startsWith("C:")?a.slice(2):K.AP[a]?K.AP[a][1]:WA[a]?WA[a][4]:"";
const apLabel=a=>a&&a.startsWith("C:")?cn(a.slice(2)):`${apN(a)} ${a}`;
const TOP_NAT=["SA","EG","SD","YE","SY","JO","PS","PK","IN","BD","PH","ID","LK","NP","ET","IQ","LB","MA","TN","DZ","TR","AF","SO","ER","NG","KE","UG","SS","LY","MR","IR","AE","KW","QA","BH","OM"];
const SUP={US:"أمريكا",UK:"بريطانيا",SCH:"شنغن",IE:"أيرلندا",CA:"كندا"};
/* حالة النموذج */
const S={nat:"",st:"",res:"",age:"",sex:"",sup:[],ebola:false,ticket:"",legs:[{to:"",car:"",h:""}],visas:{},txt:"",out:null,th:[],busy:false,aq:""};
try{const o=JSON.parse(sessionStorage.getItem("ajf_tv")||"null");if(o)Object.assign(S,o,{out:null,busy:false})}catch(e){}
const save=()=>{try{const{out,busy,...k}=S;sessionStorage.setItem("ajf_tv",JSON.stringify(k))}catch(e){}};

/* ---------- المحرك ---------- */
const inL=(x,l)=>!!x&&l.some(v=>v==="GCC"?GCC.includes(x):v===x);
const ageIn=(a,r)=>a>=r[0]&&a<=r[1];
/* 1 ينطبق · 0 ما ينطبق · 2 يعتمد على معلومة ناقصة (يرجع الشرط بالعربي) */
function match(r,P,x){const need=[];
  if(r.nat&&!inL(P.nat,r.nat))return[0];
  if(r.natNot&&inL(P.nat,r.natNot))return[0];
  if(r.res&&!inL(P.res,r.res))return[0];
  if(r.resNot&&inL(P.res,r.resNot))return[0];
  if(r.ap&&!r.ap.includes(x.ap))return[0];
  if(r.dest&&!inL(x.final,r.dest))return[0];
  if(r.ebola&&!P.ebola)return[0];
  if(r.visaOnly&&!x.hasVisa)return[0];
  if(r.onlyIfBase&&!r.onlyIfBase.includes((x.base||"")[0]))return[0];
  if(r.sex){if(!P.sex)need.push(r.sex==="M"?"رجل":"امرأة");else if(P.sex!==r.sex)return[0]}
  if(r.age){if(P.age==null)need.push(`عمره من ${r.age[0]} إلى ${r.age[1]}`);else if(!ageIn(P.age,r.age))return[0]}
  if(r.notIf){const n=r.notIf;let sexHit=n.sex?(P.sex?P.sex===n.sex:null):true,ageHit=n.age?(P.age!=null?ageIn(P.age,n.age):null):true;
    if(sexHit===true&&ageHit===true)return[0];
    if(sexHit===null||ageHit===null){if(sexHit!==false&&ageHit!==false)need.push(n.sex&&n.age?`ما يكون ${n.sex==="M"?"رجل":"امرأة"} عمره من ${n.age[0]} إلى ${n.age[1]}`:n.age?`عمره أقل من ${n.age[0]} أو فوق ${n.age[1]}`:"")}}
  if(r.sup){if(!r.sup.some(s=>P.sup.includes(s)))need.push("معه تأشيرة أو إقامة سارية من "+r.sup.map(s=>SUP[s]).join(" أو "))}
  if(r.car){if(!x.car||!x.car.length)need.push("الناقل "+r.car.map(c=>K.CAR[c]||c).join(" أو "));else if(!r.car.some(c=>x.car.includes(c)))return[0]}
  return need.length?[2,need.filter(Boolean).join(" و")]:[1]}
let TK="";const rules=(c,s)=>K.R.filter(r=>(r.c===c||(r.c==="*"&&c==="*"))&&r.s===s&&!(r.tk&&TK&&r.tk!==TK));
const ST={F:["ok","بدون تأشيرة"],V:["ok","تأشيرة عند الوصول"],E:["w","تأشيرة إلكترونية مسبقة"],T:["w","تصريح سفر إلكتروني ETA مسبق"],R:["w","تأشيرة مسبقة مطلوبة"],N:["x","الدخول غير مسموح"]};
const stTxt=s=>{if(!s||s==="-")return null;const k=ST[s[0]];return k?[k[0],k[1]+(s.length>1?` (${s.slice(1)} يوم)`:"")]:null};
const RANK={ok:0,i:0,w:1,x:2};const worse=(a,b)=>RANK[b]>RANK[a]?b:a;
function line(r,lv,cond){const s=K.SRC[r.src]||{};return{lv,t:r.t,cond,src:s.t,u:s.u}}
/* دخول بلد c (وجهة نهائية أو ترانزيت يطلع فيه من المطار) */
function entry(P,c,x){const L=[];let lv="ok",head,detailed=K.R.some(r=>r.c===c&&r.s==="entry");
  const hasVisa=P.visas[c]===1;
  if(P.nat===c){return{lv:"ok",head:"مواطن — يدخل بلده",L:ppL(P,c,x),detailed:true}}
  if(GCC.includes(P.nat)&&GCC.includes(c))return{lv:"ok",head:"مواطن خليجي — يدخل بالهوية الوطنية أو الجواز",L:ppL(P,c,x),detailed:true};
  if(P.res===c)return{lv:"ok",head:"مقيم في "+cn(c)+" — يرجع بإقامته (تأكد إنها سارية)",L:ppL(P,c,x),detailed:true};
  const base=PI&&PI.m[P.nat]?PI.m[P.nat].split(",")[PI.ix[c]]:null;const b=stTxt(base);
  if(hasVisa){lv="ok";head="معه تأشيرة/إذن دخول سارٍ لـ "+cn(c)}
  else if(b){lv=b[0];head=b[1]}else{lv="w";head="ما عندنا بيانات عامة لهالجنسية — تأكد"}
  const X={...x,hasVisa,base};let over=null;
  for(const r of rules(c,"entry")){if(hasVisa&&!r.ev&&r.lv!=="i")continue;const[m,cond]=match(r,P,X);if(!m)continue;
    if(r.lv==="ok"){if(m===1&&!hasVisa){over=r;const t=stTxt(r.st);if(t){lv=t[0];head=t[1]}L.push(line(r,"ok"))}else if(m===2)L.push(line(r,"i",cond));continue}
    if(hasVisa&&r.vok&&r.lv==="x"){const l=line(r,"w",m===2?cond:undefined);l.t="معه تأشيرة: تأكد إنها صادرة مع الموافقة المطلوبة — "+l.t;if(m===1)lv=worse(lv,"w");L.push(l);continue}
    if(m===1){if(r.lv==="x"&&lv!=="x")head=r.t.split(/[.،(]/)[0];lv=worse(lv,r.lv);L.push(line(r,r.lv))}else L.push(line(r,r.lv==="x"?"w":r.lv,cond))}
  if(!hasVisa&&b&&!over&&lv==="w")L.unshift({lv:"w",t:`حسب القاعدة العامة: ${b[1]} لحامل جواز ${cn(P.nat)} إلى ${cn(c)}. إذا معه تأشيرة أو إقامة سارية حط علامة في «الوثائق» تحت.`,src:K.SRC.pi.t,u:K.SRC.pi.u});
  if(!detailed)L.push({lv:"i",t:"ما عندنا قواعد مفصلة لهالبلد — الحكم من القاعدة العامة فقط، والحالات الخاصة (إقامة، عمر، موافقات) ممكن تختلف.",src:K.SRC.pi.t,u:K.SRC.pi.u});
  return{lv,head,L:L.concat(ppL(P,c,x)),detailed}}
function ppL(P,c,x){return rules(c,"pp").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]).map(([r,m])=>line(r,"i",m[1]))}
const TWOVH={SA:12,EG:24,LB:12};
/* تحليل المسار كامل */
function analyze(P){TK=P.ticket||"";const legs=P.legs.filter(l=>l.to),pts=["AJF",...legs.map(l=>l.to)],out=[];
  if(legs.length<1)return null;
  const final=apC(pts[pts.length-1]),x0={final};
  /* الخروج من السعودية: أول نقطة دولية */
  const exitL=rules("SA","exit").map(r=>[r,match(r,P,x0)]).filter(([r,m])=>m[0]).map(([r,m])=>line(r,m[0]===1?r.lv:"w",m[1]));
  let lvAll="ok";
  out.push({k:"exit",ic:"🇸🇦",t:"المغادرة من السعودية",lv:exitL.reduce((a,l)=>worse(a,l.lv),"ok"),head:exitL.length?"":"ما فيه شرط خاص للمغادرة",L:exitL});
  for(let i=1;i<pts.length-1;i++){const ap=pts[i],c=apC(ap),inCar=legs[i-1].car,outCar=legs[i].car,h=+legs[i-1].h||null,car=[inCar,outCar].filter(Boolean),x={final,car,ap};
    const card={k:"tr",ic:"🔁",t:`ترانزيت: ${apLabel(ap)}`,L:[],lv:"ok"};
    if(c==="SA"&&pts.slice(0,i).every(p=>apC(p)==="SA")){card.head="ترانزيت داخل السعودية قبل الرحلة الدولية — ما يحتاج تأشيرة";card.L.push({lv:"i",t:P.ticket==="sep"?"تذاكر منفصلة: يستلم عفشه في "+apN(ap)+" ويخلص إجراءات الرحلة الدولية من جديد — انتبه لوقت الربط.":P.ticket==="one"?"تذكرة وحدة: العفش ينشحن لآخر محطة عادة.":"إذا التذكرة وحدة العفش ينشحن لآخر محطة عادة؛ إذا منفصلة يستلمه ويخلص إجراءات الرحلة الدولية من جديد."});out.push(card);continue}
    /* هل يقدر يبقى داخل المطار؟ */
    const tw=rules(c,"twov").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]);
    let twBlock=false;const circ=tw.some(([r,m])=>r.vis&&m[0]===1);if(tw.some(([r,m])=>r.circ&&m[0]===1))card.circ=1;
    tw.forEach(([r,m])=>{if(circ&&!r.vis&&r.lv==="ok")return;if(r.vis){const ok=P.visas[c]===1,l=line(r,m[0]===1?(ok?"ok":"x"):"w",m[1]);if(ok)l.t="معه تأشيرة للإمارات ✓ — "+l.t;if(l.lv==="x")twBlock=true;card.L.push(l);return}
      if(r.lv==="x"&&m[0]===1)twBlock=true;card.L.push(line(r,m[0]===1?r.lv:(r.lv==="x"?"w":r.lv),m[1]))});
    if(!tw.length)card.L.push({lv:"i",t:"ما عندنا قاعدة ترانزيت مفصلة لهالمطار — عادة الترانزيت داخل المطار بدون تأشيرة إذا العفش ينشحن لآخر محطة والرحلة التالية من نفس المطار، لكن بعض الدول تشترط تأشيرة ترانزيت لجنسيات معينة. تأكد.",src:K.SRC.pi.t,u:K.SRC.pi.u});
    const mx=TWOVH[c];const tooLong=h&&mx&&h>mx;
    if(tooLong)card.L.push({lv:"w",t:`مدة الانتظار ${h} ساعة أطول من الحد المعتاد للبقاء داخل المطار (${mx} ساعة) — غالباً يحتاج تأشيرة دخول أو ترانزيت.`});
    /* العفش */
    const bagR=rules(c,"bag").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]);
    let bagsOut;
    if(P.ticket==="one"){bagsOut=false;card.L.push({lv:"ok",t:circ?"تذكرة وحدة: العفش ينشحن عادة لآخر محطة.":"تذكرة وحدة: العفش ينشحن عادة لآخر محطة، والراكب يبقى داخل المطار."})}
    else if(P.ticket==="sep"){bagsOut=true;const fz=bagR.find(([r,m])=>r.car&&m[0]===1);
      card.L.push({lv:"w",t:`تذاكر منفصلة: ${fz?"ممكن يشحن العفش لآخر محطة برسوم إذا الناقل الثاني شريك (شوف تحت)، وإلا ":""}يستلم عفشه في ${apN(ap)} ويطلع من الجوازات — فيحتاج إذن دخول لـ ${cn(c)}.`})}
    else card.L.push({lv:"w",t:"حدد نوع التذكرة (وحدة أو منفصلة) — يغيّر الحكم: مع التذاكر المنفصلة غالباً يستلم عفشه ويطلع من الجوازات."});
    bagR.forEach(([r,m])=>card.L.push(line(r,"i",m[1])));
    rules("*","bag").forEach(r=>card.L.push(line(r,"i")));
    card.lv=card.L.reduce((a,l)=>worse(a,l.lv),"ok");
    if(twBlock)card.lv="x";
    /* إذا لازم يطلع من المطار: هل يحق له الدخول؟ */
    if(bagsOut||tooLong||P.ticket===""){const e=entry(P,c,x);card.ent=e;
      const tv=rules(c,"tvisa").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]).map(([r,m])=>line(r,"i",m[1]));
      card.ent.L=card.ent.L.concat(tv);
      if(bagsOut||tooLong)card.lv=worse(card.lv,e.lv);
      card.head=bagsOut||tooLong?`لازم يطلع من الجوازات في ${apN(ap)} — ${e.head}`:`إذا اضطر يطلع من المطار: ${e.head}`}
    else card.head=twBlock?"⛔ ما يمشي الترانزيت هنا بالوضع الحالي — شوف السبب تحت":"يبقى داخل المطار";
    out.push(card)}
  /* الوجهة النهائية */
  const fc=final,e=entry(P,fc,{final,car:[legs[legs.length-1].car].filter(Boolean)});
  out.push({k:"dst",ic:"🛬",t:`الوجهة: ${apLabel(pts[pts.length-1])}`,lv:e.lv,head:e.head,L:e.L});
  out.forEach(c=>{lvAll=worse(lvAll,c.lv)});
  const needs=[];out.forEach(c=>{if(c.lv==="w"||c.lv==="x"){const h=c.head||(c.L.find(l=>l.lv===c.lv)||{}).t||"";needs.push(c.t+": "+h)}});
  const missing=[];if(!P.ticket&&legs.length>1)missing.push("نوع التذكرة");
  const allL=out.flatMap(c=>c.L.concat(c.ent?c.ent.L:[]));if(P.age==null&&allL.some(l=>l.cond&&/عمر/.test(l.cond)))missing.push("العمر");if(!P.sex&&allL.some(l=>l.cond&&/رجل|امرأة/.test(l.cond)))missing.push("الجنس");
  return{cards:out,lv:lvAll,needs,missing,final,pts}}

/* ---------- فهم الحالة المكتوبة بالعربي ---------- */
const AN=s=>String(s||"").normalize("NFKC").replace(/[ً-ْـ]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).toLowerCase();
const DEM={"سعودي":"SA","مصري":"EG","سوداني":"SD","جنوب سوداني":"SS","يمني":"YE","سوري":"SY","اردني":"JO","فلسطيني":"PS","باكستاني":"PK","هندي":"IN","بنغالي":"BD","بنجلاديشي":"BD","بنقالي":"BD","فلبيني":"PH","اندونيسي":"ID","سريلانكي":"LK","نيبالي":"NP","اثيوبي":"ET","حبشي":"ET","عراقي":"IQ","لبناني":"LB","مغربي":"MA","تونسي":"TN","جزائري":"DZ","تركي":"TR","افغاني":"AF","صومالي":"SO","ارتيري":"ER","اريتري":"ER","نيجيري":"NG","كيني":"KE","اوغندي":"UG","ليبي":"LY","موريتاني":"MR","ايراني":"IR","اماراتي":"AE","كويتي":"KW","قطري":"QA","بحريني":"BH","عماني":"OM","صيني":"CN","امريكي":"US","بريطاني":"GB","كندي":"CA","فرنسي":"FR","الماني":"DE","روسي":"RU","تشادي":"TD","نيجري":"NE","مالي":"ML","سنغالي":"SN","غاني":"GH","كاميروني":"CM","بورمي":"MM","اوزبكي":"UZ","فيتنامي":"VN","تايلندي":"TH","ماليزي":"MY"};
const CITY={"الجوف":"AJF","سكاكا":"AJF","الرياض":"RUH","جده":"JED","جدة":"JED","الدمام":"DMM","المدينه":"MED","القصيم":"ELQ","تبوك":"TUU","القاهره":"CAI","سوهاج":"HMB","الاسكندريه":"HBE","برج العرب":"HBE","الاقصر":"LXR","اسوان":"ASW","الغردقه":"HRG","شرم":"SSH",
  "دبي":"DXB","الشارقه":"SHJ","ابوظبي":"AUH","ابو ظبي":"AUH","الدوحه":"DOH","قطر":"DOH","الكويت":"KWI","البحرين":"BAH","مسقط":"MCT","عمان الاردن":"AMM","عمان":"C:OM","الاردن":"AMM","بغداد":"BGW","البصره":"BSR","النجف":"NJF","اربيل":"EBL","دمشق":"DAM","حلب":"ALP","بيروت":"BEY","لبنان":"BEY",
  "اسطنبول":"IST","تركيا":"IST","عدن":"ADE","صنعاء":"SAH","بورتسودان":"PZU","بور سودان":"PZU","الخرطوم":"KRT","كراتشي":"KHI","لاهور":"LHE","اسلام اباد":"ISB","بيشاور":"PEW","دلهي":"DEL","مومباي":"BOM","بومباي":"BOM","كوتشي":"COK","كيرلا":"COK","حيدر اباد":"HYD","كاليكوت":"CCJ",
  "دكا":"DAC","مانيلا":"MNL","جاكرتا":"CGK","كولومبو":"CMB","كاتماندو":"KTM","اديس ابابا":"ADD","نيروبي":"NBO","تونس":"TUN","الدار البيضاء":"CMN","الجزائر":"ALG","لندن":"LHR","باريس":"CDG","فرانكفورت":"FRA","نيويورك":"JFK",
  "مصر":"CAI","الامارات":"DXB","السعوديه":"RUH","السودان":"PZU","اليمن":"ADE","سوريا":"DAM","العراق":"BGW","باكستان":"KHI","الهند":"DEL","بنغلاديش":"DAC","الفلبين":"MNL","اندونيسيا":"CGK","سريلانكا":"CMB","نيبال":"KTM","اثيوبيا":"ADD","كينيا":"NBO","المغرب":"CMN","امريكا":"JFK","بريطانيا":"LHR","فرنسا":"CDG","المانيا":"FRA"};
const CARN={"السعوديه":"SV","الخطوط السعوديه":"SV","ناس":"XY","طيران ناس":"XY","اديل":"F3","فلاي دبي":"FZ","فلاي دباي":"FZ","الاماراتيه":"EK","طيران الامارات":"EK","الاتحاد":"EY","العربيه":"G9","القطريه":"QR","مصر للطيران":"MS","اير كايرو":"SM","ايركايرو":"SM","النيل":"NP","الملكيه الاردنيه":"RJ","الكويتيه":"KU","الجزيره":"J9","طيران الخليج":"GF","العماني":"WY","التركيه":"TK","بيغاسوس":"PC","الباكستانيه":"PK","انديغو":"6E","اندغو":"6E","انديقو":"6E","انديجو":"6E","اندقو":"6E","فلاي ناس":"XY","فلاي اديل":"F3","الطيران العماني":"WY","الجزيره للطيران":"J9","طيران الهند":"AI","الفلبينيه":"PR","الاثيوبيه":"ET","اليمنيه":"IY","طيران الرياض":"RX"};
function parse(txt){const t=" "+AN(txt).replace(/[،,.؛]/g," ")+" ",o={};
  const near=(re)=>{const m=t.match(re);return m?m.index:-1};
  /* الجنسية: أول صفة جنسية في الكلام (مو بعد «ب» أو داخل عبارة تأشيرة/إقامة) */
  let best=null;for(const[k,v]of Object.entries(DEM)){const kk=AN(k);const re=new RegExp("(^|\\s|ال)"+kk+"(ه|يه|ين)?(?=\\s|$)","g");let m;
    while((m=re.exec(t))){const i=m.index,pre=t.slice(Math.max(0,i-14),i+1);if(/بال$|ب$/.test(t.slice(Math.max(0,i-2),i+1).replace(/\s/g,"")))continue;
      if(/(تاشير|فيزا|اقام|جواز|جرين|الخطوط|طيران|علي)\S*\s*$/.test(pre))continue;if(!best||i<best[2]||(i===best[2]&&kk.length>best[3]))best=[v,m,i,kk.length]}}
  if(best){o.nat=best[0];if(/(ه|يه)$/.test(best[1][0].trim()))o.sex="F"}
  if(/\s(امراه|حرمه|سيده|بنت|مره|ست)\s/.test(t))o.sex="F";if(/\s(رجل|شاب|ولد|ريال)\s/.test(t))o.sex="M";
  const ag=t.match(/(?:عمره|عمرها|العمر)\s*(\d{1,2})|(\d{1,2})\s*(?:سنه|سنين|عام)/);if(ag)o.age=+(ag[1]||ag[2]);
  if(/تذكرتين|تذاكر منفصل|منفصله|منفصلين|تذكره منفصله|حجزين/.test(t))o.ticket="sep";else if(/تذكره وحده|تذكره واحده|نفس التذكره|حجز واحد|تذكره وحد/.test(t))o.ticket="one";
  o.sup=[];[["امريك","US"],["بريطان","UK"],["شنغن","SCH"],["شنجن","SCH"],["اوروب","SCH"],["ايرلند","IE"],["كندا","CA"]].forEach(([k,v])=>{if(new RegExp("(تاشير|فيزا|اقام|جرين)[^\\s]*\\s+(\\S+\\s+)?"+k).test(t))o.sup.push(v)});
  if(/ايبولا|الكونغو/.test(t))o.ebola=true;
  /* وضعه في السعودية */
  if(/(تاشير|فيزا)\S*\s+(زيار|زياره)|\sزيار(ه|ة)?\s/.test(t))o.st="visit";else if(/(تاشير|فيزا)\S*\s+عمر|\sمعتمر|\sعمره\s/.test(t))o.st="umrah";else if(/سياح/.test(t))o.st="tour";
  /* الإقامة */
  const rm=t.match(/مقيم[ه]?\s+(?:في\s+|ب)?(\S+)/);let resPos=-1;
  if(rm){resPos=rm.index;const w=rm[1];const ap=Object.entries(CITY).find(([k])=>w.startsWith(AN(k))||w.startsWith(AN(k).replace(/^ال/,"")));if(ap){o.res=apC(ap[1])||ap[1].slice(2);if(o.res==="SA"){o.st="res";delete o.res}}}
  if(!o.st&&/\sاقامه\s|\sاقامته\s|مقيم\s/.test(t))o.st="res";
  /* الأماكن بترتيب ورودها */
  const carSpans=[];for(const k of Object.keys(CARN)){const kk=AN(k);let i=t.indexOf(kk);while(i>=0){carSpans.push([i,i+kk.length]);i=t.indexOf(kk,i+1)}}
  const inCar=i=>carSpans.some(([a,b])=>i+1>=a&&i+1<b);
  const hits=[];for(const[k,v]of [...Object.entries(CITY),...Object.entries(WAR).filter(([k])=>!CITY[AN(k)])]){const kk=AN(k);let i=t.indexOf(" "+kk);if(i<0)i=t.indexOf(" ب"+kk.replace(/^ال/,"ال"));while(i>=0){const e=t.indexOf(kk,i)+kk.length;if(!(rm&&i>=resPos&&i<resPos+rm[0].length)&&!inCar(i)&&(e>=t.length||t[e]===" "))hits.push([i,v,kk.length]);i=t.indexOf(" "+kk,i+1)}}
  hits.sort((a,b)=>a[0]-b[0]||b[2]-a[2]);const pl=[];hits.forEach(h=>{if(pl.length&&h[0]<pl[pl.length-1][0]+pl[pl.length-1][2])return;if(h[1]==="AJF")return;pl.push(h)});
  /* الترانزيت: الأماكن بعد «عن طريق/ترانزيت/عبر/من…» تجي أول، والباقي بترتيب ذكره */
  const trw=/(عن طريق|ترانزيت|عبر|مرورا|مرور|via|يمر|بيمر|ربط|\sمن)/g;let m,trIdx=[];while((m=trw.exec(t)))trIdx.push(m.index+m[0].length);
  const isTr=p=>trIdx.some(i=>p[0]>=i-1&&p[0]-i<14);
  const tr=pl.filter(isTr).map(p=>p[1]),rest=pl.filter(p=>!isTr(p)).map(p=>p[1]);
  const route=[];[...tr,...rest].forEach(a=>{if(!route.includes(a))route.push(a)});
  if(route.length)o.legs=route.map(a=>({to:a,car:"",h:""}));
  /* الناقلين بترتيبهم: بالاسم العربي أو الرمز (FZ, 6E, SV…) */
  const ch=[];for(const[k,v]of Object.entries(CARN)){const kk=AN(k);let i=t.indexOf(kk);if(i>=0&&!(kk==="السعوديه"&&!/(الخطوط|طيران|علي)\s*السعوديه/.test(t)))ch.push([i,v,kk.length])}
  const cre=new RegExp("(^|[^a-z0-9])("+[...new Set([...Object.keys(K.CAR),...Object.keys(WL)])].map(c=>c.toLowerCase()).join("|")+")(?=$|[^a-z0-9])","g");while((m=cre.exec(t)))ch.push([m.index+m[1].length,m[2].toUpperCase(),m[2].length]);
  ch.sort((a,b)=>a[0]-b[0]||b[2]-a[2]);const cs=[];ch.forEach(c=>{if(cs.length&&c[0]<cs[cs.length-1][0]+cs[cs.length-1][2])return;cs.push(c)});
  if(o.legs&&cs.length){o.legs.forEach((l,i)=>{l.car=cs.length===1?cs[0][1]:(cs[i]?cs[i][1]:"")})}
  const hm=t.match(/(\d{1,2})\s*ساع/);if(hm&&o.legs&&o.legs.length>1)o.legs[0].h=hm[1];
  /* تأشيرة للوجهة */
  if(o.legs){o.legs.forEach(l=>{const c=apC(l.to);if(c&&new RegExp("معه\\s+(تاشير|فيزا|اقام)[^\\s]*\\s+(\\S+\\s+)?("+Object.entries(CITY).filter(([k,v])=>apC(v)===c).map(([k])=>AN(k)).join("|")+")").test(t)){(o.visas=o.visas||{})[c]=1}})}
  return o}

/* ---------- الواجهة ---------- */
const CSS=`.tv{display:grid;gap:12px;min-width:0}.tv-h{display:flex;gap:10px;align-items:center}.tv-h i{font-style:normal;font-size:26px}.tv-h b{display:block;font-size:16px}.tv-h small{color:var(--muted);font-size:12px}
.tv-box{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px;display:grid;gap:10px}
.tv-box>b{font-size:13px;color:var(--muted);font-weight:600}
.tv textarea,.tv select,.tv input[type=number]{width:100%;box-sizing:border-box;background:var(--raise,#111);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:15px;min-width:0}
.tv-r{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tv-r3{display:grid;grid-template-columns:1.3fr 1fr .7fr;gap:6px;align-items:end}
.tv label.l{display:grid;gap:4px;font-size:12px;color:var(--muted)}
.tv-chips{display:flex;flex-wrap:wrap;gap:6px}.tv-chips button{border:1px solid var(--line);background:none;color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px}.tv-chips button.on{background:var(--c,#d9c8a8);color:#111;border-color:transparent;font-weight:700}
.tv-leg{display:grid;gap:6px;padding:8px;border:1px dashed var(--line);border-radius:12px}.tv-leg .n{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}.tv-leg .n button{background:none;border:0;color:var(--muted);font-size:13px}
.tv-add{border:1px dashed var(--line);background:none;color:var(--ink);border-radius:12px;padding:9px;font:inherit}
.tv-go{height:52px;border-radius:16px;background:var(--c,#d9c8a8);color:#110b07;font:700 17px var(--body);border:0}.tv-go:disabled{opacity:.5}
.tv-sm{border:1px solid var(--line);background:none;color:var(--ink);border-radius:12px;padding:9px 12px;font:inherit;font-size:14px}
.tv-v{border-radius:16px;padding:14px;display:grid;gap:6px;border:1px solid var(--line)}.tv-v b{font-size:17px}.tv-v.ok{background:color-mix(in oklab,#2fa86a 18%,var(--panel))}.tv-v.w{background:color-mix(in oklab,#e0a526 18%,var(--panel))}.tv-v.x{background:color-mix(in oklab,#e0523a 20%,var(--panel))}
.tv-v ul{margin:0;padding-inline-start:18px;font-size:13px;display:grid;gap:3px}.tv-v small{color:var(--muted);font-size:12px}
.tv-c{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px;display:grid;gap:8px}.tv-c .h{display:flex;gap:8px;align-items:flex-start}.tv-c .h i{font-style:normal;font-size:18px}.tv-c .h b{display:block;font-size:15px}.tv-c .h span{font-size:13px}
.tv-mk{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;color:#111}.tv-mk.ok{background:#3cc47c}.tv-mk.w{background:#f0b429}.tv-mk.x{background:#f0614a}.tv-mk.i{background:#8a9bb0}
.tv-l{display:flex;gap:8px;font-size:13.5px;line-height:1.6}.tv-l .tv-mk{width:20px;height:20px;font-size:11px;margin-top:2px}.tv-l small{display:block;color:var(--muted);font-size:11.5px}.tv-l small a{color:inherit}.tv-l em{font-style:normal;color:#f0b429}
.tv-sub{border-top:1px dashed var(--line);padding-top:8px;display:grid;gap:8px}.tv-sub>b{font-size:13px}
.tv-ai{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px;display:grid;gap:10px}.tv-ai .a{font-size:14px;line-height:1.75;white-space:normal}.tv-ai .q{font-size:13px;color:var(--muted)}
.tv-note{font-size:12px;color:var(--muted);line-height:1.6}
.tv-miss{border-color:#f0614a!important;box-shadow:0 0 0 1px #f0614a inset;border-radius:12px}.tv-chips.tv-miss{padding:4px;border:1px solid #f0614a}
.tv-vq{display:grid;gap:6px;padding:8px;border:1px solid transparent;border-radius:12px}.tv-vq span{font-size:13.5px}
.tv-req{font-size:14px;line-height:1.7}.tv-req ul{margin:4px 0 0;padding-inline-start:20px}.tv-req b{color:#f0614a}.tv-req.o b{color:#f0b429}
.tv-cv{border-radius:16px;padding:12px;border:1px solid var(--line);background:var(--panel);display:grid;gap:8px}.tv-cv .a{font-size:14px;line-height:1.75}
.tv-wait{display:flex;gap:8px;align-items:center;font-size:14px}
.tv-pk{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;min-width:0;background:var(--raise,#141414);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:15px;text-align:start}.tv-pk span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tv-pk i{font-style:normal;color:var(--muted);flex:none}.tv-pk.e span{color:var(--muted)}
.tv-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end}
.tv-sh{width:100%;box-sizing:border-box;max-height:88vh;background:#0b0b0b;border-top:1px solid #262626;border-radius:20px 20px 0 0;display:flex;flex-direction:column;padding:12px 12px calc(12px + env(safe-area-inset-bottom));gap:10px;direction:rtl;color:#f2f2f2;font-family:var(--body,system-ui)}
.tv-sh-h{display:flex;justify-content:space-between;align-items:center}.tv-sh-h b{font-size:16px}.tv-sh-h button{background:none;border:0;color:#9a9a9a;font:inherit;font-size:14px}
.tv-sh-q{width:100%;box-sizing:border-box;background:#141414;color:#f2f2f2;border:1px solid #262626;border-radius:12px;padding:12px;font:inherit;font-size:16px}
.tv-sh-l{overflow:auto;-webkit-overflow-scrolling:touch;display:grid;gap:2px;align-content:start}.tv-sh-l button{display:flex;justify-content:space-between;align-items:center;background:none;border:0;border-bottom:1px solid #1a1a1a;color:#f2f2f2;padding:12px 6px;font:inherit;font-size:15px;text-align:start}.tv-sh-l button small{color:#9a9a9a;font-size:12px}.tv-sh-l button.on{color:#d9c8a8;font-weight:700}
.tv-sh-g{font-size:12px;color:#9a9a9a;padding:10px 6px 4px}
.tv-ov.top{align-items:stretch}.tv-ov.top .tv-sh{max-height:none;height:100%;box-sizing:border-box;border-radius:0 0 20px 20px;border-top:0;border-bottom:1px solid #262626;padding-top:calc(12px + env(safe-area-inset-top));padding-bottom:12px}.tv-ov.top .tv-sh-l{flex:1;min-height:0}`;
const MK={ok:"✓",w:"!",x:"✕",i:"i"};
const mk=l=>`<span class="tv-mk ${l}">${MK[l]}</span>`;
/* ---------- قائمة اختيار مع بحث (بدل القوائم العادية) ---------- */
let EN=null;try{EN=new Intl.DisplayNames(["en"],{type:"region"})}catch(e){}
const enN=c=>{try{return EN?EN.of(c):""}catch(e){return""}};
function natItems(){const all=PI?PI.c:TOP_NAT;const rest=all.filter(c=>!TOP_NAT.includes(c)).sort((a,b)=>cn(a).localeCompare(cn(b),"ar"));
  return[...TOP_NAT.map(c=>({v:c,l:cn(c),s:c,g:"الأكثر"})),...rest.map(c=>({v:c,l:cn(c),s:c,g:"كل الدول"}))].map(o=>({...o,k:AN(o.l+" "+o.v+" "+enN(o.v))}))}
function apItems(){const by={};Object.entries(K.AP).forEach(([a,[n,c]])=>{if(a!=="AJF")(by[c]=by[c]||[]).push(a)});
  const cs=Object.keys(by).sort((a,b)=>a==="SA"?-1:b==="SA"?1:cn(a).localeCompare(cn(b),"ar"));const out=[];
  cs.forEach(c=>by[c].forEach(a=>out.push({v:a,l:apN(a),s:a,g:cn(c),k:AN(apN(a)+" "+a+" "+cn(c)+" "+enN(c))})));
  Object.values(WA).forEach(x=>{if(K.AP[x[0]])return;out.push({v:x[0],l:(x[1]||x[2]||x[3])+(x[2]&&x[3]&&x[3]!==x[2]?" — "+x[3]:""),s:x[0]+" · "+cn(x[4]),g:"مطارات العالم",w:1,rk:x[5],k:AN([x[1],x[2],x[3],x[0],cn(x[4]),enN(x[4])].join(" "))})});
  (PI?PI.c:[]).filter(c=>!by[c]).sort((a,b)=>cn(a).localeCompare(cn(b),"ar")).forEach(c=>out.push({v:"C:"+c,l:cn(c),s:"أي مطار",g:"دول أخرى",k:AN(cn(c)+" "+c+" "+enN(c))}));
  return out}
function carItems(){return[...Object.entries(K.CAR).map(([k,v])=>({v:k,l:v,s:k,g:"الناقلين",k:AN(v+" "+k+" "+(WL[k]?WL[k][1]:""))})),...Object.values(WL).filter(x=>!K.CAR[x[0]]).map(x=>({v:x[0],l:x[1],s:x[0]+" · "+x[2],g:"ناقلين العالم",w:1,k:AN(x[1]+" "+x[0]+" "+x[2])}))]}
const PK_T={nat:"جنسية الراكب",res:"مقيم في",to:"المطار",car:"الناقل"};
function openPick(kind,i){const items=kind==="car"?carItems():kind==="to"?apItems():natItems();
  const cur=kind==="nat"?S.nat:kind==="res"?S.res:S.legs[i][kind];
  const ov=document.createElement("div");ov.className="tv-ov";
  ov.innerHTML=`<div class="tv-sh"><div class="tv-sh-h"><b>${E(PK_T[kind])}</b><button data-x="1">إغلاق ✕</button></div>
    <input type="search" class="tv-sh-q" placeholder="ابحث بالعربي أو الإنجليزي أو الرمز…" autocomplete="off"><div class="tv-sh-l"></div></div>`;
  ov.classList.add("top");document.body.appendChild(ov);const q=ov.querySelector("input"),L=ov.querySelector(".tv-sh-l");
  const vv=window.visualViewport,fit=()=>{if(!vv)return;ov.style.top=vv.offsetTop+"px";ov.style.height=vv.height+"px";ov.style.bottom="auto"};
  fit();if(vv){vv.addEventListener("resize",fit);vv.addEventListener("scroll",fit)}
  const draw=()=>{const w=AN(q.value).trim().split(/\s+/).filter(Boolean);let g="";
    let f=items.filter(o=>w.length?w.every(x=>o.k.includes(x)||o.v.toLowerCase().includes(x)):!o.w);
    if(w.length){const qq=AN(q.value).trim();f=f.map((o,i)=>[o,(o.v.toLowerCase()===qq?0:1)*10+(o.w?1+(o.rk||0):0),i]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]).map(a=>a[0])}
    L.innerHTML=f.slice(0,300).map(o=>{const gh=!w.length&&o.g&&o.g!==g?`<div class="tv-sh-g">${E(g=o.g)}</div>`:"";
      return gh+`<button data-v="${E(o.v)}" class="${o.v===cur?"on":""}"><span>${E(o.l)}</span><small>${E(o.s)}</small></button>`}).join("")||`<div class="tv-sh-g">ما لقيت نتيجة</div>`};
  draw();q.addEventListener("input",draw);setTimeout(()=>q.focus(),60);
  const close=()=>{if(vv){vv.removeEventListener("resize",fit);vv.removeEventListener("scroll",fit)}ov.remove()};
  ov.addEventListener("click",e=>{if(e.target===ov){close();return}const b=e.target.closest("button");if(!b)return;if(b.dataset.x){close();return}
    if(b.dataset.v!=null){const v=b.dataset.v;if(kind==="nat")S.nat=v;else if(kind==="res")S.res=v;else S.legs[i][kind]=v;S.out=null;close();save();paint()}})}
const pkLabel=(kind,v)=>!v?(kind==="car"?"اختر الناقل…":"اختر…"):kind==="car"?`${carN(v)} ${v}`:kind==="to"?apLabel(v):cn(v);
const pkBtn=(kind,v,i)=>`<button class="tv-pk ${v?"":"e"} ${!v&&S.showMiss&&kind!=="res"||(!v&&S.showMiss&&kind==="res")?"tv-miss":""}" data-pk="${kind}"${i!=null?` data-i="${i}"`:""}><span>${E(pkLabel(kind,v))}</span><i>⌕</i></button>`;
const ST_T={res:"مقيم (إقامة سعودية)",visit:"تأشيرة زيارة",umrah:"تأشيرة عمرة",tour:"تأشيرة سياحة"};
const isGcc=()=>GCC.includes(S.nat);
const resOf=()=>isGcc()?S.nat:S.st==="res"?"SA":(S.res||S.nat);
const routeCts=()=>[...new Set(S.legs.map(l=>apC(l.to)).filter(c=>c&&c!=="SA"&&c!==S.nat&&c!==resOf()&&!(GCC.includes(S.nat)&&GCC.includes(c))))];
/* الخانات الإجبارية قبل الفحص (نفس اللي يحتاجه تيماتيك + الناقل ونوع التذكرة للتعاميم والعفش) */
function req(){const m=[],r=[];if(!S.nat)m.push("جنسية الراكب (الجواز)");if(S.nat&&!isGcc()&&!S.st)m.push("وضع الراكب في السعودية: مقيم أو زيارة أو عمرة أو سياحة");
  S.legs.forEach((l,i)=>{const nm=i===S.legs.length-1?"الوجهة النهائية":"الترانزيت "+(i+1);if(!l.to)m.push("مطار "+nm);if(!l.car)m.push("الناقل في "+nm);
    if(i<S.legs.length-1&&l.to&&apC(l.to)!=="SA"&&!l.h)m.push("مدة الانتظار في "+apLabel(l.to))});
  if(S.legs.length>1&&!S.ticket)m.push("نوع التذكرة: وحدة أو منفصلة");
  routeCts().forEach(c=>{if(S.visas[c]==null)m.push("هل معه تأشيرة/إقامة سارية لـ "+cn(c)+"؟ (نعم/لا)")});
  /* العمر والجنس: إجباري فقط إذا فيه قاعدة لهالجنسية على هالمسار تفرق حسبها */
  const cs=[...new Set(S.legs.map(l=>apC(l.to)).filter(Boolean))],ag=new Set(),sx=new Set();
  K.R.forEach(r=>{if(!cs.includes(r.c)||(r.nat&&!inL(S.nat,r.nat))||(r.natNot&&inL(S.nat,r.natNot)))return;const n=r.notIf||{};
    if(r.age||n.age)ag.add(cn(r.c));if(r.sex||n.sex)sx.add(cn(r.c))});
  if(S.age===""&&ag.size)m.push("عمر الراكب (قواعد "+[...ag].join("، ")+" تفرق حسب العمر لهالجنسية)");
  if(!S.sex&&sx.size)m.push("جنس الراكب (قواعد "+[...sx].join("، ")+" تفرق حسبه لهالجنسية)");
  S.needAge=!!ag.size;S.needSex=!!sx.size;return{m,r}}
function preCheck(){const{m,r}=req();if(!m.length&&!r.length)return run();S.showMiss=true;paint();
  const ov=document.createElement("div");ov.className="tv-ov";
  ov.innerHTML=`<div class="tv-sh"><div class="tv-sh-h"><b>${m.length?"⚠️ قبل الفحص — أكمل الخانات الإجبارية":"تنبيه قبل الفحص"}</b><button data-x="1">إغلاق ✕</button></div>
    <div class="tv-note">مثل تيماتيك: الحكم ما يكون دقيق إلا إذا اكتملت هالبيانات. الخانات الناقصة صارت باللون الأحمر.</div>
    ${m.length?`<div class="tv-req"><b>إجباري:</b><ul>${m.map(x=>`<li>${E(x)}</li>`).join("")}</ul></div>`:""}
    ${r.length?`<div class="tv-req o"><b>مستحسن (بعض الدول تفرق حسبها):</b><ul>${r.map(x=>`<li>${E(x)}</li>`).join("")}</ul></div>`:""}
    <button class="tv-go" data-x="1">رجوع وأكمل</button>${!m.length?`<button class="tv-sm" data-run="1">افحص بدونها</button>`:""}</div>`;
  document.body.appendChild(ov);
  ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();return}const b=e.target.closest("button");if(!b)return;if(b.dataset.x){ov.remove();const f=root.querySelector(".tv-miss");if(f)f.scrollIntoView({behavior:"smooth",block:"center"})}
    if(b.dataset.run){ov.remove();run()}})}
function paint(){if(!root)return;
  if(!document.getElementById("tvCss")){const st=document.createElement("style");st.id="tvCss";st.textContent=CSS;document.head.appendChild(st)}
  const legs=S.legs,cts=routeCts();
  root.innerHTML=`<div class="tv">
  <div class="tv-h"><i>🛂</i><div><b>اشتراطات السفر</b><small>مثل تيماتيك بالعربي: اكتب الحالة أو عبّي الخانات، ويطلع لك الحكم لكل محطة.</small></div></div>
  <div class="tv-box"><b>✍️ اكتب الحالة بكلامك (اختياري)</b>
    <textarea id="tvTxt" rows="2" placeholder="مثال: يمني مقيم بالسعودية رايح القاهرة عن طريق دبي على فلاي دبي تذكرتين">${E(S.txt)}</textarea>
    <button class="tv-sm" id="tvParse">↙︎ عبّي الخانات من الكلام</button></div>
  <div class="tv-box"><b>👤 الراكب</b>
    <div class="tv-r"><label class="l">الجنسية (الجواز)${pkBtn("nat",S.nat)}</label>${S.nat&&!isGcc()&&S.st&&S.st!=="res"?`<label class="l">بلد إقامته الأصلية${pkBtn("res",S.res||S.nat)}</label>`:"<span></span>"}</div>
    ${S.nat&&!isGcc()?`<label class="l">وضعه في السعودية<div class="tv-chips ${S.showMiss&&!S.st?"tv-miss":""}" id="tvSt">${Object.entries(ST_T).map(([k,v])=>`<button data-st="${k}" class="${S.st===k?"on":""}">${v}</button>`).join("")}</div></label>`:""}
    <div class="tv-r"><label class="l">العمر<input type="number" id="tvAge" inputmode="numeric" min="0" max="120" value="${E(S.age)}" class="${S.showMiss&&S.needAge&&S.age===""?"tv-miss":""}" placeholder="${S.needAge?"مطلوب لهالحالة":"غير مطلوب عادة"}"></label>
      <label class="l">الجنس<div class="tv-chips ${S.showMiss&&S.needSex&&!S.sex?"tv-miss":""}" id="tvSex"><button data-sex="M" class="${S.sex==="M"?"on":""}">رجل</button><button data-sex="F" class="${S.sex==="F"?"on":""}">امرأة</button></div></label></div></div>
  <div class="tv-box"><b>✈️ المسار — من الجوف AJF</b>
    ${legs.map((l,i)=>`<div class="tv-leg"><div class="n"><span>${i===legs.length-1?"🛬 الوجهة النهائية":"🔁 ترانزيت "+(i+1)}</span>${legs.length>1?`<button data-del="${i}">حذف ✕</button>`:""}</div>
      <div class="tv-r">${pkBtn("to",l.to,i)}${pkBtn("car",l.car,i)}</div>
      ${i<legs.length-1?`<label class="l">مدة الانتظار في ${E(l.to?apLabel(l.to):"الترانزيت")} (ساعات)<input type="number" inputmode="decimal" data-leg="${i}" data-f="h" class="${S.showMiss&&!l.h&&l.to&&apC(l.to)!=="SA"?"tv-miss":""}" value="${E(l.h)}" placeholder="مطلوب"></label>`:""}</div>`).join("")}
    <button class="tv-add" id="tvAdd">＋ أضف محطة بعد الوجهة</button>
    ${legs.length>1?`<label class="l">التذكرة<div class="tv-chips ${S.showMiss&&!S.ticket?"tv-miss":""}" id="tvTk"><button data-tk="one" class="${S.ticket==="one"?"on":""}">تذكرة وحدة (حجز واحد)</button><button data-tk="sep" class="${S.ticket==="sep"?"on":""}">تذاكر منفصلة</button></div></label>`:""}</div>
  <div class="tv-box"><b>📄 الوثائق اللي معه</b>
    ${cts.length?cts.map(c=>`<div class="tv-vq ${S.showMiss&&S.visas[c]==null?"tv-miss":""}"><span>معه تأشيرة أو إقامة سارية لـ ${E(cn(c))}؟</span><div class="tv-chips"><button data-visa="${c}" data-val="1" class="${S.visas[c]===1?"on":""}">نعم</button><button data-visa="${c}" data-val="0" class="${S.visas[c]===0?"on":""}">لا</button></div></div>`).join(""):`<div class="tv-note">اختر المسار أول عشان تطلع أسئلة التأشيرات.</div>`}
    <div class="tv-note">تأشيرة أو إقامة سارية من (تفيد لبعض الدول مثل تركيا والإمارات):</div>
    <div class="tv-chips" id="tvSup">${Object.entries(SUP).map(([k,v])=>`<button data-sup="${k}" class="${S.sup.includes(k)?"on":""}">${v}</button>`).join("")}</div>
    <div class="tv-chips"><button data-ebola="1" class="${S.ebola?"on":""}">كان في الكونغو/أوغندا/جنوب السودان/كينيا آخر 21 يوم</button></div></div>
  <button class="tv-go" id="tvGo">🔎 افحص الاشتراطات</button>
  <div id="tvOut">${outHTML()}</div></div>`}
function lineH(l){return`<div class="tv-l">${mk(l.lv)}<div>${l.cond?`<em>إذا ${E(l.cond)}: </em>`:""}${E(l.t)}${l.src?`<small>المصدر: ${l.u?`<a href="${E(l.u)}" target="_blank" rel="noopener">${E(l.src)}</a>`:E(l.src)}</small>`:""}</div></div>`}
function outHTML(){const o=S.out;if(!o)return"";if(o.err)return`<div class="bd-empty">${E(o.err)}</div>`;
  const cv=S.cv||{st:"run"};
  if(cv.st==="run")return`<div class="tv-v w"><div class="tv-wait"><b>⏳ جاري مراجعة تعاميم المحطة…</b></div><small>الحكم يطلع بعد ما يخلص فحص القواعد والتعاميم مع بعض — لا تقرر قبلها.</small></div>`+cardsH(o);
  const lv=cv.st==="ok"?worse(o.lv,cv.lv):worse(o.lv,"w");
  const needs=[...o.needs];if(cv.st==="ok"&&cv.lv!=="ok"&&cv.k)needs.unshift("📢 التعاميم: "+cv.k);if(cv.st!=="ok")needs.unshift("ما تمت مراجعة التعاميم — اضغط «أعد مراجعة التعاميم»");
  const V={ok:["✅ يُقبل للسفر (القواعد + التعاميم)","ok"],w:["⚠️ يُقبل بشرط — تأكد من التالي","w"],x:["⛔ لا يُقبل بالوضع الحالي","x"]}[lv];
  return`<div class="tv-v ${V[1]}"><b>${V[0]}</b>${lv!=="ok"?`<ul>${needs.map(n=>`<li>${E(n)}</li>`).join("")}</ul>`:""}</div>
    <div class="tv-cv"><b>📢 مراجعة تعاميم المحطة</b>${cv.st==="ok"?`<div class="a">${fmt(cv.a)}</div>`:`<div class="tv-note">${E(cv.err||"تعذّرت المراجعة")}</div><button class="tv-sm" id="tvCv">↻ أعد مراجعة التعاميم</button>`}</div>`+cardsH(o)+aiH()}
function cardsH(o){const cv=S.cv||{};return o.cards.map(c=>`<div class="tv-c"><div class="h">${mk(c.circ?(cv.st==="ok"?worse(c.lv==="w"?"ok":c.lv,cv.lv):"w"):c.lv)}<div><b>${c.ic} ${E(c.t)}</b>${c.head?`<span>${E(c.head)}</span>`:""}</div></div>
      ${c.L.map(lineH).join("")}
      ${c.ent?`<div class="tv-sub"><b>🛂 إذن الدخول لـ ${E(cn(apC(o.pts[o.cards.indexOf(c)])))} (لو طلع من المطار): ${E(c.ent.head)}</b>${c.ent.L.map(lineH).join("")}</div>`:""}</div>`).join("")}
function aiH(){return`<div class="tv-ai"><b>🤖 كمّل مع المساعد</b>
      <div class="tv-note">إذا عندك معلومة زيادة أو تصحيح اكتبها، والمساعد يعيد الحكم مع القواعد والتعاميم.</div>
      ${S.th.slice(1).map(x=>`<div class="q">👤 ${E(x.q)}</div><div class="a">${fmt(x.a)}</div>`).join("")}
      <textarea id="tvAq" rows="2" placeholder="اكتب متابعة أو تصحيح، مثلاً «إقامته السعودية باقي عليها 4 شهور»">${E(S.aq)}</textarea>
      <button class="tv-go" id="tvAsk" ${S.busy?"disabled":""}>${S.busy?"… يحلل":"أرسل"}</button></div>
    <div class="tv-note">هذي الأداة تجمع قواعد منشورة من مواقع حكومية وشركات طيران (مو من تيماتيك نفسه). القواعد تتغير، فإذا الحكم ⚠️ أو الحالة نادرة، تأكد قبل القبول. آخر مراجعة للقواعد: ${E(K.D)}.</div>`}
function fmt(t){return E(String(t||"")).replace(/^\s*#{1,4}\s*(.+)$/gm,"<b>$1</b>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[*-]\s+/gm,"• ").replace(/\n/g,"<br>")}
function P(){return{nat:S.nat,st:isGcc()?"cit":S.st,res:resOf(),age:S.age===""?null:+S.age,sex:S.sex,sup:S.sup,ebola:S.ebola,ticket:S.legs.length>1?S.ticket:"one",legs:S.legs,visas:S.visas}}
function run(){if(!S.nat){S.out={err:"اختر جنسية الراكب أول."};paintOut();return}if(!S.legs[S.legs.length-1].to){S.out={err:"اختر الوجهة النهائية."};paintOut();return}
  loadPI().then(()=>{S.out=analyze(P());S.th=[];S.cv={st:"run"};paintOut();reviewCirc();try{ajfAct&&ajfAct("tv",S.nat+">"+S.legs.map(l=>l.to).join(">"))}catch(e){}
    setTimeout(()=>{const o=root.querySelector("#tvOut");if(o)o.scrollIntoView({behavior:"smooth",block:"start"})},50)}).catch(()=>{S.out={err:"تعذّر تحميل قاعدة التأشيرات، تأكد من الإنترنت."};paintOut()})}
function paintOut(){const o=root&&root.querySelector("#tvOut");if(o)o.innerHTML=outHTML();save()}
function ctxText(){const p=P(),o=S.out;const L=[];
  L.push("بيانات الحالة وقواعد السفر من قاعدة بيانات التطبيق (بديل نص شاشة TIMATIC — جمعت من مواقع حكومية وشركات طيران، وكل قاعدة معها مصدرها):");
  L.push(`الراكب: جنسية ${cn(p.nat)} (${p.nat})، وضعه في السعودية: ${p.st==="cit"?"مواطن خليجي":ST_T[p.st]||"غير محدد"}${p.st==="res"?"":"، يعني مو مقيم في السعودية ولا ينطبق عليه أي شرط خاص بالمقيمين في الخليج"}، بلد إقامته: ${cn(p.res)}، العمر ${p.age??"غير محدد"}، الجنس ${p.sex==="M"?"رجل":p.sex==="F"?"امرأة":"غير محدد"}.`);
  L.push(`المسار: الجوف AJF ← ${p.legs.map(l=>`${apLabel(l.to)}${l.car?" على "+carN(l.car):""}${l.h?" (انتظار "+l.h+" ساعة)":""}`).join(" ← ")}. التذكرة: ${p.ticket==="one"?"وحدة":p.ticket==="sep"?"منفصلة":"غير محدد"}.`);
  const vs=Object.keys(p.visas).filter(k=>p.visas[k]===1),vn=Object.keys(p.visas).filter(k=>p.visas[k]===0);L.push(`مطارات المسار بالإنجليزي: ${p.legs.map(l=>l.to.startsWith("C:")?enN(l.to.slice(2)):l.to+" "+enN(apC(l.to))).join(" / ")}. الناقلين: ${p.legs.map(l=>l.car?carN(l.car)+" "+l.car:"").filter(Boolean).join(" / ")}.`);
  L.push(`الوثائق: ${vs.length?"معه تأشيرة/إقامة سارية لـ "+vs.map(cn).join("، "):"ما معه تأشيرات"}${vn.length?"؛ ما معه تأشيرة لـ "+vn.map(cn).join("، "):""}${p.sup.length?"؛ معه تأشيرة/إقامة من "+p.sup.map(s=>SUP[s]).join("، "):""}${p.ebola?"؛ كان في دول الإيبولا خلال 21 يوم":""}.`);
  L.push("\nنتيجة المحرك الآلي:");
  o.cards.forEach(c=>{L.push(`\n[${c.t}] الحالة: ${c.lv} — ${c.head||""}`);c.L.forEach(l=>L.push(`- (${l.lv}) ${l.cond?"إذا "+l.cond+": ":""}${l.t}${l.src?" [المصدر: "+l.src+"]":""}`));
    if(c.ent){L.push(`  إذن الدخول لو طلع من المطار: ${c.ent.head}`);c.ent.L.forEach(l=>L.push(`  - (${l.lv}) ${l.cond?"إذا "+l.cond+": ":""}${l.t}${l.src?" [المصدر: "+l.src+"]":""}`))}});
  L.push(`\nالحكم الآلي: ${o.lv==="ok"?"يُقبل":o.lv==="w"?"يُقبل بشروط":"لا يُقبل"}.${o.missing.length?" معلومات ناقصة: "+o.missing.join("، "):""}`);
  L.push("\nمعنى الرموز: ok مسموح · w شرط/تأكد · x مانع · i معلومة. القاعدة العامة (Passport Index) أقل دقة من القواعد المفصلة.");
  return L.join("\n")}
const CVQ="إذا المسار فيه ترانزيت أبوظبي AUH: طبّق تعميم ترانزيت أبوظبي بشروطه بالضبط كما هي مكتوبة في نصه (أي ناقلين، أي اتفاقية مع السعودية، تذكرة وحدة أو منفصلة، أي جنسيات أو استثناءات) — لا توسّعه ولا تضيّقه، واذكر عنوانه وتاريخه. وبشكل عام: راجع تعاميم المحطة المرفقة على هالحالة بدقة: المطارات (عربي وإنجليزي ورموز)، الناقلين، الجنسية، الإقامة، نوع التذكرة. اذكر كل تعميم ينطبق وأثره بسطر 📢. إذا ما فيه تعميم يخص الحالة قل ذلك صراحة. بعدين أعطني الحكم النهائي بعد دمج القواعد مع التعاميم (التعميم الأشد يُقدَّم).";
const verdict=a=>{const t=String(a||"");const i=t.lastIndexOf("الخلاصة");const ln=i>=0?t.slice(i).split("\n")[0]:"";const z=ln||t;
  const lv=/⛔|لا يُسمح|لا يسمح/.test(z)?"x":/⚠️|إذا معه|بشرط/.test(z)?"w":/✅|يُسمح له|يسمح له/.test(z)?"ok":"w";return{lv,k:ln.replace(/\*+/g,"").replace(/^الخلاصة:?\s*/,"").trim()}};
async function callAI(q,h){const r=await fetch(SB_URL+"/functions/v1/ajf-dc",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},body:JSON.stringify({token:AUTH.tok||"",device:AUTH.dev,kind:"tim",ctx:ctxText(),q,h})});
  if(r.status===404)throw new Error("nofn");const j=await r.json();if(j.s==="out")throw new Error("out");if(j.s==="nokey")throw new Error("nokey");if(j.s!=="ok")throw new Error(j.s||"aierr");return j.answer||""}
const aiErr=m=>m==="out"?"سجّل دخولك أول.":m==="nokey"?"مفتاح Gemini ناقص في Supabase.":m==="aierr"?"المساعد مشغول أو وصل الحد المجاني بالدقيقة — جرّب بعد شوي.":"تعذّر الاتصال، جرّب مرة ثانية.";
async function reviewCirc(){const tok=S.out;S.cv={st:"run"};paintOut();
  try{const a=await callAI(CVQ,[]);if(S.out!==tok)return;S.th=[{q:CVQ,a}];S.cv={st:"ok",a,...verdict(a)}}
  catch(e){if(S.out!==tok)return;S.cv={st:"err",err:aiErr(e.message)}}paintOut()}
async function ask(){if(S.busy||!S.out||S.out.err)return;const q=(S.aq||"").trim();if(!q)return;
  S.busy=true;paintOut();
  try{const a=await callAI(q,S.th.slice(-6));S.th.push({q,a});S.aq="";const v=verdict(a);if(/الخلاصة/.test(a))S.cv={...S.cv,st:"ok",lv:v.lv,k:v.k}}
  catch(e){S.th.push({q,a:aiErr(e.message)})}
  S.busy=false;paintOut()}
function bind(el){el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||!root.contains(b))return;
  if(b.id==="tvGo")return preCheck();if(b.id==="tvAsk"){const t=root.querySelector("#tvAq");if(t)S.aq=t.value;return ask()}
  if(b.id==="tvCv"){reviewCirc();return}
  if(b.id==="tvParse"){loadPI().catch(()=>{}).then(()=>{const o=parse(S.txt);if(o.legs&&!o.legs.length)delete o.legs;Object.assign(S,{nat:"",st:"",res:"",age:"",sex:"",sup:[],ebola:false,ticket:"",legs:[{to:"",car:"",h:""}],visas:{}},o,{age:o.age!=null?String(o.age):"",th:[],showMiss:false});S.out=null;save();paint();if(S.nat&&S.legs[S.legs.length-1].to)preCheck()});return}
  if(b.id==="tvAdd"){S.legs.push({to:"",car:"",h:""});S.out=null;save();paint();setTimeout(()=>{const x=root.querySelectorAll(".tv-leg");const l=x[x.length-1];if(l)l.scrollIntoView({behavior:"smooth",block:"center"})},40);return}
  if(b.dataset.pk){openPick(b.dataset.pk,b.dataset.i!=null?+b.dataset.i:null);return}
  if(b.dataset.del!=null){S.legs.splice(+b.dataset.del,1);if(!S.legs.length)S.legs=[{to:"",car:"",h:""}];S.out=null;save();paint();return}
  if(b.dataset.st){S.st=S.st===b.dataset.st?"":b.dataset.st;if(S.st==="res")S.res="";S.out=null;save();paint();return}
  if(b.dataset.sex){S.sex=S.sex===b.dataset.sex?"":b.dataset.sex;S.out=null;save();paint();return}
  if(b.dataset.tk){S.ticket=S.ticket===b.dataset.tk?"":b.dataset.tk;S.out=null;save();paint();return}
  if(b.dataset.visa){const c=b.dataset.visa,v=+b.dataset.val;S.visas[c]=S.visas[c]===v?undefined:v;S.out=null;save();paint();return}
  if(b.dataset.sup){const k=b.dataset.sup;S.sup=S.sup.includes(k)?S.sup.filter(x=>x!==k):[...S.sup,k];S.out=null;save();paint();return}
  if(b.dataset.ebola){S.ebola=!S.ebola;S.out=null;save();paint();return}});
  el.addEventListener("change",e=>{const t=e.target;if(t.dataset.leg!=null){S.legs[+t.dataset.leg][t.dataset.f]=t.value;S.out=null;save();if(t.dataset.f==="to")paint()}});
  el.addEventListener("input",e=>{const t=e.target;if(t.id==="tvTxt")S.txt=t.value;else if(t.id==="tvAge")S.age=t.value;else if(t.id==="tvAq")S.aq=t.value;
    else if(t.dataset.leg!=null&&t.dataset.f==="h")S.legs[+t.dataset.leg].h=t.value;save()})}
window.TV={mount:el=>{root=el;if(!el.__tv){el.__tv=1;bind(el)}paint();loadPI().then(()=>{if(root===el&&!S.out)paint()}).catch(()=>{})},
  _t:{analyze,parse,match,entry,loadPI,S}};
})();
