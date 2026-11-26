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
const apN=a=>a&&a.startsWith("C:")?cn(a.slice(2)):K.AP[a]?K.AP[a][0]:WA[a]?(WA[a][1]||WA[a][2]||WA[a][3]):a,apC=a=>a&&a.startsWith("C:")?a.slice(2):K.AP[a]?K.AP[a][1]:WA[a]?WA[a][4]:"";
const apLabel=a=>a&&a.startsWith("C:")?cn(a.slice(2)):`${apN(a)} ${a}`;
const TOP_NAT=["SA","EG","SD","YE","SY","JO","PS","PK","IN","BD","PH","ID","LK","NP","ET","IQ","LB","MA","TN","DZ","TR","AF","SO","ER","NG","KE","UG","SS","LY","MR","IR","AE","KW","QA","BH","OM"];
const SUP={US:"أمريكا",UK:"بريطانيا",SCH:"شنغن",IE:"أيرلندا",CA:"كندا",SG:"سنغافورة",JP:"اليابان",KR:"كوريا الجنوبية",AU:"أستراليا",NZ:"نيوزيلندا"};
/* حالة النموذج */
const S={pt:"N",ppx:"",pur:"",rt:null,days:"",yf:false,qa:{},ovr:null,ovrR:"",nat:"",st:"",res:"",age:"",sex:"",sup:[],ebola:false,ticket:"",legs:[{to:"",car:"",h:""}],visas:{},txt:"",out:null,th:[],busy:false,aq:""};
try{const o=JSON.parse(sessionStorage.getItem("ajf_tv")||"null");if(o)Object.assign(S,o,{out:null,busy:false})}catch(e){}
const save=()=>{try{const{out,busy,...k}=S;sessionStorage.setItem("ajf_tv",JSON.stringify(k))}catch(e){}};

/* ---------- المحرك ---------- */
const inL=(x,l)=>!!x&&l.some(v=>v==="GCC"?GCC.includes(x):v===x);
const ageIn=(a,r)=>a>=r[0]&&a<=r[1];
/* 1 ينطبق · 0 ما ينطبق · 2 يعتمد على معلومة ناقصة (يرجع الشرط بالعربي) */
const TODAY=()=>new Date().toISOString().slice(0,10);
const PUR_T={tour:"سياحة أو زيارة",work:"عمل",study:"دراسة",home:"عودة لبلده أو إقامته",other:"أخرى (عائلة، علاج…)"};
function active(r){const t=TODAY();if(r.cancelled&&t>=r.cancelled)return false;if(r.exp&&t>r.exp)return false;if(r.from&&t<r.from)return false;return true}
function match(r,P,x){const need=[];
  if(!active(r))return[0];
  if(r.pt&&!r.pt.includes(P.pt||"N"))return[0];
  if(r.ptNot&&r.ptNot.includes(P.pt||"N"))return[0];
  if(r.apNot&&r.apNot.includes(x.ap))return[0];
  if(r.carOut&&!(x.out&&r.carOut.includes(x.out)))return[0];
  if(r.supNot&&r.supNot.some(v=>P.sup.includes(v)))return[0];
  if(r.yf&&!P.yf)return[0];
  if(r.resOnly&&P.res!==r.c)return[0];
  if(r.purNot&&P.pur&&r.purNot.includes(P.pur))return[0];
  if(r.pur){if(!P.pur)need.push("غرض السفر "+r.pur.map(k=>PUR_T[k]).join(" أو "));else if(!r.pur.includes(P.pur))return[0]}
  if(r.daysMin){if(P.days==null)need.push(`مدة البقاء ${r.daysMin} يوم أو أكثر`);else if(P.days<r.daysMin)return[0]}
  if(r.nat&&!inL(P.nat,r.nat))return[0];
  if(r.natNot&&inL(P.nat,r.natNot))return[0];
  if(r.res&&!inL(P.res,r.res))return[0];
  if(r.resNot&&inL(P.res,r.resNot))return[0];
  if(r.ap&&!r.ap.includes(x.ap))return[0];
  {const mo=new Date().getMonth()+1;if(r.mon&&!(mo>=r.mon[0]&&mo<=r.mon[1]))return[0];if(r.monNot&&mo>=r.monNot[0]&&mo<=r.monNot[1])return[0]}
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
let QA={},CP={};
function line(r,lv,cond){const s=K.SRC[r.src]||{};const l={lv,t:r.t||"",cond,src:s.t,u:s.u,d:s.d,perm:s.perm,arr:r.arr};
  if(r.q&&!cond){const k=r.qk||(r.c+":"+r.s+":"+r.t);const a=QA[k];l.qk=k;l.q=typeof r.q==="function"?r.q(CP):r.q;l.qno=r.qno;l.ans=a;l.lv=a===1?"ok":a===0?"x":"w"}
  return l}
/* دخول بلد c (وجهة نهائية أو ترانزيت يطلع فيه من المطار) */
function entry(P,c,x){const L=[];let lv="ok",head,detailed=K.R.some(r=>r.c===c&&r.s==="entry");
  const hasVisa=P.visas[c]===1;
  if(P.nat===c){const pp=ppL(P,c,x,1),okExp=rules(c,"pp").some(r=>r.ppExpOk&&match(r,P,x)[0]===1),bad=!okExp&&pp.some(l=>l.lv==="x");
    return{lv:bad?"x":"ok",head:bad?"✕ الجواز منتهي — حتى المواطن يحتاج جواز ساري للسفر":"مواطن — يدخل بلده",L:okExp?pp.filter(l=>l.lv!=="x"):pp,detailed:true}}
  if(GCC.includes(P.nat)&&GCC.includes(c))return{lv:"ok",head:"مواطن خليجي — يدخل بالهوية الوطنية أو الجواز",L:ppL(P,c,x),detailed:true};
  if(P.res===c){const RL=rules(c,"entry").filter(r=>r.resOnly).map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]===1).map(([r])=>line(r,r.lv)),pp=ppL(P,c,x,1);const L2=RL.concat(pp),lv2=L2.reduce((a,l)=>worse(a,l.lv),"ok");
    return{lv:lv2,head:lv2==="x"?"✕ "+((L2.find(l=>l.lv==="x")||{}).qno||(L2.find(l=>l.lv==="x")||{}).t||""):"مقيم في "+cn(c)+" — يرجع بإقامته (تأكد إنها سارية)",L:L2,detailed:true}}
  let base=PI&&PI.m[P.nat]?PI.m[P.nat].split(",")[PI.ix[c]]:null,bsrc=K.SRC.pi;
  {const bo=K.BO&&K.BO[c];if(bo){base=bo.f(P.nat,P.pt||"N");bsrc=K.SRC[bo.src]||bsrc}}
  const b=stTxt(base);
  if(hasVisa){lv="ok";head="معه تأشيرة/إذن دخول سارٍ لـ "+cn(c)}
  else if(b){lv=b[0];head=b[1]}else{lv="w";head="ما عندنا بيانات عامة لهالجنسية — تأكد"}
  const X={...x,hasVisa,base};let over=null,cur=hasVisa?"":(base||"");
  for(const r of rules(c,"entry")){if(hasVisa&&!r.ev&&r.lv!=="i")continue;const[m,cond]=match(r,P,X);if(!m)continue;
    if(r.lv==="ok"){if(m===1&&!hasVisa){over=r;cur=r.st||cur;const t=stTxt(r.st);if(t){lv=t[0];head=t[1]}L.push(line(r,"ok"))}else if(m===2)L.push(line(r,"i",cond));continue}
    if(hasVisa&&r.vok&&r.lv==="x"){const l=line(r,"w",m===2?cond:undefined);
      /* معه تأشيرة: إذا القاعدة تشترط موافقة (أمنية) مع التأشيرة → سؤال تأكيد (نعم = يُقبل، لا = لا يُقبل)؛ وإذا تشترط التأشيرة بس → التأشيرة تكفي */
      if(m===1&&/موافقة/.test(r.t)){const k="vok:"+c+":"+(r.nat||[]).join(","),a=QA[k];Object.assign(l,{qk:k,ans:a,q:`التأشيرة لـ ${cn(c)} صادرة مع الموافقة الأمنية المطلوبة (أو معه إقامة سارية لـ ${cn(c)})؟`,qno:"بدون الموافقة الأمنية لا يُقبل — "+r.t,lv:a===1?"ok":a===0?"x":"w"});if(L.some(z=>z.qk===k))continue;lv=worse(lv,l.lv);if(l.lv==="x")head="✕ التأشيرة بدون الموافقة الأمنية المطلوبة لـ "+cn(c)}
      else if(m===1){l.lv="ok";l.t="معه تأشيرة — "+l.t}
      else l.t="معه تأشيرة: تأكد إنها صادرة مع الموافقة المطلوبة — "+l.t;
      L.push(l);continue}
    if(m===1){const l=line(r,r.lv);if(l.qk&&L.some(z=>z.qk===l.qk))continue;if(l.lv==="x"&&lv!=="x")head=(l.qno||l.t).split(/[.،(—]/)[0];lv=worse(lv,l.lv);L.push(l)}else L.push(line(r,r.lv==="x"?"w":r.lv,cond))}
  const noV=P.visas[c]===0,needV=/^[RET]/.test(cur)||L.some(l=>l.lv==="w"&&/تأشيرة/.test(l.t)&&!l.cond);
  if(!hasVisa&&b&&!over&&lv!=="ok")L.unshift({lv:noV?"x":"w",t:`${bsrc===K.SRC.pi?"حسب القاعدة العامة":"حسب التعميم"}: ${b[1]} لحامل جواز ${cn(P.nat)} إلى ${cn(c)}.${noV?"":" إذا معه تأشيرة أو تصريح دخول أو إقامة سارية اختر «نعم» في «الوثائق»."}`,src:bsrc.t,u:bsrc.u,d:bsrc.d});
  if((P.pt||"N")!=="N"&&!over)L.push({lv:"w",t:"جواز غير عادي: القاعدة العامة مبنية على الجواز العادي — الجواز الدبلوماسي أو الرسمي له اتفاقيات خاصة، تأكد في ADC."});
  /* الموظف حدد إنه ما معه تأشيرة، والبلد يشترط تأشيرة مسبقة → مانع ✕ */
  if(noV&&needV&&lv!=="ok"){lv="x";head="✕ ما معه تأشيرة لـ "+cn(c)+" — "+(stTxt(cur)?stTxt(cur)[1]:"يحتاج تأشيرة مسبقة");L.forEach(l=>{if(l.lv==="w"&&/تأشيرة/.test(l.t)&&!l.cond&&!l.qk)l.lv="x"})}
  if(!detailed)L.push({lv:"i",t:"ما عندنا قواعد مفصلة لهالبلد — الحكم من القاعدة العامة فقط، والحالات الخاصة (إقامة، عمر، موافقات) ممكن تختلف.",src:K.SRC.pi.t,u:K.SRC.pi.u});
  /* شروط الإعفاء أو التأشيرة عند الوصول (مثل ADC): الغرض، المدة، تذكرة العودة */
  if(!hasVisa&&x.final===c&&/^[FVET]/.test(cur||"")){const n=+(String(cur).match(/\d+/)||[0])[0],k=stTxt(cur)[1];
    if(P.pur==="work"||P.pur==="study"){lv="x";head="✕ "+(P.pur==="work"?"العمل":"الدراسة")+" يحتاج تأشيرة مخصصة";L.unshift({lv:"x",t:`${k} للسياحة والزيارة فقط — ${P.pur==="work"?"العمل":"الدراسة"} يحتاج تأشيرة مخصصة قبل السفر.`})}
    if(n&&P.days!=null&&P.days>n){lv="x";head=`✕ مدة البقاء ${P.days} يوم أكثر من المسموح (${n} يوم)`;L.unshift({lv:"x",t:`مدة البقاء ${P.days} يوم أكثر من مدة ${k} (${n} يوم) — يحتاج تأشيرة.`})}
    if(P.rt===0&&P.pur!=="home"){lv="x";head="✕ ما معه تذكرة عودة أو مغادرة";L.unshift({lv:"x",t:`ما معه تذكرة عودة أو مغادرة — شرط أساسي لـ${k} (ADC يعطي Don't Board).`})}}
  else if(P.rt===0&&!hasVisa&&P.pur!=="home"&&x.final===c)L.push({lv:"w",t:"ما معه تذكرة عودة أو مغادرة — أغلب الدول تشترطها للزائر. تأكد قبل القبول."});
  const pp=ppL(P,c,x);const ppx=pp.find(l=>l.lv==="x");if(ppx){lv="x";head="✕ "+ppx.t.split(/[.—]/)[0]}else pp.forEach(l=>{lv=worse(lv,l.lv)});
  return{lv,head,L:L.concat(pp),detailed}}
