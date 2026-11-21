/* ---------- 👥 توزيع العمل اليومي ----------
   للمالك فقط (15024232) لين يعتمدها. توزيع تلقائي حسب الشفت وأيام الراحة والإجازات ومناوبة CHECK POINT،
   تعديل بالسحب أو بالضغط على الاسم، ثم «اعتماد» وفتح مسودة في Outlook (التطبيق ما يرسل شيء بنفسه).
   بيانات كل يوم تنحفظ على الجوال فقط (ajf_wd_*). */
(function(G){
"use strict";
const DAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
/* الوصف العربي يظهر داخل اللوحة فقط — الجدول المرسل يبقى بالأسماء المعتمدة */
const AR={SUP:"مشرف",LC:"موظف الكنترول",TRC:"منسق الرحلة",CG:"الكاونتر والبوابة",CO:"الكاونتر",CP:"نقطة التفتيش",BAG:"خدمة الأمتعة"};
const GR=[["SUP","SUP"],["LC","LC"],["TRC","TRC"],["TC","TC"],["CG","COUNTER / GATE"],["CO","COUNTER"],["CP","CHECK POINT"],["BAG","BAG SERVES"]];
/* id, الاسم, الشفت, يوما الراحة (0=الأحد), المهمة الافتراضية */
const P=[
["15026196","وافي العنزي","A",2,3,"SUP"],["15002038","ماجد العتيبي","A",5,6,"SUP"],["15003399","مشاري الرويلي","A",0,1,"LC"],
["15011528","فهد المويشير","A",2,3,"TRC"],["15030642","منال الجهني","A",4,5,"CG"],["15040841","سعود الجميد","A",0,1,"CG"],
["15040590","غادة العنزي","A",2,3,"CG"],["15040594","يسرى العنزي","A",2,3,"CG"],["15043734","حنين السرحان","A",5,6,"CG"],
["15043694","ميسم المقبل","A",4,5,"CG"],["15044459","آمنة الرويلي","A",0,1,"CG"],["15044458","بندر الدرع","A",0,1,"CG"],
["15024232","مدالله الرويلي","B",1,2,"SUP"],["15025749","فهد الرويلي","B",5,6,"SUP"],["15042997","سما الرويلي","B",4,5,"CG"],
["15042999","أمنية السويلم","B",2,3,"CG"],["15030648","يزيد الرويلي","B",2,3,"TRC"],["15002047","ثامر الشمري","B",1,2,"SUP"],
["15025787","أحمد القايد","B",2,3,"CG"],["15029820","يزيد الفقير","B",6,0,"CG"],["15040831","أبرار الرويلي","B",5,6,"CG"],
["15044457","سعاد الرويلي","B",6,0,"CG"],["15043732","رنا القادر","B",4,5,"CG"],["15043731","يزيد الجريد","B",6,0,"CG"],
["15043730","عبدالرحمن الفالح","B",5,6,"CG"],
["15025748","غسان خان","C",0,1,"SUP"],["15016456","زياد السالم","C",3,4,"SUP"],["15025750","عبدالإله السالم","C",6,0,"CG"],
["15002045","عبدالله الفلاح","C",4,5,"LC"],["15027211","فهاد الشمري","C",5,6,"TRC"],["15036823","حمزة النور","C",1,2,"TRC"],
["15002532","وليد العبدالله","C",4,5,"BAG"],["15040830","أحمد السبيلة","C",6,0,"CG"],["15029445","عبدالله السلطان","C",2,3,"CG"],
["15029450","معاذ العنزي","C",6,0,"CG"],["15026197","ريان الريس","C",0,1,"TRC"]
].map(a=>({id:a[0],n:a[1],s:a[2],o:[a[3],a[4]],t:a[5]}));
const PM=Object.fromEntries(P.map(p=>[p.id,p]));
/* مناوبة نقطة التفتيش CHECK POINT (نوفمبر 2026 — محدّثة من ملف المناوبة) */
const ROT={};
"15042999,15043731,15043732,15040830,15040831,15043731,15042997,15042999,15043731,15043732,15040830,15040831,,15042997,15042999,15029820,15042997,15040830,15040831,,15042997,15043730,15029820,15043732,15040830,15043730,15029820,15043732,15042999,15043730"
 .split(",").forEach((id,i)=>{if(id)ROT["2026-11-"+String(i+1).padStart(2,"0")]=id});/* الفاضي = يوم بدون مناوب */
const LEAVES0=[
{id:"15025750",type:"إجازة",from:"2026-11-01",to:"2026-11-10"},{id:"15043730",type:"إجازة",from:"2026-11-01",to:"2026-11-18"},
{id:"15025749",type:"إجازة",from:"2026-11-01",to:"2026-11-11"},{id:"15025748",type:"إجازة",from:"2026-11-01",to:"2026-11-12"},
{id:"15036823",type:"إجازة",from:"2026-11-01",to:"2026-11-30"},{id:"15044457",type:"إجازة",from:"2026-11-01",to:"2026-11-30"},
{id:"15043731",type:"إجازة",from:"2026-11-11",to:"2026-11-30"},{id:"15044459",type:"إجازة",from:"2026-11-13",to:"2026-11-30"},
{id:"15024232",type:"إجازة",from:"2026-11-18",to:"2026-11-30"},{id:"15043694",type:"إجازة",from:"2026-11-21",to:"2026-11-30"},
{id:"15027211",type:"انتداب",from:"2026-11-01",to:null}];
const NOTES=["• مطابقة الهوية مع بطاقة الصعود إلزامية في الكاونتر وعند بوابة التصعيد.","• التأكيد على مطابقة وثائق السفر وانعكاسها بالنظام.","• توزيع العمل قد يتغير حسب حاجة العمل والتشغيل."];

/* ---------- أدوات ---------- */
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)};
const fmt=s=>{const d=parse(s);return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()};
const dayName=s=>DAYS[parse(s).getDay()];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const lsGet=(k,d)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let toastT;function toast(m){let t=document.getElementById("wdToast");if(!t){t=document.createElement("div");t.id="wdToast";document.body.appendChild(t)}
  t.textContent=m;t.style.display="block";clearTimeout(toastT);toastT=setTimeout(()=>t.style.display="none",3200)}

