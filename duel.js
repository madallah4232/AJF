/* ---------- ⚔️ تحديات الموظفين: موظف يتحدى زميله، والكل يتابع الغرفة ويدردش ----------
   كل الحساب في Supabase (supabase/duel.sql): الأسئلة تنسحب من البنك المعتمد وما تنكشف لأحد قبل وقتها،
   والوقت وصح/غلط يُحسب في الخادم. يفتح من صفحة تحدي التشغيل (quiz.js). */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const LT=["أ","ب","ج","د"],TPN={"":"🌐 كل المجالات",chk:"🧳 كاونتر",gate:"🚪 بوابة",ramp:"🛫 ساحة",lc:"📋 لود كنترول"};
const CSS=`
.du{display:grid;gap:12px;padding-bottom:70px}
.du-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;gap:10px}
.du-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.du-h h3{margin:0;font:700 18px var(--display)}
.du-m{font-size:12.5px;color:var(--muted);line-height:1.7}
.du-st{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}.du-st div{background:var(--raise);border-radius:12px;padding:7px 2px}
.du-st b{display:block;font:700 18px var(--mono)}.du-st span{font-size:11px;color:var(--muted)}
.du-go{width:100%;height:50px;border-radius:15px;border:0;background:#d9b45a;color:#1a1205;font:700 16px var(--display)}
.du-go[disabled]{background:var(--raise);color:var(--muted)}.du-go:active{transform:scale(.97)}
.du-b{display:flex;gap:6px}.du-b button{flex:1;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:700 14px var(--body)}
.du-b button.g{background:var(--go);color:#110b07;border-color:var(--go)}.du-b button.x{color:var(--warn)}
.du-r{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:10px;border-radius:14px;background:var(--raise);border:1px solid var(--line);text-align:center}
.du-r.tap{cursor:pointer}.du-r.tap:active{transform:scale(.98)}.du-r.mine{border-color:#d9b45a}
.du-r .p{font:700 14px var(--display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.du-r .p.w{color:var(--go)}.du-r .p.l{color:var(--muted)}
.du-r .s{font:700 20px var(--mono);direction:ltr;white-space:nowrap}.du-r small{grid-column:1/-1;color:var(--muted);font-size:11.5px}
.du-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-inline-end:5px;animation:dulv 1.2s infinite}
@keyframes dulv{50%{opacity:.25}}
.du-f{display:grid;gap:8px}.du-f label{font:600 13px var(--body);color:var(--muted)}
.du-f select,.du-f input{width:100%;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:15px var(--body);padding:0 10px;color-scheme:dark}
.du-ch{display:flex;gap:6px;flex-wrap:wrap}.du-ch button{flex:1;min-width:60px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:700 14px var(--body)}
.du-ch button.on{background:#d9b45a;color:#1a1205;border-color:#d9b45a}
.du-cd{font:700 15px var(--mono);color:#d9b45a;white-space:nowrap}.du-cd.low{color:var(--warn)}
.du-msg{font:600 13.5px var(--body);color:var(--amber);text-align:center;min-height:1em}
.du-tb{display:grid;gap:5px}.du-tb .t{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;padding:7px 10px;border-radius:11px;background:var(--raise);font-size:13.5px}
.du-tb .t.me{outline:2px solid #d9b45a}.du-tb .t b{font-family:var(--mono)}
/* الغرفة */
.duo .qzo-in{gap:10px}
.duo-sb{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:10px;text-align:center}
.duo-sb .p{display:grid;gap:3px;justify-items:center}.duo-sb .p b{font:700 15px var(--display);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.duo-sb .p i{font-style:normal;font-size:11.5px;color:var(--muted);height:16px}.duo-sb .p i.ok{color:var(--go)}
.duo-sb .p.me b{color:#d9b45a}.duo-sb .s{font:700 30px var(--mono);direction:ltr}.duo-sb .s small{display:block;font:600 11px var(--body);color:var(--muted)}
.duo-rd{display:flex;gap:6px;justify-content:center}.duo-rd span{font-size:11.5px;padding:3px 9px;border-radius:9px;background:var(--raise);color:var(--muted)}
.duo-pk{display:flex;gap:4px;font-style:normal;font-size:11px;white-space:nowrap}.duo-pk em{font-style:normal;padding:1px 6px;border-radius:7px;background:var(--raise)}
.duo-big{text-align:center;display:grid;gap:8px;padding:18px 0}.duo-big i{font-style:normal;font-size:44px}.duo-big h2{margin:0;font:700 21px var(--display)}
.duo-big .cd{font:700 40px var(--mono);color:#d9b45a}
.duo-chat{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:10px;display:grid;gap:8px}
.duo-cl{max-height:190px;overflow:auto;display:grid;gap:5px;align-content:start;-webkit-user-select:text;user-select:text}
.duo-cl div{font-size:13.5px;line-height:1.55;padding:5px 9px;border-radius:11px;background:var(--raise)}
.duo-cl div b{font:700 12px var(--display);color:var(--muted);margin-inline-end:6px}.duo-cl div.pl b{color:#d9b45a}.duo-cl div.me{background:color-mix(in oklab,#d9b45a 16%,var(--raise))}
.duo-ci{display:flex;gap:6px}.duo-ci input{flex:1;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:15px var(--body);padding:0 10px;-webkit-user-select:text;user-select:text}
.duo-ci button{width:62px;border-radius:12px;border:0;background:#d9b45a;color:#1a1205;font:700 14px var(--display)}.duo-ci input:disabled,.duo-ci button:disabled{opacity:.45}
.duo-x{height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:600 13px var(--body)}
.duo-hist{display:grid;gap:8px}.duo-hist .h{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px;display:grid;gap:6px;font-size:13.5px;line-height:1.6}
.duo-hist .h ol{margin:0;padding:0;list-style:none;display:grid;gap:4px}.duo-hist .h li{display:flex;justify-content:space-between;gap:6px;padding:5px 9px;border-radius:9px;background:var(--raise)}
.duo-hist .h li.ok{background:color-mix(in oklab,var(--go) 25%,var(--raise));font-weight:700}
`;
function css(){if(document.getElementById("duCss"))return;const s=document.createElement("style");s.id="duCss";s.textContent=CSS;document.head.appendChild(s)}
async function call(fn,args){const j=await rpc(fn,Object.assign({p_token:AUTH.tok||"",p_device:AUTH.dev},args||{}));if(j&&j.s==="out"){authOut();throw new Error("out")}return j}
const act=k=>{try{window.ajfAct&&ajfAct(k)}catch(e){}};
const hm=t=>{try{return new Date(t).toLocaleTimeString("ar-SA-u-nu-latn",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Riyadh"})}catch(e){return""}};
const ago=t=>{const m=Math.round((Date.now()-new Date(t))/60000);return m<1?"الحين":m<60?"قبل "+m+" د":m<1440?"قبل "+Math.round(m/60)+" س":"قبل "+Math.round(m/1440)+" يوم"};
const rec=s=>(s.w||0)+"-"+(s.l||0);
/* الجولة تنحسب في النتيجة بس بعد ما تخلص كل أسئلتها */
const rDone=(ph,n,rd)=>ph==="done"||n>rd*5||(n===rd*5&&ph==="rev");
const rw=(sc,ph,n)=>{let a=0,b=0;((sc&&sc.rounds)||[]).forEach(x=>{if(rDone(ph,n,x.rd)){if(x.w==="a")a++;else if(x.w==="b")b++}});return[a,b]};

let root=null,back=null,L=null,VIEW="home",OPTS=null,F=null,MSG="",lt=null;
let PEND=new Set(),NOTE="",noteT=null,ct=null,cdKick=0;
function mount(el,onBack){css();root=el;back=onBack;VIEW="home";root.innerHTML=`<div class="bd-empty">جاري التحميل…</div>`;load().then(paint);sched();
  /* عدّاد مهلة القبول (60 ثانية) */
  clearInterval(ct);ct=setInterval(()=>{if(!root||!root.isConnected){clearInterval(ct);return}if(VIEW!=="home"||!L||L.s!=="ok")return;let z=0;
    root.querySelectorAll("[data-exp]").forEach(b=>{const s=Math.max(0,Math.ceil((new Date(b.dataset.exp)-Date.now()-(L.dt||0))/1000));b.textContent="⏳ "+s+" ث";b.classList.toggle("low",s<=15);if(!s)z=1});
    if(z&&Date.now()-cdKick>2500){cdKick=Date.now();load().then(paint)}},1000)}
/* التحديث: كل 3 ثواني إذا فيه دعوة تنتظر، وإلا كل 15 ثانية */
function sched(){clearTimeout(lt);lt=setTimeout(async()=>{if(!root||!root.isConnected)return;if(!document.hidden&&VIEW==="home"&&!R){await load();paint()}sched()},L&&L.inv&&L.inv.length?3000:15000)}
async function load(){try{L=await call("ajf_du_list");L.dt=new Date(L.now)-Date.now()}catch(e){L={s:/rpc 404|PGRST202|ajf_du_list/.test(e&&e.message||"")?"nosql":"net"}}
  if(L.s==="ok"){const live=new Set((L.live||[]).map(x=>x.id)),still=new Set((L.inv||[]).filter(x=>!x.in).map(x=>x.id));let open=0;
    /* دعوتي انقبلت ← أدخل الغرفة على طول. ما انقبلت خلال المهلة ← تنبيه */
    PEND.forEach(id=>{if(live.has(id)){if(!R&&VIEW==="home")open=id}else if(!still.has(id))note("⌛ انتهت مهلة الدعوة أو انرفضت")});
    PEND=still;if(open)setTimeout(()=>roomOpen(open),0)}
  return L}
function note(t){NOTE=t;clearTimeout(noteT);noteT=setTimeout(()=>{NOTE="";paint()},6000)}

function paint(){if(!root||VIEW!=="home")return;let h=`<button class="qz-adm" id="duBack">→ رجوع لتحدي التشغيل</button>`;
  if(!L||L.s!=="ok"){root.innerHTML=`<div class="du">${h}<div class="bd-empty">${L&&L.s==="nosql"?"⚔️ التحديات قيد التجهيز، قريباً بإذن الله":"تعذّر التحميل، تأكد من الإنترنت"}</div></div>`;root.querySelector("#duBack").onclick=back;return}
  const S=L.stats||{};
  h+=`<div class="du-card"><div class="du-h"><h3>⚔️ تحديات الزملاء</h3>${S.streak>1?`<span class="du-m">🔥 ${S.streak} انتصارات متتالية</span>`:""}</div>
    ${L.admin?"":`<div class="du-st"><div><b style="color:var(--go)">${S.w||0}</b><span>فوز</span></div><div><b style="color:var(--warn)">${S.l||0}</b><span>خسارة</span></div><div><b>${S.d||0}</b><span>تعادل</span></div><div><b>${L.left}</b><span>متبقي اليوم</span></div></div>`}
    ${L.off?`<div class="du-msg">⏸ التحديات موقوفة مؤقتاً من المشرف</div>`:""}${NOTE?`<div class="du-msg">${E(NOTE)}</div>`:""}
    ${L.admin?`<div class="du-m">أنت مشرف: تتابع الغرف وتدردش، لكن ما تلعب لأنك تشوف الأجوبة وقت الاعتماد.</div>
      <button class="du-go" id="duOff" style="${L.off?"":"background:var(--raise);color:var(--warn)"}">${L.off?"▶ تشغيل التحديات":"⏸ إيقاف التحديات (وقت الذروة)"}</button>`
      :`<button class="du-go" id="duNew" ${L.off||!L.left?"disabled":""}>${L.left?"⚔️ تحدي زميل":"خلصت تحدياتك اليوم (3)"}</button>`}</div>`;
  const inv=L.inv||[];if(inv.length)h+=`<div class="bd-sec"><span>📨 الدعوات</span></div>`+inv.map(x=>`<div class="du-card">
    <div class="du-h"><b>${x.in?"⚔️ "+E(x.who)+" يتحداك":"بانتظار رد "+E(x.who)}</b><b class="du-cd" data-exp="${E(x.exp)}">⏳ 60 ث</b></div><div><div class="du-m">${x.nq} أسئلة (${x.nq/5} ${x.nq>5?"جولات":"جولة"}) · ${x.secs} ثانية للسؤال · ${E(TPN[x.tp||""]||"")}${x.src?" · "+E(x.src):""}<br>${x.starts?"يبدأ الساعة "+E(hm(x.starts)):"يبدأ بعد دقيقة من القبول"}</div></div>
    <div class="du-b">${x.in?`<button class="g" data-dy="${x.id}">✓ قبول</button><button class="x" data-dn="${x.id}">✕ اعتذار</button>`:`<button class="x" data-dc="${x.id}">إلغاء الدعوة</button>`}</div></div>`).join("");
  const lv=L.live||[];h+=`<div class="bd-sec"><span>🏟 الغرف</span><span style="font-size:12px">مفتوحة للكل</span></div>`;
  h+=lv.length?lv.map(x=>{const on=x.ph!=="wait",sc=x.sc||{};return`<div class="du-r tap ${x.mine?"mine":""}" data-room="${x.id}">
    <span class="p">${E(x.a)}</span><span class="s">${on?rw(sc,x.ph,x.n).reverse().join(" - "):"🆚"}</span><span class="p">${E(x.b)}</span>
    <small>${on?`<span class="du-live"></span>مباشر · سؤال ${x.n||x.nq} من ${x.nq}`:"يبدأ الساعة "+E(hm(x.starts))} · ${x.secs} ث${x.v?" · 👀 "+x.v:""}${x.mine?" · تحديك":""} · اضغط للدخول</small></div>`}).join("")
    :`<div class="bd-empty" style="padding:14px">ما فيه تحديات شغّالة الحين</div>`;
  const dn=L.done||[];if(dn.length)h+=`<div class="bd-sec"><span>🏁 النتائج</span><span style="font-size:12px">آخر 7 أيام</span></div>`+dn.map(x=>`<div class="du-r tap ${x.mine?"mine":""}" data-room="${x.id}">
    <span class="p ${x.w==="a"?"w":x.w==="b"?"l":""}">${x.w==="a"?"🏆 ":""}${E(x.a)}</span><span class="s">${x.rb} - ${x.ra}</span><span class="p ${x.w==="b"?"w":x.w==="a"?"l":""}">${x.w==="b"?"🏆 ":""}${E(x.b)}</span>
    <small>${x.w?"فاز "+E(x.w==="a"?x.a:x.b):"تعادل"} · صح ${E(x.a)} ${x.ca} و${E(x.b)} ${x.cb} من ${x.nq} · ${ago(x.fin)} · اضغط لمراجعة الأسئلة</small></div>`).join("");
  const tp=L.top||[];if(tp.length)h+=`<div class="du-card"><div class="bd-sec" style="margin:0"><span>👑 أبطال التحديات</span><span style="font-size:12px">الأكثر صح، ثم الأسرع</span></div>
    <div class="du-tb">${tp.slice(0,10).map((x,i)=>`<div class="t ${x.me?"me":""}"><span>${i<3?["🥇","🥈","🥉"][i]:i+1}</span><span>${E(x.name)}${x.streak>1?" 🔥"+x.streak:""}<small class="du-m" style="display:block">${x.p} ${x.p>2&&x.p<11?"تحديات":"تحدي"} · ${x.w} فوز</small></span><b>${x.c!=null?x.c+" صح · "+Math.round((x.ms||0)/1000)+" ث":"—"}</b></div>`).join("")}</div></div>`;
  h+=`<details class="du-card qz-rules"><summary>📜 قوانين التحديات</summary><ul>
    <li>تختار زميلك والمجال وعدد الأسئلة (5 = جولة، 10 = جولتين، 15 = ثلاث) ووقت كل سؤال.</li>
    <li>الأسئلة تنسحب عشوائياً من بنك الأسئلة المعتمد، وما يشوفها أحد قبل ما تطلع للاثنين بنفس اللحظة.</li>
    <li>اللي يجاوب صح أكثر ياخذ الجولة، وعند التعادل الأسرع في إجاباته الصحيحة.</li>
    <li>إذا طلعت من التطبيق والسؤال مفتوح ينحسب خطأ.</li>
    <li>كل الغرف مفتوحة للمتابعة والدردشة. اللاعب ما يقدر يكتب وقت السؤال، ورسائل المتفرجين ما توصله إلا بعد ما يخلص السؤال.</li>
    <li>3 تحديات باليوم (الدعوة اللي انرفضت أو انتهت مهلتها ما تنحسب)، وما تقدر تتحدى نفس الزميل أكثر من مرة باليوم.</li>
    <li>الزميل عنده 60 ثانية يقبل الدعوة، وبعدها تنلغي تلقائياً.</li></ul></details>`;
  root.innerHTML=`<div class="du">${h}</div>`;
  const $=s=>root.querySelector(s);$("#duBack").onclick=back;
  const n=$("#duNew");if(n)n.onclick=()=>{act("dunew");VIEW="new";F={opp:"",tp:"",src:"",nq:5,secs:30,when:"now",tm:""};MSG="";newPaint();if(!OPTS)optsLoad()};
  const o=$("#duOff");if(o)o.onclick=async()=>{o.disabled=true;try{await call("ajf_du_admin",{p_off:!L.off})}catch(e){alert("تعذّر")}await load();paint()};
  root.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>roomOpen(+b.dataset.room));
  root.querySelectorAll("[data-dy],[data-dn],[data-dc]").forEach(b=>b.onclick=async()=>{const id=+(b.dataset.dy||b.dataset.dn||b.dataset.dc),a=b.dataset.dy?"yes":b.dataset.dn?"no":"cancel";
    if(a==="cancel"&&!confirm("إلغاء الدعوة؟"))return;b.disabled=true;let j;try{j=await call("ajf_du_reply",{p_id:id,p_act:a})}catch(e){j={s:"net"}}
    if(j.s!=="ok")alert({gone:"الدعوة ما عادت متاحة (انتهت المهلة أو انلغت)",off:"التحديات موقوفة مؤقتاً من المشرف",busy:"عندك أو عنده تحدي ثاني بنفس الوقت",net:"تعذّر، تأكد من الإنترنت"}[j.s]||"تعذّر");
    await load();paint();if(j.s==="ok"&&a==="yes")roomOpen(id)})}

/* ---------- تحدي جديد ---------- */
async function optsLoad(){try{OPTS=await call("ajf_du_opts")}catch(e){OPTS={s:"net"}}if(VIEW==="new")newPaint()}
function bankN(tps,tp,src){return((OPTS&&OPTS.bank)||[]).filter(x=>(tp?x.tp===tp:(x.tp==null||tps.includes(x.tp)))&&(!src||x.src===src)).reduce((a,x)=>a+x.n,0)}
function newPaint(){if(!root||VIEW!=="new")return;let h=`<button class="qz-adm" id="duBk">→ رجوع للتحديات</button>`;
  if(!OPTS)h+=`<div class="bd-empty">جاري التحميل…</div>`;else if(OPTS.s!=="ok")h+=`<div class="bd-empty">تعذّر التحميل</div>`;
  else{const em=OPTS.emps.find(x=>x.emp===F.opp),tps=em?OPTS.tps.filter(t=>em.tps.includes(t)):OPTS.tps;if(F.tp&&!tps.includes(F.tp))F.tp="";
    const srcs={};((OPTS.bank)||[]).filter(x=>x.src&&(F.tp?x.tp===F.tp:(x.tp==null||tps.includes(x.tp)))).forEach(x=>{srcs[x.src]=srcs[x.src]||{t:x.src_t,n:0};srcs[x.src].n+=x.n});
    if(F.src&&!srcs[F.src])F.src="";const avail=bankN(tps,F.tp,F.src);
    h+=`<div class="du-card du-f"><div class="du-h"><h3>⚔️ تحدي جديد</h3></div>
      <label>الزميل</label><select id="fOpp"><option value="">اختر زميلك…</option>${OPTS.emps.map(x=>`<option value="${E(x.emp)}" ${x.emp===F.opp?"selected":""}>${E(x.name)}</option>`).join("")}</select>
      ${em?`<div class="du-m" dir="ltr" style="text-align:right">${E(em.title||"")}</div>`:""}
      <label>المجال</label><select id="fTp"><option value="">${TPN[""]}</option>${tps.map(t=>`<option value="${t}" ${t===F.tp?"selected":""}>${TPN[t]} (${bankN(tps,t,"")})</option>`).join("")}</select>
      ${em&&tps.length<4?`<div class="du-m">تطلع بس المجالات اللي تخصك أنت و${E(em.name)} حسب مسماكم الوظيفي.</div>`:""}
      <label>المصدر</label><select id="fSrc"><option value="">كل التعاميم والأدلة</option>${Object.entries(srcs).map(([k,v])=>`<option value="${E(k)}" ${k===F.src?"selected":""}>${E(v.t||k)} (${v.n})</option>`).join("")}</select>
      <label>عدد الأسئلة</label><div class="du-ch">${[[5,"5 · جولة"],[10,"10 · جولتين"],[15,"15 · 3 جولات"]].map(([n,t])=>`<button data-nq="${n}" class="${F.nq===n?"on":""}">${t}</button>`).join("")}</div>
      <label>وقت كل سؤال</label><div class="du-ch">${[30,40,50,60].map(n=>`<button data-sc="${n}" class="${F.secs===n?"on":""}">${n} ث</button>`).join("")}</div>
      <label>وقت البداية</label><div class="du-ch"><button data-wh="now" class="${F.when==="now"?"on":""}">بعد القبول بدقيقة</button><button data-wh="at" class="${F.when==="at"?"on":""}">وقت محدد</button></div>
      ${F.when==="at"?`<input type="time" id="fTm" value="${E(F.tm)}">`:""}
      <div class="du-m">الأسئلة المعتمدة المتاحة بهذي الاختيارات: <b style="color:var(--ink)">${avail}</b>${avail<F.nq?" · ما تكفي، غيّر المجال أو المصدر أو قلّل العدد":""}</div>
      <button class="du-go" id="fGo" ${!F.opp||avail<F.nq?"disabled":""}>إرسال التحدي</button><div class="du-msg">${E(MSG)}</div></div>`}
  root.innerHTML=`<div class="du">${h}</div>`;const $=s=>root.querySelector(s);
  $("#duBk").onclick=()=>{VIEW="home";paint()};if(!OPTS||OPTS.s!=="ok")return;
  $("#fOpp").onchange=e=>{F.opp=e.target.value;newPaint()};$("#fTp").onchange=e=>{F.tp=e.target.value;newPaint()};$("#fSrc").onchange=e=>{F.src=e.target.value;newPaint()};
  root.querySelectorAll("[data-nq]").forEach(b=>b.onclick=()=>{F.nq=+b.dataset.nq;newPaint()});
  root.querySelectorAll("[data-sc]").forEach(b=>b.onclick=()=>{F.secs=+b.dataset.sc;newPaint()});
  root.querySelectorAll("[data-wh]").forEach(b=>b.onclick=()=>{F.when=b.dataset.wh;newPaint()});
  const tm=$("#fTm");if(tm)tm.onchange=e=>{F.tm=e.target.value};
  $("#fGo").onclick=async()=>{let st=null;
    if(F.when==="at"){if(!/^\d\d:\d\d$/.test(F.tm)){MSG="اختر وقت البداية";newPaint();return}
      /* الوقت بتوقيت الرياض، ولو فات اليوم يصير بكرة */
      const [H,M]=F.tm.split(":").map(Number),r=new Date(Date.now()+3*3600e3);let t=Date.UTC(r.getUTCFullYear(),r.getUTCMonth(),r.getUTCDate(),H,M)-3*3600e3;
      if(t<Date.now()+60e3)t+=864e5;st=new Date(t).toISOString()}
    const b=$("#fGo");b.disabled=true;MSG="";let j;
    try{j=await call("ajf_du_new",{p_opp:F.opp,p_tp:F.tp,p_src:F.src,p_nq:F.nq,p_secs:F.secs,p_start:st})}catch(e){j={s:"net"}}
    if(j.s==="ok"){act("dusend");PEND.add(j.id);VIEW="home";await load();paint();sched();return}
    MSG={limit:"خلصت تحدياتك اليوم (3)",pair:"سبق تحديت هذا الزميل اليوم، أو عندك دعوة له ما رد عليها",few:"الأسئلة المعتمدة ما تكفي ("+(j.n||0)+")",
      off:"التحديات موقوفة مؤقتاً من المشرف",time:"وقت البداية لازم يكون خلال 24 ساعة",busy:"عندك أو عنده تحدي ثاني بنفس الوقت",tp:"هذا المجال ما يخص زميلك",
      admin:"المشرف ما يلعب",net:"تعذّر الإرسال، تأكد من الإنترنت"}[j.s]||"تعذّر الإرسال";newPaint()}}

/* ---------- الغرفة ---------- */
let R=null,ov=null,pt=null,tk=null;
function roomOpen(id){act("duroom");R={id,d:null,off:0,last:0,sig:"",chat:[],busy:false,picked:null,left:{}};
  ov=document.createElement("div");ov.className="qzo duo";ov.setAttribute("role","dialog");document.body.appendChild(ov);document.documentElement.style.overflow="hidden";
  ov.innerHTML=`<div class="qzo-in"><div class="qzo-top"><button class="duo-x" id="duoX">✕ خروج</button><span id="duoV"></span></div>
    <div id="duoSb"></div><div id="duoMain"><div class="bd-empty">جاري الدخول…</div></div>
    <div class="duo-chat"><div class="duo-cl" id="duoCl"><div class="du-m" style="background:none">💬 دردشة الغرفة</div></div>
    <div class="duo-ci"><input id="duoIn" maxlength="200" placeholder="اكتب رسالة…" enterkeyhint="send"><button id="duoSend">إرسال</button></div></div></div>`;
  ov.querySelector("#duoX").onclick=roomClose;
  const send=async()=>{const i=ov.querySelector("#duoIn"),t=i.value.trim();if(!t||!R)return;i.value="";let j;try{j=await call("ajf_du_chat",{p_id:R.id,p_txt:t})}catch(e){j={s:"net"}}
    if(j.s!=="ok"){i.value=t;if(j.s==="q")toast("ما تقدر تكتب والسؤال مفتوح");else if(j.s==="fast")toast("انتظر ثانيتين");}poll(true)};
  ov.querySelector("#duoSend").onclick=send;ov.querySelector("#duoIn").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();send()}};
  poll(true);clearInterval(tk);tk=setInterval(tick,200)}