const mLeft=d=>{const t=new Date(TODAY()),e=new Date(d);if(isNaN(e))return null;return(e-t)/86400000/30.44};
function ppL(P,c,x,res){const rs=rules(c,"pp").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]);const L=rs.map(([r,m])=>line(r,"i",m[1]));
  if(!P.ppx)return L;const left=mLeft(P.ppx);if(left==null)return L;
  const need=Math.max(0,...rs.filter(([r,m])=>m[0]===1&&r.ppMin).map(([r])=>r.ppMin));
  if(left<=0)L.unshift({lv:"x",t:"الجواز منتهي — الجواز يعتبر صالح لين اليوم اللي قبل تاريخ انتهائه.",src:K.SRC.adc.t,d:K.SRC.adc.d});
  else if(P.days!=null&&x.final===c&&!res&&left*30.44<P.days)L.unshift({lv:"x",t:`الجواز ينتهي قبل نهاية مدة البقاء (${P.days} يوم).`});
  else if(need&&left<need)L.unshift({lv:"x",t:`الجواز باقي عليه تقريباً ${Math.floor(left)} شهر — و${cn(c)} تشترط ${need} شهور على الأقل.`});
  else if(!need&&!res&&left<6&&x.final===c)L.unshift({lv:"w",t:`الجواز باقي عليه أقل من 6 شهور — كثير من الدول تشترط 6 شهور، تأكد في ADC.`});
  return L}
/* تنبيهات تشغيلية مؤقتة (إغلاق مطار، منع ترانزيت…) — فعالة فقط داخل مدتها */
function alertsL(c,ap,P,final){return rules(c,"alert").filter(r=>active(r)&&(!r.ap||r.ap.includes(ap))&&(!r.destC||r.destC.includes(final))).map(r=>({...line(r,"x"),t:"⛔ تنبيه مؤقت: "+r.t}))}
/* أقصى مدة للبقاء في منطقة الترانزيت بدون تأشيرة — الافتراضي 24 ساعة (بعدها يعتبر توقف ويحتاج تأشيرة) */
const TWOVH={SA:12,EG:6,LB:12,AE:24},TWOVAP={};
/* أول محطة يوقف فيها العفش غصب (حسب تعميم الشركات اللي ما لها اتفاقية مع السعودية، أو حسب نتيجة التحليل) */
function bagCap(){const L=S.legs,NO=K.NOIL||[];if(S.out&&S.out.cards){const k=S.out.cards.findIndex(c=>c.k==="tr"&&c.L.some(l=>l.bag&&l.no));if(k>0)return k-1}
  for(let i=0;i<L.length-1;i++){const a=L[i].car,b=L[i+1].car;if(a&&b&&a!==b&&((a==="SV"&&NO.includes(b))||(b==="SV"&&NO.includes(a))))return i}return null}
function bagCapNote(){const L=S.legs;if(L.length<2||S.bagTo==null||S.bagTo<0)return"";const k=bagCap();if(k==null||S.bagTo<=k||!L[k].to)return"";
  const NO=K.NOIL||[],a=L[k].car,b=L[k+1].car,bad=NO.includes(b)?b:a;
  return`<div class="tv-note" style="color:#f0614a">⛔ اخترت ${E(apLabel(L[S.bagTo].to))}، لكن ${E(carN(bad))} ما لها اتفاقية شحن مع الخطوط السعودية حسب تعميم المحطة — العفش ينشحن لين ${E(apLabel(L[k].to))} بس، والتحليل مبني على هذا.</div>`}