let LEAVES=lsGet("ajf_wd_leaves",LEAVES0);
let SH=lsGet("ajf_wd_shifts",{A:true,B:true,C:true});
let cur=iso(new Date()),S=null,root=null,sheet=null,lvs=null;

function leaveFor(id,d){return LEAVES.find(l=>l.id===id&&l.from<=d&&(!l.to||d<=l.to))}
function offReason(p,d){const l=leaveFor(p.id,d);if(l)return l.type;const w=parse(d).getDay();if(w===p.o[0]||w===p.o[1])return"راحة";return null}
function auto(d){
  const g={};GR.forEach(([k])=>g[k]=[]);
  P.forEach(p=>{if(!offReason(p,d))g[p.t].push(p.id)});
  const r=ROT[d];
  if(r){const inG=Object.keys(g).find(k=>g[k].includes(r));if(inG){g[inG]=g[inG].filter(x=>x!==r);g.CP.push(r)}}
  return{g,rem:[],f:{},ok:false,t:false};
}
function load(){const s=lsGet("ajf_wd_"+cur,null);S=s&&s.g&&(s.t||s.ok)?s:auto(cur);GR.forEach(([k])=>{if(!S.g[k])S.g[k]=[]});if(!S.rem)S.rem=[];if(!S.f)S.f={}}
function save(){lsSet("ajf_wd_"+cur,S)}
const flOf=id=>(S.f&&S.f[id]||[]).join(" / ");
function inTable(id){return GR.some(([k])=>S.g[k].includes(id))}
function removeEverywhere(id){GR.forEach(([k])=>S.g[k]=S.g[k].filter(x=>x!==id));S.rem=S.rem.filter(x=>x!==id)}
function moveTo(id,key,beforeId){
  if(S.ok||!PM[id])return;
  removeEverywhere(id);
  if(key==="TRASH")S.rem.push(id);
  else if(S.g[key]){const arr=S.g[key],i=beforeId?arr.indexOf(beforeId):-1;if(i>=0)arr.splice(i,0,id);else arr.push(id)}
  S.t=true;save();render();
}

