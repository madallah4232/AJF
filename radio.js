/* ---------- 📻 الراديو: بث صوتي مباشر (اضغط وتكلم) + تنبيهات مكتوبة من المشرف ----------
   الصوت: قناة Supabase Realtime (Broadcast) باسم سري يجيبه الموظف المسجّل فقط من ajf_bc_get.
   الصوت مضغوط 8kHz μ-law على دفعات نص ثانية، ويوصل للي فاتحين التطبيق فقط (الآيفون يقطع الاتصال لما يتقفل الجوال).
   التنبيهات المكتوبة: تنحفظ في ajf_bc، تطلع فوراً للي فاتحين التطبيق، ووسيط ADS-B يرسلها Web Push لشاشة القفل خلال ~30 ثانية.
   الإرسال والتكلم للمشرف ومن يعطيه صلاحية (مفتاح bcp). يعتمد على: $, escT, AUTH, rpc, authOut, DEMO, swReady من index.html */
(function(){
if(typeof DEMO!=="undefined"&&DEMO)return;
const RT_URL=SB_URL.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+encodeURIComponent(SB_KEY)+"&vsn=1.0.0";
const RATE=8000,CHUNK=4000,MAX_SEC=90;
const st={can:false,room:null,items:[],perm:[],at:0,open:false,unread:0,seen:new Set(),auto:new Set(),stt:{}};
const myEmp=()=>(AUTH.me&&AUTH.me.emp)||"";
/* نص كلام الراديو يظهر للمشرف ومن عنده صلاحية فقط؛ الموظفين توصلهم التنبيهات المكتوبة على الشاشة بدون سجل */
const isAdm=()=>!!(AUTH.me&&AUTH.me.admin);
/* تنبيهات كلام الراديو (النص المكتوب من الكلام) تطلع للمشرف فقط */
const isNote=x=>(x.kind==="text"||(isAdm()&&x.kind==="voice"&&x.body))&&x.emp!==myEmp();
let muted=false;try{muted=localStorage.getItem("ajf_rd_mute")==="1"}catch(e){}
try{(JSON.parse(localStorage.getItem("ajf_bc_seen")||"[]")).forEach(i=>st.seen.add(i))}catch(e){}

/* ===== الشكل ===== */
const css=document.createElement("style");css.textContent=`
.rd-fab{position:fixed;z-index:39;right:16px;bottom:calc(82px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:26px;background:var(--panel);border:1px solid var(--line);color:var(--amber);display:grid;place-items:center;box-shadow:0 10px 28px rgba(0,0,0,.45)}
.rd-fab[hidden]{display:none}.rd-fab i{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--warn);color:#fff;font:700 11px/18px var(--mono);font-style:normal;padding:0 4px}
.rd-fab.live{border-color:var(--go);color:var(--go);animation:rdPulse 1.1s ease-in-out infinite}
@keyframes rdPulse{50%{box-shadow:0 0 0 8px color-mix(in oklab,var(--go) 25%,transparent),0 10px 28px rgba(0,0,0,.45)}}
.rd-air{position:fixed;z-index:72;left:12px;right:12px;bottom:calc(150px + env(safe-area-inset-bottom));padding:12px 14px;border-radius:16px;background:var(--panel);border:1.5px solid var(--go);display:flex;gap:12px;align-items:center;box-shadow:0 20px 50px rgba(0,0,0,.55)}
.rd-air[hidden]{display:none}.rd-air div{flex:1;min-width:0}.rd-air b{display:block;font-size:15px}.rd-air small{color:var(--muted);font-size:12.5px}
.rd-air.need{cursor:pointer;border-width:2px;animation:rdNeed 1.4s ease-in-out infinite}
@keyframes rdNeed{50%{box-shadow:0 0 0 6px color-mix(in oklab,var(--go) 30%,transparent),0 20px 50px rgba(0,0,0,.55)}}
.rd-stt{font-size:12.5px;color:var(--muted)}.rd-it p.v{border-inline-start:3px solid var(--go);padding-inline-start:8px}
.rd-air .go{background:var(--go);color:#062417;border:0;border-radius:11px;padding:10px 14px;font-weight:700;font-size:14px}
.rd-wave{display:flex;gap:3px;align-items:center;height:28px}.rd-wave span{width:4px;height:6px;border-radius:2px;background:var(--go);transition:height .07s linear}
.rd-wave.idle span{animation:rdW .9s ease-in-out infinite}
.rd-wave span:nth-child(2){animation-delay:.15s}.rd-wave span:nth-child(3){animation-delay:.3s}.rd-wave span:nth-child(4){animation-delay:.45s}
@keyframes rdW{0%,100%{height:6px}50%{height:24px}}
.rd-pttw{display:grid;justify-items:center;gap:14px;padding:10px 0 2px;-webkit-user-select:none;user-select:none}
.rd-ptt{--l:0;position:relative;width:176px;height:176px;border-radius:50%;border:0;padding:0;color:var(--amber);display:grid;place-items:center;
  background:radial-gradient(circle at 50% 30%,#22304d 0%,var(--raise) 62%,#111a2d 100%);
  box-shadow:0 0 0 1px var(--line) inset,0 0 0 8px color-mix(in oklab,var(--amber) 7%,transparent),0 18px 44px rgba(0,0,0,.5);
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;-webkit-tap-highlight-color:transparent;transition:transform .14s cubic-bezier(.3,.7,.4,1),color .2s,box-shadow .25s}
.rd-ptt:disabled{opacity:.45}
.rd-ptt.prep{transform:scale(.96)}
.rd-ptt.on{transform:scale(.96);color:#fff;background:radial-gradient(circle at 50% 30%,#ff8f7d 0%,#e2493a 58%,#a92a20 100%);
  box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 0 0 8px color-mix(in oklab,var(--warn) 22%,transparent),0 18px 50px rgba(226,73,58,.45)}
.rd-core{position:relative;z-index:2;display:grid;place-items:center;gap:4px;pointer-events:none}
.rd-core svg{width:54px;height:54px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
.rd-halo{position:absolute;inset:0;border-radius:50%;pointer-events:none;border:2px solid var(--warn);opacity:0;transform:scale(1);transition:transform .08s linear,opacity .2s}
.rd-ptt.on .rd-halo.h1{opacity:calc(.25 + var(--l)*.6);transform:scale(calc(1.04 + var(--l)*.16))}
.rd-ptt.on .rd-halo.h2{opacity:calc(var(--l)*.45);transform:scale(calc(1.1 + var(--l)*.32))}
.rd-ring{position:absolute;inset:-12px;width:200px;height:200px;transform:rotate(-90deg);pointer-events:none;overflow:visible}
.rd-ring circle{fill:none;stroke-width:4;stroke-linecap:round}
.rd-ring .tr{stroke:var(--line);opacity:.0;transition:opacity .2s}.rd-ptt.on .rd-ring .tr,.rd-ptt.prep .rd-ring .tr{opacity:.9}
.rd-ring .pg{stroke:var(--warn);stroke-dasharray:597;stroke-dashoffset:597;transition:stroke .3s}
.rd-ptt.prep .rd-ring .pg{stroke:var(--amber);stroke-dashoffset:450;transform-origin:100px 100px;animation:rdSpin .9s linear infinite}
@keyframes rdSpin{to{transform:rotate(360deg)}}
.rd-ptt.late .rd-ring .pg{stroke:var(--amber)}
.rd-info{width:100%;display:grid;justify-items:center;gap:8px}
.rd-st{font:700 17px var(--display);display:flex;align-items:center;gap:8px;min-height:26px}
.rd-st .rec{width:10px;height:10px;border-radius:5px;background:var(--warn);box-shadow:0 0 0 0 var(--warn);animation:rdRec 1.2s ease-out infinite}
@keyframes rdRec{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--warn) 70%,transparent)}100%{box-shadow:0 0 0 9px transparent}}
.rd-st .tm{font:600 17px var(--mono);letter-spacing:.5px;color:var(--ink)}
.rd-cv{width:100%;max-width:340px;height:52px;display:block}
.rd-sub{font-size:13px;color:var(--muted);text-align:center;min-height:18px}
.rd-sub.w{color:var(--amber)}
.rd-it{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:grid;gap:6px;background:var(--raise)}
.rd-it.u{border-color:var(--warn)}.rd-it.new{box-shadow:0 0 0 1.5px var(--amber) inset}
.rd-it p{margin:0;font-size:14.5px;white-space:pre-wrap;line-height:1.6}.rd-it .m{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.rd-it .who{font-size:12.5px;color:var(--muted);display:grid;gap:4px}
.rd-urg{display:flex;align-items:center;gap:8px;font-size:14px}.rd-urg input{width:20px;height:20px}
.rd-dot{display:inline-block;width:9px;height:9px;border-radius:5px;background:var(--muted);margin-inline-end:6px}.rd-dot.ok{background:var(--go)}
`;document.head.appendChild(css);
const ICO='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="12" height="14" rx="2"/><path d="M9 8V2M12 12v.01M9 16h6M9 19h6"/></svg>';
const fab=document.createElement("button");fab.className="rd-fab";fab.id="rdFab";fab.hidden=true;fab.setAttribute("aria-label","الراديو والتنبيهات");fab.innerHTML=ICO+'<i id="rdN" hidden></i>';document.body.appendChild(fab);
const pan=document.createElement("div");pan.className="dlyc";pan.id="rd";pan.hidden=true;pan.setAttribute("role","dialog");pan.setAttribute("aria-modal","true");pan.style.gridTemplateRows="auto 1fr";pan.style.zIndex="41";
pan.innerHTML=`<div class="trk-top"><button class="trk-back" id="rdBack" aria-label="رجوع"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>
<div><b>📻 الراديو والتنبيهات</b><span id="rdS"></span></div></div><div class="adm-b" id="rdB"></div>`;document.body.appendChild(pan);
const air=document.createElement("div");air.className="rd-air";air.id="rdAir";air.hidden=true;air.setAttribute("role","status");document.body.appendChild(air);

/* ===== الصوت: تشغيل ===== */
let ctx=null;
function aSess(t){try{if(navigator.audioSession&&navigator.audioSession.type!==t)navigator.audioSession.type=t}catch(e){}}
function unlock(){try{if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=new A();aSess("playback")}
  if(ctx.state!=="running")ctx.resume();const b=ctx.createBuffer(1,1,ctx.sampleRate),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}}
const audioOK=()=>ctx&&ctx.state==="running";
/* الآيفون يسمح بتشغيل الصوت بعد لمسة "نقر" فقط (مو سحب)، فنفتح الصوت مع أي نقرة في أي لوحة */
["pointerdown","touchend","click","keydown"].forEach(ev=>document.addEventListener(ev,()=>{const was=audioOK();if(!was)unlock();if(RX.sid){if(!was)setTimeout(()=>{rxPump();airPaint()},120);else rxPump()}},{capture:true,passive:true}));
/* الآيفون: لما الموظف يطلع من التطبيق ويرجع، الصوت القديم يصير صامت حتى لو يقول إنه شغّال.
   فنسكّره ونسوي واحد جديد مع أول لمسة، والشريط الأخضر يطلب منه يضغط عشان يسمع */
let wasHidden=false;
function audioReset(){if(TX.on||TX.want)return;try{ctx&&ctx.close()}catch(e){}ctx=null;RX.next=0;RX.pi=0}
document.addEventListener("visibilitychange",()=>{if(document.hidden){wasHidden=true;return}if(wasHidden){wasHidden=false;audioReset();if(RX.sid)airPaint()}});
addEventListener("pageshow",e=>{if(e.persisted){audioReset();if(RX.sid)airPaint()}});
function beep(f1,f2,dur,vol){if(!audioOK()||muted)return;try{const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(f1,t);o.frequency.linearRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.18,t+.02);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}}
/* μ-law (G.711) */
function muEnc(x){let s=Math.max(-1,Math.min(1,x))*32767|0;const sign=s<0?0x80:0;if(sign)s=-s;if(s>32635)s=32635;s+=0x84;let e=7;for(let m=0x4000;(s&m)===0&&e>0;e--,m>>=1);return ~(sign|(e<<4)|((s>>(e+3))&0x0F))&0xFF}
const MUD=new Float32Array(256);for(let i=0;i<256;i++){const u=~i&0xFF,e=(u>>4)&7;let s=(((u&0x0F)<<3)+0x84)<<e;s-=0x84;MUD[i]=((u&0x80)?-s:s)/32768}
const b64e=u=>{let s="";for(let i=0;i<u.length;i+=0x2000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x2000));return btoa(s)};
const b64d=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const RX={sid:null,name:"",next:0,last:0,t:null,lv:[],raf:0,buf:[],pi:0,heard:new Set()};
const toLvl=r=>{const db=20*Math.log10(r||1e-6);return Math.max(0,Math.min(1,(db+52)/40))};
function rxStart(p){RX.sid=p.sid;RX.name=p.name||"";RX.next=0;RX.lv=[];RX.buf=[];RX.pi=0;RX.last=Date.now();fab.classList.add("live");if(!muted)beep(880,1320,.12);airPaint();rxWatch();
  try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}}