/* تحليل المسار كامل */
function analyze(P){TK=P.ticket||"";QA=P.qa||{};CP=P;
  /* اتفاقيات شحن العفش بين الناقلين (من مراجعة التعاميم) */
  const NO=K.NOIL||[],noAg=(a,b)=>!!a&&!!b&&a!==b&&((a==="SV"&&NO.includes(b))||(b==="SV"&&NO.includes(a)));
  const ilOf=(a,b)=>{if(!a||!b)return{v:"unk"};if(a===b)return{v:"yes",same:1};if(noAg(a,b))return{v:"no",src:K.SRC.noil.t,circ:1};return(P.il||{})[a+">"+b]||{v:P.ilPending?"pend":"unk"}};
  /* حكم العفش بين ناقلين: يمشي لآخر محطة، أو ينشحن لين هالمحطة بس */
  const ilLine=(a,b,ap)=>{const r=ilOf(a,b),nm=carN(a)+" و"+carN(b),bad=NO.includes(b)?b:a;
    if(r.v==="yes")return{lv:"ok",bag:1,t:r.same?`🧳 نفس الناقل (${carN(a)}) — العفش يمشي لآخر محطة.`:`🧳 فيه اتفاقية شحن بين ${nm} حسب تعاميم المحطة — العفش يمشي لآخر محطة.`,s:r.same?"العفش يمشي لآخر محطة (نفس الناقل)":`العفش يمشي لآخر محطة — فيه اتفاقية بين ${nm}`,src:r.src};
    if(r.v==="pend")return{lv:"w",bag:1,t:`🧳 جاري البحث في التعاميم عن اتفاقية شحن بين ${nm}…`,s:"جاري البحث في التعاميم عن اتفاقية الشحن…"};
    if(r.v==="no")return{lv:"i",bag:1,no:1,t:`🧳 ما فيه اتفاقية بين ${nm}${r.circ?" — "+carN(bad)+" من الشركات اللي ما لها اتفاقية مع الخطوط السعودية حسب تعميم المحطة":" حسب تعاميم المحطة"}. العفش ما ينشحن لآخر محطة: ينشحن لين ${apN(ap)} بس، والراكب يستلمه ويسوي قبول من جديد.`,s:`العفش لين ${apN(ap)} بس — ما فيه اتفاقية بين ${nm}`,src:r.src};
    return{lv:"i",bag:1,no:1,t:`🧳 ما فيه اتفاقية شحن مذكورة في تعاميم المحطة بين ${nm} — الأصل مع التذاكر المنفصلة: العفش ينشحن لين ${apN(ap)} بس، والراكب يستلمه ويسوي قبول من جديد.`,s:`العفش لين ${apN(ap)} بس — ما فيه اتفاقية مذكورة بين ${nm}`}};
  const legs=P.legs.filter(l=>l.to),pts=["AJF",...legs.map(l=>l.to)],out=[];
  if(legs.length<1)return null;
  const final=apC(pts[pts.length-1]),x0={final};
  /* الخروج من السعودية: أول نقطة دولية */
  const exitL=rules("SA","exit").map(r=>[r,match(r,P,x0)]).filter(([r,m])=>m[0]).map(([r,m])=>line(r,m[0]===1?r.lv:"w",m[1]));
  let lvAll="ok";
  out.push({k:"exit",ic:"🇸🇦",t:"المغادرة من السعودية",lv:exitL.reduce((a,l)=>worse(a,l.lv),"ok"),head:exitL.length?"":"ما فيه شرط خاص للمغادرة",L:exitL});
  for(let i=1;i<pts.length-1;i++){const ap=pts[i],c=apC(ap),inCar=legs[i-1].car,outCar=legs[i].car,h=+legs[i-1].h||null,car=[inCar,outCar].filter(Boolean),x={final,car,ap,out:outCar};
    const card={k:"tr",ic:"🔁",t:`ترانزيت: ${apLabel(ap)}`,L:alertsL(c,ap,P,final),lv:"ok"};
    if(c==="SA"&&pts.slice(0,i).every(p=>apC(p)==="SA")){card.head="ترانزيت داخل السعودية قبل الرحلة الدولية — ما يحتاج تأشيرة";{const bg=legs[i-1].bag;card.L.push(bg==="none"?{lv:"ok",bag:1,t:"🧳 بدون عفش — ما فيه شحن ولا استلام.",s:"بدون عفش — ما فيه شحن"}:bg==="out"?{lv:"i",bag:1,t:"🧳 يستلم عفشه في "+apN(ap)+" ويخلص إجراءات الرحلة الدولية من جديد — انتبه لوقت الربط."}:bg==="thru"?(P.ticket==="sep"||noAg(legs[i-1].car,legs[i].car)?ilLine(legs[i-1].car,legs[i].car,ap):{lv:"ok",bag:1,t:"🧳 تذكرة وحدة: العفش يمشي لآخر محطة.",s:"العفش يمشي لآخر محطة (تذكرة وحدة)"}):{lv:"w",bag:1,t:"🧳 حدد وين ينشحن العفش في هالمحطة."})}out.push(card);continue}
    /* هل يقدر يبقى داخل المطار؟ */
    const tw=rules(c,"twov").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]);
    let twBlock=false;const circ=tw.some(([r,m])=>r.vis&&m[0]===1);if(tw.some(([r,m])=>r.circ&&m[0]===1))card.circ=1;
    tw.forEach(([r,m])=>{if(circ&&!r.vis&&r.lv==="ok")return;if(r.lv==="ok"){const l=line(r,"ok",m[1]);l.tw=1;card.L.push(l);return}if(r.vis){const ok=P.visas[c]===1,l=line(r,m[0]===1?(ok?"ok":"x"):"w",m[1]);if(ok)l.t="معه تأشيرة للإمارات ✓ — "+l.t;if(l.lv==="x")twBlock=true;card.L.push(l);return}
      if(r.lv==="x"&&m[0]===1)twBlock=true;card.L.push(line(r,m[0]===1?r.lv:(r.lv==="x"?"w":r.lv),m[1]))});
    const eAny=entry(P,c,x),freeIn=eAny.lv==="ok";
    if(!tw.length)card.L.push(freeIn?{lv:"ok",t:`حتى لو طلع من المطار ما يحتاج تأشيرة لـ ${cn(c)} (${eAny.head}).`,src:K.SRC.pi.t,u:K.SRC.pi.u}:{lv:"w",t:`ما عندنا قاعدة ترانزيت مفصلة لـ ${cn(c)}، وجنسيته لو طلع من المطار: ${eAny.head.replace(/^✕\s*/,"")}. بعض الدول تشترط تأشيرة ترانزيت حتى داخل المطار لجنسيات معينة — تأكد.`,src:K.SRC.pi.t,u:K.SRC.pi.u});
    const mx=TWOVAP[ap]||TWOVH[c]||24,isLong=h&&h>mx&&!freeIn;
    /* شنغن: إذا الرحلة التالية داخل شنغن، يمر الجوازات في أول مطار شنغن (دخول) */
    const schIn=!freeIn&&(K.SCH||[]).includes(c)&&(K.SCH||[]).includes(apC(pts[i+1])),tooLong=isLong||schIn;
    if(schIn)card.L.push({lv:"w",t:`الرحلة التالية داخل منطقة شنغن — يمر الجوازات هنا في ${apN(ap)} (دخول شنغن)، فيحتاج تأشيرة شنغن أو إعفاء.`,s:"الرحلة التالية داخل شنغن — يمر الجوازات هنا",src:K.SRC.sch_atv.t});
    if(isLong)card.L.push({lv:"w",t:`الانتظار ${h} ساعة أكثر من ${mx} ساعة — ما يقدر يبقى في منطقة الترانزيت بدون تأشيرة: لازم تأشيرة ترانزيت أو دخول لـ ${cn(c)}.`,s:`الانتظار ${h} ساعة أكثر من الحد (${mx} ساعة) — ما يقدر يبقى داخل المطار`});
    /* العفش: اختيار الموظف + قواعد استلام العفش في أول مطار دخول + نوع التذكرة */
    const lg=legs[i-1],prevC=apC(pts[i-1]),nextC=apC(pts[i+1]);
    const b1=rules(c,"bag1").filter(r=>r.carOut?(r.carOut.includes(legs[i].car)&&(!r.ap||r.ap.includes(ap))):(r.all||(prevC!==c&&nextC===c))),forced=b1.length>0,long=h&&h>24;
    const bagR=rules(c,"bag").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]);
    let bagsOut=lg.bag==="out"||(forced&&(lg.bag!=="none"||b1.some(r=>r.all))),ilNo=false;
    if(lg.bag==="thru"){
      if(forced){b1.forEach(r=>{const l=line(r,"w");l.bag=1;card.L.push(l)});card.L.push({lv:"w",bag:1,t:`🧳 لا تشحن العفش لآخر محطة: اشحنه لين ${apN(ap)} بس — الراكب يستلمه هناك ويطلع من الجوازات${freeIn?"":" (ويحتاج إذن دخول لـ "+cn(c)+")"}، وبعدين يشحنه من جديد.`})}
      else{const na=noAg(lg.car,legs[i].car),il=P.ticket==="sep"||na?ilLine(lg.car,legs[i].car,ap):null;
        if(na&&P.ticket!=="sep")card.L.push({lv:"i",t:`مسجلة تذكرة وحدة، لكن ${carN(NO.includes(legs[i].car)?legs[i].car:lg.car)} ما لها اتفاقية مع الخطوط السعودية — فعلياً تذاكر منفصلة.`,s:"ما فيه اتفاقية بين الناقلين — تُعامل تذاكر منفصلة",src:K.SRC.noil.t});
        if(il&&il.no){bagsOut=true;ilNo=true;card.L.push({lv:"x",bag:1,t:`⛔ اخترت شحن العفش لين ${apN(pts[pts.length-1])} — ما ينفع حسب تعاميم المحطة، فالتحليل مبني على إن العفش ينشحن لين ${apN(ap)} بس.`,s:`اختيار شحن العفش لين ${apN(pts[pts.length-1])} ما ينفع — لين ${apN(ap)} بس`})}
        card.L.push(il||{lv:"ok",bag:1,t:"🧳 تذكرة وحدة: العفش يمشي لآخر محطة.",s:"العفش يمشي لآخر محطة (تذكرة وحدة)"});
        if(long&&!(il&&il.no)){const sm=K.SRC.msc;bagsOut=true;ilNo=true;card.L=card.L.filter(l=>!(l.bag&&l.lv==="ok"));card.L.push({lv:"i",bag:1,no:1,t:`🧳 الانتظار ${h} ساعة (أكثر من 24) يعتبر توقف (Stopover): العفش ما ينشحن لآخر محطة — ينشحن لين ${apN(ap)} بس، والراكب يستلمه ويطلع من الجوازات.`,s:`العفش لين ${apN(ap)} بس — توقف أكثر من 24 ساعة`,src:sm.t,u:sm.u})}
        if(il&&il.lv!=="ok")bagR.forEach(([r,m])=>card.L.push(line(r,"i",m[1])))}}
    else if(lg.bag==="none"){const sep=P.ticket==="sep"||noAg(lg.car,legs[i].car);
      if(sep){const k="bp_"+ap,an=QA[k];card.L.push({lv:"i",bag:1,t:`🧳 بدون عفش — ما يحتاج يستلم عفش في ${apN(ap)}.`,s:"بدون عفش — ما فيه شحن"});
        card.L.push({lv:an===1?"ok":an===0?"i":"w",qk:k,ans:an,q:`معه بطاقة صعود للرحلة التالية من ${apN(ap)} (تشييك أونلاين أو من كاونتر التحويل داخل المطار)؟`,qno:`بدون بطاقة صعود لازم يطلع من الجوازات في ${apN(ap)} ويسوي قبول من جديد — فيحتاج إذن دخول.`,t:"التذاكر منفصلة: الرحلة التالية تحتاج بطاقة صعود."});
        if(an===0)bagsOut=true}
      else card.L.push({lv:"ok",bag:1,t:"🧳 بدون عفش — ما فيه شحن ولا استلام.",s:"بدون عفش — ما فيه شحن"})}
    else if(lg.bag==="out"){card.L.push({lv:"i",bag:1,t:`🧳 يستلم عفشه في ${apN(ap)} ويطلع من الجوازات — لازم يحق له دخول ${cn(c)}.`});b1.forEach(r=>card.L.push(line(r,"i")))}
    else card.L.push({lv:"w",bag:1,t:"🧳 حدد وين ينشحن العفش في هالمحطة (يمشي لآخر محطة أو يستلمه هنا)."});
    if(bagsOut||tooLong)card.L=card.L.filter(l=>!(l.tw&&l.lv==="ok"));
    card.lv=card.L.reduce((a,l)=>worse(a,l.lv),"ok");
    if(twBlock)card.lv="x";
    /* إذا لازم يطلع من المطار: هل يحق له الدخول؟ */
    if(!freeIn&&(bagsOut||tooLong||!lg.bag)){const e=eAny;card.ent=e;
      const tv=rules(c,"tvisa").map(r=>[r,match(r,P,x)]).filter(([r,m])=>m[0]).map(([r,m])=>line(r,"i",m[1]));
      card.ent.L=card.ent.L.concat(tv);
      if(bagsOut||tooLong)card.lv=worse(card.lv,e.lv);
      card.head=bagsOut||tooLong?`لازم يطلع من الجوازات في ${apN(ap)} — ${e.head.replace(/^✕\s*/,"")}`:`إذا اضطر يطلع من المطار: ${e.head}`}
    else{if(freeIn&&bagsOut){card.ent=eAny;card.mustExit=1;card.lv=worse(card.lv,eAny.lv)}card.head=twBlock?"⛔ ما يمشي الترانزيت هنا بالوضع الحالي — شوف السبب تحت":forced&&lg.bag==="thru"?`🧳 ما ينفع يتشحن العفش لين ${apN(pts[pts.length-1])}: ${cn(c)} تشترط استلامه في ${apN(ap)}${freeIn?" (وما يحتاج تأشيرة)":""}`:ilNo?`🧳 العفش ينشحن لين ${apN(ap)} بس (ما فيه اتفاقية شحن بين الناقلين) — يستلمه هنا وما يحتاج تأشيرة`:forced&&freeIn?"🧳 العفش ينستلم هنا — وما يحتاج تأشيرة لدخوله":freeIn?"ما يحتاج تأشيرة هنا حتى لو طلع من المطار":"يبقى داخل المطار"}
    if(bagsOut||tooLong)card.mustExit=1;
    /* حكم البطاقة بدون سطر «للمحطة تعميم…» — يُستخدم بعد ما تخلص مراجعة التعاميم بدون شي يخص الراكب */
    if(card.circ){const nc=card.L.filter(l=>!/^📢 للمحطة تعميم/.test(l.t)).reduce((a,l)=>worse(a,l.lv),"ok");card.lvNC=card.lv==="x"?"x":worse(nc,card.mustExit&&card.ent?card.ent.lv:"ok")}
    out.push(card)}
  /* الوجهة النهائية */
  const fc=final,e=entry(P,fc,{final,car:[legs[legs.length-1].car].filter(Boolean)});
  {const al=alertsL(fc,pts[pts.length-1],P,fc);out.push({k:"dst",ic:"🛬",t:`الوجهة: ${apLabel(pts[pts.length-1])}`,lv:al.length?"x":e.lv,head:al.length?al[0].t:e.head,L:al.concat(e.L)})}
  out.forEach(c=>{lvAll=worse(lvAll,c.lv)});
  const needs=[];out.forEach(c=>{if(!c.circ&&(c.lv==="w"||c.lv==="x")){const h=c.head||(c.L.find(l=>l.lv===c.lv)||{}).t||"";needs.push(c.t+": "+h)}});
  const missing=[];if(!P.ticket&&legs.length>1)missing.push("نوع التذكرة");
  const allL=out.flatMap(c=>c.L.concat(c.ent?c.ent.L:[]));if(P.age==null&&allL.some(l=>l.cond&&/عمر/.test(l.cond)))missing.push("العمر");if(!P.sex&&allL.some(l=>l.cond&&/رجل|امرأة/.test(l.cond)))missing.push("الجنس");
  const fines=[...new Set(out.filter(c=>c.lv==="x").map((c,k)=>c.k==="dst"?fc:c.k==="tr"?apC(pts[out.indexOf(c)]):"").filter(c=>K.FINE&&K.FINE[c]))].map(c=>({c,...K.FINE[c]}));
  return{cards:out,lv:lvAll,needs,missing,final,pts,fines}}

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
  /* «تذكرتين بحجز واحد» = حجز واحد (PNR واحد) → تذكرة وحدة */
  if(/تذكره وحده|تذكره واحده|نفس التذكره|حجز واحد|نفس الحجز|تذكره وحد|حجز وحد/.test(t))o.ticket="one";else if(/تذكرتين|تذاكر منفصل|منفصله|منفصلين|تذكره منفصله|حجزين/.test(t))o.ticket="sep";
  o.sup=[];[["امريك","US"],["بريطان","UK"],["شنغن","SCH"],["شنجن","SCH"],["اوروب","SCH"],["ايرلند","IE"],["كندا","CA"],["سنغافور","SG"],["يابان","JP"],["كوري","KR"],["استرال","AU"],["نيوزيلند","NZ"]].forEach(([k,v])=>{if(new RegExp("(تاشير|فيزا|اقام|جرين)[^\\s]*\\s+(\\S+\\s+)?"+k).test(t))o.sup.push(v)});
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
  /* الناقلين بمواقعهم: بالاسم العربي أو الرمز (FZ, 6E, SV…) */
  const ch=[];for(const[k,v]of Object.entries(CARN)){const kk=AN(k);let i=t.indexOf(kk);while(i>=0){if(!(kk==="السعوديه"&&!/(الخطوط|طيران|علي|طريق|مع)\s*$/.test(t.slice(Math.max(0,i-9),i))))ch.push([i,v,kk.length]);i=t.indexOf(kk,i+1)}}
  let m;const cre=new RegExp("(^|[^a-z0-9])("+[...new Set([...Object.keys(K.CAR),...Object.keys(WL)])].map(c=>c.toLowerCase()).join("|")+")(?=$|[^a-z0-9])","g");while((m=cre.exec(t)))ch.push([m.index+m[1].length,m[2].toUpperCase(),m[2].length]);
  ch.sort((a,b)=>a[0]-b[0]||b[2]-a[2]);const cs=[];ch.forEach(c=>{if(cs.length&&c[0]<cs[cs.length-1][0]+cs[cs.length-1][2])return;cs.push(c)});
  /* «عن طريق/على/مع + ناقل» = الناقل، مو ترانزيت */
  const carAt=i=>cs.some(c=>c[0]>=i&&c[0]-i<=2);
  const trw=/(عن طريق|ترانزيت|عبر|مرورا|مرور|via|يمر|بيمر|ربط|\sمن)/g;let trIdx=[];while((m=trw.exec(t))){const e=m.index+m[0].length;if(!carAt(e+1)&&!carAt(e))trIdx.push(e)}
  const isTr=p=>trIdx.some(i=>p[0]>=i-1&&p[0]-i<14);
  let route=[],rp=[];
  if(trIdx.length&&pl.some(isTr)){const tr=pl.filter(isTr),rest=pl.filter(p=>!isTr(p));[...tr,...rest].forEach(p=>{if(!route.includes(p[1])){route.push(p[1]);rp.push(p[0])}})}
  else pl.forEach(p=>{if(route[route.length-1]!==p[1]&&!route.includes(p[1])){route.push(p[1]);rp.push(p[0])}});
  if(route.length)o.legs=route.map(a=>({to:a,car:"",h:""}));
  /* توزيع الناقلين: إذا الناقل يجي بعد المحطات («الجوف القصيم دبي عن طريق السعودية») يغطي المحطات اللي قبله، وإذا يجي قبلها («على فلاي دبي رايح…») يغطي اللي بعده */
  if(o.legs&&cs.length){if(cs.length===1)o.legs.forEach(l=>l.car=cs[0][1]);
    else if(trIdx.length&&pl.some(isTr))o.legs.forEach((l,i)=>{l.car=cs[i]?cs[i][1]:cs[cs.length-1][1]});
    else{const after=cs[0][0]>Math.min(...rp);const allP=pl.map(p=>[p[0],p[1]]);
      o.legs.forEach(l=>{const ps=allP.filter(p=>p[1]===l.to).map(p=>p[0]);let c=null;
        if(after){for(const pp of ps){const n=cs.find(c=>c[0]>pp);if(n){c=n;break}}if(!c)c=cs[cs.length-1]}
        else{const pp=ps[ps.length-1];const pr=cs.filter(c=>c[0]<pp);c=pr.length?pr[pr.length-1]:cs[0]}
        l.car=c[1]})}}
  if(o.legs&&o.legs.length>1){const thru=/عفش\S*\s+(\S+\s+)?(لاخر|لين اخر|الي اخر|علي اخر|اخر)\s*(محطه|وجهه)/.test(t),out=/(يستلم|استلام|ياخذ)\s+(\S+\s+)?عفش/.test(t);
    if(thru)o.bagTo=o.legs.length-1;else if(out){const m2=t.match(/عفش\S*\s+(في|ب)\s*(\S+)/);let k=0;if(m2){const w=m2[2].replace(/^ال/,"");const f=o.legs.findIndex(l=>AN(apLabel(l.to)).includes(w));if(f>=0)k=f}o.bagTo=k}}
  const hm=t.match(/(\d{1,2})\s*ساع/);if(hm&&o.legs&&o.legs.length>1)o.legs[0].h=hm[1];
  /* تأشيرة للوجهة */
  if(o.legs){o.legs.forEach(l=>{const c=apC(l.to);if(c&&new RegExp("معه\\s+(تاشير|فيزا|اقام)[^\\s]*\\s+(\\S+\\s+)?("+Object.entries(CITY).filter(([k,v])=>apC(v)===c).map(([k])=>AN(k)).join("|")+")").test(t)){(o.visas=o.visas||{})[c]=1}})}
  return o}