/* ---------- الشكل ---------- */
const CSS=`
.wd{display:grid;gap:12px;min-width:0;--A:#d9a441;--B:#5b8fd6;--C:#9b7fd9}
.wd *{box-sizing:border-box}
.wd-date{display:flex;align-items:center;gap:8px}
.wd-date button{height:44px;min-width:44px;border-radius:12px;background:var(--panel);border:1px solid var(--line);color:var(--ink);font-size:18px}
.wd-date .dn{flex:1;text-align:center;font:700 16px var(--display)}
.wd-date .dn small{display:block;font:600 12px var(--mono);color:var(--muted)}
.wd-date input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
.wd-st{font:700 11.5px var(--body);padding:3px 10px;border-radius:999px;background:var(--raise);color:var(--muted);border:1px solid var(--line)}
.wd-st.ok{background:var(--go);color:#0f1a0f;border-color:var(--go)}
.wd-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.wd-tools .sp{flex:1}
.wd-cb{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--muted)}
.wd-cb.on{color:var(--ink);border-color:var(--c,var(--amber));background:color-mix(in oklab,var(--c,var(--amber)) 22%,var(--panel))}
.wd-cb.sA{--c:var(--A)}.wd-cb.sB{--c:var(--B)}.wd-cb.sC{--c:var(--C)}
.wd-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.wd-sum div{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:8px;text-align:center}
.wd-sum b{display:block;font:700 20px var(--mono);color:var(--amber)}
.wd-sum span{font-size:12px;color:var(--muted)}
.wd-bn{background:color-mix(in oklab,var(--amber) 14%,var(--panel));color:var(--ink);border:1px solid color-mix(in oklab,var(--amber) 45%,var(--line));border-radius:12px;padding:9px 12px;font-size:13px;line-height:1.6}
.wd-bn.ok{background:color-mix(in oklab,var(--go) 16%,var(--panel));border-color:var(--go)}
.wd-grid{display:grid;gap:10px}
.wd-grp{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:box-shadow .12s,border-color .12s}
.wd-grp h3{margin:0;padding:9px 12px;background:var(--raise);color:var(--ink);font:700 14px var(--display);display:flex;justify-content:space-between;align-items:center;direction:ltr;letter-spacing:.3px}
.wd-grp h3 small{font:600 12px var(--body);color:var(--muted);margin:0 8px;direction:rtl;unicode-bidi:isolate}
.wd-grp h3 em{font:600 12px var(--mono);font-style:normal;background:var(--panel);border-radius:999px;padding:1px 9px;color:var(--amber)}
.wd-list{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:52px}
.wd-hint{margin:0;color:var(--muted);font-size:13px;text-align:center;padding:10px 0;border:1.5px dashed var(--line);border-radius:10px}
.wd-chip{display:flex;align-items:center;gap:8px;background:var(--raise);border:1px solid var(--line);border-radius:12px;padding:7px 8px;user-select:none;-webkit-user-select:none}
.wd-chip.off{opacity:.6}
.wd-chip .grip{touch-action:none;cursor:grab;font-size:18px;color:var(--amber);padding:2px 6px;line-height:1}
.wd-chip .nm{flex:1;min-width:0;cursor:pointer}
.wd-chip .nm b{display:block;font-weight:600}
.wd-chip .nm .fl{display:block;font:600 12px var(--mono);font-style:normal;color:var(--amber);direction:ltr;text-align:right}
.wd-chip .nm small{color:var(--muted);font:500 12px var(--mono);direction:ltr;unicode-bidi:isolate}
.wd-sh{font:700 11px var(--mono);color:#140d06;border-radius:6px;padding:1px 7px}
.wd-sh.sA{background:var(--A)}.wd-sh.sB{background:var(--B)}.wd-sh.sC{background:var(--C)}
.wd-w{font-size:11.5px;background:color-mix(in oklab,var(--warn) 18%,var(--raise));color:var(--ink);border:1px solid color-mix(in oklab,var(--warn) 50%,var(--line));border-radius:6px;padding:1px 7px;white-space:nowrap}
.wd-chip.dragging{opacity:.35}
.wd-ghost{position:fixed;z-index:200;pointer-events:none;box-shadow:0 10px 24px rgba(0,0,0,.5);transform:rotate(-1.5deg);background:var(--raise)}
.wd .over{border-color:var(--amber);box-shadow:0 0 0 3px color-mix(in oklab,var(--amber) 35%,transparent)}
.wd-out{background:var(--panel);border:1px dashed var(--line);border-radius:16px;padding:4px 0 8px}
.wd-out h3{margin:0;padding:10px 12px 4px;font:700 13.5px var(--display);color:var(--muted)}
.wd-out .wd-list{min-height:0}
.wd-prev{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:4px 12px 12px}
.wd-prev summary{cursor:pointer;padding:10px 0;font-weight:600;color:var(--amber)}
.wd-pb{overflow:auto;padding-top:6px;background:#fff;border-radius:8px}
.wd-dock{position:sticky;bottom:0;z-index:5;background:color-mix(in oklab,var(--night) 92%,transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-top:1px solid var(--line);padding:10px 0 calc(6px + env(safe-area-inset-bottom));display:flex;gap:8px;align-items:stretch;margin-top:4px}
.wd-trash{flex:1;border:2px dashed color-mix(in oklab,var(--warn) 60%,var(--line));border-radius:12px;color:var(--warn);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;min-height:48px}
.wd-trash.over{background:color-mix(in oklab,var(--warn) 18%,transparent);border-color:var(--warn);box-shadow:none}
.wd-btn{border-radius:12px;min-height:48px;padding:0 16px;font:700 14.5px var(--display)}
.wd-btn.pr{background:var(--amber);color:#1a1205}
.wd-btn.gh{background:var(--raise);color:var(--ink);border:1px solid var(--line)}
.wd-btn.ol{background:#0F6CBD;color:#fff;display:flex;align-items:center;gap:8px;flex:1;justify-content:center}
.wd-ov{position:fixed;inset:0;background:#000a;z-index:150;display:none;align-items:flex-end;justify-content:center;color:var(--ink);font-family:var(--body)}
.wd-ov.show{display:flex}
.wd-pn{background:var(--panel);border:1px solid var(--line);width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));max-height:86vh;overflow:auto}
.wd-pn h4{margin:0 0 4px;font:700 16px var(--display)}
.wd-pn p{margin:0 0 12px;color:var(--muted);font-size:13px}
.wd-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wd-opts button{padding:9px 6px;border-radius:11px;border:1px solid var(--line);background:var(--raise);font-weight:600}
.wd-opts button small{display:block;font:500 11px var(--mono);opacity:.7;direction:ltr}
.wd-opts button.cur{background:var(--amber);color:#1a1205;border-color:var(--amber)}
.wd-opts button.del{grid-column:1/-1;color:var(--warn);direction:rtl}
.wd-fls{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.wd-fls button{padding:8px 4px;border-radius:11px;border:1px solid var(--line);background:var(--raise);direction:ltr}
.wd-fls button b{display:block;font:700 14px var(--mono)}.wd-fls button small{font:500 11px var(--mono);color:var(--muted)}
.wd-fls button.cur{background:var(--amber);border-color:var(--amber);color:#1a1205}.wd-fls button.cur small{color:#1a1205}
.wd-lv{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:8px 0;font-size:14px}
.wd-lv .t{flex:1}.wd-lv small{color:var(--muted)}
.wd-lv button{padding:6px 12px;border-radius:10px;border:1px solid var(--line);background:var(--raise);color:var(--warn);font-size:13px}
.wd-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.wd-form select,.wd-form input{font:inherit;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--raise);color:var(--ink);min-width:0;color-scheme:dark;font-size:16px}
.wd-form .full{grid-column:1/-1}
.wd-form label{display:grid;gap:4px;font-size:12px;color:var(--muted);min-width:0}
#wdToast{position:fixed;left:50%;transform:translateX(-50%);bottom:110px;background:var(--ink);color:var(--night);padding:10px 16px;border-radius:12px;z-index:300;font-size:14px;display:none;max-width:90vw;text-align:center;font-family:var(--body)}
body.wd-drag{touch-action:none;overflow-x:hidden}
.wd.locked .grip{opacity:.25;pointer-events:none}
`;
function css(){if(document.getElementById("wdCss"))return;const s=document.createElement("style");s.id="wdCss";s.textContent=CSS;document.head.appendChild(s)}

