/* ---------- 📻 الراديو: بث صوتي مباشر (اضغط وتكلم) + تنبيهات مكتوبة من المشرف ----------
   الصوت: قناة Supabase Realtime (Broadcast) باسم سري يجيبه الموظف المسجّل فقط من ajf_bc_get.
   الصوت مضغوط 8kHz μ-law على دفعات نص ثانية، ويوصل للي فاتحين التطبيق فقط (الآيفون يقطع الاتصال لما يتقفل الجوال).
   التنبيهات المكتوبة: تنحفظ في ajf_bc، تطلع فوراً للي فاتحين التطبيق، ووسيط ADS-B يرسلها Web Push لشاشة القفل خلال ~30 ثانية.
   الإرسال والتكلم للمشرف ومن يعطيه صلاحية (مفتاح bcp). يعتمد على: $, escT, AUTH, rpc, authOut, DEMO, swReady من index.html */
(function(){
if(typeof DEMO!=="undefined"&&DEMO)return;
const RT_URL=SB_URL.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+encodeURIComponent(SB_KEY)+"&vsn=1.0.0";
const RATE=8000,CHUNK=4000,MAX_SEC=90;
const st={can:false,room:null,items:[],perm:[],at:0,open:false,unread:0,seen:new Set()};
let muted=false;try{muted=localStorage.getItem("ajf_rd_mute")==="1"}catch(e){}
try{(JSON.parse(localStorage.getItem("ajf_bc_seen")||"[]")).forEach(i=>st.seen.add(i))}catch(e){}

/* ===== الشكل ===== */
const css=document.createElement("style");css.textContent=`
.rd-fab{position:fixed;z-index:30;right:16px;bottom:calc(82px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:26px;background:var(--panel);border:1px solid var(--line);color:var(--amber);display:grid;place-items:center;box-shadow:0 10px 28px rgba(0,0,0,.45)}
.rd-fab[hidden]{display:none}.rd-fab i{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--warn);color:#fff;font:700 11px/18px var(--mono);font-style:normal;padding:0 4px}
.rd-fab.live{border-color:var(--go);color:var(--go);animation:rdPulse 1.1s ease-in-out infinite}
@keyframes rdPulse{50%{box-shadow:0 0 0 8px color-mix(in oklab,var(--go) 25%,transparent),0 10px 28px rgba(0,0,0,.45)}}
.rd-air{position:fixed;z-index:72;left:12px;right:12px;bottom:calc(150px + env(safe-area-inset-bottom));padding:12px 14px;border-radius:16px;background:var(--panel);border:1.5px solid var(--go);display:flex;gap:12px;align-items:center;box-shadow:0 20px 50px rgba(0,0,0,.55)}
.rd-air[hidden]{display:none}.rd-air div{flex:1;min-width:0}.rd-air b{display:block;font-size:15px}.rd-air small{color:var(--muted);font-size:12.5px}
.rd-air .go{background:var(--go);color:#062417;border:0;border-radius:11px;padding:10px 14px;font-weight:700;font-size:14px}
.rd-wave{display:flex;gap:3px;align-items:center;height:26px}.rd-wave span{width:4px;border-radius:2px;background:var(--go);animation:rdW .9s ease-in-out infinite}
.rd-wave span:nth-child(2){animation-delay:.15s}.rd-wave span:nth-child(3){animation-delay:.3s}.rd-wave span:nth-child(4){animation-delay:.45s}
@keyframes rdW{0%,100%{height:6px}50%{height:24px}}
.rd-ptt{width:100%;min-height:150px;border-radius:24px;border:2px solid var(--line);background:var(--raise);color:var(--ink);font:700 18px var(--display);display:grid;place-items:center;gap:6px;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;transition:background .15s,border-color .15s}
.rd-ptt small{font:500 13px var(--body);color:var(--muted)}.rd-ptt.on{background:color-mix(in oklab,var(--warn) 30%,var(--raise));border-color:var(--warn)}
.rd-ptt:disabled{opacity:.5}
.rd-it{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:grid;gap:6px;background:var(--raise)}
.rd-it.u{border-color:var(--warn)}.rd-it.new{box-shadow:0 0 0 1.5px var(--amber) inset}
.rd-it p{margin:0;font-size:14.5px;white-space:pre-wrap;line-height:1.6}.rd-it .m{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.rd-it .who{font-size:12.5px;color:var(--muted);display:grid;gap:4px}
.rd-urg{display:flex;align-items:center;gap:8px;font-size:14px}.rd-urg input{width:20px;height:20px}
.rd-dot{display:inline-block;width:9px;height:9px;border-radius:5px;background:var(--muted);margin-inline-end:6px}.rd-dot.ok{background:var(--go)}
`;document.head.appendChild(css);
const ICO='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="12" height="14" rx="2"/><path d="M9 8V2M12 12v.01M9 16h6M9 19h6"/></svg>';
const fab=document.createElement("button");fab.className="rd-fab";fab.id="rdFab";fab.hidden=true;fab.setAttribute("aria-label","الراديو والتنبيهات");fab.innerHTML=ICO+'<i id="rdN" hidden></i>';document.body.appendChild(fab);
const pan=document.createElement("div");pan.className="dlyc";pan.id="rd";pan.hidden=true;pan.setAttribute("role","dialog");pan.setAttribute("aria-modal","true");pan.style.gridTemplateRows="auto 1fr";
pan.innerHTML=`<div class="trk-top"><button class="trk-back" id="rdBack" aria-label="رجوع"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>
<div><b>📻 الراديو والتنبيهات</b><span id="rdS"></span></div></div><div class="adm-b" id="rdB"></div>`;document.body.appendChild(pan);
const air=document.createElement("div");air.className="rd-air";air.id="rdAir";air.hidden=true;air.setAttribute("role","status");document.body.appendChild(air);

/* ===== الصوت: تشغيل ===== */
let ctx=null;
function aSess(t){try{if(navigator.audioSession)navigator.audioSession.type=t}catch(e){}}
function unlock(){try{if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=new A();aSess("playback")}
  if(ctx.state!=="running")ctx.resume();const b=ctx.createBuffer(1,1,ctx.sampleRate),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}}
const audioOK=()=>ctx&&ctx.state==="running";
["pointerdown","touchend","keydown"].forEach(ev=>document.addEventListener(ev,()=>{if(!audioOK())unlock();if(audioOK()&&RX.sid)airPaint()},{capture:true,passive:true}));
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ctx&&ctx.state!=="running")ctx.resume().catch(()=>{})});
function beep(f1,f2,dur,vol){if(!audioOK()||muted)return;try{const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(f1,t);o.frequency.linearRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.18,t+.02);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}}
/* μ-law (G.711) */
function muEnc(x){let s=Math.max(-1,Math.min(1,x))*32767|0;const sign=s<0?0x80:0;if(sign)s=-s;if(s>32635)s=32635;s+=0x84;let e=7;for(let m=0x4000;(s&m)===0&&e>0;e--,m>>=1);return ~(sign|(e<<4)|((s>>(e+3))&0x0F))&0xFF}
const MUD=new Float32Array(256);for(let i=0;i<256;i++){const u=~i&0xFF,e=(u>>4)&7;let s=(((u&0x0F)<<3)+0x84)<<e;s-=0x84;MUD[i]=((u&0x80)?-s:s)/32768}
const b64e=u=>{let s="";for(let i=0;i<u.length;i+=0x2000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x2000));return btoa(s)};
const b64d=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const RX={sid:null,name:"",next:0,last:0,t:null};
function rxStart(p){RX.sid=p.sid;RX.name=p.name||"";RX.next=0;RX.last=Date.now();fab.classList.add("live");if(!muted)beep(880,1320,.12);airPaint();rxWatch();
  try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}}
