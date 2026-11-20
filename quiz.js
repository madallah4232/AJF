/* ---------- تحدي التشغيل: أسئلة يومية من التعاميم ودليل العمليات (السعودية وSGS) ----------
   كل الحساب في Supabase (supabase/quiz.sql): السؤال يوصل بدون الجواب، والوقت يُحسب في الخادم.
   الخروج من التطبيق أثناء السؤال = خطأ، والرجوع لنفس السؤال ممنوع. المشرف يولّد الأسئلة بـ Gemini ويعتمدها قبل نشرها. */
(function(){
const FN=SB_URL+"/functions/v1/ajf-files";
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const LV=["","سهل","متوسط","صعب"],LT=["أ","ب","ج","د"];
/* اختصاص السؤال: يحدد مين يطلع له (supabase/quiz_roles.sql) */
const TPS=[["","🌐 عام للكل"],["chk","🧳 كاونتر"],["gate","🚪 بوابة"],["ramp","🛫 ساحة"],["lc","📋 لود كنترول"]];
const TPN=t=>(TPS.find(x=>x[0]===(t||""))||TPS[0])[1];
const TPK={"الكاونتر وإنهاء إجراءات الركاب":"chk","بوابة التصعيد":"gate","الساحة (Ramp)":"ramp","اللود كنترول (Load Control)":"lc"};
const CSS=`
.qz{display:grid;gap:12px;padding-bottom:70px}
.qz-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px}
.qz-st h3{margin:0 0 2px;font:700 18px var(--display)}.qz-st small{color:var(--muted);font-size:12.5px}
.qz-st .row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.qz-st .cd{font:600 13px var(--body);color:var(--amber);white-space:nowrap}
.qz-dots{display:flex;gap:6px;margin:14px 0 4px;direction:rtl}
.qz-dots i{flex:1;height:8px;border-radius:5px;background:var(--raise);border:1px solid var(--line)}
.qz-dots i.ok{background:var(--go);border-color:var(--go)}.qz-dots i.no{background:var(--warn);border-color:var(--warn)}
.qz-sum{display:flex;gap:14px;color:var(--muted);font-size:12.5px;margin-top:6px}.qz-sum b{color:var(--ink);font-family:var(--mono)}
.qz-go{width:100%;height:52px;margin-top:12px;border-radius:16px;border:0;background:#d9b45a;color:#1a1205;font:700 16px var(--display)}
.qz-go:active{transform:scale(.97)}.qz-go[disabled]{background:var(--raise);color:var(--muted)}
.qz-rules{font-size:13px;color:#dccab0;line-height:1.8}.qz-rules summary{font:700 14px var(--display);color:var(--ink);list-style:none;cursor:pointer}
.qz-rules ul{margin:8px 0 0;padding-inline-start:18px}
.qz-tabs{display:flex;gap:6px;margin-bottom:10px}.qz-tabs button{flex:1;height:36px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--muted);font:600 13px var(--body)}
.qz-tabs button.on{background:#d9b45a;color:#1a1205;border-color:#d9b45a}
.qz-lb{display:grid;gap:6px}
.qz-lb .r{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;background:var(--raise)}
.qz-lb .r.me{outline:2px solid #d9b45a}.qz-lb .k{font:700 15px var(--mono);text-align:center}
.qz-lb .nm{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qz-lb .nm small{display:block;color:var(--muted);font-weight:400;font-size:11.5px}
.qz-lb .sc{font:700 15px var(--mono);color:var(--go);direction:ltr}
.qz-adm{width:100%;height:44px;border-radius:14px;border:1px dashed var(--line);background:transparent;color:var(--ink);font:600 14px var(--body)}
.qzo{position:fixed;inset:0;z-index:2000;background:var(--night);overflow:auto;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))}
.qzo-in{max-width:560px;margin:0 auto;display:grid;gap:14px}
.qzo-top{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font:600 13px var(--body)}
.qzo-top .lv{padding:3px 10px;border-radius:9px;background:var(--raise);border:1px solid var(--line)}
.qzo-ring{position:relative;width:96px;height:96px;margin:0 auto}.qzo-ring svg{width:96px;height:96px;transform:rotate(-90deg)}
.qzo-ring circle{fill:none;stroke-width:9}.qzo-ring .bg{stroke:var(--raise)}
.qzo-ring .fg{stroke:#d9b45a;stroke-linecap:round;stroke-dasharray:289;animation:qzr linear forwards}
.qzo-ring.low .fg{stroke:var(--warn)}.qzo-ring b{position:absolute;inset:0;display:grid;place-items:center;font:700 28px var(--mono)}
.qzo-ring.low b{color:var(--warn)}.qzo-ring.stop .fg{animation-play-state:paused}
@keyframes qzr{to{stroke-dashoffset:289}}
.qzo-q{font:700 18px/1.7 var(--display);text-align:start}
.qzo-o{display:grid;gap:10px}
.qzo-o button{display:grid;grid-template-columns:34px 1fr;align-items:center;gap:10px;min-height:56px;padding:10px 12px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 15px/1.55 var(--body);text-align:start}
.qzo-o button i{font-style:normal;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--raise);font:700 15px var(--display)}
.qzo-o button:active{transform:scale(.98)}.qzo-o button[disabled]{opacity:1}
.qzo-o button.pk{border-color:#d9b45a}.qzo-o button.ok{background:color-mix(in oklab,var(--go) 22%,var(--panel));border-color:var(--go)}
.qzo-o button.ok i{background:var(--go);color:#110b07}.qzo-o button.no{background:color-mix(in oklab,var(--warn) 20%,var(--panel));border-color:var(--warn)}.qzo-o button.no i{background:var(--warn);color:#110b07}
.qzo-r{border-radius:16px;padding:12px 14px;background:var(--panel);border:1px solid var(--line);font-size:14px;line-height:1.75}
.qzo-r b.h{display:block;font:700 17px var(--display);margin-bottom:4px}.qzo-r.ok b.h{color:var(--go)}.qzo-r.no b.h{color:var(--warn)}
.qzo-r small{display:block;color:var(--muted);margin-top:6px;font-size:12px}
.qzo-act{display:flex;gap:8px}.qzo-act button{flex:1;height:50px;border-radius:15px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:700 15px var(--display)}
.qzo-act button.p{background:#d9b45a;color:#1a1205;border-color:#d9b45a}
.qzo-intro{display:grid;gap:12px;text-align:center;padding-top:8vh}.qzo-intro i{font-style:normal;font-size:46px}.qzo-intro h2{margin:0;font:700 22px var(--display)}
.qzo-intro ul{text-align:start;margin:0 auto;padding-inline-start:20px;color:#dccab0;line-height:2;font-size:14.5px;max-width:420px}
.qa-c{display:grid;gap:8px}.qa-c .q{font:700 15px/1.65 var(--display)}
.qa-c ol{margin:0;padding:0;list-style:none;display:grid;gap:4px}.qa-c li{padding:6px 10px;border-radius:10px;background:var(--raise);font-size:13.5px}
.qa-c li.ok{background:color-mix(in oklab,var(--go) 25%,var(--raise));font-weight:700}.qa-c li.ok::before{content:"✓ "}
.qa-c .m{color:var(--muted);font-size:12px;line-height:1.6}.qa-c .w{font-size:12.5px;color:#dccab0;line-height:1.7}
.qa-b{display:flex;gap:6px;flex-wrap:wrap}.qa-b button{flex:1;min-width:70px;height:38px;border-radius:11px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:600 13px var(--body)}
.qa-b button.g{background:var(--go);color:#110b07;border-color:var(--go)}.qa-b button.x{color:var(--warn)}
.qa-f{display:grid;gap:8px}.qa-f textarea,.qa-f input,.qa-f select{width:100%;border-radius:11px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:14px/1.6 var(--body);padding:8px 10px;color-scheme:dark}
.qa-f label{display:flex;gap:8px;align-items:center;font-size:13px}.qa-f label input[type=radio]{width:auto}
.qa-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.qa-st div{background:var(--raise);border-radius:12px;padding:8px 4px}.qa-st b{display:block;font:700 18px var(--mono)}.qa-st span{font-size:11.5px;color:var(--muted)}
.qa-m{font-size:12.5px;color:var(--muted);line-height:1.7}
.qa-tp{background:var(--raise);color:var(--ink);border:1px solid var(--line);color-scheme:dark;width:auto!important;display:inline-block;padding:2px 6px!important;font-size:12px!important;border-radius:8px!important;margin-inline-end:4px}
.qe-ans{font:700 14px var(--body);color:var(--go);padding:4px 2px}
.qz-gl{background:var(--raise);border:1px dashed var(--line);border-radius:12px;padding:8px 10px;display:grid;gap:4px;font-size:13px;line-height:1.6;text-align:start;margin-top:6px}
.qz-gl>b{font:700 13px var(--display);color:#d9b45a}.qz-gl div{display:flex;gap:8px}.qz-gl div span{font:700 12.5px var(--mono);color:var(--ink);min-width:52px}
.qz-du{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;width:100%;text-align:start;color:var(--ink);font:inherit;cursor:pointer}
.qz-du>span{font-size:28px}.qz-du b{display:block;font:700 16px var(--display)}.qz-du small{color:var(--muted);font-size:12.5px}.qz-du em{font-style:normal;color:var(--muted);font-size:20px}.qz-du:active{transform:scale(.98)}
.qz-lb .r.qe{cursor:pointer}.qz-lb .r.qe:active{transform:scale(.98)}
.qe-q p{margin:6px 0 10px;font-size:14.5px;line-height:1.7}.qe-h{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}
.qe-o{display:grid;gap:6px;margin-bottom:6px}.qe-o div{display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:11px;background:var(--raise);border:1px solid var(--line);font-size:13.5px}
.qe-o div span{flex:1}.qe-o div i{font-style:normal;font-size:11.5px;white-space:nowrap}
.qe-o div.r{border-color:var(--go);background:rgba(120,190,110,.14)}.qe-o div.r i{color:var(--go)}
.qe-o div.w{border-color:var(--warn);background:rgba(230,110,80,.14)}.qe-o div.w i{color:var(--warn)}
`;
function css(){if(document.getElementById("qzCss"))return;const s=document.createElement("style");s.id="qzCss";s.textContent=CSS;document.head.appendChild(s)}

async function call(fn,args){const j=await rpc(fn,Object.assign({p_token:AUTH.tok||"",p_device:AUTH.dev},args||{}));if(j&&j.s==="out"){authOut();throw new Error("out")}return j}
async function edge(body){const r=await fetch(FN,{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},body:JSON.stringify(Object.assign({token:AUTH.tok||"",device:AUTH.dev},body))});
  if(!r.ok)throw new Error("fn "+r.status);const j=await r.json();if(j.s==="out"){authOut();throw new Error("out")}return j}

let root=null,ST=null,BT="round",BD=null,VIEW="home",tick=null;
const left=t=>{const m=Math.max(0,Math.round((new Date(t)-Date.now())/60000));return m>=60?Math.floor(m/60)+"س "+m%60+"د":m+"د"};
/* ---------- 📖 شرح الرموز والاختصارات بالعربي (يطلع تحت السؤال إذا فيه رمز منها) ---------- */
const GL={PAX:"الركاب",ADT:"راكب بالغ",CHD:"طفل (من سنتين لأقل من 12 سنة)",INF:"رضيع (أقل من سنتين، بدون مقعد)",
UMNR:"قاصر غير مصحوب (طفل مسافر بدون مرافق)",UM:"قاصر غير مصحوب",PRM:"راكب من ذوي الإعاقة أو محدودي الحركة",
WCHR:"كرسي متحرك: يمشي ويطلع الدرج، بس يحتاج كرسي للمسافات الطويلة",WCHS:"كرسي متحرك: يمشي داخل الطائرة بس ما يقدر يطلع الدرج",
WCHC:"كرسي متحرك: ما يقدر يمشي أبداً ويُحمل لمقعده",MEDA:"راكب بحالة طبية تحتاج موافقة طبية قبل السفر",STCR:"راكب على نقالة (سرير طبي)",
BLND:"راكب كفيف",DEAF:"راكب أصم",DPNA:"راكب بإعاقة ذهنية أو نمائية يحتاج مساعدة",VIP:"شخصية مهمة جداً",CIP:"شخصية تجارية مهمة",
DEPA:"مُرحَّل مع مرافق أمني",DEPU:"مُرحَّل بدون مرافق",INAD:"راكب مرفوض دخوله للبلد ويُعاد",
PNR:"سجل حجز الراكب (رقم الحجز)",ETKT:"تذكرة إلكترونية",SSR:"طلب خدمة خاصة في الحجز",OSI:"معلومة إضافية في الحجز",
DCS:"نظام تسجيل المغادرة (إجراءات السفر)",APIS:"بيانات الركاب المسبقة اللي تُرسل لسلطات بلد الوصول",
TIMATIC:"قاعدة بيانات أياتا لمتطلبات الجوازات والتأشيرات",MRZ:"السطرين المقروءة آلياً أسفل الجواز",
NOSHO:"راكب محجوز وما حضر",GOSHO:"راكب حضر بدون حجز مؤكد",DBC:"تعويض الراكب الممنوع من الصعود",MCT:"أقل وقت مسموح للترانزيت",
FIM:"نموذج نقل الراكب لرحلة شركة ثانية",EXST:"مقعد إضافي للراكب",CBBG:"أمتعة مقصورة محجوز لها مقعد",
RUSH:"عفش متأخر يُرسل على أول رحلة متاحة",AHL:"بلاغ عفش مفقود",PIR:"تقرير مخالفة العفش (مفقود أو تالف)",
STD:"موعد الإقلاع المجدول",STA:"موعد الوصول المجدول",ETD:"موعد الإقلاع المتوقع",ETA:"موعد الوصول المتوقع",
ATD:"وقت الإقلاع الفعلي",ATA:"وقت الوصول الفعلي",EOBT:"الوقت المتوقع لتحرك الطائرة من موقفها",TOBT:"الوقت المستهدف لتحرك الطائرة من موقفها",
MVT:"رسالة حركة الطائرة (إقلاع/وصول/تأخير)",LDM:"رسالة توزيع الحمولة",CPM:"رسالة توزيع الحاويات",PTM:"رسالة ركاب الترانزيت",DLY:"تأخير",
LMC:"تعديلات آخر لحظة على اللودشيت",MZFW:"أقصى وزن مسموح للطائرة بدون وقود",MTOW:"أقصى وزن مسموح للإقلاع",MLW:"أقصى وزن مسموح للهبوط",MLAW:"أقصى وزن مسموح للهبوط",
ZFW:"وزن الطائرة بدون وقود",TOW:"وزن الإقلاع",LAW:"وزن الهبوط",DOW:"الوزن التشغيلي الجاف (الطائرة بطاقمها وتجهيزاتها بدون حمولة ولا وقود)",
DOI:"مؤشر الاتزان للوزن التشغيلي الجاف",TOF:"وقود الإقلاع",TIF:"وقود الرحلة (المستهلك من الإقلاع للهبوط)",MAC:"متوسط وتر الجناح، يُستخدم لتحديد مركز الثقل",
CG:"مركز الثقل",LIR:"تعليمات التحميل لعمال الساحة",NOTOC:"إشعار للكابتن بالبضائع الخطرة والخاصة على الطائرة",
DGR:"لوائح البضائع الخطرة",DG:"بضائع خطرة",AVI:"حيوانات حية",HUM:"رفات بشرية",PER:"بضائع قابلة للتلف",
ULD:"وحدة تحميل (حاوية أو منصة)",AKE:"حاوية عفش صغيرة (LD3)",BULK:"العنبر السائب (تحميل بدون حاويات)",
GSE:"معدات الخدمة الأرضية",GPU:"وحدة كهرباء أرضية للطائرة",FOD:"أجسام غريبة على الساحة تضر بالطائرة",
LC:"مراقبة الحمولة (لود كنترول)",TRC:"منسق الدوران (مسؤول تجهيز الطائرة بين الوصول والإقلاع)",GACA:"الهيئة العامة للطيران المدني",IATA:"الاتحاد الدولي للنقل الجوي (أياتا)",
ICAO:"منظمة الطيران المدني الدولي (إيكاو)",AHM:"دليل المناولة الأرضية من أياتا",SOP:"إجراءات التشغيل القياسية",
PIC:"قائد الطائرة (الكابتن)",NOTAM:"إشعار رسمي للطيارين",METAR:"تقرير الطقس الحالي في المطار",TAF:"توقعات الطقس للمطار",
AOG:"طائرة متوقفة بسبب عطل",MEL:"قائمة الأعطال المسموح الطيران بها",SGS:"الشركة السعودية للخدمات الأرضية"};
/* كلمات وعبارات إنجليزية شائعة في الأسئلة (بدون حساسية للأحرف) */
const GLW={"cute":"نظام أجهزة الكاونتر المشتركة بين شركات الطيران","sita":"شركة أنظمة الاتصالات وتقنية المعلومات للطيران","amadeus":"نظام الحجز وإجراءات السفر",
"backup procedure":"الإجراء البديل وقت تعطل النظام","backup":"البديل الاحتياطي","primary link failure":"انقطاع الاتصال الأساسي","failure":"عطل أو انقطاع","procedure":"إجراء",
"carts and dollies":"عربات نقل العفش والحاويات","carts":"عربات نقل العفش","dollies":"عربات نقل الحاويات","check-in":"إنهاء إجراءات السفر","boarding pass":"بطاقة صعود الطائرة",
"boarding":"صعود الركاب للطائرة","gate closure":"إغلاق البوابة","final call":"النداء الأخير","gate":"بوابة الصعود","ramp":"ساحة الطائرات","apron":"ساحة وقوف الطائرات",
"pushback":"دفع الطائرة للخلف من موقفها","push back":"دفع الطائرة للخلف من موقفها","offload":"تنزيل (راكب أو عفش) من الرحلة","headcount":"عدّ الركاب داخل الطائرة",
"load sheet":"ورقة الوزن والاتزان للرحلة","loadsheet":"ورقة الوزن والاتزان للرحلة","load control":"مراقبة الحمولة","weight and balance":"الوزن والاتزان","trim":"اتزان الطائرة",
"belt loader":"سير تحميل العفش","high loader":"رافعة تحميل الحاويات","chocks":"مصدات العجلات","chock":"مصد العجلة","cones":"أقماع السلامة حول الطائرة",
"marshaller":"موجّه الطائرة بالإشارات","wing walker":"مراقب طرف الجناح وقت التحريك","jet bridge":"الجسر المتحرك للطائرة","ambulift":"سيارة رافعة لذوي الإعاقة",
"standby":"راكب احتياط ينتظر مقعد","overbooking":"حجز أكثر من المقاعد","upgrade":"ترقية الدرجة","no show":"راكب ما حضر","denied boarding":"منع الراكب من الصعود",
"excess baggage":"وزن عفش زائد","bag tag":"بطاقة العفش","cabin baggage":"حقيبة المقصورة","hand baggage":"حقيبة اليد","checked baggage":"العفش المشحون","baggage":"العفش","hold":"عنبر الطائرة",
"dangerous goods":"بضائع خطرة","power bank":"شاحن متنقل","lithium":"بطاريات ليثيوم","safety":"السلامة","ppe":"معدات الحماية الشخصية","ground operations manual":"دليل العمليات الأرضية",
"ground handling":"الخدمات الأرضية","turnaround":"تجهيز الطائرة بين الوصول والإقلاع","delay code":"رمز سبب التأخير","delay":"تأخير","cancellation":"إلغاء","compensation":"تعويض",
"captain":"قائد الطائرة","crew":"طاقم الطائرة","cabin crew":"طاقم الضيافة","refuelling":"تزويد الوقود","fuelling":"تزويد الوقود","fuel":"وقود","deplaning":"نزول الركاب من الطائرة",
"disembarkation":"نزول الركاب","embarkation":"صعود الركاب","unruly":"راكب مشاغب","medif":"نموذج اللياقة الطبية للسفر","stretcher":"نقالة طبية","infant":"رضيع","seat":"مقعد","exit row":"صف مخرج الطوارئ",
"visa":"تأشيرة","passport":"جواز السفر","iqama":"الإقامة","travel document":"وثيقة السفر","ticket":"تذكرة","manual":"دليل","circular":"تعميم","accepted":"معتمد","eff":"ساري من تاريخ"};
const GLRX=new RegExp("(?<![A-Za-z])("+Object.keys(GL).sort((a,b)=>b.length-a.length).join("|")+")(?![A-Za-z])","g");
const GLWX=new RegExp("(?<![A-Za-z])("+Object.keys(GLW).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[-]/g,"\\-")).join("|")+")(?![A-Za-z])","gi");
/* gl: شرح الكلمات اللي جهّزه Gemini لهذا السؤال (أولوية)، وبعده القاموس الثابت */
function glH(gl,...txt){const out=new Map();(Array.isArray(gl)?gl:[]).forEach(x=>{if(x&&x.t&&x.ar&&!out.has(x.t.toLowerCase()))out.set(x.t.toLowerCase(),[x.t,x.ar])});
  const all=txt.flat().map(t=>String(t||"")).join(" \n ");
  all.replace(GLRX,m=>{if(!out.has(m.toLowerCase()))out.set(m.toLowerCase(),[m,GL[m]]);return m});
  all.replace(GLWX,m=>{const k=m.toLowerCase();if(![...out.keys()].some(o=>o===k||o.includes(k)))out.set(k,[m,GLW[k]]);return m});
  if(!out.size)return"";
  return`<div class="qz-gl"><b>📖 معاني الكلمات الإنجليزية</b>${[...out.values()].map(([k,v])=>`<div><span dir="ltr">${E(k)}</span>${E(v)}</div>`).join("")}</div>`}