/* ---------- العرض ---------- */
function chip(p,warn,off){
  return`<div class="wd-chip${off?" off":""}" data-id="${p.id}"><span class="grip" data-grip>⠿</span>
    <div class="nm" data-open><b>${esc(p.n)}</b><small>${p.id}</small>${S.f&&S.f[p.id]&&S.f[p.id].length?`<i class="fl">✈ ${esc(flOf(p.id))}</i>`:""}</div><span class="wd-sh s${p.s}">${p.s}</span>${warn?`<span class="wd-w">${esc(warn)}</span>`:""}</div>`;
}
function render(){
  if(!root||!root.isConnected)return;
  const outs=P.filter(p=>SH[p.s]&&!inTable(p.id)),rem=outs.filter(p=>S.rem.includes(p.id)),off=outs.filter(p=>!S.rem.includes(p.id));
  const offIn=P.filter(p=>SH[p.s]&&inTable(p.id)&&offReason(p,cur)).length;
  let total=0;
  const grid=GR.map(([k,l])=>{const ids=S.g[k].filter(id=>PM[id]&&SH[PM[id].s]);total+=ids.length;
    return`<section class="wd-grp" data-drop="${k}"><h3><span>${l}${AR[k]?`<small>${AR[k]}</small>`:""}</span><em>${ids.length}</em></h3><div class="wd-list">${
      ids.length?ids.map(id=>chip(PM[id],offReason(PM[id],cur),false)).join(""):'<p class="wd-hint">اسحب اسم موظف لهنا</p>'}</div></section>`}).join("");
  let b="";
  if(S.ok)b+=`<div class="wd-bn ok">تم اعتماد توزيع هذا اليوم. الأسماء مقفلة، وتقدر ترسله بفتح البريد (Outlook) من الأسفل.</div>`;
  const r=ROT[cur];
  if(r&&!S.g.CP.includes(r)&&!S.ok)b+=`<div class="wd-bn">مناوب نقطة التفتيش حسب الجدول: ${esc(PM[r].n)} — ${offReason(PM[r],cur)?"لا يداوم اليوم ("+offReason(PM[r],cur)+")":"غير موضوع في نقطة التفتيش"}.</div>`;
  if(offIn)b+=`<div class="wd-bn">${offIn} من الموجودين في التوزيع ما يداومون اليوم (راحة أو إجازة)، وعليهم علامة.</div>`;
  if(cur<"2026-11-01"||cur>"2026-11-30")b+=`<div class="wd-bn">جدول المناوبات والإجازات الموجود يغطي شهر نوفمبر 2026 فقط.</div>`;
  const dock=S.ok
    ?`<button class="wd-btn ol" data-a="ol"><svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="5" width="30" height="22" rx="4" fill="#fff"/><ellipse cx="12" cy="16" rx="6.2" ry="6.8" fill="#0F6CBD"/><ellipse cx="12" cy="16" rx="2.8" ry="3.6" fill="#fff"/><path d="M20 10.5h8M20 16h8M20 21.5h8" stroke="#0F6CBD" stroke-width="2.2" stroke-linecap="round"/></svg>إرسال بالبريد (Outlook)</button><button class="wd-btn gh" data-a="cp">نسخ الجدول</button><button class="wd-btn gh" data-a="re">فتح للتعديل</button>`
    :`<div class="wd-trash" data-drop="TRASH"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>اسحب الاسم هنا لحذفه</div><button class="wd-btn pr" data-a="ok">${Date.now()-okArm<3500?"اضغط مرة ثانية للتأكيد":"اعتماد التوزيع"}</button>`;
  const open=root.querySelector(".wd-prev[open]");
  root.innerHTML=`<div class="wd${S.ok?" locked":""}">
    <div class="wd-date"><button data-a="prev" aria-label="اليوم السابق"><span dir="ltr">›</span></button><div class="dn">${dayName(cur)}<small>${fmt(cur)}</small></div><button data-a="next" aria-label="اليوم التالي"><span dir="ltr">‹</span></button><button data-a="pick" aria-label="اختيار تاريخ">📅</button><input type="date" id="wdPick"></div>
    <div class="wd-tools"><span class="wd-st${S.ok?" ok":""}">${S.ok?"✓ معتمد":"غير معتمد"}</span>${["A","B","C"].map(s=>`<button class="wd-cb s${s}${SH[s]?" on":""}" data-sh="${s}">شفت ${s}</button>`).join("")}<span class="sp"></span><button class="wd-cb" data-a="lv">الإجازات والانتدابات</button><button class="wd-cb" data-a="rst">توزيع تلقائي من جديد</button></div>
    <div class="wd-sum"><div><b>${total}</b><span>في الجدول</span></div><div><b>${off.filter(p=>offReason(p,cur)).length}</b><span>غير مداوم</span></div><div><b>${rem.length}</b><span>محذوف من التوزيع</span></div></div>
    ${b}
    <div class="wd-grid">${grid}</div>
    <div class="wd-out"><h3>غير موجودين في توزيع اليوم (${outs.length})</h3><div class="wd-list">${
      (off.map(p=>chip(p,offReason(p,cur)||"بدون موقع",true)).join("")+rem.map(p=>chip(p,"محذوف من التوزيع",true)).join(""))||'<p class="wd-hint">لا أحد</p>'}</div></div>
    <details class="wd-prev"${open?" open":""}><summary>شكل الجدول قبل الإرسال</summary><div class="wd-pb">${tableHTML()}</div></details>
    <div class="wd-dock">${dock}</div></div>`;
}