function rxChunk(p){if(!RX.sid||p.sid!==RX.sid){if(!RX.sid)rxStart(p);else return}RX.last=Date.now();
  try{RX.buf.push(b64d(p.d))}catch(e){}rxPump()}
/* يشغّل كل اللي وصل وما انسمع — لو الموظف ضغط «استماع» متأخر يسمع الكلام من أوله */
function rxPump(){if(!RX.sid||muted||!audioOK())return;while(RX.pi<RX.buf.length)rxPlay(RX.buf[RX.pi++])}
function rxPlay(u){
  try{RX.heard.add(RX.sid);const sr=ctx.sampleRate,n=Math.round(u.length*sr/RATE),buf=ctx.createBuffer(1,n,sr),o=buf.getChannelData(0),k=RATE/sr;
    for(let i=0;i<n;i++){const x=i*k,j=x|0,f=x-j,a=MUD[u[j]],b=j+1<u.length?MUD[u[j+1]]:a;o[i]=(a+(b-a)*f)*1.6}
    const s=ctx.createBufferSource();s.buffer=buf;s.connect(ctx.destination);const now=ctx.currentTime;
    if(RX.next<now+.05)RX.next=now+.35;/* أول دفعة أو بعد تقطّع: هامش صغير عشان ما يتقطع الصوت */
    s.start(RX.next);const seg=400;for(let i=0;i<u.length;i+=seg){let q=0,m=Math.min(seg,u.length-i);for(let k2=0;k2<m;k2++){const v=MUD[u[i+k2]];q+=v*v}RX.lv.push({t:RX.next+i/RATE,v:toLvl(Math.sqrt(q/m)*1.6)})}
    if(RX.lv.length>400)RX.lv.splice(0,RX.lv.length-400);RX.next+=buf.duration;rxAnim()}catch(e){}}