window.QZ_GL=glH;
const fdate=t=>{try{return new Date(t).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn",{weekday:"long",day:"numeric",month:"long",timeZone:"Asia/Riyadh"})}catch(e){return""}};
const secs=ms=>(Math.round((ms||0)/100)/10).toFixed(1)+"ث";
function hubSave(){try{const r=ST&&ST.round;let t="",b="";
  if(r&&r.ph==="on"){const d=(ST.today||[]).length;t=d>=r.per?"✓ خلصت أسئلة اليوم":d?"اليوم "+d+"/"+r.per:r.per+" أسئلة بانتظارك";b=d?"":"جديد"}
  localStorage.setItem("ajf_qz_hub",JSON.stringify({t,b,k:r&&r.day_end?+new Date(r.day_end):0}))}catch(e){}try{hubPaint()}catch(e){}}

async function load(){ST=await call("ajf_qz_state");hubSave();return ST}
async function loadBoard(){try{const j=await call("ajf_qz_board",{p_scope:BT});BD=j.s==="ok"?j.rows:[]}catch(e){BD=null}}

let DUI=null,duP=null;
function duPeek(){call("ajf_du_list").then(j=>{if(j.s!=="ok")return;DUI={inv:(j.inv||[]).filter(x=>x.in).length,live:(j.live||[]).filter(x=>x.ph!=="wait").length};paint()}).catch(()=>{})}
function duOpen(){VIEW="duel";root.innerHTML=`<div class="bd-empty">جاري التحميل…</div>`;
  (window.DU?Promise.resolve():duP||(duP=ldJs("duel.js?v=6").catch(e=>{duP=null;throw e}))).then(()=>{if(VIEW==="duel")DU.mount(root,()=>{VIEW="home";paint();duPeek()})})
    .catch(()=>{VIEW="home";paint();alert("تعذّر التحميل، تأكد من الإنترنت")})}
function mount(el){css();root=el;VIEW="home";window.QZ_GO=null;/* تحديات الزملاء مقفلة بطلب المشرف (2026-11-21) */root.innerHTML=`<div class="bd-empty">جاري التحميل…</div>`;
  Promise.all([load(),loadBoard()]).then(paint).catch(e=>{if(root)root.innerHTML=`<div class="bd-empty">${/rpc 404/.test(e&&e.message)?"🏁 التحدي قيد التجهيز، قريباً بإذن الله":"تعذّر التحميل، تأكد من الإنترنت"}</div>`});
  clearInterval(tick);tick=setInterval(()=>{if(!root||!root.isConnected){clearInterval(tick);return}if(!document.hidden&&VIEW==="home"&&!cur)paint()},30000)}

function paint(){if(!root||VIEW!=="home")return;const r=ST&&ST.round,T=(ST&&ST.today)||[],tot=(ST&&ST.tot)||{};let h="";
  if(!r||r.ph==="stop"||r.ph==="end")h=`<div class="qz-card qz-st"><h3>🏁 تحدي التشغيل</h3><small>${r&&r.ph==="end"?"انتهت الجولة. ترقبوا الجولة الجاية.":"ما فيه جولة شغّالة حالياً. أول ما يبدأ المشرف جولة بتظهر لك الأسئلة هنا."}</small></div>`;
  else if(r.ph==="wait")h=`<div class="qz-card qz-st"><h3>🏁 الجولة ${r.no}</h3><small>تبدأ ${E(fdate(r.starts))} الساعة 12:00 ص · ${r.days} أيام · ${r.per} أسئلة كل يوم</small></div>`;
  else{const d=T.length,okn=T.filter(x=>x.ok).length,done=d>=r.per;
    h=`<div class="qz-card qz-st"><div class="row"><div><h3>🏁 الجولة ${r.no} · اليوم ${r.day} من ${r.days}</h3><small>${done?"خلصت أسئلة اليوم، ترجع لك أسئلة جديدة بكرة":"أسئلة اليوم تختفي بعد"}</small></div><span class="cd">${done?"":left(r.day_end)}</span></div>
      <div class="qz-dots">${Array.from({length:r.per},(_,i)=>`<i class="${T[i]?T[i].ok?"ok":"no":""}"></i>`).join("")}</div>
      <div class="qz-sum"><span>اليوم <b>${okn}/${r.per}</b></span><span>الجولة <b>${tot.ok||0}/${tot.n||0}</b></span></div>
      <button class="qz-go" id="qzStart" ${done?"disabled":""}>${done?"✓ خلصت أسئلة اليوم":d?"كمّل الأسئلة ("+(d+1)+" من "+r.per+")":"ابدأ أسئلة اليوم"}</button></div>`}
  h+=`<button class="qz-card qz-du" id="qzMine"><span>📚</span><div><b>أسئلتي وأجوبتها</b><small>راجع كل سؤال جاوبته: الجواب الصحيح والشرح والمرجع ومعاني الرموز</small></div><em>‹</em></button>`;
  /* ⚔️ تحديات الزملاء (duel.js) */
  if(window.AJF_DUEL_ON)h+=`<button class="qz-card qz-du" id="qzDu"><span>⚔️</span><div><b>تحديات الزملاء</b><small>${DUI&&DUI.inv?"📨 عندك "+DUI.inv+" "+(DUI.inv>1?"دعوات":"دعوة")+" تحدي":DUI&&DUI.live?"🔴 "+DUI.live+" تحدي مباشر الحين":"تحدّى زميلك بأسئلة التعاميم، والكل يتابع"}</small></div><em>‹</em></button>`;
  h+=`<details class="qz-card qz-rules"><summary>📜 قوانين التحدي</summary><ul>
    <li>كل يوم ${r?r.per:10} أسئلة من التعاميم ودليل العمليات، ولكل سؤال 4 خيارات.</li>
    <li>عندك ${r?r.secs:30} ثانية لكل سؤال، وإذا خلص الوقت ينحسب خطأ.</li>
    <li>إذا طلعت من التطبيق والسؤال مفتوح ينحسب خطأ وتنتقل للي بعده، وما تقدر ترجع لنفس السؤال.</li>
    <li>أسئلتك خاصة فيك وما تتكرر عليك، وتجيك حسب اختصاصك (كاونتر، بوابة، ساحة، لود كنترول).</li>
    <li>أسئلة كل يوم تبقى 24 ساعة وبعدها تختفي.</li>
    <li>الترتيب بعدد الإجابات الصحيحة، وعند التعادل يتقدم الأسرع.</li></ul></details>`;
  h+=`<div class="qz-card"><div class="bd-sec" style="margin:0 0 10px"><span>🏆 لوحة المراكز</span></div>
    <div class="qz-tabs">${[["round","الجولة"],["day","اليوم"],["all","كل الجولات"]].map(([k,t])=>`<button data-qb="${k}" class="${BT===k?"on":""}">${t}</button>`).join("")}</div>
    <div class="qz-lb">${BD==null?`<div class="bd-empty" style="padding:16px">تعذّر تحميل المراكز</div>`:!BD.length?`<div class="bd-empty" style="padding:16px">ما فيه نتائج للحين. كن الأول!</div>`:
      BD.slice(0,50).map(x=>`<div class="r ${x.me?"me":""}${x.emp?" qe":""}"${x.emp?` data-qemp="${E(x.emp)}"`:""}><span class="k">${x.rk<=3?["🥇","🥈","🥉"][x.rk-1]:x.rk}</span><div class="nm">${E(x.name)}${x.me?" (أنت)":""}<small>${x.n} سؤال · ${secs(x.ms)}${x.emp?" · اضغط لعرض إجاباته":""}</small></div><span class="sc">${x.ok}${x.emp?" ‹":""}</span></div>`).join("")+
      (BD.length>50&&BD.some((x,i)=>i>=50&&x.me)?(x=>`<div class="r me"><span class="k">${x.rk}</span><div class="nm">${E(x.name)} (أنت)<small>${x.n} سؤال</small></div><span class="sc">${x.ok}</span></div>`)(BD.find(x=>x.me)):"")}</div></div>`;
  if(ST&&ST.admin)h+=`<button class="qz-adm" id="qzAdm">🛠 إدارة الأسئلة والجولات${ST.adm&&ST.adm.pending?" · "+ST.adm.pending+" بانتظار الاعتماد":""}</button>
    <div class="qa-m" style="text-align:center">أنت مشرف: تقدر تجرب الأسئلة، لكن ما تدخل الترتيب لأنك تشوف الأجوبة وقت الاعتماد.</div>`;
  root.innerHTML=`<div class="qz">${h}</div>`;
  const s=root.querySelector("#qzStart");if(s)s.onclick=()=>{try{window.ajfAct&&ajfAct("qzgo")}catch(e){}openQuiz()};
  root.querySelectorAll("[data-qb]").forEach(b=>b.onclick=async()=>{BT=b.dataset.qb;BD=undefined;paint();await loadBoard();paint()});
  const a=root.querySelector("#qzAdm");if(a)a.onclick=()=>{VIEW="adm";admPaint()};
  const du=root.querySelector("#qzDu");if(du)du.onclick=duOpen;
  const mi=root.querySelector("#qzMine");if(mi)mi.onclick=mineOpen;
  root.querySelectorAll("[data-qemp]").forEach(b=>b.onclick=()=>empOpen(b.dataset.qemp))}

/* ---------- المشرف: تفاصيل إجابات موظف (supabase/quiz_emp.sql) ---------- */
let EMP=null;
/* 📚 أسئلتي: الموظف يراجع أسئلته اللي جاوبها */
async function mineOpen(){try{window.ajfAct&&ajfAct("qzmine")}catch(e){}VIEW="emp";EMP={mine:true,ld:true};empPaint();
  try{const j=await call("ajf_qz_mine");EMP=j.s==="ok"?j:{mine:true,err:"تعذّر التحميل"}}
  catch(e){EMP={mine:true,err:/rpc 404|ajf_qz_mine|PGRST202/.test(e&&e.message||"")?"📚 مراجعة الأسئلة قيد التجهيز، قريباً بإذن الله":"تعذّر التحميل، تأكد من الإنترنت"}}
  empPaint()}
async function empOpen(emp){VIEW="emp";EMP={emp,ld:true};empPaint();root.scrollIntoView();
  try{const j=await call("ajf_qz_emp",{p_emp:emp});EMP=j.s==="ok"?j:{emp,err:j.s==="denied"?"هذي للمشرف فقط":"تعذّر التحميل"}}
  catch(e){EMP={emp,err:/rpc 404|ajf_qz_emp|PGRST202/.test(e&&e.message||"")?"لازم يتشغّل ملف supabase/quiz_emp.sql في Supabase أول":"تعذّر التحميل، تأكد من الإنترنت"}}
  empPaint()}
function empPaint(){if(!root||VIEW!=="emp")return;const D=EMP||{},R=D.rows||[];let h=`<button class="qz-adm" id="qeBack">→ رجوع${D.mine?"":" للوحة المراكز"}</button>`;
  if(D.ld)h+=`<div class="bd-empty">جاري التحميل…</div>`;else if(D.err)h+=`<div class="bd-empty">${E(D.err)}</div>`;
  else{const done=R.filter(x=>x.ans),ok=done.filter(x=>x.ok).length,to=done.filter(x=>!x.ok&&x.pick==null).length;
    h+=`<div class="qz-card qz-st"><h3>${E(D.name||D.emp)}</h3><small dir="ltr" style="display:block;text-align:right">${E(D.title||"")} · ${E(D.emp)}</small>
      <div class="qa-st" style="margin-top:10px"><div><b style="color:var(--go)">${ok}</b><span>صح</span></div><div><b style="color:var(--warn)">${done.length-ok}</b><span>غلط${to?" (منها "+to+" وقت/خروج)":""}</span></div><div><b>${done.length}</b><span>سؤال</span></div></div></div>`;
    if(!R.length)h+=`<div class="bd-empty">${D.mine?"ما جاوبت على أي سؤال للحين":"ما جاوب على أي سؤال للحين"}</div>`;
    let g="";R.forEach(x=>{const k=x.rno+"-"+x.day;if(k!==g){g=k;h+=`<div class="bd-sec" style="margin:6px 2px 0"><span>الجولة ${x.rno} · اليوم ${x.day}</span><span style="font-size:12px">${E(fdate(x.shown))}</span></div>`}
      const st=!x.ans?"⏳ لم يجاوب بعد":x.ok?"✅ صح":x.pick==null?"⏱️ خلص الوقت أو طلع من التطبيق":"❌ غلط";
      h+=`<div class="qz-card qe-q"><div class="qe-h"><span>سؤال ${x.n} · ${LV[x.d]||""}</span><span>${st}${x.ans?" · "+secs(x.ms):""}</span></div><p>${E(x.q)}</p>
        <div class="qe-o">${(x.o||[]).map((t,i)=>`<div class="${i===x.right?"r":i===x.pick?"w":""}"><b>${LT[i]}</b><span>${E(t)}</span>${i===x.right?"<i>✓ الصحيح</i>":i===x.pick?(D.mine?"<i>✗ اختيارك</i>":"<i>✗ اختياره</i>"):""}</div>`).join("")}</div>
        <div class="qe-ans">✅ الجواب الصحيح: ${E((x.o||[])[x.right]||"")}</div>
        ${x.why?`<div class="qa-m">💡 ${E(x.why)}</div>`:""}${x.src?`<div class="qa-m">📄 المرجع: ${E(x.src)}${x.page?" · صفحة "+E(x.page):""}</div>`:""}${glH(x.gl,x.q,x.o,x.why)}</div>`})}
  root.innerHTML=`<div class="qz">${h}</div>`;root.querySelector("#qeBack").onclick=()=>{VIEW="home";EMP=null;paint()}}

/* ---------- شاشة السؤال ---------- */
let ov=null,cur=null,tmr=null;
function ovOpen(){if(ov)return ov;ov=document.createElement("div");ov.className="qzo";ov.setAttribute("role","dialog");document.body.appendChild(ov);document.documentElement.style.overflow="hidden";return ov}
function ovClose(){clearInterval(tmr);cur=null;if(ov){ov.remove();ov=null}document.documentElement.style.overflow="";
  load().then(()=>loadBoard()).then(()=>{VIEW="home";paint()}).catch(()=>{})}
function openQuiz(){const r=ST.round;ovOpen().innerHTML=`<div class="qzo-in"><div class="qzo-intro"><i>⏱️</i><h2>جاهز؟</h2>
  <ul><li>${r.secs} ثانية لكل سؤال</li><li>لا تطلع من التطبيق والسؤال مفتوح، ينحسب خطأ</li><li>ما فيه رجوع للسؤال بعد ما يظهر</li><li>تقدر توقف بين الأسئلة وتكمل بعدين خلال اليوم</li></ul></div>
  <div class="qzo-act"><button id="qzNo">رجوع</button><button class="p" id="qzYes">ابدأ</button></div></div>`;
  ov.querySelector("#qzNo").onclick=ovClose;ov.querySelector("#qzYes").onclick=next}
async function next(){const o=ovOpen();o.innerHTML=`<div class="qzo-in"><div class="bd-empty">… جاري تجهيز السؤال</div></div>`;let j;
  try{j=await call("ajf_qz_next")}catch(e){o.innerHTML=`<div class="qzo-in"><div class="bd-empty">تعذّر الاتصال، تأكد من الإنترنت</div><div class="qzo-act"><button id="qzX">رجوع</button><button class="p" id="qzR">إعادة المحاولة</button></div></div>`;
    o.querySelector("#qzX").onclick=ovClose;o.querySelector("#qzR").onclick=next;return}
  if(j.s!=="ok"){const m={done:["✅","خلصت أسئلة اليوم","أحسنت! ترجع لك أسئلة جديدة بكرة."],empty:["📭","ما فيه أسئلة كافية حالياً","بنك الأسئلة يحتاج أسئلة جديدة، بلّغ المشرف."],noround:["🏁","الجولة مو شغّالة","ما فيه أسئلة متاحة الحين."]}[j.s]||["⚠️","صار خطأ","جرّب مرة ثانية."];
    o.innerHTML=`<div class="qzo-in"><div class="qzo-intro"><i>${m[0]}</i><h2>${m[1]}</h2><p class="qa-m">${m[2]}</p></div><div class="qzo-act"><button class="p" id="qzX">رجوع للوحة</button></div></div>`;o.querySelector("#qzX").onclick=ovClose;return}
  cur={id:j.id,n:j.n,of:j.of,qt:j.q,qo:j.o,secs:j.secs,end:performance.now()+j.secs*1000,busy:false,left:false};
  o.innerHTML=`<div class="qzo-in"><div class="qzo-top"><span>سؤال ${j.n} من ${j.of}</span><span class="lv">${LV[j.d]||""}</span></div>
    <div class="qzo-ring" id="qzRing"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" cx="50" cy="50" r="46" style="animation-duration:${j.secs}s"/></svg><b id="qzSec">${j.secs}</b></div>
    <div class="qzo-q">${E(j.q)}</div><div class="qzo-o">${j.o.map((t,i)=>`<button data-o="${i}"><i>${LT[i]}</i><span>${E(t)}</span></button>`).join("")}</div>
    <div id="qzRes"></div><div class="qzo-act" id="qzAct"></div></div>`;
  o.scrollTop=0;o.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>answer(+b.dataset.o));
  clearInterval(tmr);tmr=setInterval(()=>{if(!cur||cur.busy)return;const s=Math.max(0,Math.ceil((cur.end-performance.now())/1000)),e=document.getElementById("qzSec");
    if(e)e.textContent=s;if(s<=10){const r=document.getElementById("qzRing");if(r)r.classList.add("low")}if(s<=0)answer(-1)},200)}
async function answer(i){if(!cur||cur.busy)return;cur.busy=true;clearInterval(tmr);const c=cur;
  const rg=document.getElementById("qzRing");if(rg)rg.classList.add("stop");
  ov.querySelectorAll("[data-o]").forEach(b=>{b.disabled=true;if(+b.dataset.o===i)b.classList.add("pk")});
  let res=null;for(let k=0;k<3&&!res;k++){try{res=await call("ajf_qz_answer",{p_id:c.id,p_pick:i})}catch(e){if(e.message==="out")return;await new Promise(z=>setTimeout(z,800))}}
  if(!res||res.s!=="ok"){showRes(c,{s:"ok",ok:false,why:"net"});return}showRes(c,res)}
function showRes(c,r){if(!ov)return;c.done=true;
  ov.querySelectorAll("[data-o]").forEach(b=>{const k=+b.dataset.o;b.disabled=true;if(k===r.right)b.classList.add("ok");else if(k===r.pick&&!r.ok)b.classList.add("no")});
  const H=r.ok?"✓ إجابة صحيحة":r.why==="time"?"⏱ انتهى الوقت":r.why==="left"?"🚪 خرجت من التطبيق":r.why==="net"?"⚠️ تعذّر إرسال الإجابة":"✕ إجابة خاطئة";
  const sub=r.ok?"خلال "+secs(r.ms):r.why==="left"?"انحسب السؤال خطأ لأنك طلعت من التطبيق والسؤال مفتوح.":r.why==="net"?"تأكد من الإنترنت. الوقت يُحسب في الخادم.":"";
  const R=document.getElementById("qzRes");if(R)R.innerHTML=`<div class="qzo-r ${r.ok?"ok":"no"}"><b class="h">${H}</b>${sub?`<div>${E(sub)}</div>`:""}${r.exp?`<div>💡 ${E(r.exp)}</div>`:""}${r.src?`<small>📄 المصدر: ${E(r.src)}${r.page?" · صفحة "+E(r.page):""}</small>`:""}${glH(r.gl,cur&&cur.qt,cur&&cur.qo,r.exp)}</div>`;
  const last=c.n>=c.of,A=document.getElementById("qzAct");
  if(A){A.innerHTML=last?`<button class="p" id="qzX">عرض النتيجة</button>`:`<button id="qzX">أكمل لاحقاً</button><button class="p" id="qzN">السؤال التالي ←</button>`;
    A.querySelector("#qzX").onclick=ovClose;const n=A.querySelector("#qzN");if(n)n.onclick=next}
  cur=null}
/* الخروج من التطبيق والسؤال مفتوح = خطأ (الخادم يحسبه خطأ كذلك لو طلب السؤال مرة ثانية) */
function leaveNow(){if(!cur||cur.busy||cur.left)return;cur.left=true;clearInterval(tmr);const id=cur.id;
  try{cur.lp=fetch(SB_URL+"/rest/v1/rpc/ajf_qz_leave",{method:"POST",keepalive:true,headers:{apikey:SB_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({p_token:AUTH.tok||"",p_device:AUTH.dev,p_id:id})}).then(r=>r.json()).catch(()=>null)}catch(e){cur.lp=Promise.resolve(null)}}
document.addEventListener("visibilitychange",async()=>{if(document.hidden){leaveNow();return}
  if(cur&&cur.left&&!cur.busy){const c=cur;c.busy=true;let r=await (c.lp||Promise.resolve(null));
    if(!r||r.s!=="ok")try{r=await call("ajf_qz_leave",{p_id:c.id})}catch(e){r=null}
    showRes(c,r&&r.s==="ok"?r:{s:"ok",ok:false,why:"left"})}});
addEventListener("pagehide",leaveNow);

/* ---------- إدارة الأسئلة (المشرف) ---------- */
let AGL="",AGLB=false;
let ATOP="mix",AT="pending",AL=undefined,AOFF=0,AED=null,ASRC=null,AGEN=false,AMSG="";
async function admLoad(){try{const j=await call("ajf_qz_admin",{p_action:"list",p_arg:{st:AT,off:AOFF}});AL=j.s==="ok"?j:{n:0,rows:[]}}catch(e){AL=null}}
async function srcLoad(){if(ASRC)return;try{const j=await call("ajf_circ_list",{p_offset:0,p_limit:100});ASRC=j.s==="ok"?j.rows:[]}catch(e){ASRC=[]}}
function qCard(x){if(AED===x.id)return qForm(x);
  return`<div class="qz-card qa-c"><div class="q">${E(x.q)}</div><ol>${x.o.map((t,i)=>`<li class="${i===x.a?"ok":""}">${LT[i]}) ${E(t)}</li>`).join("")}</ol>
    ${x.why?`<div class="w">💡 ${E(x.why)}</div>`:""}<div class="m"><select class="qa-tp" data-qtp="${x.id}">${TPS.map(([k,t])=>`<option value="${k}" ${(x.tp||"")===k?"selected":""}>${t}</option>`).join("")}</select> ${LV[x.d]||""} · ${E(x.src_title||"يدوي")}${x.page?" · ص "+E(x.page):""}${x.used?" · ظهر "+x.used+" مرة، صح "+x.good:""}</div>
    <div class="qa-b">${x.st!=="ok"?`<button class="g" data-qs="ok" data-id="${x.id}">✓ اعتماد</button>`:""}${x.st!=="no"?`<button class="x" data-qs="no" data-id="${x.id}">✕ ${x.st==="ok"?"إيقاف":"رفض"}</button>`:""}${x.st==="no"?`<button data-qs="pending" data-id="${x.id}">↺ إرجاع للمراجعة</button>`:""}<button data-qe="${x.id}">✎ تعديل</button></div></div>`}
function qForm(x){x=x||{id:"new",q:"",o:["","","",""],a:0,d:2,why:""};
  return`<div class="qz-card qa-f" id="qaF"><b>${x.id==="new"?"➕ سؤال جديد":"✎ تعديل السؤال"}</b><textarea id="qaQ" rows="3" placeholder="نص السؤال">${E(x.q)}</textarea>
    ${x.o.map((t,i)=>`<label><input type="radio" name="qaA" value="${i}" ${i===x.a?"checked":""}><input id="qaO${i}" value="${E(t)}" placeholder="الخيار ${LT[i]}"></label>`).join("")}
    <div class="qa-m">علّم الدائرة جنب الجواب الصحيح</div>
    <select id="qaTp">${TPS.map(([k,t])=>`<option value="${k}" ${(x.tp||"")===k?"selected":""}>${t}</option>`).join("")}</select>
    <select id="qaD">${[1,2,3].map(d=>`<option value="${d}" ${d===x.d?"selected":""}>${LV[d]}</option>`).join("")}</select>
    <textarea id="qaW" rows="2" placeholder="الشرح (ليش الجواب صحيح)">${E(x.why)}</textarea>
    <div class="qa-b"><button class="g" id="qaSave" data-id="${x.id}">حفظ</button><button id="qaCan">إلغاء</button></div><div class="qa-m" id="qaFm"></div></div>`}
function admPaint(){if(!root||VIEW!=="adm")return;const a=(ST&&ST.adm)||{},r=ST&&ST.round,
  need=r?r.per*r.days:30;
  root.innerHTML=`<div class="qz"><button class="qz-adm" id="qaBack">→ رجوع للتحدي</button>
  <div class="qz-card"><div class="bd-sec" style="margin:0 0 10px"><span>📊 بنك الأسئلة</span></div>
    <div class="qa-st"><div><b>${a.ok||0}</b><span>معتمد</span></div><div><b>${a.pending||0}</b><span>بانتظار الاعتماد</span></div><div><b>${a.players||0}</b><span>مشارك بالجولة</span></div></div>
    <div class="qa-m" style="margin-top:8px">المعتمد: سهل ${a.ok1||0} · متوسط ${a.ok2||0} · صعب ${a.ok3||0}<br>كل موظف يحتاج ${need} سؤال في الجولة. عشان تكون أسئلة كل موظف خاصة فيه، يكون المعتمد تقريباً ${need} × عدد الموظفين. إذا البنك أقل، تتوزع الأسئلة الأقل استخداماً أول.</div></div>
  <div class="qz-card qa-f"><b>✨ توليد أسئلة بالذكاء الاصطناعي</b>
    <select id="qaTop">${[["mix","كل المجالات (بالتناوب)"],["chk","الكاونتر وإنهاء إجراءات الركاب"],["gate","بوابة التصعيد"],["ramp","الساحة (Ramp)"],["lc","اللود كنترول"]].map(([k,t])=>`<option value="${k}" ${k===ATOP?"selected":""}>${t}</option>`).join("")}</select>
    <select id="qaSrc"><option value="">يختار المصدر المناسب للمجال من التعاميم والأدلة</option>${(ASRC||[]).map(c=>`<option value="${E(c.id)}">${E(c.title)}</option>`).join("")}</select>
    <select id="qaN">${[5,10,15].map(n=>`<option value="${n}" ${n===10?"selected":""}>${n} أسئلة</option>`).join("")}</select>
    <button class="qz-go" id="qaGen" style="margin:0" ${AGEN?"disabled":""}>${AGEN?"… جاري التوليد (قرابة 30 ثانية)":"توليد الأسئلة"}</button>
    <div class="qa-m">الأسئلة الجديدة تروح لـ "بانتظار الاعتماد" وما تظهر للموظفين لين تعتمدها.${AMSG?"<br><b style='color:var(--ink)'>"+E(AMSG)+"</b>":""}</div></div>
  <div class="qz-card qa-f"><b>📖 شرح الكلمات الإنجليزية</b><div class="qa-m">يجهّز شرح عربي مختصر لكل كلمة إنجليزية في الأسئلة القديمة (مثل CUTE و Backup). الأسئلة الجديدة تنولّد مع شرحها تلقائياً.${AGL?"<br><b style='color:var(--ink)'>"+E(AGL)+"</b>":""}</div>
    <button class="qz-go" id="qaGl" ${AGLB?"disabled":""}>${AGLB?"جاري التجهيز…":"📖 تجهيز الشرح للأسئلة"}</button></div>
  <div class="qz-card qa-f"><b>🏁 الجولة</b><div class="qa-m">3 أيام · 10 أسئلة يومياً · 30 ثانية للسؤال<br>${r?`الجولة ${r.no}: ${r.ph==="on"?"شغّالة، اليوم "+r.day+" من "+r.days:r.ph==="wait"?"تبدأ "+E(fdate(r.starts)):r.ph==="stop"?"موقوفة":"انتهت"} · ${r.auto?"الجولة اللي بعدها تبدأ تلقائياً":"بدون تجديد تلقائي"}`:"ما فيه جولات للحين"}</div>
    <select id="qaDay"><option value="0">تبدأ اليوم</option><option value="1">تبدأ بكرة</option></select>
    <label><input type="checkbox" id="qaAuto" checked style="width:auto"> بعد ما تخلص الجولة تبدأ اللي بعدها تلقائياً</label>
    <div class="qa-b"><button class="g" id="qaRound">▶ بدء جولة جديدة</button>${r&&(r.ph==="on"||r.ph==="wait")?`<button class="x" id="qaStop">إيقاف الجولة</button>`:""}</div></div>
  <div class="qz-tabs">${[["pending","بانتظار الاعتماد"],["ok","معتمدة"],["no","مرفوضة"]].map(([k,t])=>`<button data-qt="${k}" class="${AT===k?"on":""}">${t}</button>`).join("")}</div>
  <div class="qa-b"><button id="qaAdd">➕ إضافة سؤال يدوي</button>${AT==="pending"&&AL&&AL.rows.length?`<button class="g" id="qaAll">✓ اعتماد كل الظاهر (${AL.rows.length})</button>`:""}${AT==="pending"&&AL&&AL.rows.length?`<button class="x" id="qaNone">✕ رفض كل الظاهر</button>`:""}</div>
  ${AED==="new"?qForm():""}
  <div class="qz" id="qaList">${AL===undefined?`<div class="bd-empty">جاري التحميل…</div>`:AL===null?`<div class="bd-empty">تعذّر التحميل</div>`:!AL.rows.length?`<div class="bd-empty">ما فيه أسئلة هنا</div>`:AL.rows.map(qCard).join("")}</div>
  ${AL&&AL.n>AOFF+AL.rows.length||AOFF?`<div class="qa-b">${AOFF?`<button id="qaPrev">السابق</button>`:""}${AL&&AL.n>AOFF+AL.rows.length?`<button id="qaNext">التالي (${AL.n-AOFF-AL.rows.length})</button>`:""}</div>`:""}</div>`;
  const $q=s=>root.querySelector(s),re=async()=>{await Promise.all([admLoad(),load()]);admPaint()};
  $q("#qaBack").onclick=()=>{VIEW="home";AED=null;paint()};
  $q("#qaGl").onclick=async()=>{AGLB=true;AGL="";admPaint();let tot=0,j=null;
    for(let i=0;i<60;i++){try{j=await edge({action:"qzgl"})}catch(e){j={s:/fn 404/.test(e.message)?"nofn":"net"}}
      if(j.s!=="ok")break;tot+=j.done;AGL=`تم ${tot} سؤال · باقي ${j.left}`;admPaint();if(!j.left||!j.done)break}
    AGL=j&&j.s==="ok"?(j.left?`تم ${tot} سؤال · باقي ${j.left}، اضغط مرة ثانية`:`✓ خلص: كل الأسئلة صار لها شرح (${tot} الحين)`):
      j&&(j.s==="nofn"||j.s==="bad")?"لازم تحدّث الدالة ajf-files في Supabase أول":j&&j.s==="nokey"?"مفتاح Gemini غير موجود":j&&j.s==="err"?"لازم تشغّل ملف quiz_mine.sql أول":j&&j.s==="aierr"?"خدمة الذكاء الاصطناعي ما ردّت، جرّب بعد دقيقة":"تعذّر، تأكد من الإنترنت";
    AGLB=false;admPaint()};
  $q("#qaGen").onclick=async()=>{AGEN=true;AMSG="";const src=$q("#qaSrc").value,n=+$q("#qaN").value;ATOP=$q("#qaTop").value;admPaint();
    try{const j=await edge({action:"quizgen",n,src,topic:ATOP==="mix"?"":ATOP});
      /* الأسئلة الجديدة تاخذ اختصاص المجال اللي انولّدت له */
      const tk=TPK[j.topic]||(ATOP!=="mix"?ATOP:"");if(j.s==="ok"&&j.n&&tk){try{await call("ajf_qz_admin",{p_action:"tag",p_arg:{last:j.n,tp:tk}})}catch(e){}}
      AMSG=j.s==="ok"?(j.n?`✓ انضاف ${j.n} سؤال (${j.topic||""}) من: ${j.src}`:`ما طلع أسئلة مفيدة كفاية من: ${j.src}. اضغط توليد مرة ثانية.`):j.s==="nokey"?"مفتاح Gemini غير موجود":j.s==="nosrc"?"ما فيه تعاميم مرفوعة":j.s==="aierr"?"خدمة الذكاء الاصطناعي ما ردّت، جرّب بعد دقيقة":"تعذّر التوليد"}
    catch(e){AMSG=/fn 404/.test(e.message)?"حدّث الدالة ajf-files في Supabase أول":"تعذّر التوليد، تأكد من الإنترنت"}
    AGEN=false;AT="pending";AOFF=0;await re()};
  $q("#qaRound").onclick=async()=>{if(r&&(r.ph==="on"||r.ph==="wait")&&!confirm("فيه جولة شغّالة. توقفها وتبدأ جولة جديدة؟"))return;
    const d=new Date(Date.now()+3*3600e3+(+$q("#qaDay").value)*864e5).toISOString().slice(0,10);
    try{await call("ajf_qz_admin",{p_action:"round",p_arg:{date:d,auto:$q("#qaAuto").checked}});await re()}catch(e){alert("تعذّر، تأكد من الإنترنت")}};
  const sp=$q("#qaStop");if(sp)sp.onclick=async()=>{if(!confirm("إيقاف الجولة الحالية؟"))return;try{await call("ajf_qz_admin",{p_action:"stop"});await re()}catch(e){alert("تعذّر")}};
  root.querySelectorAll("[data-qt]").forEach(b=>b.onclick=async()=>{AT=b.dataset.qt;AOFF=0;AED=null;AL=undefined;await admLoad();admPaint()});
  root.querySelectorAll("[data-qs]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await call("ajf_qz_admin",{p_action:"set",p_arg:{ids:[+b.dataset.id],st:b.dataset.qs}});await re()}catch(e){b.disabled=false}});
  const all=$q("#qaAll");if(all)all.onclick=async()=>{if(!confirm("اعتماد كل الأسئلة الظاهرة؟ تأكد إنك راجعتها."))return;all.disabled=true;
    try{await call("ajf_qz_admin",{p_action:"set",p_arg:{ids:AL.rows.map(x=>x.id),st:"ok"}});await re()}catch(e){all.disabled=false}};
  const none=$q("#qaNone");if(none)none.onclick=async()=>{if(!confirm("رفض كل الأسئلة الظاهرة؟"))return;none.disabled=true;
    try{await call("ajf_qz_admin",{p_action:"set",p_arg:{ids:AL.rows.map(x=>x.id),st:"no"}});await re()}catch(e){none.disabled=false}};
  root.querySelectorAll("[data-qtp]").forEach(b=>b.onchange=async()=>{b.disabled=true;try{const j=await call("ajf_qz_admin",{p_action:"tag",p_arg:{ids:[+b.dataset.qtp],tp:b.value}});if(j.s!=="ok")throw 0;const x=AL&&AL.rows.find(y=>y.id===+b.dataset.qtp);if(x)x.tp=b.value||null}catch(e){alert("تعذّر تغيير الاختصاص")}b.disabled=false});
  root.querySelectorAll("[data-qe]").forEach(b=>b.onclick=()=>{AED=+b.dataset.qe;admPaint();const f=$q("#qaF");if(f)f.scrollIntoView({block:"center"})});
  $q("#qaAdd").onclick=()=>{AED="new";admPaint()};
  const can=$q("#qaCan");if(can)can.onclick=()=>{AED=null;admPaint()};
  const sv=$q("#qaSave");if(sv)sv.onclick=async()=>{const id=sv.dataset.id,ck=root.querySelector("input[name=qaA]:checked");
    const arg={q:$q("#qaQ").value,o:[0,1,2,3].map(i=>$q("#qaO"+i).value.trim()),a:ck?+ck.value:0,d:+$q("#qaD").value,why:$q("#qaW").value,tp:$q("#qaTp").value};
    if(arg.q.trim().length<5||arg.o.some(x=>!x)){$q("#qaFm").textContent="اكتب السؤال والخيارات الأربعة";return}
    if(id!=="new")arg.id=+id;sv.disabled=true;
    try{const j=await call("ajf_qz_admin",{p_action:id==="new"?"add":"edit",p_arg:arg});if(j.s!=="ok")throw 0;AED=null;await re()}catch(e){sv.disabled=false;$q("#qaFm").textContent="تعذّر الحفظ"}};
  const pv=$q("#qaPrev");if(pv)pv.onclick=async()=>{AOFF=Math.max(0,AOFF-25);await admLoad();admPaint();root.scrollIntoView()};
  const nx=$q("#qaNext");if(nx)nx.onclick=async()=>{AOFF+=25;await admLoad();admPaint();root.scrollIntoView()};
  if(AL===undefined)admLoad().then(admPaint)
  if(!ASRC)srcLoad().then(()=>{if(VIEW==="adm"&&!AGEN)admPaint()})}

window.QZ={mount};
})();