/* ---------- الجدول الناتج (نفس الشكل المعتمد) ---------- */
function rowsOut(){const rows=[];GR.forEach(([k,l])=>S.g[k].forEach(id=>{const p=PM[id];if(p&&SH[p.s])rows.push([p.n,p.id,l,flOf(id)])}));return rows}
function tableHTML(){
  const TITLE=`توزيع جدول العمل - ${dayName(cur)} ${fmt(cur)}`;
  const base="border:1px solid #999;padding:2px 6px;text-align:center;font-family:Arial,sans-serif;font-size:11px;";
  let t=`<table dir="rtl" style="border-collapse:collapse;direction:rtl;min-width:0;width:400px;table-layout:fixed;border:3px solid #000"><tr><td colspan="4" style="${base}background:#1E5B33;color:#fff;font-weight:bold;font-size:13px">${TITLE}</td></tr><tr>`;
  /* عرض الأعمدة ثابت: عمود الرحلات بنفس عرض اسم الموظف */
  t+=[["اسم الموظف",28],["الرقم الوظيفي",22],["التوزيع",22],["الرحلات",28]].map(([x,w])=>`<td width="${w}%" style="${base}width:${w}%;background:#2E8B57;color:#fff;font-weight:bold">${x}</td>`).join("")+"</tr>";
  const rows=rowsOut();
  rows.forEach(([n,i,l,f],k)=>{const bg=k%2?"#fff":"#E2F0E5";
    t+=`<tr><td style="${base}background:${bg};color:#000;font-weight:bold;">${esc(n)}</td><td style="${base}background:${bg};color:#000;">${i}</td><td style="${base}background:${bg};color:#000;">${l}</td><td style="${base}background:${bg};color:#000;direction:ltr;">${esc(f||"")}</td></tr>`});
  NOTES.forEach((n,j)=>{const bg=(rows.length+j)%2?"#fff":"#E2F0E5";
    t+=`<tr><td colspan="4" style="border:1px solid #999;padding:2px 6px;text-align:right;font-family:Arial,sans-serif;font-size:11px;background:${bg};color:#000;">${n}</td></tr>`});
  return t+"</table>";
}
function emailBits(){
  const rows=rowsOut();
  const to=[...new Set(rows.map(r=>r[1]+"@saudiags.com"))].join(";");
  const intro=`الاخوه الاعزاء\r\n\r\nتحيه طيبه ..\r\n\r\nتجدون بالجدول ادناه توزيع العمل ليوم ${dayName(cur)} الموافق ${fmt(cur)}\r\n\r\n`;
  const outro=`\r\n\r\nارجوا التقيد والالتزام بمواقع العمل .`;
  const plain=rows.map(r=>`${r[0]} - ${r[2]} - ${r[1]}${r[3]?" - "+r[3]:""}`).join("\r\n");
  const html=`<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px"><p>الاخوه الاعزاء</p><p>تحيه طيبه ..</p><p>تجدون بالجدول ادناه توزيع العمل ليوم ${dayName(cur)} الموافق ${fmt(cur)}</p>${tableHTML()}<p>ارجوا التقيد والالتزام بمواقع العمل .</p></div>`;
  return{to,intro,outro,plain,html,subject:"توزيع العمل"};
}
async function copyTable(only){
  const e=emailBits();if(only){e.html=`<div dir="rtl">${tableHTML()}</div>`;e.intro="";e.outro=""}
  try{
    await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([e.html],{type:"text/html"}),"text/plain":new Blob([e.intro+e.plain+e.outro],{type:"text/plain"})})]);
    return true;
  }catch(err){
    try{const box=document.createElement("div");box.innerHTML=e.html;box.style.cssText="position:fixed;top:0;left:-9999px;background:#fff;color:#000";document.body.appendChild(box);
      const r=document.createRange();r.selectNodeContents(box);const s=getSelection();s.removeAllRanges();s.addRange(r);
      const ok=document.execCommand("copy");s.removeAllRanges();box.remove();return ok}catch(e2){return false}
  }
}
/* يفتح مسودة في Outlook فقط — التطبيق ما يرسل أي إيميل بنفسه */
async function openOutlook(){
  const e=emailBits(),ok=await copyTable(true);
  toast(ok?"انسخ الجدول — الصقه داخل الرسالة":"ما انسخ الجدول تلقائياً، استخدم زر «نسخ الجدول»");
  const url="mailto:"+e.to+"?subject="+encodeURIComponent(e.subject)+"&body="+encodeURIComponent(e.intro+"(الصق الجدول هنا)"+e.outro);
  setTimeout(()=>{location.href=url},ok?700:1200);
}