function roomClose(){clearTimeout(pt);clearInterval(tk);if(ov){ov.remove();ov=null}R=null;document.documentElement.style.overflow="";if(root&&VIEW==="home")load().then(paint)}
function toast(m){const v=ov&&ov.querySelector("#duoV");if(!v)return;v.textContent=m;v.style.color="var(--amber)";setTimeout(()=>{if(v.isConnected){v.style.color="";vPaint()}},2500)}
const srvNow=()=>Date.now()+(R?R.off:0);
async function poll(){clearTimeout(pt);if(!R)return;const r=R;if(r.inf){r.again=1;return}r.inf=1;let j=null;
  try{j=await call("ajf_du_room",{p_id:r.id,p_after:r.last})}catch(e){}
  r.inf=0;if(R!==r)return;const ag=r.again;r.again=0;
  if(j&&j.s==="ok"){r.off=new Date(j.now)-Date.now();r.d=j;(j.chat||[]).forEach(c=>{r.chat.push(c);r.last=Math.max(r.last,c.id)});chatPaint(j.chat||[]);render()}
  else if(j&&j.s==="gone"){ov.querySelector("#duoMain").innerHTML=`<div class="duo-big"><i>🚫</i><h2>التحدي انلغى</h2></div>`;return}
  const d=r.d,fast=d&&(["q","q2","rev","brk"].includes(d.ph)||(d.ph==="wait"&&new Date(d.starts)-srvNow()<90e3));
  clearTimeout(pt);if(!document.hidden)pt=setTimeout(poll,ag?0:fast?1000:d&&d.ph==="done"?6000:3500)}