function rxChunk(p){if(!RX.sid||p.sid!==RX.sid){if(!RX.sid)rxStart(p);else return}RX.last=Date.now();if(muted||!audioOK())return;
  try{const u=b64d(p.d),sr=ctx.sampleRate,n=Math.round(u.length*sr/RATE),buf=ctx.createBuffer(1,n,sr),o=buf.getChannelData(0),k=RATE/sr;
    for(let i=0;i<n;i++){const x=i*k,j=x|0,f=x-j,a=MUD[u[j]],b=j+1<u.length?MUD[u[j+1]]:a;o[i]=(a+(b-a)*f)*1.6}
    const s=ctx.createBufferSource();s.buffer=buf;s.connect(ctx.destination);const now=ctx.currentTime;
    if(RX.next<now+.05)RX.next=now+.35;/* أول دفعة أو بعد تقطّع: هامش صغير عشان ما يتقطع الصوت */
    s.start(RX.next);RX.next+=buf.duration}catch(e){}}
function rxEnd(sid){if(sid&&sid!==RX.sid)return;const wait=audioOK()?Math.max(0,(RX.next-ctx.currentTime)*1000):0;const was=RX.sid;
  setTimeout(()=>{if(RX.sid!==was)return;RX.sid=null;fab.classList.remove("live");air.hidden=true;if(!muted)beep(1320,700,.14,.14)},wait+50)}