/* ---------- قائمة الاسم (بديل السحب) ---------- */
function ov(id){let o=document.getElementById(id);if(!o){o=document.createElement("div");o.id=id;o.className="wd-ov";o.innerHTML=`<div class="wd-pn"></div>`;document.body.appendChild(o)}return o}
function openSheet(id){
  if(S.ok)return;const p=PM[id];if(!p)return;const where=Object.keys(S.g).find(k=>S.g[k].includes(id)),r=offReason(p,cur);
  sheet.querySelector(".wd-pn").innerHTML=`<h4>${esc(p.n)}</h4><p>${p.id} · شفت ${p.s}${r?" · "+r+" اليوم":""}</p><div class="wd-opts">${
    GR.map(([k,l])=>`<button data-mv="${k}" class="${where===k?"cur":""}">${AR[k]||l}<small>${l}</small></button>`).join("")}${where?`<button class="del" data-mv="TRASH">حذف من الجدول</button>`:""}</div>${where?flPick(id):""}`;
  sheet.dataset.id=id;sheet.classList.add("show");
}
function flPick(id){
  const L=(G.wdFlights?G.wdFlights(cur):[]),sel=S.f[id]||[];
  const all=[...L.map(f=>f.n),...sel.filter(n=>!L.some(f=>f.n===n))];
  return`<h4 style="margin-top:16px">الرحلات</h4><p>اختر رحلات هذا الموظف اليوم (تقدر تختار أكثر من رحلة).</p><div class="wd-fls">${
    all.length?all.map(n=>{const f=L.find(x=>x.n===n);return`<button data-fl="${esc(n)}" class="${sel.includes(n)?"cur":""}"><b>${esc(n)}</b><small>${f?esc(f.t+(f.d?" · "+f.d:"")):"—"}</small></button>`}).join(""):`<p>ما فيه رحلات بهذا اليوم في لوحة الرحلات.</p>`}</div>
    <button class="wd-btn pr" data-done style="width:100%;margin-top:12px">تم</button>`}