document.addEventListener("visibilitychange",()=>{if(!R)return;if(document.hidden){leave();return}poll(true)});
addEventListener("pagehide",()=>{if(R)leave()});
/* طلع من التطبيق والسؤال مفتوح = خطأ */
function leave(){const d=R&&R.d;if(!d||!d.me||d.ph!=="q"||!d.cur||d.cur.mydone||R.left[d.n])return;R.left[d.n]=1;
  try{fetch(SB_URL+"/rest/v1/rpc/ajf_du_leave",{method:"POST",keepalive:true,headers:{apikey:SB_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({p_token:AUTH.tok||"",p_device:AUTH.dev,p_id:R.id,p_n:d.n})}).catch(()=>{})}catch(e){}}

function vPaint(){const v=ov&&ov.querySelector("#duoV"),d=R&&R.d;if(!v||!d)return;const n=(d.v||[]).length;
  v.textContent=(d.me?"أنت لاعب":"👀 متفرج")+(n?" · "+n+" يتابعون":"");v.title=(d.v||[]).join("، ")}
function chatPaint(nw){const cl=ov&&ov.querySelector("#duoCl");if(!cl||!nw.length)return;const near=cl.scrollHeight-cl.scrollTop-cl.clientHeight<40;
  nw.forEach(c=>{const x=document.createElement("div");x.className=(c.me?"me ":"")+(c.pl?"pl":"");x.innerHTML=`<b>${E(c.name||"")}${c.pl?" ⚔️":""}</b>${E(c.txt)}`;cl.appendChild(x)});
  if(near||nw.some(c=>c.me))cl.scrollTop=cl.scrollHeight}
function render(){const d=R&&R.d;if(!d||!ov)return;vPaint();
  const inp=ov.querySelector("#duoIn"),sb=ov.querySelector("#duoSend"),lock=!!d.me&&(d.ph==="q"||d.ph==="q2");
  inp.disabled=sb.disabled=lock;inp.placeholder=lock?"🔒 الدردشة مقفلة عليك والسؤال مفتوح":d.ph==="done"?"علّق على النتيجة…":"اكتب رسالة…";
  /* لوحة النتيجة */
  const sc=d.sc||{ra:0,rb:0,rounds:[]},c=d.cur||{},showAns=d.ph==="q"||d.ph==="q2";
  const lab=k=>showAns?(c["ans_"+k]?"✓ جاوب":"… يفكر"):d.ph==="done"?(d.win===k?"🏆 الفائز":d.win===""?"تعادل":""):"";
  const rdDone=rd=>rDone(d.ph,d.n,rd),RW=rw(sc,d.ph,d.n);
  ov.querySelector("#duoSb").innerHTML=`<div class="duo-sb"><div class="p ${d.me==="a"?"me":""}"><b>${E(d.a.name)}</b><i class="${showAns&&c.ans_a?"ok":""}">${lab("a")}</i></div>
    <div class="s">${d.ph==="wait"?"🆚":RW[1]+" - "+RW[0]}<small>${d.nq/5>1?"جولات":"جولة"} · صح <span dir="ltr">${sc.cb||0}-${sc.ca||0}</span></small></div>
    <div class="p ${d.me==="b"?"me":""}"><b>${E(d.b.name)}</b><i class="${showAns&&c.ans_b?"ok":""}">${lab("b")}</i></div></div>
    ${d.nq>5&&d.ph!=="wait"?`<div class="duo-rd" style="margin-top:8px">${sc.rounds.map(x=>`<span>ج${x.rd}: ${rdDone(x.rd)?(x.w==="a"?E(d.a.name):x.w==="b"?E(d.b.name):"تعادل"):x.rd===Math.ceil((d.n||1)/5)?"شغّالة":"…"}</span>`).join("")}</div>`:""}`;
  /* الجزء الرئيسي: نعيد رسمه بس إذا تغيرت المرحلة */
  const sig=[d.ph,d.n,c.mydone,c.my,c.right,!!c.pa,!!c.pb].join("|");if(sig===R.sig)return;R.sig=sig;R.busy=false;
  const M=ov.querySelector("#duoMain"),rd=Math.ceil((d.n||1)/5),qi=((d.n||1)-1)%5+1;
  if(d.ph==="invite"){M.innerHTML=`<div class="duo-big"><i>📨</i><h2>بانتظار رد ${E(d.b.name)}</h2></div>`;return}
  if(d.ph==="wait"){M.innerHTML=`<div class="duo-big"><i>⚔️</i><h2>التحدي يبدأ بعد</h2><div class="cd" id="duoCd">--</div>
    <div class="du-m">${d.nq} أسئلة · ${d.secs} ثانية للسؤال · ${E(TPN[d.tp||""])}${d.src?" · "+E(d.src):""}</div>
    ${d.me?`<div class="du-m">خلك في الغرفة. إذا طلعت من التطبيق والسؤال مفتوح ينحسب خطأ.</div>`:`<div class="du-m">أنت متفرج: تشوف الأسئلة وتدردش، ورسائلك توصل اللاعبين بعد ما يخلص كل سؤال.</div>`}</div>`;return}
  if(d.ph==="brk"){M.innerHTML=`<div class="duo-big"><i>☕</i><h2>استراحة · الجولة ${rd} تبدأ بعد</h2><div class="cd" id="duoCd">--</div></div>`;return}
  if(d.ph==="done"){const H=d.hist||[],w=d.win;
    M.innerHTML=`<div class="duo-big"><i>${w?"🏆":"🤝"}</i><h2>${w?"فاز "+E(w==="a"?d.a.name:d.b.name)+" "+(w==="a"?sc.ra+"-"+sc.rb:sc.rb+"-"+sc.ra):"تعادل "+sc.ra+"-"+sc.rb}</h2>
      ${d.me?`<div class="du-m">${w===d.me?"مبروك! 🎉":w?"حظ أوفر المرة الجاية 💪":""}</div>`:""}</div>
      <details class="du-card"><summary style="font:700 14px var(--display);list-style:none;cursor:pointer">📚 مراجعة الأسئلة والأجوبة (${H.length})</summary><div class="duo-hist">${H.map(x=>{
        const tag=(k,p)=>p&&p.pick===k?`<em>${k===x.right?"✓":"✗"} ${E((k===x.right?"":"")+(p===x.pa?d.a.name:d.b.name))}</em>`:"";
        return`<div class="h"><b>${x.n}. ${E(x.q)}</b><ol>${x.o.map((t,k)=>`<li class="${k===x.right?"ok":""}"><span>${LT[k]}) ${E(t)}</span><i class="duo-pk">${tag(k,x.pa)}${tag(k,x.pb)}</i></li>`).join("")}</ol>
          ${!x.pa||x.pa.pick==null||!x.pb||x.pb.pick==null?`<div class="du-m">${!x.pa||x.pa.pick==null?E(d.a.name)+" ما جاوب. ":""}${!x.pb||x.pb.pick==null?E(d.b.name)+" ما جاوب.":""}</div>`:""}
          ${x.why?`<div class="du-m">💡 ${E(x.why)}</div>`:""}${x.src?`<div class="du-m">📄 ${E(x.src)}</div>`:""}</div>`}).join("")}</div></details>`;return}
  /* سؤال مفتوح أو عرض الجواب */
  const rev=d.ph==="rev",pa=c.pa,pb=c.pb,me=d.me,mine=me?c.my:null;
  const who=k=>[pa&&pa.pick===k?`<em>${E(d.a.name)}</em>`:"",pb&&pb.pick===k?`<em>${E(d.b.name)}</em>`:""].join("");
  M.innerHTML=`<div class="qzo-top"><span>${d.nq>5?"الجولة "+rd+" · ":""}سؤال ${qi} من 5</span><span>${d.n} / ${d.nq}</span></div>
    ${rev||d.ph==="q2"?"":`<div class="qzo-ring" id="duoRing"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" cx="50" cy="50" r="46" style="animation-duration:${d.secs}s;animation-delay:-${Math.max(0,(srvNow()-new Date(d.t0))/1000).toFixed(1)}s"/></svg><b id="duoSec">${d.secs}</b></div>`}
    <div class="qzo-q">${E(c.q)}</div>
    <div class="qzo-o">${(c.o||[]).map((t,k)=>`<button data-o="${k}" ${!me||c.mydone||rev||d.ph==="q2"?"disabled":""} class="${rev?(k===c.right?"ok":k===mine?"no":""):k===mine?"pk":""}"><i>${LT[k]}</i><span>${E(t)}</span>${rev?`<span class="duo-pk">${who(k)}</span>`:""}</button>`).join("")}</div>
    ${rev?`<div class="qzo-r ${me?(pa&&me==="a"?pa.ok:pb&&me==="b"?pb.ok:false)?"ok":"no":""}"><b class="h">${rev?res(d,pa,pb):""}</b>${c.why?`<div>💡 ${E(c.why)}</div>`:""}${c.src?`<small>📄 ${E(c.src)}</small>`:""}</div>`
      :me&&c.mydone?`<div class="du-m" style="text-align:center">✓ انرسل جوابك، انتظر نهاية الوقت</div>`:d.ph==="q2"?`<div class="du-m" style="text-align:center">⏳ انتهى الوقت…</div>`:!me?`<div class="du-m" style="text-align:center">👀 أنت متفرج</div>`:""}`;
  M.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>pick(+b.dataset.o))}
function res(d,pa,pb){const f=(p,n)=>!p||p.pick==null?n+": ما جاوب":n+": "+(p.ok?"✓ صح ("+(p.ms/1000).toFixed(1)+"ث)":"✗ غلط");return E(f(pa,d.a.name)+" · "+f(pb,d.b.name))}
async function pick(k){const d=R&&R.d;if(!d||!d.me||R.busy||d.ph!=="q"||(d.cur&&d.cur.mydone))return;R.busy=true;const n=d.n;
  ov.querySelectorAll("[data-o]").forEach(b=>{b.disabled=true;if(+b.dataset.o===k)b.classList.add("pk")});
  let j=null;for(let i=0;i<3&&!j;i++){try{j=await call("ajf_du_answer",{p_id:R.id,p_n:n,p_pick:k})}catch(e){if(e.message==="out")return;await new Promise(z=>setTimeout(z,600))}}
  if(!R)return;if(!j||j.s!=="ok")toast(j&&j.s==="late"?"⏱ وصل جوابك بعد نهاية الوقت":"⚠️ تعذّر إرسال الجواب");poll(true)}
function tick(){const d=R&&R.d;if(!d||!ov)return;const now=srvNow();
  const cd=ov.querySelector("#duoCd");if(cd){const t=d.ph==="wait"?d.starts:d.t0,s=Math.max(0,Math.ceil((new Date(t)-now)/1000));cd.textContent=s>=60?Math.floor(s/60)+":"+String(s%60).padStart(2,"0"):s;if(s<=0&&!R.kick){R.kick=1;setTimeout(()=>{if(R)R.kick=0},1500);poll(true)}}
  const se=ov.querySelector("#duoSec");if(se&&d.t1){const s=Math.max(0,Math.ceil((new Date(d.t1)-now)/1000));se.textContent=s;const rg=ov.querySelector("#duoRing");if(rg&&s<=10)rg.classList.add("low");
    if(s<=0&&!R.kick){R.kick=1;setTimeout(()=>{if(R)R.kick=0},1500);poll(true)}}}

window.DU={mount};
})();