function rxAnim(){if(RX.raf)return;const f=()=>{RX.raf=0;if(!RX.sid||air.hidden)return;const sp=air.querySelectorAll(".rd-wave span");
    if(audioOK()&&!muted&&sp.length){const now=ctx.currentTime;let v=0;while(RX.lv.length>1&&RX.lv[1].t<=now)RX.lv.shift();if(RX.lv.length&&RX.lv[0].t<=now)v=RX.lv[0].v;
      const w=[.55,.9,1,.8,.6],tt=performance.now()/90;sp.forEach((e,i)=>{e.style.height=(5+v*22*w[i]*(.75+.25*Math.sin(tt+i*1.7)))+"px"})}
    RX.raf=requestAnimationFrame(f)};RX.raf=requestAnimationFrame(f)}
function rxEnd(sid){if(sid&&sid!==RX.sid)return;rxPump();const wait=audioOK()?Math.max(0,(RX.next-ctx.currentTime)*1000):0;const was=RX.sid;
  setTimeout(()=>{if(RX.sid!==was)return;RX.sid=null;fab.classList.remove("live");air.hidden=true;if(!muted)beep(1320,700,.14,.14)},wait+50)}
function rxWatch(){clearTimeout(RX.t);RX.t=setTimeout(()=>{if(!RX.sid)return;if(Date.now()-RX.last>4000)rxEnd(RX.sid);else rxWatch()},1500)}
function airPaint(){if(!RX.sid||TX.on){air.hidden=true;return}
  const need=!muted&&!audioOK();
  /* شريط «فلان يتكلم» للمشرف فقط؛ الموظف يطلع له بس لو الجوال يحتاج ضغطة عشان يسمع */
  if(!isAdm()&&!need){air.hidden=true;return}
  air.innerHTML=`<div class="rd-wave ${need||muted?"idle":""}"><span></span><span></span><span></span><span></span></div><div><b>📻 ${escT(RX.name||"المشرف")} يتكلم الحين</b><small>${muted?"الراديو مكتوم على هذا الجوال":need?"اضغط هنا عشان تسمع (من أول الكلام)":"بث مباشر"}</small></div>${need?'<button class="go" id="rdHear">🔊 استماع</button>':""}`;
  air.classList.toggle("need",need);air.onclick=need?()=>{unlock();setTimeout(()=>{rxPump();airPaint()},150)}:null;
  air.hidden=false;rxAnim()}