function rxWatch(){clearTimeout(RX.t);RX.t=setTimeout(()=>{if(!RX.sid)return;if(Date.now()-RX.last>4000)rxEnd(RX.sid);else rxWatch()},1500)}
function airPaint(){if(!RX.sid||TX.on){air.hidden=true;return}
  const need=!muted&&!audioOK();
  air.innerHTML=`<div class="rd-wave"><span></span><span></span><span></span><span></span></div><div><b>📻 ${escT(RX.name||"المشرف")} يتكلم الحين</b><small>${muted?"الراديو مكتوم على هذا الجوال":need?"اضغط «استماع» عشان يطلع الصوت":"بث مباشر"}</small></div>${need?'<button class="go" id="rdHear">🔊 استماع</button>':""}`;
  air.hidden=false;const h=$("rdHear");if(h)h.onclick=()=>{unlock();setTimeout(airPaint,200)}}

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
    if(ev==="vs")rxStart(p);else if(ev==="va")rxChunk(p);else if(ev==="ve")rxEnd(p.sid);else if(ev==="bc")load(true)};
  ws.onclose=()=>{clearInterval(RT.hb);if(RT.ws===ws){RT.ws=null;RT.ok=false;RT.pres={};stPaint();if(TX.on)txStop();
    if(!document.hidden&&AUTH.tok){RT.retry=Math.min(RT.retry+1,6);RT.rt=setTimeout(rtOpen,1000*2**RT.retry/2)}}};
  ws.onerror=()=>{}}
function rtClose(){clearTimeout(RT.rt);clearInterval(RT.hb);const w=RT.ws;RT.ws=null;RT.ok=false;if(w)try{w.close()}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.hidden){if(!TX.on)rtClose()}else if(AUTH.tok){load(true).then(rtOpen)}});
addEventListener("online",()=>{if(AUTH.tok)rtOpen()});
const listeners=()=>Object.keys(RT.pres).filter(k=>k!==((AUTH.me&&AUTH.me.emp)||AUTH.dev)).length;