/* ---------- الإجازات ---------- */
function openLeaves(){
  const rows=LEAVES.map((l,i)=>({l,i,p:PM[l.id]})).filter(x=>x.p).sort((a,b)=>a.l.from.localeCompare(b.l.from));
  lvs.querySelector(".wd-pn").innerHTML=`<h4>الإجازات والانتدابات</h4><p>أي موظف هنا لا يظهر في التوزيع خلال الفترة. إذا ما تعرف تاريخ الرجوع اترك خانة النهاية فاضية.</p>${
    rows.map(({l,i,p})=>`<div class="wd-lv"><div class="t"><b>${esc(p.n)}</b><br><small>${esc(l.type)} · من ${fmt(l.from)} ${l.to?"إلى "+fmt(l.to):"(بدون تاريخ رجوع)"}</small></div><button data-dl="${i}">حذف</button></div>`).join("")||"<p>لا توجد إجازات.</p>"}
    <div class="wd-form"><label class="full">الموظف<select id="wdLvE">${P.slice().sort((a,b)=>a.n.localeCompare(b.n,"ar")).map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join("")}</select></label>
    <label>النوع<select id="wdLvT"><option>إجازة</option><option>انتداب</option><option>يوم تعويضي</option></select></label><span></span>
    <label>من تاريخ<input type="date" id="wdLvF" value="${cur}"></label><label>إلى تاريخ<input type="date" id="wdLvTo"></label>
    <button class="wd-btn pr full" id="wdLvAdd">إضافة للقائمة</button></div>
    <p style="margin-top:12px"><button class="wd-btn gh" id="wdLvClose" style="min-height:40px">إغلاق</button></p>`;
  lvs.classList.add("show");
}
function afterLeaves(){if(!S.t&&!S.ok){S=auto(cur);save()}render()}

/* ---------- السحب والإفلات ---------- */
let drag=null;
const scroller=()=>(root&&root.closest(".bd-b"))||document.scrollingElement;
function onDown(e){
  const grip=e.target.closest("[data-grip]");
  if(!grip||S.ok||e.button>0)return;
  const el=grip.closest(".wd-chip"),id=el.dataset.id;e.preventDefault();
  const r=el.getBoundingClientRect(),ghost=el.cloneNode(true);ghost.classList.add("wd-ghost");ghost.style.width=r.width+"px";
  const w=document.createElement("div");w.className="wd";w.style.display="contents";w.appendChild(ghost);document.body.appendChild(w);
  el.classList.add("dragging");document.body.classList.add("wd-drag");
  drag={id,el,ghost:w,g:ghost,over:null,w:r.width};moveGhost(e);
  addEventListener("pointermove",onMove,{passive:false});addEventListener("pointerup",onUp);addEventListener("pointercancel",endDrag);
}
function moveGhost(e){drag.g.style.left=(e.clientX-drag.w/2)+"px";drag.g.style.top=(e.clientY-24)+"px"}
function target(e){const el=document.elementFromPoint(e.clientX,e.clientY);return el&&root.contains(el)?el.closest("[data-drop]"):null}
function onMove(e){
  if(!drag)return;e.preventDefault();moveGhost(e);const t=target(e);
  if(drag.over&&drag.over!==t)drag.over.classList.remove("over");if(t)t.classList.add("over");drag.over=t;
  const sc=scroller(),R=sc===document.scrollingElement?{top:0,bottom:innerHeight}:sc.getBoundingClientRect();
  if(e.clientY<R.top+70)sc.scrollBy(0,-14);else if(e.clientY>R.bottom-120)sc.scrollBy(0,14);
}
function onUp(e){
  if(!drag)return;const t=target(e),id=drag.id;let before=null;
  if(t&&t.dataset.drop!=="TRASH"){const under=document.elementFromPoint(e.clientX,e.clientY),c=under&&under.closest(".wd-chip[data-id]");
    if(c&&c.dataset.id!==id&&t.contains(c)){const r=c.getBoundingClientRect();
      before=e.clientY<r.top+r.height/2?c.dataset.id:(c.nextElementSibling&&c.nextElementSibling.dataset.id)||null}}
  const key=t&&t.dataset.drop;endDrag();if(key)moveTo(id,key,before);
}
function endDrag(){
  if(!drag)return;drag.ghost.remove();drag.el.classList.remove("dragging");if(drag.over)drag.over.classList.remove("over");
  document.body.classList.remove("wd-drag");removeEventListener("pointermove",onMove);removeEventListener("pointerup",onUp);removeEventListener("pointercancel",endDrag);drag=null;
}