/* ===== الاتصال المباشر (Supabase Realtime) ===== */
const RT={ws:null,ref:0,jref:null,ok:false,hb:null,retry:0,rt:null,topic:null,pres:{}};
function rtSend(ev,payload){if(!RT.ws||RT.ws.readyState!==1||!RT.ok)return false;RT.ws.send(JSON.stringify({topic:RT.topic,event:"broadcast",payload:{type:"broadcast",event:ev,payload},ref:String(++RT.ref),join_ref:RT.jref}));return true}
function rtOpen(){if(!st.room||!AUTH.tok||document.hidden)return;if(RT.ws&&RT.ws.readyState<=1)return;clearTimeout(RT.rt);
  RT.topic="realtime:ajf-"+st.room;RT.ok=false;RT.pres={};const ws=new WebSocket(RT_URL);RT.ws=ws;
  ws.onopen=()=>{RT.jref=String(++RT.ref);ws.send(JSON.stringify({topic:RT.topic,event:"phx_join",payload:{config:{broadcast:{self:false,ack:false},presence:{key:(AUTH.me&&AUTH.me.emp)||AUTH.dev}},private:false},ref:RT.jref,join_ref:RT.jref}));
    clearInterval(RT.hb);RT.hb=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({topic:"phoenix",event:"heartbeat",payload:{},ref:String(++RT.ref)}))},25000)};
  ws.onmessage=m=>{let j;try{j=JSON.parse(m.data)}catch(e){return}
    if(j.event==="phx_reply"&&j.ref===RT.jref){if(j.payload&&j.payload.status==="ok"){RT.ok=true;RT.retry=0;
        ws.send(JSON.stringify({topic:RT.topic,event:"presence",payload:{type:"presence",event:"track",payload:{n:(AUTH.me&&AUTH.me.name)||""}},ref:String(++RT.ref),join_ref:RT.jref}));stPaint()}
      else ws.close();return}
    if(j.event==="presence_state"){RT.pres={};for(const k in j.payload)RT.pres[k]=(j.payload[k].metas||[]).length;stPaint();return}
    if(j.event==="presence_diff"){const P=j.payload||{};for(const k in P.joins||{})RT.pres[k]=(RT.pres[k]||0)+(P.joins[k].metas||[]).length;
      for(const k in P.leaves||{}){RT.pres[k]=(RT.pres[k]||0)-(P.leaves[k].metas||[]).length;if(RT.pres[k]<=0)delete RT.pres[k]}stPaint();return}
    if(j.event==="phx_error"||j.event==="phx_close"){ws.close();return}
    if(j.event!=="broadcast"||!j.payload)return;const ev=j.payload.event,p=j.payload.payload||{};
    if(ev==="vs")rxStart(p);else if(ev==="va")rxChunk(p);else if(ev==="ve")rxEnd(p.sid);else if(ev==="bc"){if(p.sid&&RX.heard.has(p.sid)&&p.id)st.auto.add(p.id);load(true)}};
  ws.onclose=()=>{clearInterval(RT.hb);if(RT.ws===ws){RT.ws=null;RT.ok=false;RT.pres={};stPaint();if(TX.on)txStop();
    if(!document.hidden&&AUTH.tok){RT.retry=Math.min(RT.retry+1,6);RT.rt=setTimeout(rtOpen,1000*2**RT.retry/2)}}};
  ws.onerror=()=>{}}
function rtClose(){clearTimeout(RT.rt);clearInterval(RT.hb);const w=RT.ws;RT.ws=null;RT.ok=false;if(w)try{w.close()}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.hidden){if(!TX.on)rtClose()}else if(AUTH.tok){load(true).then(rtOpen)}});
addEventListener("online",()=>{if(AUTH.tok)rtOpen()});
const listeners=()=>Object.keys(RT.pres).filter(k=>k!==((AUTH.me&&AUTH.me.emp)||AUTH.dev)).length;

/* ===== الصوت: إرسال (اضغط مطوّل وتكلم) ===== */
const TX={on:false,want:false,stream:null,src:null,proc:null,sid:null,q:0,buf:null,n:0,acc:0,cnt:0,pos:0,t0:0,id:null,tm:null,lvl:0,raw:0,hist:[],raf:0,quiet:0,all:[]};
async function getMic(){const md=navigator.mediaDevices;
  try{return await md.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}})}
  catch(e){if(e&&(e.name==="NotAllowedError"||e.name==="SecurityError"))throw e;return await md.getUserMedia({audio:true})}}