/* ===== الصوت: إرسال (اضغط مطوّل وتكلم) ===== */
const TX={on:false,want:false,stream:null,src:null,proc:null,sid:null,q:0,buf:null,n:0,acc:0,cnt:0,pos:0,t0:0,id:null,tm:null};
async function txStart(){if(TX.on||TX.want)return;if(!RT.ok){toast("الراديو غير متصل، انتظر ثواني وجرّب");return}
  unlock();if(!ctx||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast("هذا الجوال ما يدعم المايك من التطبيق");return}
  TX.want=true;pttPaint();
  try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
    if(!TX.want){s.getTracks().forEach(t=>t.stop());return}
    aSess("play-and-record");if(ctx.state!=="running")await ctx.resume();
    TX.stream=s;TX.src=ctx.createMediaStreamSource(s);TX.proc=ctx.createScriptProcessor(2048,1,1);
    TX.buf=new Uint8Array(CHUNK);TX.n=0;TX.acc=0;TX.cnt=0;TX.pos=0;TX.q=0;TX.sid=Math.random().toString(36).slice(2,10);
    const ratio=ctx.sampleRate/RATE;
    TX.proc.onaudioprocess=e=>{if(!TX.on)return;const x=e.inputBuffer.getChannelData(0);
      for(let i=0;i<x.length;i++){TX.acc+=x[i];TX.cnt++;TX.pos+=1;if(TX.pos>=ratio){TX.pos-=ratio;TX.buf[TX.n++]=muEnc(TX.acc/TX.cnt);TX.acc=0;TX.cnt=0;if(TX.n>=CHUNK)txFlush()}}};
    TX.src.connect(TX.proc);TX.proc.connect(ctx.destination);
    TX.on=true;TX.t0=Date.now();rtSend("vs",{sid:TX.sid,emp:AUTH.me&&AUTH.me.emp,name:(AUTH.me&&AUTH.me.name)||""});beep(1320,880,.08,.12);
    try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
    TX.id=null;rpc("ajf_bc_talk",{p_token:AUTH.tok,p_device:AUTH.dev,p_id:null,p_secs:null}).then(j=>{if(j&&j.s==="ok")TX.id=j.id}).catch(()=>{});
    clearInterval(TX.tm);TX.tm=setInterval(()=>{const s=(Date.now()-TX.t0)/1000;pttPaint();if(s>=MAX_SEC)txStop()},250);pttPaint()}
  catch(e){TX.want=false;toast(e&&e.name==="NotAllowedError"?"المايك مرفوض. اسمح للتطبيق باستخدام الميكروفون من إعدادات الجوال (Safari ← الميكروفون).":"تعذّر تشغيل المايك");pttPaint()}}
function txFlush(){if(!TX.n)return;rtSend("va",{sid:TX.sid,q:TX.q++,d:b64e(TX.buf.subarray(0,TX.n))});TX.buf=new Uint8Array(CHUNK);TX.n=0}
function txStop(){TX.want=false;if(!TX.on)return;TX.on=false;clearInterval(TX.tm);
  try{txFlush()}catch(e){}rtSend("ve",{sid:TX.sid});
  try{TX.src.disconnect();TX.proc.disconnect();TX.proc.onaudioprocess=null}catch(e){}
  if(TX.stream)TX.stream.getTracks().forEach(t=>t.stop());TX.stream=null;aSess("playback");
  const secs=Math.round((Date.now()-TX.t0)/1000);const id0=TX.id;
  const fin=id=>rpc("ajf_bc_talk",{p_token:AUTH.tok,p_device:AUTH.dev,p_id:id,p_secs:secs}).catch(()=>{});
  if(id0)fin(id0);else setTimeout(()=>{if(TX.id)fin(TX.id)},1500);
  try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}pttPaint();setTimeout(()=>load(true),1800)}
addEventListener("pagehide",()=>{if(TX.on)txStop()});
function pttPaint(){const b=$("rdPtt");if(!b)return;b.classList.toggle("on",TX.on);
  b.innerHTML=TX.on?`<span>🔴 على الهواء ${fmtS((Date.now()-TX.t0)/1000)}</span><small>شيل إصبعك لما تخلص</small>`
    :TX.want?`<span>…</span><small>يجهّز المايك</small>`:`<span>🎙️ اضغط مطوّل وتكلم</span><small>${RT.ok?(listeners()?"يسمعك الحين "+listeners()+" موظف فاتح التطبيق":"ما فيه أحد فاتح التطبيق الحين"):"جاري الاتصال…"}</small>`;
  b.disabled=!RT.ok&&!TX.on}
const fmtS=s=>{s=Math.max(0,s|0);return (s/60|0)+":"+String(s%60).padStart(2,"0")};