/* ---------- الواجهة ---------- */
let CSS=`.tv{display:grid;gap:12px;min-width:0}.tv-h{display:flex;gap:10px;align-items:center}.tv-h i{font-style:normal;font-size:26px}.tv-h b{display:block;font-size:16px}.tv-h small{color:var(--muted);font-size:12px}
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
.tv-hero{border-radius:20px;padding:16px;display:grid;gap:12px;border:1px solid var(--line);background:var(--panel)}
.tv-hero.ok{background:linear-gradient(160deg,rgba(60,196,124,.22),rgba(60,196,124,.05));border-color:rgba(60,196,124,.45)}
.tv-hero.w{background:linear-gradient(160deg,rgba(240,180,41,.22),rgba(240,180,41,.05));border-color:rgba(240,180,41,.45)}
.tv-hero.x{background:linear-gradient(160deg,rgba(240,97,74,.25),rgba(240,97,74,.06));border-color:rgba(240,97,74,.5)}
.tv-hero.p{background:var(--panel)}
.tv-hero-t{display:flex;gap:12px;align-items:center}.tv-hero-t b{display:block;font-size:22px;line-height:1.2}.tv-hero-t small{color:var(--muted);font-size:13px;line-height:1.5}
.tv-big{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:900;color:#111;background:#8a9bb0}
.tv-hero.ok .tv-big{background:#3cc47c}.tv-hero.w .tv-big{background:#f0b429}.tv-hero.x .tv-big{background:#f0614a}.tv-hero.p .tv-big{background:#333;color:#ddd;animation:tvp 1.2s ease-in-out infinite}
@keyframes tvp{50%{opacity:.4}}
.tv-route{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:10px;border-radius:14px;background:rgba(0,0,0,.35)}
.tv-rp{display:grid;text-align:center}.tv-rp b{font-size:14px}.tv-rp small,.tv-ra small{font-size:11px;color:var(--muted);letter-spacing:.5px}
.tv-ra{display:grid;text-align:center;padding:0 4px}.tv-ra i{font-style:normal;color:var(--muted);font-size:16px;line-height:1}
.tv-who{display:flex;flex-wrap:wrap;gap:6px}.tv-who span{font-size:12px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--ink)}
.tv-sec{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:10px}
.tv-sec h4,.tv-h4,.tv-ai h4{margin:0;font-size:14px;font-weight:700;color:var(--muted)}.tv-h4{margin:6px 4px -2px}
.tv-sec.need{border-color:rgba(240,180,41,.4)}.tv-sec.need.x{border-color:rgba(240,97,74,.45)}.tv-sec.need.x .tv-need{background:rgba(240,97,74,.1);border-inline-start-color:#f0614a}.tv-need{font-size:15px;line-height:1.6;padding:10px 12px;border-radius:12px;background:rgba(240,180,41,.1);border-inline-start:3px solid #f0b429}
.tv-sec.bag.w{border-color:rgba(240,180,41,.45)}.tv-sec.bag.x{border-color:rgba(240,97,74,.5)}.tv-src{color:var(--muted);font-size:11.5px}
.tv-sec.circ.hit.x{border-color:rgba(240,97,74,.5)}.tv-sec.circ.hit.w{border-color:rgba(240,180,41,.45)}
.tv-cl{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.6}.tv-cl .tv-mk{margin-top:3px}
.tv-more summary{cursor:pointer;font-size:12.5px;color:var(--muted);list-style:none;padding:4px 0}.tv-more summary::-webkit-details-marker{display:none}.tv-more summary::before{content:"▸ ";}.tv-more[open] summary::before{content:"▾ "}
.tv-more .a{font-size:13.5px;line-height:1.75;padding-top:6px;color:var(--ink)}.tv-more{display:grid;gap:8px}
.tv-tl{display:grid;gap:0;position:relative}
.tv-st{position:relative;display:flex;gap:12px;padding-bottom:14px}.tv-st:not(:last-child)::after{content:"";position:absolute;inset-inline-start:15px;top:34px;bottom:2px;width:2px;background:var(--line)}
.tv-dot{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:15px;color:#111;z-index:1}
.tv-st.ok .tv-dot{background:#3cc47c}.tv-st.w .tv-dot{background:#f0b429}.tv-st.x .tv-dot{background:#f0614a}.tv-st.i .tv-dot{background:#8a9bb0}
.tv-st-b{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px;display:grid;gap:8px}
.tv-st.x .tv-st-b{border-color:rgba(240,97,74,.45)}.tv-st.w .tv-st-b{border-color:rgba(240,180,41,.35)}
.tv-st-h small{display:block;font-size:11.5px;color:var(--muted)}.tv-st-h b{display:block;font-size:16px}.tv-st-h span{display:block;font-size:14px;line-height:1.6;margin-top:2px}
.tv-skel{height:16px;border-radius:8px;background:linear-gradient(90deg,#161616,#222,#161616);background-size:200% 100%;animation:tvs 1.2s linear infinite}.tv-skel.s{width:60%}
@keyframes tvs{to{background-position:-200% 0}}
.tv-pk{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;min-width:0;background:var(--raise,#141414);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:15px;text-align:start}.tv-pk span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tv-pk i{font-style:normal;color:var(--muted);flex:none}.tv-pk.e span{color:var(--muted)}
.tv-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end}
.tv-sh{width:100%;box-sizing:border-box;max-height:88vh;background:#0b0b0b;border-top:1px solid #262626;border-radius:20px 20px 0 0;display:flex;flex-direction:column;padding:12px 12px calc(12px + env(safe-area-inset-bottom));gap:10px;direction:rtl;color:#f2f2f2;font-family:var(--body,system-ui)}
.tv-sh-h{display:flex;justify-content:space-between;align-items:center}.tv-sh-h b{font-size:16px}.tv-sh-h button{background:none;border:0;color:#9a9a9a;font:inherit;font-size:14px}
.tv-sh-q{width:100%;box-sizing:border-box;background:#141414;color:#f2f2f2;border:1px solid #262626;border-radius:12px;padding:12px;font:inherit;font-size:16px}
.tv-sh-l{overflow:auto;-webkit-overflow-scrolling:touch;display:grid;gap:2px;align-content:start}.tv-sh-l button{display:flex;justify-content:space-between;align-items:center;background:none;border:0;border-bottom:1px solid #1a1a1a;color:#f2f2f2;padding:12px 6px;font:inherit;font-size:15px;text-align:start}.tv-sh-l button small{color:#9a9a9a;font-size:12px}.tv-sh-l button.on{color:#d9c8a8;font-weight:700}
.tv-sh-g{font-size:12px;color:#9a9a9a;padding:10px 6px 4px}
.tv-ov.top{align-items:stretch}.tv-ov.top .tv-sh{max-height:none;height:100%;box-sizing:border-box;border-radius:0 0 20px 20px;border-top:0;border-bottom:1px solid #262626;padding-top:calc(12px + env(safe-area-inset-top));padding-bottom:12px}.tv-ov.top .tv-sh-l{flex:1;min-height:0}`;
const MK={ok:"✓",w:"!",x:"✕",i:"i"};
CSS+=`.tv-q{margin-top:6px;display:grid;gap:6px}.tv-q b{font-size:14.5px;line-height:1.6}.tv-q small{color:var(--muted);font-size:12px}.tv-qno{background:rgba(240,97,74,.12);border-inline-start:3px solid #f0614a;border-radius:8px;padding:8px 10px;font-size:13.5px}
.tv-qb button{min-width:72px}.tv-qb button.on.no{background:rgba(240,97,74,.18);border-color:#f0614a;color:#ffb4a6}
.tv-sec.qs.w{border-color:rgba(240,180,41,.45)}.tv-sec.qs.x{border-color:rgba(240,97,74,.5)}.tv-sec.qs.ok{border-color:rgba(70,190,120,.45)}.tv-sec h4 small{color:var(--muted);font-weight:400}
.tv-old{color:#f0b429;font-weight:600}.tv-adc{border:1px solid rgba(217,200,168,.35);border-radius:10px;padding:8px 10px}
#tvPpx{color-scheme:dark}
.tv-why{display:grid;gap:7px;margin-top:4px}.tv-w{display:flex;gap:9px;align-items:flex-start;font-size:15px;line-height:1.55}.tv-w>i{font-style:normal;width:22px;text-align:center;flex:0 0 22px}.tv-w .tv-mk{flex:0 0 auto;margin-top:2px}
.tv-w.x span{color:#ffb4a6;font-weight:600}.tv-w.ok span{color:#d6f5e0}.tv-w.i span{color:var(--muted)}.tv-st-h b{font-size:17px}`;
const mk=l=>`<span class="tv-mk ${l}">${MK[l]}</span>`;
CSS+=`.tv-hero.p .tv-big{background:none;animation:none;position:relative}.tv-hero.p .tv-big::before{content:"";position:absolute;inset:0;border-radius:50%;border:4px solid #2a2a2a;border-top-color:#f0b429;animation:tvrot .9s linear infinite}
@keyframes tvrot{to{transform:rotate(360deg)}}
.tv-scan{background:var(--panel);border:1px solid rgba(240,180,41,.35);border-radius:16px;padding:14px;display:grid;gap:10px}
.tv-bar{position:relative;height:28px;overflow:hidden;border-radius:14px;background:#151515}.tv-bar::before{content:"";position:absolute;inset:13px 14px auto;border-top:2px dashed #3a3a3a}
.tv-bar i{position:absolute;top:2px;right:0;font-style:normal;font-size:20px;line-height:24px;animation:tvfly 1.8s linear infinite;will-change:transform}
@keyframes tvfly{from{transform:translateX(40px)}to{transform:translateX(calc(-100vw))}}
.tv-stp{display:flex;gap:9px;align-items:center;font-size:14.5px;opacity:0;animation:tvin .35s ease forwards}.tv-stp:nth-of-type(2){animation-delay:.25s}.tv-stp:nth-of-type(3){animation-delay:.55s}.tv-stp:nth-of-type(4){animation-delay:.85s}
.tv-stp.r{color:#f0d9a0;font-weight:600}.tv-stp small{color:var(--muted);font-weight:400}
@keyframes tvin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.tv-spin{flex:0 0 20px;width:20px;height:20px;border-radius:50%;border:3px solid #2a2a2a;border-top-color:#f0b429;animation:tvrot .9s linear infinite;box-sizing:border-box}
.tv-wait{opacity:.4;pointer-events:none;filter:saturate(.5)}
.tv-fu{border-top:1px solid var(--line);padding-top:10px;display:grid;gap:8px}
.tv-chg{background:rgba(120,160,255,.08);border:1px solid rgba(120,160,255,.3);border-radius:12px;padding:8px 10px;display:grid;gap:4px;font-size:13.5px}.tv-chg b{font-size:13px;color:#b9cbff}
.tv-fl{display:grid;gap:7px}.tv-fl .tv-cl{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;line-height:1.6}.tv-fl .tv-cl.x span{color:#ffb4a6}.tv-fl p{margin:0;font-size:14px;line-height:1.7;color:var(--muted)}
.tv-fv{display:flex;gap:10px;align-items:center;border-radius:12px;padding:10px 12px;border:1px solid var(--line);font-size:15px}.tv-fv .tv-mk{width:26px;height:26px;font-size:14px;margin:0}.tv-fv small{display:block;color:var(--muted);font-size:12px;font-weight:400}
.tv-fv.ok{background:rgba(60,196,124,.12);border-color:rgba(60,196,124,.45)}.tv-fv.w{background:rgba(240,180,41,.12);border-color:rgba(240,180,41,.45)}.tv-fv.x{background:rgba(240,97,74,.14);border-color:rgba(240,97,74,.5)}
.tv-up{background:none;border:0;color:#b9cbff;font:inherit;font-size:13px;padding:0;text-decoration:underline;justify-self:start}
@media (prefers-reduced-motion:reduce){.tv-bar i,.tv-spin,.tv-hero.p .tv-big::before{animation-duration:3s}.tv-stp{animation:none;opacity:1}}`;
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
const PK_T={bag:"العفش ينشحن لين",nat:"جنسية الراكب",res:"مقيم في",to:"المطار",car:"الناقل"};
function openPick(kind,i){const items=kind==="bag"?[{v:"-1",l:"بدون عفش 🚫🧳",s:"شنطة يد فقط",g:"",k:AN("بدون عفش لا يوجد عفش شنطه يد no bag")}].concat(S.legs.map((l,k)=>({v:String(k),l:l.to?apLabel(l.to):"(محطة بدون مطار)",s:k===S.legs.length-1?"الوجهة النهائية":"ترانزيت "+(k+1),g:"",k:AN(l.to?apLabel(l.to):"")})).filter(o=>S.legs[+o.v].to)):kind==="car"?carItems():kind==="to"?apItems():natItems();
  const cur=kind==="bag"?String(S.bagTo):kind==="nat"?S.nat:kind==="res"?S.res:S.legs[i][kind];
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
    if(b.dataset.v!=null){const v=b.dataset.v;if(kind==="bag")S.bagTo=+v;else if(kind==="nat")S.nat=v;else if(kind==="res")S.res=v;else S.legs[i][kind]=v;S.out=null;close();save();paint()}})}