async function txStart(){if(TX.on||TX.want)return;if(!RT.ok){toast("الراديو غير متصل، انتظر ثواني وجرّب");return}
  unlock();if(!ctx||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast("هذا الجوال ما يدعم المايك من التطبيق");return}
  TX.want=true;pttPaint();txAnim();
  /* الآيفون: جلسة الصوت لازم تكون "تسجيل وتشغيل" قبل طلب المايك، وإلا يرفض المايك (كان هذا سبب «تعذّر تشغيل المايك») */
  aSess("play-and-record");
  try{const s=await getMic();
    if(!TX.want){s.getTracks().forEach(t=>t.stop());aSess("playback");say("✅ تم تجهيز المايك. اضغط مطوّل مرة ثانية وتكلم");pttPaint();return}
    if(ctx.state!=="running")await ctx.resume().catch(()=>{});
    TX.stream=s;TX.src=ctx.createMediaStreamSource(s);TX.proc=ctx.createScriptProcessor(2048,1,1);
    TX.buf=new Uint8Array(CHUNK);TX.n=0;TX.acc=0;TX.cnt=0;TX.pos=0;TX.q=0;TX.lvl=0;TX.raw=0;TX.hist=[];TX.quiet=0;TX.all=[];TX.sid=Math.random().toString(36).slice(2,10);
    const ratio=ctx.sampleRate/RATE;
    TX.proc.onaudioprocess=e=>{if(!TX.on)return;const x=e.inputBuffer.getChannelData(0);let q=0;for(let i=0;i<x.length;i++)q+=x[i]*x[i];TX.raw=toLvl(Math.sqrt(q/x.length));
      for(let i=0;i<x.length;i++){TX.acc+=x[i];TX.cnt++;TX.pos+=1;if(TX.pos>=ratio){TX.pos-=ratio;TX.buf[TX.n++]=muEnc(TX.acc/TX.cnt);TX.acc=0;TX.cnt=0;if(TX.n>=CHUNK)txFlush()}}};
    TX.src.connect(TX.proc);TX.proc.connect(ctx.destination);
    TX.on=true;TX.t0=Date.now();rtSend("vs",{sid:TX.sid,emp:AUTH.me&&AUTH.me.emp,name:(AUTH.me&&AUTH.me.name)||""});beep(1320,880,.08,.12);
    try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
    TX.id=null;rpc("ajf_bc_talk",{p_token:AUTH.tok,p_device:AUTH.dev,p_id:null,p_secs:null}).then(j=>{if(j&&j.s==="ok")TX.id=j.id}).catch(()=>{});
    clearInterval(TX.tm);TX.tm=setInterval(()=>{const s=(Date.now()-TX.t0)/1000;pttPaint();if(s>=MAX_SEC)txStop()},250);pttPaint();txAnim()}
  catch(e){TX.want=false;aSess("playback");const n=e&&e.name||"";
    toast(n==="NotAllowedError"?"المايك مرفوض. افتح الإعدادات ← Safari ← الميكروفون واختر «اسمح»، ثم سكّر التطبيق وافتحه من جديد."
      :n==="NotFoundError"?"ما لقيت مايك في الجوال"
      :n==="NotReadableError"||n==="AbortError"?"المايك مشغول بتطبيق ثاني (مكالمة أو تسجيل). سكّره وجرّب":"تعذّر تشغيل المايك ("+(n||"خطأ")+")");pttPaint()}}
function txFlush(){if(!TX.n)return;TX.all.push(TX.buf.subarray(0,TX.n));rtSend("va",{sid:TX.sid,q:TX.q++,d:b64e(TX.buf.subarray(0,TX.n))});TX.buf=new Uint8Array(CHUNK);TX.n=0}
function txStop(){TX.want=false;if(!TX.on)return;TX.on=false;clearInterval(TX.tm);
  try{txFlush()}catch(e){}rtSend("ve",{sid:TX.sid});
  try{TX.src.disconnect();TX.proc.disconnect();TX.proc.onaudioprocess=null}catch(e){}
  if(TX.stream)TX.stream.getTracks().forEach(t=>t.stop());TX.stream=null;setTimeout(()=>{if(!TX.on&&!TX.want)aSess("playback")},300);
  const secs=Math.round((Date.now()-TX.t0)/1000);const id0=TX.id,all=TX.all,sid=TX.sid;TX.all=[];
  const fin=id=>{rpc("ajf_bc_talk",{p_token:AUTH.tok,p_device:AUTH.dev,p_id:id,p_secs:secs}).catch(()=>{});stt(id,all,sid)};
  if(id0)fin(id0);else setTimeout(()=>{if(TX.id)fin(TX.id)},1500);
  try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}pttPaint();setTimeout(()=>load(true),1800)}
addEventListener("pagehide",()=>{if(TX.on)txStop()});
/* ===== تحويل الكلام لنص: يرسل التسجيل (WAV) لدالة ajf-dc ← Gemini المجاني، والنص ينحفظ مع البث في التنبيهات ===== */
function wav(chunks){let n=0;chunks.forEach(c=>n+=c.length);const b=new ArrayBuffer(44+n*2),v=new DataView(b),W=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  W(0,"RIFF");v.setUint32(4,36+n*2,true);W(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,"data");v.setUint32(40,n*2,true);
  let o=44;chunks.forEach(c=>{for(let i=0;i<c.length;i++,o+=2)v.setInt16(o,Math.max(-32768,Math.min(32767,Math.round(MUD[c[i]]*32768*1.4))),true)});return new Uint8Array(b)}
async function stt(id,chunks,sid){let n=0;chunks.forEach(c=>n+=c.length);if(!id||n<RATE*.8)return;
  st.stt[id]="w";if(st.open&&!TX.on&&!TX.want)render();
  try{const r=await fetch(SB_URL+"/functions/v1/ajf-dc",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},
      body:JSON.stringify({kind:"stt",token:AUTH.tok||"",device:AUTH.dev,id,wav:b64e(wav(chunks))})});
    if(r.status===404)throw new Error("nofn");const j=await r.json().catch(()=>({}));if(j.s!=="ok")throw new Error(j.s||"err");
    delete st.stt[id];if(j.text)rtSend("bc",{id,sid});await load(true);if(st.open&&!TX.on&&!TX.want)render()}
  catch(e){const m=e.message;st.stt[id]=m==="nofn"||m==="bad"?"ما تفعّل التحويل لنص — حدّث دالة ajf-dc في Supabase":m==="aierr"?"تعذّر التحويل لنص (الحد المجاني بالدقيقة) — جرّب بعد شوي":"تعذّر التحويل لنص";if(st.open&&!TX.on&&!TX.want)render()}}
const MIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" fill-opacity=".18"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
function pttPaint(){const b=$("rdPtt");if(!b)return;const el=(Date.now()-TX.t0)/1000,left=MAX_SEC-el;
  b.classList.toggle("on",TX.on);b.classList.toggle("prep",TX.want&&!TX.on);b.classList.toggle("late",TX.on&&left<=10);b.disabled=!RT.ok&&!TX.on&&!TX.want;
  const S=$("rdSt"),U=$("rdSub");if(!S||!U)return;const L=listeners();
  if(TX.on){S.innerHTML=`<span class="rec"></span><span>على الهواء</span><span class="tm">${fmtS(el)}</span>`;
    const lo=TX.quiet>45;U.className="rd-sub"+(lo||left<=10?" w":"");
    U.textContent=lo?"الصوت ضعيف — قرّب الجوال من فمك":left<=10?"باقي "+Math.ceil(left)+" ثانية":(L?"يسمعك "+L+" موظف":"ما فيه أحد فاتح التطبيق الحين")+" · شيل إصبعك لما تخلص"}
  else if(TX.want){S.innerHTML="<span>يجهّز المايك…</span>";U.className="rd-sub";U.textContent="خلك ضاغط"}
  else{S.innerHTML="<span>اضغط مطوّل وتكلم</span>";U.className="rd-sub";U.textContent=RT.ok?(L?"يسمعك الحين "+L+" موظف فاتح التطبيق":"ما فيه أحد فاتح التطبيق الحين"):"جاري الاتصال…"}}
function txAnim(){if(TX.raf)return;let last=0;const f=ts=>{TX.raf=0;const b=$("rdPtt"),cv=$("rdCv");
    TX.lvl+=((TX.on?TX.raw:0)-TX.lvl)*(TX.raw>TX.lvl?.55:.18);if(b)b.style.setProperty("--l",TX.lvl.toFixed(3));
    const pg=b&&b.querySelector(".pg");if(pg&&TX.on)pg.style.strokeDashoffset=(597*(1-Math.min(1,(Date.now()-TX.t0)/1000/MAX_SEC))).toFixed(1);else if(pg&&!TX.want)pg.style.strokeDashoffset="597";
    if(ts-last>45){last=ts;TX.hist.push(TX.on?TX.raw:0);if(TX.hist.length>120)TX.hist.shift();if(TX.on)TX.quiet=TX.raw<.12?TX.quiet+1:0;if(cv)drawCv(cv)}
    if(TX.on||TX.want||TX.lvl>.01)TX.raf=requestAnimationFrame(f);else{TX.hist=[];if(cv)drawCv(cv)}};TX.raf=requestAnimationFrame(f)}
let CVC=null;function drawCv(cv){const dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;if(!w)return;
  if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}const g=cv.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  if(!CVC){const cs=getComputedStyle(document.documentElement);CVC={w:cs.getPropertyValue("--warn").trim()||"#ff7a66",a:cs.getPropertyValue("--amber").trim()||"#ffb340",m:cs.getPropertyValue("--line").trim()||"#2a3550"}}
  const bw=3,gap=2.5,n=Math.floor(w/(bw+gap)),H=TX.hist,mid=h/2;
  /* الأحدث على اليسار والموجة تمشي لليمين (اتجاه الوقت بالعربي) */
  for(let i=0;i<n;i++){const v=H[H.length-1-i],xx=i*(bw+gap);if(v==null||v<.02){g.fillStyle=CVC.m;g.fillRect(xx,mid-1,bw,2);continue}
    const bh=Math.max(3,v*(h-4));g.fillStyle=v>.92?CVC.a:CVC.w;g.globalAlpha=1-.65*(i/n);
    g.beginPath();if(g.roundRect)g.roundRect(xx,mid-bh/2,bw,bh,1.5);else g.rect(xx,mid-bh/2,bw,bh);g.fill();g.globalAlpha=1}}
const fmtS=s=>{s=Math.max(0,s|0);return (s/60|0)+":"+String(s%60).padStart(2,"0")};