/* ===== التنبيهات المكتوبة ===== */
const tm=t=>{try{return new Date(t).toLocaleString("ar-SA-u-nu-latn",{timeZone:"Asia/Riyadh",weekday:"short",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
let loading=null;
async function load(force){if(!AUTH.tok)return;if(loading)return loading;if(!force&&Date.now()-st.at<20e3)return;
  loading=(async()=>{try{const j=await rpc("ajf_bc_get",{p_token:AUTH.tok,p_device:AUTH.dev});
      if(j.s==="out"){authOut();return}if(j.s!=="ok")return;
      const fresh=!st.room;st.can=!!j.can;st.room=j.room;st.perm=j.perm||[];st.at=Date.now();
      const prev=new Set(st.items.map(x=>x.id));st.items=j.items||[];
      const un=st.items.filter(x=>x.kind==="text"&&!x.read&&!st.seen.has(x.id));st.unread=un.length;badge();
      /* تنبيه جديد وصل والتطبيق مفتوح: يطلع على الشاشة */
      const nw=un.filter(x=>fresh?Date.now()-new Date(x.at).getTime()<6*3600e3:!prev.has(x.id));if(nw.length&&!st.open)banner(nw[0],un.length);
      if(st.open&&!TX.on&&!TX.want)render();fab.hidden=false;rtOpen()}catch(e){}finally{loading=null}})();return loading}
function badge(){const i=$("rdN");if(!i)return;i.hidden=!st.unread;i.textContent=st.unread}
function banner(x,n){const old=$("bcBan");if(old)old.remove();
  const d=document.createElement("div");d.className="jr-ban";d.id="bcBan";d.setAttribute("role","alert");if(x.urgent)d.style.borderColor="var(--warn)";
  d.innerHTML=`<i>${x.urgent?"🚨":"📢"}</i><div><b>${x.urgent?"عاجل · ":""}${escT(x.name||"المشرف")}</b><small style="white-space:pre-wrap;display:block;color:var(--ink);font-size:14px;margin-top:2px">${escT(x.body.length>220?x.body.slice(0,220)+"…":x.body)}</small>${n>1?`<small>+${n-1} تنبيهات ثانية</small>`:""}</div><button class="go">تم ✓</button>`;
  d.querySelector(".go").onclick=()=>{d.remove();if(n>1)openRd();else seen([x.id])};
  document.body.appendChild(d);if(!muted){beep(988,988,.12,.2);setTimeout(()=>beep(1319,1319,.18,.2),160)}
  try{navigator.vibrate&&navigator.vibrate(x.urgent?[300,120,300,120,300]:[150,80,150])}catch(e){}}
function seen(ids){ids=ids.filter(i=>!st.seen.has(i));if(!ids.length)return;ids.forEach(i=>st.seen.add(i));
  try{localStorage.setItem("ajf_bc_seen",JSON.stringify([...st.seen].slice(-200)))}catch(e){}
  st.items.forEach(x=>{if(ids.includes(x.id))x.read=true});st.unread=st.items.filter(x=>x.kind==="text"&&!x.read&&!st.seen.has(x.id)).length;badge();
  rpc("ajf_bc_seen",{p_token:AUTH.tok,p_device:AUTH.dev,p_ids:ids}).catch(()=>{})}
function say(t){st.msg=t;const m=$("rdMsg");if(m)m.textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>{st.msg="";const n=$("rdMsg");if(n)n.textContent=""},6000)}
function toast(t){if(st.open){say(t);return}const d=document.createElement("div");d.className="pu-ban";d.innerHTML=`<p style="margin:0">${escT(t)}</p>`;document.body.appendChild(d);setTimeout(()=>d.remove(),4000)}
function stPaint(){const s=$("rdS");if(s)s.innerHTML=`<span class="rd-dot ${RT.ok?"ok":""}"></span>${RT.ok?"متصل · "+(listeners()+1)+" فاتحين التطبيق الحين":"غير متصل"}`;pttPaint()}

/* ===== الصفحة ===== */
let NAMES=null,openW=null;
async function openRd(){st.open=true;pan.hidden=false;const b=$("bcBan");if(b)b.remove();unlock();render();await load(true);rtOpen();render();
  const ids=st.items.filter(x=>x.kind==="text"&&!x.read).map(x=>x.id);setTimeout(()=>{if(st.open)seen(ids)},1200)}
function closeRd(){st.open=false;pan.hidden=true;if(TX.on)txStop()}
function render(){const me=AUTH.me||{};let h="";
  h+=`<div class="adm-s"><h3>📻 البث المباشر</h3>${st.can?`<button class="rd-ptt" id="rdPtt"></button><div class="amsg">اضغط على الزر واستمر ضاغط وأنت تتكلم، وشيل إصبعك لما تخلص (حد أقصى ${MAX_SEC} ثانية). يسمعك كل موظف فاتح التطبيق الحين.</div>`
    :`<div class="amsg">لما يتكلم المشرف يطلع لك شريط أخضر ويطلع الصوت مباشرة، بشرط يكون التطبيق مفتوح قدامك. لو الجوال مقفل ما يوصلك الصوت، لكن التنبيهات المكتوبة توصلك.</div>`}
    <div class="amsg" id="rdMsg">${escT(st.msg||"")}</div>
    <button class="abtn ${muted?"a":""}" id="rdMute">${muted?"🔇 الراديو مكتوم على هذا الجوال · اضغط للتشغيل":"🔊 الصوت شغّال · كتم الراديو"}</button>
    <div class="amsg">مساندة فقط: التعليمات العاجلة والسلامة تبقى على الريدو الرسمي.</div></div>`;
  if(st.can)h+=`<div class="adm-s"><h3>📢 تنبيه مكتوب لكل الموظفين</h3><textarea id="rdTx" maxlength="600" placeholder="مثال: SV1382 تأخير 30 دقيقة، المغادرة 19:45"></textarea>
    <label class="rd-urg"><input type="checkbox" id="rdUrg"> 🚨 عاجل (يبقى على الشاشة لين يفتحه الموظف)</label><button class="abtn a" id="rdSend">إرسال للجميع</button>
    <div class="amsg">يطلع فوراً للي فاتحين التطبيق، ويوصل على شاشة القفل للي مفعّلين التنبيهات خلال نص دقيقة تقريباً.</div></div>`;
  const its=st.items;
  h+=`<div class="adm-s"><h3>آخر التنبيهات <span class="chip">48 ساعة</span></h3>${its.length?its.map(x=>x.kind==="voice"
    ?`<div class="rd-it"><div class="m"><span>📻 ${escT(x.name||x.emp)} تكلم على الراديو${x.secs?" · "+fmtS(x.secs):""}</span><span>${tm(x.at)}</span></div></div>`
    :`<div class="rd-it ${x.urgent?"u":""} ${!x.read&&!st.seen.has(x.id)?"new":""}"><div class="m"><span>${x.urgent?'<span class="chip w">عاجل</span> ':""}${escT(x.name||x.emp)}</span><span>${tm(x.at)}</span></div><p>${escT(x.body)}</p>
      ${st.can?`<div class="m"><button class="abtn" data-rw="${x.id}">👁️ قرأه ${x.n||0}</button></div>${openW&&openW.id===x.id?`<div class="who">${openW.html}</div>`:""}`:""}</div>`).join("")
    :'<div class="amsg">ما فيه تنبيهات.</div>'}</div>`;
  if(me.admin)h+=`<div class="adm-s"><h3>صلاحية الإرسال والتكلم <span class="chip">${st.perm.length}</span></h3><div class="amsg">أنت تقدر ترسل وتتكلم دايم. أضف رقم وظيفي لموظف تبيه يقدر بعد (مثل المناوب).</div>
    ${st.perm.map(e=>`<div class="req"><div><b>${escT((NAMES&&NAMES[e])||"")}</b> <span class="chip">${escT(e)}</span></div><button class="abtn n" data-rp="${escT(e)}">إزالة</button></div>`).join("")}
    <div style="display:flex;gap:8px"><input id="rdPE" inputmode="numeric" placeholder="الرقم الوظيفي"><button class="abtn a" id="rdPA">إضافة</button></div></div>`;
  const keep=$("rdTx")?{v:$("rdTx").value,u:$("rdUrg").checked}:null;
  $("rdB").innerHTML=h;if(keep&&$("rdTx")){$("rdTx").value=keep.v;$("rdUrg").checked=keep.u}stPaint();
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