const pkLabel=(kind,v)=>!v?(kind==="car"?"اختر الناقل…":"اختر…"):kind==="car"?`${carN(v)} ${v}`:kind==="to"?apLabel(v):cn(v);
const pkBtn=(kind,v,i)=>`<button class="tv-pk ${v?"":"e"} ${!v&&S.showMiss&&kind!=="res"||(!v&&S.showMiss&&kind==="res")?"tv-miss":""}" data-pk="${kind}"${i!=null?` data-i="${i}"`:""}><span>${E(pkLabel(kind,v))}</span><i>⌕</i></button>`;
const ST_T={res:"مقيم (إقامة سعودية)",visit:"تأشيرة زيارة",umrah:"تأشيرة عمرة",tour:"تأشيرة سياحة"};
const isGcc=()=>GCC.includes(S.nat);
const resOf=()=>isGcc()?S.nat:S.st==="res"?"SA":(S.res||S.nat);
const needRt=()=>{const fc=apC(S.legs[S.legs.length-1].to);return!!fc&&fc!=="SA"&&fc!==S.nat&&fc!==resOf()&&!(GCC.includes(S.nat)&&GCC.includes(fc))};
const PT_T={N:"عادي",D:"دبلوماسي",O:"رسمي / خاص / خدمة"};
const isSup=()=>{try{return!!(typeof AUTH!=="undefined"&&AUTH.me&&AUTH.me.admin)}catch(e){return false}};
const routeCts=()=>[...new Set(S.legs.map(l=>apC(l.to)).filter(c=>c&&c!=="SA"&&c!==S.nat&&c!==resOf()&&!(GCC.includes(S.nat)&&GCC.includes(c))))];
/* الخانات الإجبارية قبل الفحص (نفس اللي يحتاجه تيماتيك + الناقل ونوع التذكرة للتعاميم والعفش) */
function req(){const m=[],r=[];if(!S.nat)m.push("جنسية الراكب (الجواز)");if(S.nat&&!isGcc()&&!S.st)m.push("وضع الراكب في السعودية: مقيم أو زيارة أو عمرة أو سياحة");
  S.legs.forEach((l,i)=>{const nm=i===S.legs.length-1?"الوجهة النهائية":"الترانزيت "+(i+1);if(!l.to)m.push("مطار "+nm);if(!l.car)m.push("الناقل في "+nm);
    if(i<S.legs.length-1&&l.to&&apC(l.to)!=="SA"&&!l.h)m.push("مدة الانتظار في "+apLabel(l.to));
  });
  if(!S.ppx)m.push("تاريخ انتهاء الجواز");
  if(!S.pur)m.push("غرض السفر");
  if(needRt()&&S.rt==null)m.push("هل معه تذكرة عودة أو مغادرة؟ (نعم/لا)");
  if(S.legs.length>1&&(S.bagTo==null||S.bagTo>=S.legs.length))m.push("🧳 العفش ينشحن لين أي مطار؟");
  if(S.legs.length>1&&!S.ticket)m.push("نوع التذكرة: وحدة أو منفصلة");
  routeCts().forEach(c=>{if(S.visas[c]==null)m.push("هل معه تأشيرة/إقامة سارية لـ "+cn(c)+"؟ (نعم/لا)")});
  /* العمر والجنس: إجباري فقط إذا فيه قاعدة لهالجنسية على هالمسار تفرق حسبها */
  const cs=[...new Set(S.legs.map(l=>apC(l.to)).filter(Boolean))],ag=new Set(),sx=new Set(),dy=new Set();
  K.R.forEach(r=>{if(!cs.includes(r.c)||(r.nat&&!inL(S.nat,r.nat))||(r.natNot&&inL(S.nat,r.natNot)))return;const n=r.notIf||{};
    if(r.age||n.age)ag.add(cn(r.c));if(r.sex||n.sex)sx.add(cn(r.c));if(r.needDays||r.daysMin)dy.add(cn(r.c))});
  if(S.days===""&&dy.size)m.push("مدة البقاء بالأيام (قواعد "+[...dy].join("، ")+" تفرق حسبها)");S.needDays=!!dy.size;
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
    <div class="tv-r"><label class="l">نوع الجواز<div class="tv-chips" id="tvPt">${Object.entries(PT_T).map(([k,v])=>`<button data-pt="${k}" class="${(S.pt||"N")===k?"on":""}">${v}</button>`).join("")}</div></label>
      <label class="l">انتهاء الجواز<input type="date" id="tvPpx" value="${E(S.ppx)}" class="${S.showMiss&&!S.ppx?"tv-miss":""}"></label></div>
    <label class="l">غرض السفر<div class="tv-chips ${S.showMiss&&!S.pur?"tv-miss":""}" id="tvPur">${Object.entries(PUR_T).map(([k,v])=>`<button data-pur="${k}" class="${S.pur===k?"on":""}">${v}</button>`).join("")}</div></label>
    <div class="tv-r"><label class="l">تذكرة عودة أو مغادرة<div class="tv-chips ${S.showMiss&&needRt()&&S.rt==null?"tv-miss":""}"><button data-rt="1" class="${S.rt===1?"on":""}">نعم</button><button data-rt="0" class="${S.rt===0?"on":""}">لا</button></div></label>
      <label class="l">مدة البقاء (أيام)<input type="number" id="tvDays" inputmode="numeric" min="1" value="${E(S.days)}" class="${S.showMiss&&S.needDays&&S.days===""?"tv-miss":""}" placeholder="${S.needDays?"مطلوب لهالحالة":"اختياري"}"></label></div>
    <div class="tv-r"><label class="l">العمر<input type="number" id="tvAge" inputmode="numeric" min="0" max="120" value="${E(S.age)}" class="${S.showMiss&&S.needAge&&S.age===""?"tv-miss":""}" placeholder="${S.needAge?"مطلوب لهالحالة":"غير مطلوب عادة"}"></label>
      <label class="l">الجنس<div class="tv-chips ${S.showMiss&&S.needSex&&!S.sex?"tv-miss":""}" id="tvSex"><button data-sex="M" class="${S.sex==="M"?"on":""}">رجل</button><button data-sex="F" class="${S.sex==="F"?"on":""}">امرأة</button></div></label></div></div>
  <div class="tv-box"><b>✈️ المسار — من الجوف AJF</b>
    ${legs.map((l,i)=>`<div class="tv-leg"><div class="n"><span>${i===legs.length-1?"🛬 الوجهة النهائية":"🔁 ترانزيت "+(i+1)}</span>${legs.length>1?`<button data-del="${i}">حذف ✕</button>`:""}</div>
      <div class="tv-r">${pkBtn("to",l.to,i)}${pkBtn("car",l.car,i)}</div>
      ${i<legs.length-1?`<label class="l">مدة الانتظار في ${E(l.to?apLabel(l.to):"الترانزيت")} (ساعات)<input type="number" inputmode="decimal" data-leg="${i}" data-f="h" class="${S.showMiss&&!l.h&&l.to&&apC(l.to)!=="SA"?"tv-miss":""}" value="${E(l.h)}" placeholder="مطلوب"></label>`:""}</div>`).join("")}
    <button class="tv-add" id="tvAdd">＋ أضف محطة بعد الوجهة</button>
    ${legs.length>1?`<label class="l">🧳 العفش ينشحن لين<button class="tv-pk ${S.bagTo==null||S.bagTo>=legs.length?"e":""} ${S.showMiss&&(S.bagTo==null||S.bagTo>=legs.length)?"tv-miss":""}" data-pk="bag"><span>${S.bagTo===-1?"بدون عفش (شنطة يد فقط)":S.bagTo!=null&&S.bagTo<legs.length&&legs[S.bagTo].to?E(apLabel(legs[S.bagTo].to))+(S.bagTo===legs.length-1?" (الوجهة النهائية)":""):"اختر المطار…"}</span><i>⌕</i></button></label>${bagCapNote()}`:""}
    ${legs.length>1?`<label class="l">التذكرة<div class="tv-chips ${S.showMiss&&!S.ticket?"tv-miss":""}" id="tvTk"><button data-tk="one" class="${S.ticket==="one"?"on":""}">تذكرة وحدة (حجز واحد)</button><button data-tk="sep" class="${S.ticket==="sep"?"on":""}">تذاكر منفصلة</button></div></label>`:""}</div>
  <div class="tv-box"><b>📄 الوثائق اللي معه</b>
    ${cts.length?cts.map(c=>`<div class="tv-vq ${S.showMiss&&S.visas[c]==null?"tv-miss":""}"><span>معه تأشيرة أو تصريح دخول (eVisa / ETA) أو إقامة سارية لـ ${E(cn(c))}؟</span><div class="tv-chips"><button data-visa="${c}" data-val="1" class="${S.visas[c]===1?"on":""}">نعم</button><button data-visa="${c}" data-val="0" class="${S.visas[c]===0?"on":""}">لا</button></div></div>`).join(""):`<div class="tv-note">اختر المسار أول عشان تطلع أسئلة التأشيرات.</div>`}
    <div class="tv-note">تأشيرة أو إقامة سارية من (تفيد لبعض الدول مثل تركيا والإمارات):</div>
    <div class="tv-chips" id="tvSup">${Object.entries(SUP).map(([k,v])=>`<button data-sup="${k}" class="${S.sup.includes(k)?"on":""}">${v}</button>`).join("")}</div>
    <div class="tv-chips"><button data-ebola="1" class="${S.ebola?"on":""}">كان في الكونغو/أوغندا/جنوب السودان/كينيا آخر 21 يوم</button><button data-yf="1" class="${S.yf?"on":""}">قادم من / كان في دولة من قائمة الحمى الصفراء (أفريقيا وأمريكا الجنوبية)</button></div></div>
  <button class="tv-go" id="tvGo">🔎 افحص الاشتراطات</button>
  <div id="tvOut">${outHTML()}</div></div>`}
const oldSrc=d=>d&&(new Date(K.D)-new Date(d))/86400000>365;
function qBtns(l){return`<div class="tv-chips tv-qb"><button data-qa="${E(l.qk)}" data-v="1" class="${l.ans===1?"on":""}">نعم</button><button data-qa="${E(l.qk)}" data-v="0" class="${l.ans===0?"on no":""}">لا</button></div>`}
function lineH(l,btn){const q=l.qk?`<div class="tv-q"><b>❓ ${E(l.q)}</b>${btn?qBtns(l):`<small>${l.ans===1?"✓ تم التأكيد":l.ans===0?"✕ الجواب: لا":"جاوب عليه في «أسئلة التأكيد» فوق"}</small>`}${l.ans===0&&l.qno?`<div class="tv-qno">${E(l.qno)}</div>`:""}</div>`:"";
  return`<div class="tv-l">${mk(l.lv)}<div>${l.cond?`<em>إذا ${E(l.cond)}: </em>`:""}${l.qk&&btn?"":E(l.t)}${q}${l.src?`<small>المصدر: ${l.u?`<a href="${E(l.u)}" target="_blank" rel="noopener">${E(l.src)}</a>`:E(l.src)}${l.d?" · "+E(l.d):""}${oldSrc(l.d)&&!l.perm?` <b class="tv-old">⚠️ مصدر قديم — يحتاج مراجعة</b>`:""}</small>`:""}</div></div>`}
/* ---------- عرض النتيجة ---------- */
const VT={ok:["✓","Ok to Board — يُقبل","القواعد والتعاميم ما فيها ما يمنع"],w:["!","Conditional — يُقبل بشرط","جاوب «أسئلة التأكيد» وتأكد من النقاط تحت: إذا كلها «نعم» يصير يُقبل"],x:["✕","Don't Board — لا يُقبل","بالوضع الحالي ما يمشي — شوف السبب تحت"]};
function heroH(o,lv,pending){const p=P(),v=VT[lv],pts=o.pts;
  const route=pts.map((a,i)=>`<span class="tv-rp"><b>${E(a==="AJF"?"الجوف":a.startsWith("C:")?cn(a.slice(2)):apN(a))}</b><small>${E(a.startsWith("C:")?"":a)}</small></span>${i<pts.length-1?`<span class="tv-ra"><i>←</i><small>${E(p.legs[i].car||"")}</small></span>`:""}`).join("");
  const who=[cn(p.nat),p.st==="cit"?"مواطن خليجي":ST_T[p.st]||"",p.legs.length>1?(p.ticket==="one"?"تذكرة وحدة":"تذاكر منفصلة"):"",p.legs.length>1&&S.bagTo===-1?"🚫 بدون عفش":p.legs.length>1&&S.bagTo!=null&&p.legs[S.bagTo]?(()=>{const k=o.cards.findIndex(c=>c.k==="tr"&&c.L.some(l=>l.bag&&l.no));return k>0?"🧳 العفش لين "+apN(o.pts[k])+" بس (ما ينشحن أبعد)":"🧳 العفش لين "+apN(p.legs[S.bagTo].to)})():""].filter(Boolean);
  const ov=!pending&&S.ovr;
  return`<div class="tv-hero ${pending?"p":ov?"ok":lv}"><div class="tv-hero-t"><span class="tv-big">${pending?"":ov?"✓":v[0]}</span><div><b>${pending?"جاري الفحص":ov?"Ok to Board — بتجاوز المشرف":v[1]}</b><small>${pending?"نراجع القواعد وتعاميم المحطة — لا تقرر قبل ما يخلص":ov?`الحكم الأصلي: ${VT[lv][1]} · السبب: ${E(S.ovr.r)} · ${E(S.ovr.by)}`:v[2]}</small></div></div>
    <div class="tv-route">${route}</div><div class="tv-who">${who.map(w=>`<span>${E(w)}</span>`).join("")}</div></div>`}
function outHTML(){const o=S.out;if(!o)return"";if(o.err)return`<div class="bd-empty">${E(o.err)}</div>`;
  const cv=S.cv||{st:"run"};
  if(cv.st==="run")return heroH(o,"w",true)+scanH(o)+`<div class="tv-wait">${cardsH(o)}</div>`;
  const hit=cv.st==="ok"&&circLines(cv).length>0,lv=ovLv(o,cv);
  const needs=[...o.needs];if(hit&&cv.lv!=="ok"&&cv.k)needs.unshift("📢 حسب تعميم المحطة: "+cv.k);if(cv.fu&&cv.fu!=="ok"&&cv.fk)needs.unshift("🤖 حسب آخر متابعة: "+cv.fk);if(cv.st!=="ok")needs.unshift("ما تمت مراجعة التعاميم — أعد المراجعة تحت");
  const fin=lv==="x"?(o.fines||[]).map(f=>`<div class="tv-need">💰 ${E(cn(f.c))}: ${E(f.t)}</div>`).join(""):"";
  return heroH(o,lv)+(fin?`<div class="tv-sec need x">${fin}</div>`:"")+qH(o)+cardsH(o)+circH(cv)+ovrH(lv)+aiH()}
/* الحكم العام = أسوأ حكم بطاقة بعد مراجعة التعاميم (بطاقة فيها تعميم وتمت المراجعة بدون شي يخصه → تصير ✓ مثل ما تظهر في البطاقة) */
function ovLv(o,cv){const hit=cv.st==="ok"&&circLines(cv).length>0,oLv=o.cards.reduce((a,c)=>worse(a,cardLv(c,cv)),"ok");const L=cv.st==="ok"?(hit?worse(oLv,cv.lv):oLv):worse(oLv,"w");return cv.fu?worse(L,cv.fu):L}
/* شاشة «جاري الفحص»: طيارة تمشي + خطوات تتعلّم وحدة وحدة */
function scanH(o){const n=o.cards.length;return`<div class="tv-scan" role="status" aria-live="polite"><div class="tv-bar"><i>✈︎</i></div>
  <div class="tv-stp d">${mk("ok")}<span>قراءة بيانات الراكب والمسار</span></div>
  <div class="tv-stp d">${mk("ok")}<span>قواعد المغادرة والترانزيت والدخول <small>(${n} محطة)</small></span></div>
  <div class="tv-stp r"><span class="tv-spin"></span><span>مراجعة تعاميم المحطة… <small>عادة 10–30 ثانية</small></span></div>
  <div class="tv-stp"><span class="tv-spin" style="opacity:.35;animation:none"></span><span style="color:var(--muted)">الحكم النهائي</span></div></div>`}
/* أسئلة التأكيد (مثل «Can you confirm conditions are met?» في ADC) */
function qLines(o){const seen=new Set(),out=[];o.cards.forEach(c=>{c.L.concat(c.ent&&(c.mustExit||c.k==="dst")?c.ent.L:[]).forEach(l=>{if(l.qk&&!seen.has(l.qk)){seen.add(l.qk);out.push(l)}})});return out}
function qH(o){const qs=qLines(o);if(!qs.length)return"";const left=qs.filter(l=>l.ans==null).length;
  return`<div class="tv-sec qs ${qs.some(l=>l.ans===0)?"x":left?"w":"ok"}"><h4>✅ أسئلة التأكيد ${left?`<small>(باقي ${left})</small>`:""}</h4><div class="tv-note">مثل ADC: إذا كل الأجوبة «نعم» يصير الحكم يُقبل، وأي «لا» يصير لا يُقبل.</div>${qs.map(l=>lineH(l,1)).join("")}</div>`}
function arrH(o){const seen=new Set(),ls=[];o.cards.forEach(c=>c.L.concat(c.ent&&(c.mustExit||c.k==="dst")?c.ent.L:[]).forEach(l=>{if(l.arr&&!l.qk&&!seen.has(l.t)){seen.add(l.t);ls.push(l)}}));if(!ls.length)return"";
  return`<div class="tv-sec"><h4>🪪 بطاقات الوصول الرقمية <small>(مو تأشيرة)</small></h4>${ls.map(l=>lineH(l)).join("")}</div>`}
function ovrH(lv){if(lv==="ok"||!isSup())return"";if(S.ovr)return`<div class="tv-sec"><h4>🔓 تجاوز المشرف</h4><div class="tv-note">تم التجاوز: ${E(S.ovr.r)} — ${E(S.ovr.by)} (${E(S.ovr.at.slice(0,16).replace("T"," "))})</div><button class="tv-sm" id="tvOvrX">إلغاء التجاوز</button></div>`;
  return`<details class="tv-sec tv-more"><summary>🔓 تجاوز المشرف (للمشرف فقط)</summary><div class="tv-note">مثل Override ADC: اكتب السبب، وينحفظ التجاوز في سجل التطبيق باسمك.</div><textarea id="tvOvrR" rows="2" placeholder="سبب التجاوز (إجباري)">${E(S.ovrR||"")}</textarea><button class="tv-sm" id="tvOvr">تجاوز الحكم</button></details>`}
function bagH(o){const rows=[];o.cards.forEach((c,ci)=>{if(c.k!=="tr")return;c.L.filter(l=>l.bag).forEach(l=>rows.push([o.pts[ci],l]))});if(!rows.length)return"";
  const lv=rows.reduce((a,[,l])=>worse(a,l.lv==="i"?"ok":l.lv),"ok");
  return`<div class="tv-sec bag ${lv}"><h4>🧳 شحن العفش</h4>${rows.map(([ap,l])=>`<div class="tv-cl">${mk(l.lv)}<span><b>${E(apN(ap))}:</b> ${E(l.t.replace(/^🧳\s*/,""))}${l.src?`<small class="tv-src"> — ${E(l.src)}</small>`:""}</span></div>`).join("")}</div>`}
function circLines(cv){return String(cv.a||"").split("\n").map(x=>x.replace(/\*+/g,"").trim()).filter(x=>/^📢/.test(x)).map(x=>x.replace(/^📢\s*(التعاميم|التعميم)?\s*:?\s*/,"")).filter(x=>!/لا يوجد تعميم|ما فيه تعميم|لا توجد تعاميم|لا ينطبق/.test(x))}
function circH(cv){if(cv.st!=="ok")return`<div class="tv-sec"><h4>📢 تعاميم المحطة</h4><div class="tv-note">${E(cv.err||"تعذّرت المراجعة")}</div><button class="tv-sm" id="tvCv">↻ أعد مراجعة التعاميم</button></div>`;
  const ls=circLines(cv),none=!ls.length;
  return`<div class="tv-sec circ ${none?"":"hit "+cv.lv}"><h4>📢 تعاميم المحطة</h4>
    ${none?`<div class="tv-cl">${mk("ok")}<span>ما فيه تعميم إضافي يخص هالراكب أو هالمسار</span></div>`:ls.map(x=>`<div class="tv-cl">${mk(cv.lv==="ok"?"i":cv.lv)}<span>${E(x)}</span></div>`).join("")}
    <details class="tv-more"><summary>رد المراجعة كامل</summary><div class="a">${fmt(cv.a)}</div></details></div>`}
/* سطر مختصر: أول جملة فقط */
const short=t=>{t=String(t||"").replace(/^🧳\s*/,"").replace(/^✕\s*/,"");const k=t.search(/[.؟](\s|$)/);return(k>20?t.slice(0,k):t).trim()};
/* تحت كل مطار: سبب مختصر للقبول أو الرفض + أيقونة، والتفاصيل مطوية */
function whyL(c,lv,o,ci){const W=[],seen=new Set(),add=(lv,t,ic)=>{t=short(t);if(!t||seen.has(t))return;seen.add(t);W.push({lv,t,ic})};
  const ent=c.ent&&(c.mustExit||c.k==="dst")?c.ent.L:[],all=c.L.concat(ent),bg=c.L.find(l=>l.bag),bgAdd=()=>{if(bg)add(bg.lv==="i"?(bg.no?"i":"ok"):bg.lv,bg.s||bg.t,"🧳")};
  if(c.k==="exit"&&!c.L.some(l=>l.lv!=="i"&&l.lv!=="ok")){add("ok","ما فيه شرط يمنع المغادرة");return W}
  if(c.k==="tr"&&c.mustExit&&c.ent){const tl=c.L.find(l=>/ما يقدر يبقى في منطقة الترانزيت|داخل منطقة شنغن/.test(l.t));if(tl)add("w",tl.s,"⏱️");bgAdd();c.L.filter(l=>l.lv==="x"&&!l.bag).slice(0,1).forEach(l=>add("x",l.ans===0&&l.qno?l.qno:l.t));
    add(c.ent.lv,`لازم يطلع من الجوازات في ${apN(o.pts[ci])}${c.ent.lv==="x"?" — "+short(c.ent.head):c.ent.lv==="ok"?" — "+short(c.ent.head):": "+short(c.ent.head)}`)}
  else{const xs=all.filter(l=>l.lv==="x"&&!l.bag);
    if(lv==="x"&&xs.length)add("x",xs[0].ans===0&&xs[0].qno?xs[0].qno:(c.head&&!/^(مسموح|يبقى)/.test(c.head)?c.head:xs[0].t));
    else{const onlyQ=lv==="w"&&!all.some(l=>l.lv==="w"&&!l.qk);add(lv==="w"&&!onlyQ?"w":"ok",c.head||"مسموح")}
    bgAdd()}
  if(lv!=="x"&&all.some(l=>l.qk&&l.ans==null))add("w","بانتظار جوابك على سؤال التأكيد فوق");
  if(c.k==="dst"&&all.some(l=>l.arr))add("i","يعبّي بطاقة الوصول الرقمية قبل الوصول (مو تأشيرة)","🪪");
  return W}
function cardLv(c,cv){const hit=cv.st==="ok"&&circLines(cv).length>0;const nc=c.lvNC||c.lv;return c.circ?(cv.st==="ok"?(hit?worse(nc,cv.lv):nc):"w"):c.lv}
function cardsH(o){const cv=S.cv||{};return`<div class="tv-tl">${o.cards.map((c,ci)=>{const hit=cv.st==="ok"&&circLines(cv).length>0,lv=cardLv(c,cv);
  const W=whyL(c,lv,o,ci);if(c.circ&&hit&&cv.lv!=="ok")W.unshift({lv:cv.lv,t:cv.lv==="x"?"حسب تعميم المحطة ما يمشي — شوف «تعاميم المحطة»":"حسب تعميم المحطة: بشرط — شوف «تعاميم المحطة»"});
  const ent=c.ent?`<div class="tv-sub"><b>🛂 دخول ${E(cn(apC(o.pts[ci])))}: ${E(c.ent.head)}</b>${c.ent.L.map(l=>lineH(l)).join("")}</div>`:"";
  const det=c.L.filter(l=>!(l.arr&&!l.qk));
  return`<div class="tv-st ${lv}"><span class="tv-dot">${MK[lv]}</span><div class="tv-st-b"><div class="tv-st-h">${c.k==="exit"?"<small>المغادرة</small>":`<small>${c.k==="tr"?"ترانزيت":"الوجهة النهائية"}</small>`}<b>${E(c.k==="exit"?"من السعودية":c.t.replace(/^[^:]+:\s*/,""))}</b></div>
    <div class="tv-why">${W.map(w=>`<div class="tv-w ${w.lv}">${w.ic?`<i>${w.ic}</i>`:mk(w.lv==="i"?"i":w.lv)}<span>${E(w.t)}</span></div>`).join("")}</div>
    ${det.length||ent?`<details class="tv-more"><summary>التفاصيل والمصادر</summary>${det.map(l=>lineH(l)).join("")}${ent}</details>`:""}</div></div>`}).join("")}</div>`}
function aiH(){return`<div class="tv-ai"><h4>🤖 كمّل مع المساعد</h4>
      <div class="tv-note">إذا عندك معلومة زيادة أو تصحيح اكتبها، والمساعد يحدّث الفحص فوق ويعيد الحكم مع القواعد والتعاميم.</div>
      ${S.th.slice(1).map(fuH).join("")}${S.busy?`<div class="tv-fu"><div class="q">👤 ${E(S.pq||"")}</div><div class="tv-scan"><div class="tv-bar"><i>✈︎</i></div><div class="tv-stp r"><span class="tv-spin"></span><span>يراجع معلومتك مع القواعد والتعاميم…</span></div></div></div>`:""}
      <textarea id="tvAq" rows="2" placeholder="اكتب متابعة أو تصحيح، مثلاً «إقامته السعودية باقي عليها 4 شهور»">${E(S.aq)}</textarea>
      <button class="tv-go" id="tvAsk" ${S.busy?"disabled":""}>${S.busy?"… جاري التحليل":"أرسل"}</button></div>
    <div class="tv-note tv-adc">⚖️ حكم ADC في نظام القبول (Altea) هو المرجع الرسمي. هذي الأداة تجهزك قبله وتشرح لك بالعربي، والتعميم الأحدث يتقدم على قاعدة البيانات العامة.</div>
    <div class="tv-note">هذي الأداة تجمع قواعد منشورة من مواقع حكومية وشركات طيران (مو من تيماتيك نفسه). القواعد تتغير، فإذا الحكم ⚠️ أو الحالة نادرة، تأكد قبل القبول. آخر مراجعة للقواعد: ${E(K.D)}.</div>`}
function fmt(t){return E(String(t||"")).replace(/^\s*#{1,4}\s*(.+)$/gm,"<b>$1</b>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[*-]\s+/gm,"• ").replace(/\n/g,"<br>")}
function legsB(){const n=S.legs.length,k=S.legs.length>1?(S.bagTo!=null&&S.bagTo<n?S.bagTo:null):0;return S.legs.map((l,i)=>({...l,bag:k===-1?(i<n-1?"none":""):k==null?"":i<n-1?(i<k?"thru":i===k?"out":"thru"):""}))}
function P(){return{pt:S.pt||"N",ppx:S.ppx,pur:S.pur,rt:S.rt,days:S.days===""?null:+S.days,yf:S.yf,qa:S.qa||{},il:S.il||{},ilPending:!!(S.cv&&S.cv.st==="run"),nat:S.nat,st:isGcc()?"cit":S.st,res:resOf(),age:S.age===""?null:+S.age,sex:S.sex,sup:S.sup,ebola:S.ebola,ticket:S.legs.length>1?S.ticket:"one",legs:legsB(),visas:S.visas}}
function run(){if(!S.nat){S.out={err:"اختر جنسية الراكب أول."};paintOut();return}if(!S.legs[S.legs.length-1].to){S.out={err:"اختر الوجهة النهائية."};paintOut();return}
  loadPI().then(()=>{S.il={};S.qa={};S.ovr=null;S.ovrR="";S.cv={st:"run"};S.out=analyze(P());S.th=[];paintOut();reviewCirc();try{ajfAct&&ajfAct("tv",S.nat+">"+S.legs.map(l=>l.to).join(">"))}catch(e){}
    setTimeout(()=>{const o=root.querySelector("#tvOut");if(o)o.scrollIntoView({behavior:"smooth",block:"start"})},50)}).catch(()=>{S.out={err:"تعذّر تحميل قاعدة التأشيرات، تأكد من الإنترنت."};paintOut()})}
function paintOut(){const o=root&&root.querySelector("#tvOut");if(o)o.innerHTML=outHTML();save()}
function ctxText(){const p=P(),o=S.out;const L=[];
  L.push("بيانات الحالة وقواعد السفر من قاعدة بيانات التطبيق (بديل نص شاشة TIMATIC — جمعت من مواقع حكومية وشركات طيران، وكل قاعدة معها مصدرها):");
  L.push(`الراكب: جنسية ${cn(p.nat)} (${p.nat})، وضعه في السعودية: ${p.st==="cit"?"مواطن خليجي":ST_T[p.st]||"غير محدد"}${p.st==="res"?"":"، يعني مو مقيم في السعودية ولا ينطبق عليه أي شرط خاص بالمقيمين في الخليج"}، بلد إقامته: ${cn(p.res)}، العمر ${p.age??"غير محدد"}، الجنس ${p.sex==="M"?"رجل":p.sex==="F"?"امرأة":"غير محدد"}.`);
  L.push(`الجواز: ${PT_T[p.pt]||"عادي"}، ينتهي ${p.ppx||"غير محدد"}. غرض السفر: ${PUR_T[p.pur]||"غير محدد"}. تذكرة عودة/مغادرة: ${p.rt===1?"نعم":p.rt===0?"لا":"غير محدد"}. مدة البقاء: ${p.days??"غير محدد"} يوم.${p.yf?" قادم من دولة من قائمة الحمى الصفراء.":""}`);
  L.push(`المسار: الجوف AJF ← ${p.legs.map(l=>`${apLabel(l.to)}${l.car?" على "+carN(l.car):""}${l.h?" (انتظار "+l.h+" ساعة)":""}${l.bag?(l.bag==="none"?" [بدون عفش]":l.bag==="thru"?" [العفش يمشي لآخر محطة]":" [يستلم عفشه هنا]"):""}`).join(" ← ")}. التذكرة: ${p.ticket==="one"?"وحدة":p.ticket==="sep"?"منفصلة":"غير محدد"}.`);
  const vs=Object.keys(p.visas).filter(k=>p.visas[k]===1),vn=Object.keys(p.visas).filter(k=>p.visas[k]===0);L.push(`مطارات المسار بالإنجليزي: ${p.legs.map(l=>l.to.startsWith("C:")?enN(l.to.slice(2)):l.to+" "+enN(apC(l.to))).join(" / ")}. الناقلين: ${p.legs.map(l=>l.car?carN(l.car)+" "+l.car:"").filter(Boolean).join(" / ")}.`);
  L.push(`الوثائق: ${vs.length?"معه تأشيرة/إقامة سارية لـ "+vs.map(cn).join("، "):"ما معه تأشيرات"}${vn.length?"؛ ما معه تأشيرة لـ "+vn.map(cn).join("، "):""}${p.sup.length?"؛ معه تأشيرة/إقامة من "+p.sup.map(s=>SUP[s]).join("، "):""}${p.ebola?"؛ كان في دول الإيبولا خلال 21 يوم":""}.`);
  L.push("\nنتيجة المحرك الآلي:");
  o.cards.forEach(c=>{L.push(`\n[${c.t}] الحالة: ${c.lv} — ${c.head||""}`);c.L.forEach(l=>L.push(`- (${l.lv}) ${l.cond?"إذا "+l.cond+": ":""}${l.t}${l.src?" [المصدر: "+l.src+"]":""}`));
    if(c.ent){L.push(`  إذن الدخول لو طلع من المطار: ${c.ent.head}`);c.ent.L.forEach(l=>L.push(`  - (${l.lv}) ${l.cond?"إذا "+l.cond+": ":""}${l.t}${l.src?" [المصدر: "+l.src+"]":""}`))}});
  L.push(`\nالحكم الآلي: ${o.lv==="ok"?"يُقبل":o.lv==="w"?"يُقبل بشروط":"لا يُقبل"}.${o.missing.length?" معلومات ناقصة: "+o.missing.join("، "):""}`);
  L.push("\nمعنى الرموز: ok مسموح · w شرط/تأكد · x مانع · i معلومة. القاعدة العامة (Passport Index) أقل دقة من القواعد المفصلة.");
  return L.join("\n")}
const CVQ="قواعد قراءة التعاميم: (1) أي تعميم مكتوب عليه ملغى أو Cancelled أو انتهت مدته لا تطبقه. (2) التنبيهات التشغيلية المؤقتة (إغلاق مطار، إيقاف رحلات، إغلاق أجواء، منع ترانزيت لظرف طارئ) لا تطبقها إذا مر عليها أكثر من 30 يوم إلا إذا فيه تعميم أحدث يجددها. (3) إذا تعميمين يتعارضون، الأحدث تاريخاً هو المعتمد. (4) إذا التعميم يقول إن تيماتيك أو القواعد العامة غير محدثة، التعميم يتقدم. (5) قواعد التطبيق المرفقة مبنية أصلاً على تعاميم المحطة اللي مذكور مصدرها — لا تكررها إلا إذا فيه تعميم أحدث يغيرها. "+"إذا المسار فيه ترانزيت أبوظبي AUH: طبّق تعميم ترانزيت أبوظبي بشروطه بالضبط كما هي مكتوبة في نصه (أي ناقلين، أي اتفاقية مع السعودية، تذكرة وحدة أو منفصلة، أي جنسيات أو استثناءات) — لا توسّعه ولا تضيّقه، واذكر عنوانه وتاريخه. وبشكل عام: راجع تعاميم المحطة المرفقة على هالحالة بدقة: المطارات (عربي وإنجليزي ورموز)، الناقلين، الجنسية، الإقامة، نوع التذكرة. اذكر كل تعميم ينطبق وأثره بسطر 📢. إذا ما فيه تعميم يخص الحالة قل ذلك صراحة. بعدين أعطني الحكم النهائي بعد دمج القواعد مع التعاميم (التعميم الأشد يُقدَّم). مهم: إذا الموظف حدد إن الراكب ما معه تأشيرة لبلد يشترط تأشيرة مسبقة، فالحكم ⛔ لا يُسمح له بالسفر — مو ⚠️.";
const verdict=a=>{const t=String(a||"");const i=t.lastIndexOf("الخلاصة");const ln=i>=0?t.slice(i).split("\n")[0]:"";const z=ln||t;
  const lv=/⛔|لا يُسمح|لا يسمح/.test(z)?"x":/⚠️|إذا معه|بشرط/.test(z)?"w":/✅|يُسمح له|يسمح له/.test(z)?"ok":"w";return{lv,k:ln.replace(/\*+/g,"").replace(/^الخلاصة:?\s*/,"").trim()}};
async function callAI(q,h){const r=await fetch(SB_URL+"/functions/v1/ajf-dc",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},body:JSON.stringify({token:AUTH.tok||"",device:AUTH.dev,kind:"tim",ctx:ctxText(),q,h})});
  if(r.status===404)throw new Error("nofn");const j=await r.json();if(j.s==="out")throw new Error("out");if(j.s==="nokey")throw new Error("nokey");if(j.s!=="ok")throw new Error(j.s||"aierr");return j.answer||""}
const aiErr=m=>m==="out"?"سجّل دخولك أول.":m==="nokey"?"مفتاح Gemini ناقص في Supabase.":m==="aierr"?"تتعذّر مراجعة التعاميم حالياً لكثرة الطلبات — يُرجى إعادة المحاولة بعد دقيقة.":"تعذّر الاتصال، جرّب مرة ثانية.";
function ilPairs(){const L=S.legs,ps=[];if(L.length<2||S.ticket!=="sep")return ps;for(let i=0;i<L.length-1;i++){const a=L[i].car,b=L[i+1].car;if(a&&b&&a!==b&&!ps.includes(a+">"+b))ps.push(a+">"+b)}return ps}
function parseIl(a){const il={};String(a||"").split("\n").forEach(x=>{const m=x.replace(/\*+/g,"").match(/🧳\s*([A-Z0-9]{2})\s*[>←→\-–]+\s*([A-Z0-9]{2})\s*:\s*(نعم|لا|غير مذكور)\s*[—–\-:]?\s*(.*)/);if(m)il[m[1]+">"+m[2]]={v:m[3]==="نعم"?"yes":m[3]==="لا"?"no":"unk",src:m[4]&&m[4].trim()?"تعميم: "+m[4].trim():"تعاميم المحطة"}});return il}
async function reviewCirc(){let tok=S.out;S.cv={st:"run"};S.out=analyze(P());tok=S.out;paintOut();
  const ps=ilPairs(),q=CVQ+(ps.length?` + شحن العفش (interline / through check / اتفاقية شحن العفش / baggage agreement): الراكب على تذاكر منفصلة. ابحث في التعاميم عن اتفاقيات شحن العفش بين هالناقلين: ${ps.map(p=>p.split(">").map(c=>carN(c)+" "+c).join(" ← ")).join("، ")}. وقبل سطر الخلاصة اكتب سطر لكل زوج بهالشكل بالضبط (بالرموز الإنجليزية): ${ps.map(p=>"🧳 "+p+": نعم أو لا أو غير مذكور — عنوان التعميم").join(" | ")}. «نعم» فقط إذا التعميم يذكر الاتفاقية صراحة، و«لا» فقط إذا التعميم ينفيها أو يمنع الشحن، وغير كذا «غير مذكور».`:"");
  try{const a=await callAI(q,[]);if(S.out!==tok)return;S.th=[{q,a}];S.il=parseIl(a);S.cv={st:"ok",a,...verdict(a)};S.out=analyze(P())}
  catch(e){if(S.out!==tok)return;S.cv={st:"err",err:aiErr(e.message)}}paintOut()}
/* ---------- المتابعة: نفس طريقة الفحص (✓ / ! / ✕) ---------- */
const MKRE=/⛔|❌|🚫|✕|✖️?|⚠️?|✅|✔️?|✓/g;
function aiLines(a){return String(a||"").split("\n").map(x=>x.replace(/\*+/g,"").replace(/^\s*#{1,4}\s*/,"").replace(/^\s*[-•]\s+/,"").trim()).filter(x=>x&&!/^🔧/.test(x)).map(x=>{
  const lv=/⛔|❌|🚫|✕|✖/.test(x)?"x":/⚠/.test(x)?"w":/✅|✔|✓/.test(x)?"ok":null;return{lv,t:x.replace(MKRE,"").replace(/\s{2,}/g," ").replace(/^\s*:\s*/,"").trim(),sum:/الخلاصة/.test(x)}}).filter(l=>l.t)}
function clH(l){const t=l.t.replace(/^الخلاصة\s*:?\s*/,""),k=t.indexOf(":"),h=k>0&&k<28?`<b>${E(t.slice(0,k+1))}</b>${E(t.slice(k+1))}`:E(t);return l.lv?`<div class="tv-cl ${l.lv}">${mk(l.lv)}<span>${h}</span></div>`:`<p>${h}</p>`}
function fuH(x){if(x.e)return`<div class="tv-fu"><div class="q">👤 ${E(x.q)}</div><div class="tv-note">${E(x.a)}</div></div>`;
  const L=aiLines(x.a),body=L.filter(l=>!l.sum),sm=L.filter(l=>l.sum).pop(),lv=x.lv||"w",v=VT[lv];
  return`<div class="tv-fu"><div class="q">👤 ${E(x.q)}</div>
  ${x.ch&&x.ch.length?`<div class="tv-chg"><b>✎ تحدّثت بيانات الفحص:</b>${x.ch.map(c=>`<div>• ${E(c)}</div>`).join("")}</div>`:""}
  <div class="tv-fl">${body.map(clH).join("")}</div>
  <div class="tv-fv ${lv}">${mk(lv)}<div><b>${E(v[1])}</b><small>${sm?E(sm.t.replace(/^الخلاصة\s*:?\s*/,"")):"الحكم بعد دمج القواعد والتعاميم"}</small></div></div>
  ${x.ch&&x.ch.length?`<button class="tv-up" data-up="1">↑ شوف الفحص المحدّث فوق</button>`:""}
  <details class="tv-more"><summary>رد المساعد كامل</summary><div class="a">${fmt(String(x.a).replace(/^\s*🔧.*$/gm,"").trim())}</div></details></div>`}
/* تعديلات البيانات اللي يرجعها المساعد بسطر «🔧 مفتاح: قيمة» */
const YN=v=>v===1?"نعم":v===0?"لا":"غير محدد";
function applyCh(a){const ch=[],cts=routeCts(),set=(lbl,old,nw,f)=>{if(String(old??"")===String(nw??""))return;f();ch.push(`${lbl}: ${old===""||old==null?"غير محدد":old} ← ${nw}`)};
  String(a||"").split("\n").forEach(x=>{const m=x.replace(/\*+/g,"").match(/🔧\s*([a-z]+)(?::([A-Z]{2,3}))?\s*[:=]\s*([A-Za-z0-9\-]+)/);if(!m)return;const[,k,c,v0]=m,v=v0.trim(),b=v==="1"?1:v==="0"?0:null;
    if(k==="rt"&&b!=null)set("تذكرة عودة/مغادرة",YN(S.rt),YN(b),()=>S.rt=b);
    else if(k==="visa"&&c&&cts.includes(c)&&b!=null)set("تأشيرة/إقامة لـ "+cn(c),YN(S.visas[c]),YN(b),()=>S.visas[c]=b);
    else if(k==="ppx"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(new Date(v)))set("انتهاء الجواز",S.ppx,v,()=>S.ppx=v);
    else if(k==="pur"&&PUR_T[v])set("غرض السفر",PUR_T[S.pur]||"",PUR_T[v],()=>S.pur=v);
    else if(k==="st"&&ST_T[v]&&!isGcc())set("وضعه في السعودية",ST_T[S.st]||"",ST_T[v],()=>{S.st=v;if(v==="res")S.res=""});
    else if(k==="days"&&/^\d{1,4}$/.test(v))set("مدة البقاء (أيام)",S.days,v,()=>S.days=v);
    else if(k==="age"&&/^\d{1,3}$/.test(v)&&+v<=120)set("العمر",S.age,v,()=>S.age=v);
    else if(k==="sex"&&/^[MF]$/.test(v))set("الجنس",S.sex==="M"?"رجل":S.sex==="F"?"امرأة":"",v==="M"?"رجل":"امرأة",()=>S.sex=v);
    else if(k==="ticket"&&/^(one|sep)$/.test(v)&&S.legs.length>1){const T={one:"تذكرة وحدة",sep:"تذاكر منفصلة"};set("التذكرة",T[S.ticket]||"",T[v],()=>S.ticket=v)}
    else if(k==="sup"&&c&&SUP[c]&&b!=null){const on=S.sup.includes(c);set("تأشيرة/إقامة "+SUP[c],YN(on?1:0),YN(b),()=>S.sup=b?[...S.sup.filter(z=>z!==c),c]:S.sup.filter(z=>z!==c))}
    else if(k==="pt"&&PT_T[v])set("نوع الجواز",PT_T[S.pt||"N"],PT_T[v],()=>S.pt=v)});
  return ch}
const FUQ=()=>"\n\n[تنسيق الرد — إلزامي] (1) إذا رسالة الموظف فيها معلومة تغيّر بيانات الحالة، ابدأ بسطر لكل تغيير بالشكل بالضبط «🔧 مفتاح: قيمة» من هالمفاتيح فقط: rt (1 معه تذكرة عودة أو مغادرة، 0 ما معه) · visa:XX حيث XX من "+(routeCts().join(",")||"-")+" (1 معه تأشيرة/إقامة سارية، 0 ما معه) · ppx (انتهاء الجواز YYYY-MM-DD) · pur (tour|work|study|home|other) · st (res|visit|umrah|tour) · days · age · sex (M|F) · ticket (one|sep) · sup:US|UK|SCH|IE|CA|SG|JP|KR|AU|NZ (1/0) · pt (N|D|O). لا تكتب 🔧 لشي ما قاله الموظف صراحة. إذا غيّر الجنسية أو المسار لا تكتب 🔧 وقل له يعدّل الخانات فوق ويعيد الفحص. (2) بعدها كل بند بسطر مستقل يبدأ بـ ✅ أو ⚠️ أو ⛔ ثم اسم البند ونقطتين وسبب بجملة قصيرة، مثل: ✅ الجواز: ساري حتى 2028-11-26. (3) آخر سطر: الخلاصة: ✅ أو ⚠️ أو ⛔ والحكم بجملة. بدون مقدمات.";
async function ask(){if(S.busy||!S.out||S.out.err)return;const q=(S.aq||"").trim().slice(0,350);if(!q)return;
  S.busy=true;S.pq=q;S.aq="";paintOut();
  try{const a=await callAI(q+FUQ(),S.th.slice(-6).map(x=>({q:x.q,a:x.a})));const ch=applyCh(a),v=verdict(a);
    if(/الخلاصة/.test(a))S.cv={...S.cv,fu:v.lv,fk:v.k};
    if(ch.length){S.ovr=null;S.out=analyze(P());try{ajfAct&&ajfAct("tv_fu",ch.join(" | "))}catch(e){}}
    S.th.push({q,a,ch,lv:ovLv(S.out,S.cv)})}
  catch(e){S.th.push({q,a:aiErr(e.message),e:1});S.aq=q}
  S.busy=false;S.pq="";paintOut();
  setTimeout(()=>{const f=root.querySelectorAll(".tv-fu");const l=f[f.length-1];if(l)l.scrollIntoView({behavior:"smooth",block:"start"})},40)}
function bind(el){el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||!root.contains(b))return;
  if(b.id==="tvGo")return preCheck();if(b.id==="tvAsk"){const t=root.querySelector("#tvAq");if(t)S.aq=t.value;return ask()}
  if(b.id==="tvCv"){reviewCirc();return}
  if(b.dataset.up){const o=root.querySelector("#tvOut");if(o)o.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(b.id==="tvParse"){loadPI().catch(()=>{}).then(()=>{const o=parse(S.txt);if(o.legs&&!o.legs.length)delete o.legs;Object.assign(S,{pt:"N",ppx:"",pur:"",rt:null,days:"",yf:false,qa:{},ovr:null,bagTo:null,nat:"",st:"",res:"",age:"",sex:"",sup:[],ebola:false,ticket:"",legs:[{to:"",car:"",h:""}],visas:{}},o,{age:o.age!=null?String(o.age):"",th:[],showMiss:false});S.out=null;save();paint();if(S.nat&&S.legs[S.legs.length-1].to)preCheck()});return}
  if(b.id==="tvAdd"){S.legs.push({to:"",car:"",h:""});if(S.bagTo===S.legs.length-2)S.bagTo=null;S.out=null;save();paint();setTimeout(()=>{const x=root.querySelectorAll(".tv-leg");const l=x[x.length-1];if(l)l.scrollIntoView({behavior:"smooth",block:"center"})},40);return}
  if(b.dataset.pk){openPick(b.dataset.pk,b.dataset.i!=null?+b.dataset.i:null);return}
  if(b.dataset.del!=null){S.legs.splice(+b.dataset.del,1);S.bagTo=null;if(!S.legs.length)S.legs=[{to:"",car:"",h:""}];S.out=null;save();paint();return}
  if(b.dataset.bag!=null){const lg=S.legs[+b.dataset.bag];lg.bag=lg.bag===b.dataset.val?"":b.dataset.val;S.out=null;save();paint();return}
  if(b.dataset.st){S.st=S.st===b.dataset.st?"":b.dataset.st;if(S.st==="res")S.res="";S.out=null;save();paint();return}
  if(b.dataset.sex){S.sex=S.sex===b.dataset.sex?"":b.dataset.sex;S.out=null;save();paint();return}
  if(b.dataset.tk){S.ticket=S.ticket===b.dataset.tk?"":b.dataset.tk;S.out=null;save();paint();return}
  if(b.dataset.visa){const c=b.dataset.visa,v=+b.dataset.val;S.visas[c]=S.visas[c]===v?undefined:v;S.out=null;save();paint();return}
  if(b.dataset.sup){const k=b.dataset.sup;S.sup=S.sup.includes(k)?S.sup.filter(x=>x!==k):[...S.sup,k];S.out=null;save();paint();return}
  if(b.dataset.ebola){S.ebola=!S.ebola;S.out=null;save();paint();return}
  if(b.dataset.yf){S.yf=!S.yf;S.out=null;save();paint();return}
  if(b.dataset.pt){S.pt=b.dataset.pt;S.out=null;save();paint();return}
  if(b.dataset.pur){S.pur=S.pur===b.dataset.pur?"":b.dataset.pur;S.out=null;save();paint();return}
  if(b.dataset.rt){const v=+b.dataset.rt;S.rt=S.rt===v?null:v;S.out=null;save();paint();return}
  if(b.dataset.qa){const k=b.dataset.qa,v=+b.dataset.v;S.qa=S.qa||{};S.qa[k]=S.qa[k]===v?undefined:v;S.ovr=null;if(S.out&&!S.out.err)S.out=analyze(P());const y=window.scrollY;paintOut();window.scrollTo(0,y);return}
  if(b.id==="tvOvr"){const t=root.querySelector("#tvOvrR"),r=(t&&t.value||"").trim();if(!r){if(t){t.classList.add("tv-miss");t.focus()}return}
    let by="";try{by=AUTH.me.name||AUTH.me.emp}catch(e){}S.ovr={r,by,at:new Date().toISOString()};try{ajfAct&&ajfAct("tv_ovr",S.nat+">"+S.legs.map(l=>l.to).join(">")+" | "+r)}catch(e){}paintOut();return}
  if(b.id==="tvOvrX"){S.ovr=null;paintOut();return}});
  el.addEventListener("change",e=>{const t=e.target;if(t.dataset.leg!=null){S.legs[+t.dataset.leg][t.dataset.f]=t.value;S.out=null;save();if(t.dataset.f==="to")paint()}});
  el.addEventListener("input",e=>{const t=e.target;if(t.value)t.classList.remove("tv-miss");if(t.id==="tvTxt")S.txt=t.value;else if(t.id==="tvAge")S.age=t.value;else if(t.id==="tvAq")S.aq=t.value;else if(t.id==="tvPpx")S.ppx=t.value;else if(t.id==="tvDays")S.days=t.value;else if(t.id==="tvOvrR")S.ovrR=t.value;
    else if(t.dataset.leg!=null&&t.dataset.f==="h")S.legs[+t.dataset.leg].h=t.value;save()})}
window.TV={mount:el=>{root=el;if(!el.__tv){el.__tv=1;bind(el)}paint();loadPI().then(()=>{if(root===el&&!S.out)paint()}).catch(()=>{})},
  _t:{analyze,parse,match,entry,loadPI,S}};
})();