/* ===== التنبيهات المكتوبة ===== */
const tm=t=>{try{return new Date(t).toLocaleString("ar-SA-u-nu-latn",{timeZone:"Asia/Riyadh",weekday:"short",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
let loading=null;
async function load(force){if(!AUTH.tok)return;if(loading)return loading;if(!force&&Date.now()-st.at<20e3)return;
  loading=(async()=>{try{const j=await rpc("ajf_bc_get",{p_token:AUTH.tok,p_device:AUTH.dev});
      if(j.s==="out"){authOut();return}if(j.s!=="ok")return;
      const fresh=!st.room;st.can=!!j.can;st.room=j.room;st.perm=j.perm||[];st.at=Date.now();
      const prev=new Set(st.items.map(x=>x.id));st.items=j.items||[];
      const au=st.items.filter(x=>st.auto.has(x.id)&&x.body).map(x=>x.id);if(au.length){au.forEach(i=>st.auto.delete(i));seen(au)}
      const un=st.items.filter(x=>isNote(x)&&!x.read&&!st.seen.has(x.id));st.unread=un.length;badge();
      /* تنبيه جديد وصل والتطبيق مفتوح: يطلع على الشاشة */
      const nw=un.filter(x=>fresh?Date.now()-new Date(x.at).getTime()<6*3600e3:!prev.has(x.id));if(nw.length&&!st.open)banner(nw[0],un.length);
      if(st.open&&!TX.on&&!TX.want)render();fab.hidden=false;rtOpen()}catch(e){}finally{loading=null}})();return loading}
function badge(){const i=$("rdN");if(!i)return;i.hidden=!st.unread;i.textContent=st.unread}
function banner(x,n){const old=$("bcBan");if(old)old.remove();
  const d=document.createElement("div");d.className="jr-ban";d.id="bcBan";d.setAttribute("role","alert");if(x.urgent)d.style.borderColor="var(--warn)";
  d.innerHTML=`<i>${x.urgent?"🚨":x.kind==="voice"?"📻":"📢"}</i><div><b>${x.urgent?"عاجل · ":""}${escT(x.name||"المشرف")}${x.kind==="voice"?" · 📻 كلام الراديو":""}</b><small style="white-space:pre-wrap;display:block;color:var(--ink);font-size:14px;margin-top:2px">${escT(x.body.length>220?x.body.slice(0,220)+"…":x.body)}</small>${n>1?`<small>+${n-1} تنبيهات ثانية</small>`:""}</div><button class="go">تم ✓</button>`;
  d.querySelector(".go").onclick=()=>{d.remove();if(n>1&&st.can)openRd();else seen(n>1?st.items.filter(y=>isNote(y)&&!y.read).map(y=>y.id):[x.id])};
  document.body.appendChild(d);if(!muted){beep(988,988,.12,.2);setTimeout(()=>beep(1319,1319,.18,.2),160)}
  try{navigator.vibrate&&navigator.vibrate(x.urgent?[300,120,300,120,300]:[150,80,150])}catch(e){}}
function seen(ids){ids=ids.filter(i=>!st.seen.has(i));if(!ids.length)return;ids.forEach(i=>st.seen.add(i));
  try{localStorage.setItem("ajf_bc_seen",JSON.stringify([...st.seen].slice(-200)))}catch(e){}
  st.items.forEach(x=>{if(ids.includes(x.id))x.read=true});st.unread=st.items.filter(x=>isNote(x)&&!x.read&&!st.seen.has(x.id)).length;badge();
  rpc("ajf_bc_seen",{p_token:AUTH.tok,p_device:AUTH.dev,p_ids:ids}).catch(()=>{})}
function say(t){st.msg=t;const m=$("rdMsg");if(m)m.textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>{st.msg="";const n=$("rdMsg");if(n)n.textContent=""},6000)}
function toast(t){if(st.open){say(t);return}const d=document.createElement("div");d.className="pu-ban";d.innerHTML=`<p style="margin:0">${escT(t)}</p>`;document.body.appendChild(d);setTimeout(()=>d.remove(),4000)}
function stPaint(){const s=$("rdS");if(s)s.innerHTML=`<span class="rd-dot ${RT.ok?"ok":""}"></span>${RT.ok?"متصل · "+(listeners()+1)+" فاتحين التطبيق الحين":"غير متصل"}`;pttPaint()}

/* ===== الصفحة ===== */
let NAMES=null,openW=null;
async function openRd(){st.open=true;pan.hidden=false;const b=$("bcBan");if(b)b.remove();unlock();render();await load(true);rtOpen();render();
  const ids=st.items.filter(x=>isNote(x)&&!x.read).map(x=>x.id);setTimeout(()=>{if(st.open)seen(ids)},1200)}
function closeRd(){st.open=false;pan.hidden=true;if(TX.on)txStop()}
function render(){const me=AUTH.me||{};let h="";
  h+=`<div class="adm-s"><h3>📻 البث المباشر</h3>${st.can?`<div class="rd-pttw"><button class="rd-ptt" id="rdPtt" aria-label="اضغط مطوّل وتكلم"><span class="rd-halo h2"></span><span class="rd-halo h1"></span><svg class="rd-ring" viewBox="0 0 200 200"><circle class="tr" cx="100" cy="100" r="95"/><circle class="pg" cx="100" cy="100" r="95"/></svg><span class="rd-core">${MIC}</span></button>
    <div class="rd-info"><div class="rd-st" id="rdSt"></div><canvas class="rd-cv" id="rdCv"></canvas><div class="rd-sub" id="rdSub"></div></div></div><div class="amsg">اضغط على الزر واستمر ضاغط وأنت تتكلم، وشيل إصبعك لما تخلص (حد أقصى ${MAX_SEC} ثانية). يسمعك كل موظف فاتح التطبيق الحين.</div>`
    :`<div class="amsg">لما يتكلم المشرف يطلع لك شريط أخضر ويطلع الصوت مباشرة، بشرط يكون التطبيق مفتوح قدامك. لو الجوال مقفل ما يوصلك الصوت، لكن التنبيهات المكتوبة توصلك.</div>`}
    <div class="amsg" id="rdMsg">${escT(st.msg||"")}</div>
    <button class="abtn ${muted?"a":""}" id="rdMute">${muted?"🔇 الراديو مكتوم على هذا الجوال · اضغط للتشغيل":"🔊 الصوت شغّال · كتم الراديو"}</button>
    <div class="amsg">مساندة فقط: التعليمات العاجلة والسلامة تبقى على الريدو الرسمي.</div></div>`;
  if(st.can)h+=`<div class="adm-s"><h3>📢 تنبيه مكتوب لكل الموظفين</h3><textarea id="rdTx" maxlength="600" placeholder="مثال: SV1382 تأخير 30 دقيقة، المغادرة 19:45"></textarea>
    <label class="rd-urg"><input type="checkbox" id="rdUrg"> 🚨 عاجل (يبقى على الشاشة لين يفتحه الموظف)</label><button class="abtn a" id="rdSend">إرسال للجميع</button>
    <div class="amsg">يطلع فوراً للي فاتحين التطبيق، ويوصل على شاشة القفل للي مفعّلين التنبيهات خلال نص دقيقة تقريباً.</div></div>`;
  const its=st.items;
  if(!st.can)h+=`<div class="adm-s"><h3>📢 التنبيهات</h3><div class="amsg">أي تنبيه جديد من المشرف يطلع لك على الشاشة مباشرة، ويوصلك على شاشة القفل إذا مفعّل التنبيهات.</div></div>`;
  else h+=`<div class="adm-s"><h3>آخر التنبيهات <span class="chip">48 ساعة</span></h3>${its.length?its.map(x=>x.kind==="voice"
    ?`<div class="rd-it ${x.body&&isNote(x)&&!x.read&&!st.seen.has(x.id)?"new":""}"><div class="m"><span>📻 ${escT(x.name||x.emp)} تكلم على الراديو${x.secs?" · "+fmtS(x.secs):""}</span><span>${tm(x.at)}</span></div>${x.body?`<p class="v">${escT(x.body)}</p>`:st.stt[x.id]?`<div class="rd-stt">${st.stt[x.id]==="w"?"⏳ يحوّل الكلام لنص…":escT(st.stt[x.id])}</div>`:""}
      ${st.can&&x.body?`<div class="m"><button class="abtn" data-rw="${x.id}">👁️ قرأه ${x.n||0}</button></div>${openW&&openW.id===x.id?`<div class="who">${openW.html}</div>`:""}`:""}</div>`
    :`<div class="rd-it ${x.urgent?"u":""} ${!x.read&&!st.seen.has(x.id)?"new":""}"><div class="m"><span>${x.urgent?'<span class="chip w">عاجل</span> ':""}${escT(x.name||x.emp)}</span><span>${tm(x.at)}</span></div><p>${escT(x.body)}</p>
      ${st.can?`<div class="m"><button class="abtn" data-rw="${x.id}">👁️ قرأه ${x.n||0}</button></div>${openW&&openW.id===x.id?`<div class="who">${openW.html}</div>`:""}`:""}</div>`).join("")
    :'<div class="amsg">ما فيه تنبيهات.</div>'}</div>`;
  if(me.admin)h+=`<div class="adm-s"><h3>صلاحية الإرسال والتكلم <span class="chip">${st.perm.length}</span></h3><div class="amsg">أنت تقدر ترسل وتتكلم دايم. أضف رقم وظيفي لموظف تبيه يقدر بعد (مثل المناوب).</div>
    ${st.perm.map(e=>`<div class="req"><div><b>${escT((NAMES&&NAMES[e])||"")}</b> <span class="chip">${escT(e)}</span></div><button class="abtn n" data-rp="${escT(e)}">إزالة</button></div>`).join("")}
    <div style="display:flex;gap:8px"><input id="rdPE" inputmode="numeric" placeholder="الرقم الوظيفي"><button class="abtn a" id="rdPA">إضافة</button></div></div>`;
  const keep=$("rdTx")?{v:$("rdTx").value,u:$("rdUrg").checked}:null;
  $("rdB").innerHTML=h;if(keep&&$("rdTx")){$("rdTx").value=keep.v;$("rdUrg").checked=keep.u}stPaint();{const c=$("rdCv");if(c)requestAnimationFrame(()=>drawCv(c))}
  if(me.admin&&!NAMES)admCall("list").then(j=>{NAMES={};(j.emps||[]).forEach(e=>NAMES[e.emp]=e.name);if(st.open)render()}).catch(()=>{});
  const p=$("rdPtt");if(p){const go=e=>{e.preventDefault();try{p.setPointerCapture(e.pointerId)}catch(x){}txStart()},end=e=>{e.preventDefault();txStop()};
    p.addEventListener("pointerdown",go);p.addEventListener("pointerup",end);p.addEventListener("pointercancel",end);p.addEventListener("lostpointercapture",()=>{if(TX.on||TX.want)txStop()});p.oncontextmenu=e=>e.preventDefault()}}
pan.addEventListener("click",async ev=>{const t=ev.target.closest("button");if(!t)return;
  if(t.id==="rdBack"){closeRd();return}
  if(t.id==="rdMute"){muted=!muted;try{localStorage.setItem("ajf_rd_mute",muted?"1":"0")}catch(e){}render();airPaint();return}
  if(t.id==="rdSend"){const v=$("rdTx").value.trim();if(!v)return;if(t.dataset.c!=="1"){t.dataset.c="1";t.textContent="متأكد؟ اضغط مرة ثانية للإرسال للجميع";setTimeout(()=>{if(t.isConnected){t.dataset.c="";t.textContent="إرسال للجميع"}},4000);return}
    t.disabled=true;t.textContent="…";try{const j=await rpc("ajf_bc_send",{p_token:AUTH.tok,p_device:AUTH.dev,p_body:v,p_urgent:$("rdUrg").checked});
      if(j.s==="out"){authOut();return}if(j.s!=="ok")throw new Error(j.s);$("rdTx").value="";$("rdUrg").checked=false;rtSend("bc",{id:j.id});say("✅ انرسل التنبيه لكل الموظفين");await load(true);render()}
    catch(e){t.disabled=false;t.textContent="إرسال للجميع";say(e.message==="denied"?"ما عندك صلاحية الإرسال":"تعذّر الإرسال، تأكد من الإنترنت")}return}
  if(t.dataset.rw){const id=+t.dataset.rw;if(openW&&openW.id===id){openW=null;render();return}t.disabled=true;
    try{const j=await rpc("ajf_bc_reads",{p_token:AUTH.tok,p_device:AUTH.dev,p_id:id});if(j.s!=="ok")throw 0;
      openW={id,html:`<b>✅ قرأه (${j.read.length})</b><span>${j.read.map(r=>escT(r.name||r.emp)+" "+tm(r.at).split(" ").pop()).join("، ")||"—"}</span><b>⏳ ما قرأه (${j.unread.length})</b><span>${j.unread.map(r=>escT(r.name||r.emp)).join("، ")||"—"}</span>`};render()}
    catch(e){t.disabled=false}return}
  if(t.id==="rdPA"||t.dataset.rp){const add=t.id==="rdPA",e=add?$("rdPE").value.replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).trim().toUpperCase():t.dataset.rp;if(!e)return;
    const nx=[...new Set(st.perm.filter(x=>x!==e).concat(add?[e]:[]))];t.disabled=true;
    try{const j=await rpc("ajf_cfg_set",{p_token:AUTH.tok,p_device:AUTH.dev,p_k:"bcp",p_v:{l:nx}});if(j.s==="out"){authOut();return}if(j.s!=="ok")throw 0;st.perm=nx;render()}catch(x){t.disabled=false}}});

/* ===== التشغيل ===== */
fab.onclick=openRd;
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener("message",e=>{const u=e.data&&e.data.ajfOpen;if(u&&/[?&]bc\b/.test(u)&&AUTH.tok)openRd()});
let booted=false;(function boot(){if(AUTH.tok){if(!document.hidden)load(true).then(()=>{if(/[?&]bc\b/.test(location.search)&&!st.open&&!booted)openRd();booted=true})}else{fab.hidden=true;rtClose()}
  setTimeout(boot,AUTH.tok?60e3:3000)})();
})();