/* ---------- الأحداث ---------- */
let okArm=0,rstArm=0;
function go(d){cur=d;load();render();const sc=scroller();if(sc)sc.scrollTop=0}
function onClick(e){
  const t=e.target,open=t.closest("[data-open]");
  if(open){openSheet(open.closest(".wd-chip").dataset.id);return}
  const sh=t.closest("[data-sh]");if(sh){SH[sh.dataset.sh]=!SH[sh.dataset.sh];lsSet("ajf_wd_shifts",SH);render();return}
  const a=t.closest("[data-a]");if(!a)return;const k=a.dataset.a;
  if(k==="lv")openLeaves();
  else if(k==="rst"){
    if(S.ok){toast("التوزيع معتمد. اضغط «فتح للتعديل» أولاً");return}
    if(Date.now()-rstArm>3000){rstArm=Date.now();toast("اضغط مرة ثانية: بيرجع التوزيع التلقائي وتنمسح تعديلاتك لهذا اليوم");return}
    S=auto(cur);save();render();toast("رجع التوزيع التلقائي")}
  else if(k==="ok"){
    if(Date.now()-okArm>3500){okArm=Date.now();a.textContent="اضغط مرة ثانية للتأكيد";setTimeout(()=>{const x=root.querySelector('[data-a="ok"]');if(x)x.textContent="اعتماد التوزيع"},3500);return}
    okArm=0;S.ok=true;S.t=true;save();render();toast("تم اعتماد التوزيع")}
  else if(k==="re"){S.ok=false;save();render()}
  else if(k==="cp")copyTable(true).then(ok=>toast(ok?"تم نسخ الجدول":"تعذّر النسخ"));
  else if(k==="ol")openOutlook();
  else if(k==="prev"||k==="next"){const d=parse(cur);d.setDate(d.getDate()+(k==="next"?1:-1));go(iso(d))}
  else if(k==="pick"){const p=root.querySelector("#wdPick");p.value=cur;if(p.showPicker){try{p.showPicker();return}catch(x){}}p.focus();p.click()}
}
function bindOnce(){
  if(sheet)return;css();
  sheet=ov("wdSheet");lvs=ov("wdLeaves");
  sheet.addEventListener("click",e=>{const fl=e.target.closest("[data-fl]");
    if(fl){const id=sheet.dataset.id,n=fl.dataset.fl,a=S.f[id]=S.f[id]||[],i=a.indexOf(n);if(i>=0)a.splice(i,1);else a.push(n);if(!a.length)delete S.f[id];S.t=true;save();render();openSheet(id);return}
    if(e.target.closest("[data-done]")){sheet.classList.remove("show");return}
    const mv=e.target.closest("[data-mv]");if(mv)moveTo(sheet.dataset.id,mv.dataset.mv);if(mv||e.target===sheet)sheet.classList.remove("show")});
  lvs.addEventListener("click",e=>{const t=e.target;
    if(t===lvs||t.id==="wdLvClose"){lvs.classList.remove("show");return}
    if(t.dataset.dl!==undefined){LEAVES.splice(+t.dataset.dl,1);lsSet("ajf_wd_leaves",LEAVES);afterLeaves();openLeaves();return}
    if(t.id==="wdLvAdd"){const from=lvs.querySelector("#wdLvF").value,to=lvs.querySelector("#wdLvTo").value||null;
      if(!from){toast("اختر تاريخ البداية");return}if(to&&to<from){toast("تاريخ النهاية قبل تاريخ البداية");return}
      LEAVES.push({id:lvs.querySelector("#wdLvE").value,type:lvs.querySelector("#wdLvT").value,from,to});lsSet("ajf_wd_leaves",LEAVES);afterLeaves();openLeaves()}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){sheet.classList.remove("show");lvs.classList.remove("show")}});
}
function bind(r){
  r.addEventListener("click",onClick);
  r.addEventListener("pointerdown",onDown);
  r.addEventListener("change",e=>{if(e.target.id==="wdPick"&&e.target.value)go(e.target.value)});
}
G.WD={mount(r){bindOnce();if(root!==r){root=r;bind(r)}if(!S)load();render()}};
})(typeof window!=="undefined"?window:globalThis);
