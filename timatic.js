/* ---------- فحص وثائق الراكب: صورة شاشة TIMATIC + الجواز + الفيزا/الإقامة + الحجز ----------
   كل القراءة تتم على جوال الموظف (Tesseract.js) — ما تنرفع الصور لأي مكان ولا تنحفظ.
   الخلاصة مساعدة للموظف، والمرجع النهائي هو شاشة TIMATIC في أماديوس. */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const TESS=window.TESS_BASE||"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/";

/* ---------- الدول: alpha2 · alpha3 · الاسم بالإنجليزي كما في تيماتيك · بالعربي ---------- */
const CTRY=`SA SAU SAUDI ARABIA|السعودية;AE ARE UNITED ARAB EMIRATES|الإمارات;KW KWT KUWAIT|الكويت;BH BHR BAHRAIN|البحرين;QA QAT QATAR|قطر;OM OMN OMAN|عُمان;YE YEM YEMEN|اليمن;JO JOR JORDAN|الأردن;EG EGY EGYPT|مصر;SD SDN SUDAN|السودان;SS SSD SOUTH SUDAN|جنوب السودان;LB LBN LEBANON|لبنان;SY SYR SYRIA|سوريا;IQ IRQ IRAQ|العراق;PS PSE PALESTINIAN TERRITORY|فلسطين;IR IRN IRAN|إيران;TR TUR TURKIYE|تركيا;MA MAR MOROCCO|المغرب;DZ DZA ALGERIA|الجزائر;TN TUN TUNISIA|تونس;LY LBY LIBYA|ليبيا;MR MRT MAURITANIA|موريتانيا;SO SOM SOMALIA|الصومال;DJ DJI DJIBOUTI|جيبوتي;ER ERI ERITREA|إريتريا;ET ETH ETHIOPIA|إثيوبيا;KE KEN KENYA|كينيا;UG UGA UGANDA|أوغندا;TZ TZA TANZANIA|تنزانيا;NG NGA NIGERIA|نيجيريا;GH GHA GHANA|غانا;CM CMR CAMEROON|الكاميرون;TD TCD CHAD|تشاد;NE NER NIGER|النيجر;ML MLI MALI|مالي;SN SEN SENEGAL|السنغال;ZA ZAF SOUTH AFRICA|جنوب أفريقيا;IN IND INDIA|الهند;PK PAK PAKISTAN|باكستان;BD BGD BANGLADESH|بنغلاديش;NP NPL NEPAL|نيبال;LK LKA SRI LANKA|سريلانكا;AF AFG AFGHANISTAN|أفغانستان;PH PHL PHILIPPINES|الفلبين;ID IDN INDONESIA|إندونيسيا;MY MYS MALAYSIA|ماليزيا;TH THA THAILAND|تايلاند;VN VNM VIET NAM|فيتنام;MM MMR MYANMAR|ميانمار;CN CHN CHINA|الصين;JP JPN JAPAN|اليابان;KR KOR KOREA|كوريا الجنوبية;SG SGP SINGAPORE|سنغافورة;MV MDV MALDIVES|المالديف;KZ KAZ KAZAKHSTAN|كازاخستان;UZ UZB UZBEKISTAN|أوزبكستان;AZ AZE AZERBAIJAN|أذربيجان;GE GEO GEORGIA|جورجيا;AM ARM ARMENIA|أرمينيا;RU RUS RUSSIAN FEDERATION|روسيا;UA UKR UKRAINE|أوكرانيا;GB GBR UNITED KINGDOM|بريطانيا;IE IRL IRELAND|أيرلندا;FR FRA FRANCE|فرنسا;DE DEU GERMANY|ألمانيا;IT ITA ITALY|إيطاليا;ES ESP SPAIN|إسبانيا;PT PRT PORTUGAL|البرتغال;NL NLD NETHERLANDS|هولندا;BE BEL BELGIUM|بلجيكا;CH CHE SWITZERLAND|سويسرا;AT AUT AUSTRIA|النمسا;SE SWE SWEDEN|السويد;NO NOR NORWAY|النرويج;DK DNK DENMARK|الدنمارك;FI FIN FINLAND|فنلندا;PL POL POLAND|بولندا;GR GRC GREECE|اليونان;CY CYP CYPRUS|قبرص;BA BIH BOSNIA AND HERZEGOVINA|البوسنة;AL ALB ALBANIA|ألبانيا;US USA USA|أمريكا;CA CAN CANADA|كندا;MX MEX MEXICO|المكسيك;BR BRA BRAZIL|البرازيل;AU AUS AUSTRALIA|أستراليا;NZ NZL NEW ZEALAND|نيوزيلندا`.split(";").map(r=>{const[a,ar]=r.split("|"),p=a.split(" ");return{a2:p[0],a3:p[1],en:p.slice(2).join(" "),ar}});
const ALT={"UNITED STATES":"US","TURKEY":"TR","VIETNAM":"VN","KOREA (REP.)":"KR","SOUTH KOREA":"KR","RUSSIA":"RU","PALESTINE":"PS","UK":"GB","UAE":"AE","KSA":"SA"};
const byA2=c=>CTRY.find(x=>x.a2===c),byA3=c=>CTRY.find(x=>x.a3===c);
function cFind(s){if(!s)return null;s=String(s).toUpperCase().replace(/[^A-Z ]/g," ").replace(/\s+/g," ").trim();if(!s)return null;
  let c=CTRY.find(x=>x.en===s)||(ALT[s]&&byA2(ALT[s]));if(c)return c;
  c=CTRY.filter(x=>s.includes(x.en)).sort((a,b)=>b.en.length-a.en.length)[0];if(c)return c;
  /* تسامح مع أخطاء القراءة: أقرب اسم دولة بفرق حرف أو حرفين */
  let best=null,bd=9;for(const x of CTRY){const d=lev(s.slice(0,x.en.length+1),x.en);const lim=x.en.length>=8?2:1;if(d<=lim&&d<bd){bd=d;best=x}}return best}
const cAr=c=>c?c.ar:"—";
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){const q=[i];for(let j=1;j<=n;j++)q[j]=Math.min(p[j]+1,q[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=q}return p[n]}

/* ---------- تجهيز الصورة: تكبير + تنعيم (يشيل تموّج شاشة الكمبيوتر) + تباين ---------- */
function loadImg(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{ok(im);setTimeout(()=>URL.revokeObjectURL(u),2000)};im.onerror=no;im.src=u})}
function prep(im,mode){const W0=im.naturalWidth,H0=im.naturalHeight,target=mode==="screen"?2600:2000;const s=Math.min(2.2,target/Math.max(W0,1));
  const W=Math.round(W0*s),H=Math.round(H0*s),cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d",{willReadFrequently:true});
  x.drawImage(im,0,0,W,H);const d=x.getImageData(0,0,W,H),p=d.data,g=new Float32Array(W*H);
  for(let i=0,j=0;i<p.length;i+=4,j++)g[j]=p[i]*.299+p[i+1]*.587+p[i+2]*.114;
  if(mode==="screen"){const r=Math.max(2,Math.round(W/1100));blur(g,W,H,r);blur(g,W,H,r)}
  /* تباين تلقائي: يتجاهل أفتح وأغمق 2% */
  const hist=new Uint32Array(256);for(let j=0;j<g.length;j++)hist[g[j]|0]++;let lo=0,hi=255,acc=0;const cut=g.length*.02;
  for(let v=0;v<256;v++){acc+=hist[v];if(acc>cut){lo=v;break}}acc=0;for(let v=255;v>=0;v--){acc+=hist[v];if(acc>cut){hi=v;break}}
  const sc=255/Math.max(1,hi-lo);
  for(let i=0,j=0;i<p.length;i+=4,j++){let v=(g[j]-lo)*sc;v=v<0?0:v>255?255:v;if(mode==="screen")v=v>150?255:0;p[i]=p[i+1]=p[i+2]=v}
  x.putImageData(d,0,0);return cv}
/* قصّ أسفل الصورة (منطقة الشريط) مع تكبير وتباين — bin: أبيض/أسود بعتبة محلية */
function prepMRZ(im,fr,target,bin){const W0=im.naturalWidth,H0=im.naturalHeight,s=Math.min(3,target/Math.max(W0,1)),W=Math.round(W0*s),H=Math.round(H0*fr*s);
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d",{willReadFrequently:true});x.drawImage(im,0,H0*(1-fr),W0,H0*fr,0,0,W,H);
  const d=x.getImageData(0,0,W,H),p=d.data,g=new Float32Array(W*H);for(let i=0,j=0;i<p.length;i+=4,j++)g[j]=p[i]*.299+p[i+1]*.587+p[i+2]*.114;
  let lo=255,hi=0;for(let j=0;j<g.length;j+=7){if(g[j]<lo)lo=g[j];if(g[j]>hi)hi=g[j]}const sc=255/Math.max(1,hi-lo);
  let bg=null;if(bin){bg=Float32Array.from(g);blur(bg,W,H,Math.max(8,Math.round(W/60)))}
  for(let i=0,j=0;i<p.length;i+=4,j++){let v=bin?(g[j]<bg[j]-12?0:255):(g[j]-lo)*sc;v=v<0?0:v>255?255:v;p[i]=p[i+1]=p[i+2]=v}x.putImageData(d,0,0);return cv}
function blur(g,W,H,r){const t=new Float32Array(g.length),n=2*r+1;
  for(let y=0;y<H;y++){let s=0;const o=y*W;for(let k=-r;k<=r;k++)s+=g[o+Math.min(W-1,Math.max(0,k))];for(let x=0;x<W;x++){t[o+x]=s/n;s+=g[o+Math.min(W-1,x+r+1)]-g[o+Math.max(0,x-r)]}}
  for(let x=0;x<W;x++){let s=0;for(let k=-r;k<=r;k++)s+=t[Math.min(H-1,Math.max(0,k))*W+x];for(let y=0;y<H;y++){g[y*W+x]=s/n;s+=t[Math.min(H-1,y+r+1)*W+x]-t[Math.max(0,y-r)*W+x]}}}

/* ---------- محرك القراءة ---------- */
let worker=null,wP=null;
function loadScript(u){return new Promise((ok,no)=>{if(window.Tesseract)return ok();const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>no(new Error("lib"));document.head.appendChild(s)})}
async function getWorker(onp){if(worker)return worker;if(wP)return wP;
  wP=(async()=>{await loadScript(TESS+"tesseract.min.js");const o={logger:m=>{if(onp&&m.status)onp(m)}};
    if(window.TESS_LOCAL)Object.assign(o,window.TESS_LOCAL);
    worker=await Tesseract.createWorker("eng",1,o);await worker.setParameters({preserve_interword_spaces:"1"});return worker})();
  try{return await wP}catch(e){wP=null;throw e}}
async function ocr(cv,psm){const w=await getWorker();await w.setParameters({tessedit_pageseg_mode:String(psm||6)});const r=await w.recognize(cv);return r.data.text||""}

/* ---------- تصحيح كلمات تيماتيك اللي تنقرأ غلط ---------- */
const VOC=("VISA VISAS REQUIRED NOT EXCEPT PASSPORT PASSPORTS PASSENGER PASSENGERS NATIONALS NATIONAL NATIONALITY VALID VALIDITY ARRIVAL DEPARTURE MONTHS MONTH TRANSIT DESTINATION EMBARKATION RESIDENCE RESIDENTS RESIDENT "+
 "CONFIRMED ONWARD RETURN TICKET TICKETS HOURS WITHIN COUNTRY THIRD INTERNATIONAL AIRPORT AREA DOCUMENTS DOCUMENT REQUIRED HOTEL BOOKING ALLOWED ENTER TRAVELING TRAVELLING WARNING ADDITIONAL INFORMATION "+
 "MINORS MINOR YOUNGER YEARS PARENT EXEMPTIONS NORMAL ONLY ISSUED EMERGENCY CERTIFICATE VACCINATION YELLOW FEVER HEALTH INSURANCE FUNDS SUFFICIENT BLANK PAGES ELECTRONIC AUTHORIZATION AUTHORISATION OBTAIN "+
 "THROUGH UNITED ARAB EMIRATES SAUDI ARABIA ADMISSION RESTRICTIONS TRAVEL CREW MEMBERS GENDER STAY MAXIMUM MINIMUM BEYOND PERIOD INTENDED HOLDING HOLDERS ACCEPTED BOARDING COMPLETE DECLARATION FORM "+
 "ONLINE PORTAL EXTENDED BOOKLET STAMP CONTAINS DUAL PERMIT REGISTERED IMMIGRATION IMMIGRATIONS CUSTOMS BAGGAGE SEPARATE AIRSIDE APPLY TOURIST CALENDAR FACILITATION IDENTITY").split(" ");
const VSET=new Set(VOC);CTRY.forEach(c=>c.en.split(" ").forEach(w=>{if(w.length>3){VSET.add(w);VOC.push(w)}}));
function fixWord(w){if(w.length<4||VSET.has(w)||!/^[A-Z]+$/.test(w))return w;const lim=w.length>=7?2:1;let best=w,bd=lim+1;
  for(const v of VOC){if(Math.abs(v.length-w.length)>lim)continue;const d=lev(w,v);if(d<bd){bd=d;best=v}}return best}
function cleanLines(raw){return raw.split(/\n/).map(l=>{
    /* ضجيج الحواف: كلمات قصيرة بحروف صغيرة قبل نص تيماتيك (تيماتيك كله حروف كبيرة) */
    let t=l.replace(/[|‘’“”`~_¥»«]/g," ").replace(/\s+/g," ").trim();const tk=t.split(" ");let i=0;
    while(i<tk.length&&i<4&&(/[a-z]/.test(tk[i])&&tk[i].length<=5||/^[^A-Za-z0-9\-(]+$/.test(tk[i])))i++;
    t=tk.slice(i).join(" ").toUpperCase();
    t=t.replace(/\b[A-Z]+\b/g,fixWord).replace(/\s+[^A-Z0-9().,:\-/'>]{1,3}$/,"").trim();
    return t}).filter(l=>l.length>2)}

/* ---------- تخمين الدولة من نص حر (مواقع رسمية/مدن/أسماء دول) ---------- */
const HINT=[[/GDRFA|ICP\.?GOV\.?AE|\bU\.?A\.?E\b|UNITED ARAB EMIRATES|\bDUBAI\b|ABU ?DHABI|SHARJAH|EMIRATES ID|FEDERAL AUTHORITY FOR IDENTITY/,"AE"],
  [/KINGDOM OF SAUDI|\bKSA\b|MOFA\.GOV\.SA|ENJAZ|VISA\.VISITSAUDI|\bIQAMA\b|MUQEEM|JAWAZAT/,"SA"],[/STATE OF QATAR|MOI\.GOV\.QA|HAYYA/,"QA"],[/KINGDOM OF BAHRAIN|NPRA|EVISA\.GOV\.BH/,"BH"],
  [/STATE OF KUWAIT|MOI\.GOV\.KW/,"KW"],[/SULTANATE OF OMAN|ROP\.GOV\.OM/,"OM"],[/VISA2EGYPT|ARAB REPUBLIC OF EGYPT/,"EG"],[/HASHEMITE KINGDOM|JORDAN/,"JO"],[/E-?VISA\.GOV\.TR|REPUBLIC OF TURKIYE|TURKEY/,"TR"]];
function guessC(txt,skip){const T=String(txt||"").toUpperCase();for(const[re,a2]of HINT)if(re.test(T)){const c=byA2(a2);if(c&&!(skip&&skip.a2===a2))return c}
  const cnt={};CTRY.forEach(c=>{if(skip&&skip.a2===c.a2)return;const n=T.split(c.en).length-1;if(n)cnt[c.a2]=(cnt[c.a2]||0)+n*c.en.length});
  const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];return best?byA2(best[0]):null}
/* ---------- فيزا بدون شريط مقروء (تأشيرة إلكترونية مطبوعة / إذن دخول / إقامة) ---------- */
function parseVisaText(raw,skip){const T=String(raw||"").toUpperCase().replace(/[|]/g," ");
  const isRes=/RESIDEN(?:CE|T) (?:PERMIT|VISA|CARD)|\bIQAMA\b|EMIRATES ID|IDENTITY CARD/.test(T),isVisa=/\bV[I1]SA\b|E-?V[I1]SA|ENTRY PERMIT|VISIT VISA|TOURIST|ENTRY VISA|PERMIT NO|EMPLOYMENT|WORK (?:VISA|PERMIT)|LABOU?R|PROFESSION|SPONSOR|EMPLOYER/.test(T);
  const kind=/EMPLOYMENT|WORK (?:VISA|PERMIT)|LABOU?R|PROFESSION|EMPLOYER|SPONSOR/.test(T)?"عمل":/TOURIS/.test(T)?"سياحة":/VISIT/.test(T)?"زيارة":/TRANSIT/.test(T)?"ترانزيت":isRes?"إقامة":"";
  if(!isRes&&!isVisa&&T.replace(/[^A-Z]/g,"").length<40)return null;
  const c=guessC(T,skip);
  const all=datesIn(T).filter(x=>x.d.getUTCFullYear()>=2015&&x.d.getUTCFullYear()<=new Date().getUTCFullYear()+12);
  let exp=null;const km=T.match(/(?:VALID(?:ITY)?\s*(?:UNTIL|TILL|TO|THRU)|EXPIR[A-Z]*(?:\s*DATE)?|DATE OF EXPIRY|EXP\.?\s*DATE|UNTIL|ENTER BEFORE|USE BEFORE)[^0-9A-Z]{0,6}([0-9][0-9A-Z\/.\- ]{5,12})/);
  if(km){const d=datesIn(km[1]);if(d.length)exp=d[0].d}
  if(!exp&&all.length)exp=all.map(x=>x.d).sort((a,b)=>b-a)[0];
  const pn=T.match(/PASSPORT\s*(?:NO|NUMBER|#)?\.?\s*:?\s*([A-Z]{0,2}\d{6,9})/),vn=T.match(/(?:VISA|PERMIT|ENTRY PERMIT|FILE)\s*(?:NO|NUMBER|#)\.?\s*:?\s*([0-9\/]{6,20})/);
  const nm=T.match(/(?:FULL NAME|NAME)\s*:?\s*([A-Z]{2,}(?: [A-Z]{2,}){1,4})/);
  return{type:isRes&&!isVisa?"res":"visa",kind,raw:T,ocr:true,state:c?c.a3:"",c,num:vn?vn[1]:"",pass:pn?pn[1]:"",sur:nm?nm[1]:"",giv:"",exp,dates:all,lines:["",""]}}

/* ---------- تحليل نص تيماتيك ---------- */
function parseTim(lines){
  const T={hdr:{},secs:[],raw:lines.join("\n")};const all=lines.join("\n");
  const g=(re)=>{const m=all.match(re);return m?m[1].trim():""};
  T.hdr.nat=cFind(g(/N?ATIONAL\s+([A-Z ]{3,30}?)\s*[([{]/))||cFind(g(/NATIONAL[I1]?TY:?\s*([A-Z]+(?: [A-Z]+)?)\s/));
  T.hdr.res=cFind(g(/RESIDENCE\s+([A-Z ]{3,30}?)\s*[([{]/));
  T.hdr.emb=cFind(g(/BARKATION\s+([A-Z ]{3,30}?)\s*[([{]/));
  T.hdr.tr=cFind(g(/^\s*\W?\s*T?RANS[I1]T\s+([A-Z ]{3,30}?)\s*[([{]/m));
  T.hdr.dst=cFind(g(/^\s*\W?\s*D?ESTINATION\s+([A-Z ]{3,30}?)\s*[([{]/m))||cFind(g(/DESTINATION:?\s*([A-Z ]{3,30})/));
  const dm=all.match(/T[I1]MAT[I1]C-?\d?\s*\/\s*(\d{2}[A-Z0O]{3}\d{2})/);T.hdr.date=dm?dm[1]:"";
  /* أقسام: VISA TRANSIT X · VISA DESTINATION X · HEALTH ... */
  let cur=null;
  for(const l of lines){
    const m=l.match(/\b(?:V?I?SA|HEALTH)\s+(TRANSIT|DESTINATION)\s+([A-Z ]{3,40}?)\s*(?:[([{]|$)/);
    if(m&&!/CHECK DESTINATION/.test(l)){const kind=/TRANS/.test(m[1])?"tr":"dst",health=/HEALTH/.test(l),c=cFind(m[2]);
      /* نفس القسم يتكرر لو الصور متداخلة: ندمجه */
      cur=T.secs.find(x=>x.kind===kind&&x.health===health&&(x.c&&c?x.c.a2===c.a2:x.c===c));if(!cur){cur={kind,health,c,lines:[]};T.secs.push(cur)}continue}
    if(cur)cur.lines.push(l)}
  /* بدون عناوين واضحة: نعامل النص كله كقسم وجهة */
  if(!T.secs.length)T.secs.push({kind:"dst",c:T.hdr.dst,lines:lines});
  if(!T.hdr.tr){const x=T.secs.find(s=>s.kind==="tr"&&s.c);if(x)T.hdr.tr=x.c}if(!T.hdr.dst){const x=T.secs.find(s=>s.kind==="dst"&&s.c);if(x)T.hdr.dst=x.c}
  if(!T.hdr.dst)T.hdr.dst=guessC(all,T.hdr.nat);
  T.secs.forEach(s=>{if(!s.c&&s.kind==="dst")s.c=T.hdr.dst});
  T.secs.forEach(s=>{s.txt=s.lines.join(" ").replace(/\s+-\s+/g," • ").replace(/\s[.,:;=]+(?=\s)/g," ").replace(/\s+/g," ");s.items=rules(s,T)});
  return T}
/* القواعد: كل وحدة تطلع بند عربي واضح + درجة (r أحمر مانع/مطلوب · a تنبيه/شرط · g مسموح · i معلومة) */
function rules(s,T){const t=s.txt,out=[],cn=cAr(s.c),add=(lv,ar,src,sh)=>out.push({lv,ar,src:src||"",sh:sh||""});
  const near=(re,n=170)=>{const m=t.match(re);if(!m)return"";return t.slice(Math.max(0,m.index-20),m.index+n).replace(/^\S*\s/,"")};
  const vNot=/V?ISA NOT REQUIRED/.test(t),vExc=/V?ISA REQUIRED,?\s*EXCEPT/.test(t),vReq=/(?<!NOT )V?ISA REQUIRED(?!,?\s*EXCEPT)/.test(t)&&!vNot;
  const twov=/T?WOV\b|TRANSIT WITHOUT V?ISA/.test(t);
  if(vNot)add("g",`التأشيرة <b>غير مطلوبة</b> ${s.kind==="tr"?"للترانزيت في":"لدخول"} ${cn}`,near(/V?ISA NOT REQUIRED/,60));
  if(vExc){const h=t.match(/WITHIN\s+(\d{1,3})\s+HOURS?/);
    add("a",`${s.kind==="tr"?"ترانزيت "+cn:"دخول "+cn}: التأشيرة <b>مطلوبة إلا</b> بشروط${twov?" (ترانزيت بدون تأشيرة TWOV)":""}`,near(/V?ISA REQUIRED,?\s*EXCEPT/,260),`تأشيرة ${cn} أو شروط الإعفاء منها`);
    if(/CONFIRMED ONWARD/.test(t))add("a",`لازم <b>تذكرة مؤكدة</b> لرحلة إلى دولة ثالثة${h?` خلال <b>${h[1]} ساعة</b>`:""}`,near(/CONFIRMED ONWARD/),`تذكرة مؤكدة لدولة ثالثة${h?` خلال ${h[1]} ساعة`:""}`);
    if(/STAY IN THE INTERNATIONAL TRANSIT AREA/.test(t))add("a","الراكب <b>يبقى في منطقة الترانزيت</b> ولا يطلع من المطار",near(/STAY IN THE INTERNATIONAL TRANSIT/));
    if(/DOCUMENTS REQUIRED FOR THE NEXT DESTINATION/.test(t))add("a","لازم تكون معه <b>وثائق الوجهة التالية</b> كاملة","","وثائق الوجهة التالية كاملة")}
  if(vReq)add("r",`<b>تأشيرة ${cn} مطلوبة</b>${s.kind==="tr"?" للترانزيت":""}`,near(/V?ISA REQUIRED/,80));
  if(/VISA ON ARRIVAL|OBTAIN A VISA ON ARRIVAL/.test(t))add("a",`يمكن الحصول على <b>تأشيرة عند الوصول</b> بشروط`,near(/VISA ON ARRIVAL/,220),"شروط التأشيرة عند الوصول");
  if(/\bE-?VISA\b|ELECTRONIC VISA|\bETA\b|ELECTRONIC TRAVEL AUTHORI[SZ]ATION|\bEVISITOR\b/.test(t))add("a","تحقق من <b>التأشيرة الإلكترونية / ETA</b> (مطبوعة أو على الجوال) وأنها باسم الراكب ورقم جوازه",near(/E-?VISA|ELECTRONIC|\bETA\b/,200),"التأشيرة الإلكترونية باسمه ورقم جوازه");
  /* صلاحية الجواز */
  const mv=t.match(/VALID(?:ITY)?\s+(?:FOR\s+)?(?:A\s+)?(?:MINIMUM\s+(?:OF\s+)?|AT\s+LEAST\s+)?(\d{1,2})\s+MONTHS?(?:\s+(BEYOND|AFTER|FROM|ON)\s+(?:THE\s+)?(?:DATE\s+OF\s+)?(ARRIVAL|DEPARTURE|ENTRY))?/);
  if(mv){s.months=+mv[1];s.mRef=mv[3]||"ARRIVAL";add("a",`الجواز لازم يكون <b>ساري ${mv[1]} شهور</b> ${mv[3]==="DEPARTURE"?"بعد تاريخ المغادرة":"من تاريخ الوصول"}`,near(/VALID(?:ITY)?\s+(?:FOR\s+)?(?:A\s+)?(?:MINIMUM|AT LEAST)?\s*(?:OF\s+)?\d{1,2}\s+MONTHS?/))}
  else if(/MUST BE VALID ON ARRIVAL|VALID ON ARRIVAL/.test(t)){s.months=0;add("a","الجواز لازم يكون <b>ساري يوم الوصول</b>",near(/VALID ON ARRIVAL/))}
  else if(/PERIOD OF (?:INTENDED )?STAY/.test(t)){s.months=0;add("a","الجواز لازم يكون <b>ساري طول مدة الإقامة</b>",near(/PERIOD OF (?:INTENDED )?STAY/))}
  if(/NORMAL PASSPORTS ONLY/.test(t)&&s.kind==="dst")add("i","المعلومات هذي <b>للجوازات العادية</b> فقط (مو الدبلوماسية أو الخاصة)","");
  /* ممنوع الترانزيت لوجهات معيّنة */
  for(const m of t.matchAll(/NOT ALLOWED TO TRANSIT THROUGH [A-Z =•]+? WHEN T?\s?RAVEL+ING TO ([A-Z ]+?)[.•]/g)){const c=cFind(m[1]),hit=c&&T.hdr.dst&&c.a2===T.hdr.dst.a2;
    add(hit?"r":"i",`ممنوع الترانزيت عبر ${cn} إذا الوجهة <b>${cAr(c)||E(m[1])}</b>${hit?" — <b>وهي وجهة هذا الراكب!</b>":""}`,m[0])}
  if(/NOT ALLOWED TO ENTER/.test(t))add("a","فيه <b>منع دخول لفئة معيّنة</b> من الركاب — تأكد إن الراكب مو منها (اقرأ النص تحت)",near(/NOT ALLOWED TO ENTER/,220));
  if(/RETURN OR ONWARD|RETURN\/ONWARD|ONWARD OR RETURN|RETURN TICKET/.test(t)&&!/CONFIRMED ONWARD/.test(t))add("a","لازم <b>تذكرة عودة أو مغادرة</b> مؤكدة",near(/RETURN OR ONWARD|RETURN\/ONWARD|ONWARD OR RETURN|RETURN TICKET/),"تذكرة عودة أو مغادرة مؤكدة");
  if(/HOTEL (?:BOOKING|RESERVATION)/.test(t)){const h=t.match(/TRANSIT TIME IS MORE THAN (\d+) HOURS/);add("a",`<b>حجز فندق</b>${h?` إذا الترانزيت أكثر من ${h[1]} ساعة`:""}`,near(/HOTEL (?:BOOKING|RESERVATION)/,160),"حجز فندق"+(h?` (لو الترانزيت أكثر من ${h[1]} ساعة)`:""))}
  if(/SUFFICIENT FUNDS/.test(t))add("a","قد يُطلب <b>ما يثبت كفاية المال</b>",near(/SUFFICIENT FUNDS/),"ما يثبت كفاية المال");
  if(/BLANK (?:VISA )?PAGES?/.test(t))add("a","لازم <b>صفحات فاضية</b> في الجواز",near(/BLANK (?:VISA )?PAGES?/),"صفحات فاضية في الجواز");
  if(/YELLOW FEVER/.test(t))add("a","<b>شهادة تطعيم الحمى الصفراء</b> قد تكون مطلوبة",near(/YELLOW FEVER/,200),"شهادة الحمى الصفراء (إن لزمت)");
  else if(/VACCINAT/.test(t))add("a","فيه شرط <b>تطعيم</b> — اقرأ النص",near(/VACCINAT/,200),"شهادة التطعيم المطلوبة");
  if(/AIR SUVIDHA|SELF-?DECLARATION FORM/.test(t))add("a","الراكب لازم يعبّي <b>نموذج Air Suvidha</b> (إقرار ذاتي) أونلاين قبل الصعود — ويُقبل نموذج ورقي عند الوصول",near(/AIR SUVIDHA/,200),"نموذج Air Suvidha");
  if(/ARRIVAL CARD|LANDING CARD|ARRIVAL DECLARATION/.test(t))add("a","لازم <b>بطاقة وصول</b> / إقرار وصول",near(/ARRIVAL CARD|LANDING CARD|ARRIVAL DECLARATION/),"بطاقة وصول");
  if(/EXTENDED BY THE ISSUE OF FRESH BOOKLET|FRESH BOOKLET/.test(t))add("a","إذا جوازه فيه ختم <b>تمديد بإصدار دفتر جديد</b> لازم يسافر <b>بالجواز الجديد</b>",near(/FRESH BOOKLET/,150),"الجواز الجديد لو جوازه ممدد");
  if(/GENDER F OR M/.test(t))add("i","الجواز لازم يكون فيه الجنس <b>F أو M</b>","");
  const mn=t.match(/MINORS? YOUNGER THAN (\d+) YEARS?/);if(mn)add("i",`القاصرين أقل من <b>${mn[1]} سنة</b>: ${/REGISTERED IN A PARENT/.test(t)?"يُسمح لهم إذا مسجلين في جواز أحد الوالدين":"لهم شروط خاصة"}`,near(/MINORS? YOUNGER/,160));
  if(/DUAL NATIONALITY/.test(t))add("i","الدولة <b>ما تسمح بازدواج الجنسية</b> لمواطنيها",near(/DUAL NATIONALITY/,120));
  if(/INSURANCE/.test(t))add("a","قد يُطلب <b>تأمين سفر/صحي</b>",near(/INSURANCE/,160),"تأمين سفر/صحي (قد يُطلب)");
  if(/TOURIST VISA/.test(t)&&/180 DAYS|MAXIMUM OF/.test(t))add("i","التأشيرة السياحية لها <b>حد أقصى لمدة الإقامة</b>",near(/TOURIST VISA/,180));
  if(/ID CARD NUMBER WHICH STARTS WITH 784/.test(t))add("i","رقم الهوية الإماراتية (يبدأ بـ 784) <b>يُدخل يدوياً</b> في النظام","");
  return out}

/* ---------- الشريط المقروء آلياً (MRZ): جواز TD3 · فيزا MRV · بطاقة TD1 ---------- */
const DIG={O:"0",Q:"0",D:"0",I:"1",L:"1",Z:"2",S:"5",B:"8",G:"6",T:"7"};
const toDig=s=>s.replace(/[A-Z]/g,c=>DIG[c]||c);
const cd=s=>{const w=[7,3,1];let t=0;for(let i=0;i<s.length;i++){const c=s[i];const v=c==="<"?0:/\d/.test(c)?+c:c.charCodeAt(0)-55;t+=v*w[i%3]}return String(t%10)};
const ymd=(s,fut)=>{if(!/^\d{6}$/.test(s))return null;let y=+s.slice(0,2);const m=+s.slice(2,4),d=+s.slice(4,6);if(m<1||m>12||d<1||d>31)return null;
  const now=new Date().getUTCFullYear()%100;y+=fut?2000:(y>now?1900:2000);return new Date(Date.UTC(y,m-1,d))};
function mrzLines(txt){return txt.toUpperCase().split(/\n/).map(l=>l.replace(/\s+/g,"").replace(/(?<=<)K(?=<)/g,"<").replace(/[«‹(\[{]/g,"<").replace(/[^A-Z0-9<]/g,"")).filter(l=>l.length>=28&&(l.match(/</g)||[]).length>=2)}
/* تصحيح خانة بالرقم الضابط: نجرب تبديل حرف واحد لين يطابق */
const okD=(g,k)=>{const d=ymd(g,k==="e");if(!d)return false;const y=d.getUTCFullYear(),n=new Date().getUTCFullYear();return k==="e"?y>=n-2&&y<=n+11:y<=n&&y>=n-100};
const CONF={"0":"8696","1":"74","2":"7","3":"85","4":"1","5":"63","6":"508","7":"12","8":"3069","9":"0"};
function fixCD(f,c,isDate){if(cd(f)===c)return f;const cands=[];
  for(let i=0;i<f.length;i++)for(const d of CONF[f[i]]||""){if(d===f[i])continue;const g=f.slice(0,i)+d+f.slice(i+1);if(cd(g)===c&&(!isDate||okD(g,isDate)))cands.push(g)}
  return cands.length===1?cands[0]:f}
function l2Only(L){let best=null;
  for(const l of L)for(let i=0;i+28<=l.length;i++){const x=l.slice(i,i+28),nat=x.slice(10,13).replace(/[0-9]/g,c=>({"0":"O","1":"I","5":"S","8":"B","2":"Z"})[c]);
    if(!/^[A-Z<]{3}$/.test(nat)||!byA3(nat.replace(/</g,"")))continue;const dob=toDig(x.slice(13,19)),exp=toDig(x.slice(21,27));if(!/^\d{6}$/.test(dob)||!/^\d{6}$/.test(exp)||!/[MF<]/.test(x[20]))continue;
    const ok={num:cd(x.slice(0,9))===toDig(x[9]),dob:cd(dob)===toDig(x[19]),exp:cd(exp)===toDig(x[27])},sc=Object.values(ok).filter(Boolean).length;
    if(sc>=2&&(!best||sc>best.sc))best={sc,x,nat,dob,exp,ok}}
  if(!best)return null;const x=best.x;
  return{type:"passport",state:best.nat,sur:"",giv:"",num:x.slice(0,9).replace(/<+$/,""),nat:best.nat,dob:ymd(best.dob),sex:x[20]==="<"?"":x[20],exp:ymd(best.exp,true),ok:best.ok,lines:["",x]}}
function parseMRZ(txt){const r=parseMRZ0(txt);if(r)return r;return l2Only(mrzLines(txt).map(l=>l.length>=28?l:"").filter(Boolean))}
function parseMRZ0(txt){const L=mrzLines(txt);
  for(let i=0;i<L.length-1;i++){const a=L[i],b=L[i+1];
    if(/^[PV]/.test(a)&&a.length>=40&&b.length>=36){const l1=(a+"<".repeat(44)).slice(0,44),l2=(b+"<".repeat(44)).slice(0,44);
      const nat=l2.slice(10,13).replace(/[0-9]/g,c=>({"0":"O","1":"I","5":"S","8":"B","2":"Z"})[c]),sex=l2[20];
      const dob=fixCD(toDig(l2.slice(13,19)),toDig(l2[19]),"d"),exp=fixCD(toDig(l2.slice(21,27)),toDig(l2[27]),"e"),num=l2.slice(0,9).replace(/<+$/,"");
      const nm=l1.slice(5).split("<<"),sur=nm[0].replace(/</g," ").trim(),giv=(nm.slice(1).join(" ")).replace(/</g," ").replace(/\s+/g," ").trim().split(" ").filter((w,i)=>i===0||w.length>1&&!/^[CLKE]{3,}$/.test(w)).join(" ");
      const ok={num:cd(l2.slice(0,9))===toDig(l2[9]),dob:cd(dob)===toDig(l2[19]),exp:cd(exp)===toDig(l2[27])};
      return{type:a[0]==="V"?"visa":"passport",state:l1.slice(2,5).replace(/</g,""),sur,giv,num,nat,dob:ymd(dob),sex:sex==="<"?"":sex,exp:ymd(exp,true),ok,lines:[l1,l2]}}
    if(/^[IAC][A-Z<]/.test(a)&&i+2<L.length&&a.length>=28){const l1=(a+"<".repeat(30)).slice(0,30),l2=(b+"<".repeat(30)).slice(0,30),l3=(L[i+2]+"<".repeat(30)).slice(0,30);
      const dob=toDig(l2.slice(0,6)),exp=toDig(l2.slice(8,14)),nm=l3.split("<<");
      return{type:"id",state:l1.slice(2,5).replace(/</g,""),num:l1.slice(5,14).replace(/<+$/,""),nat:l2.slice(15,18),dob:ymd(dob),sex:l2[7],exp:ymd(exp,true),sur:nm[0].replace(/</g," ").trim(),giv:(nm[1]||"").replace(/</g," ").trim(),
        ok:{dob:cd(dob)===toDig(l2[6]),exp:cd(exp)===toDig(l2[14])},lines:[l1,l2,l3]}}}
  return null}
/* تواريخ مكتوبة في الوثيقة (ميلادي أو هجري) */
const MON={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
function hijriToG(y,m,d){try{const f=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{year:"numeric",month:"numeric",day:"numeric",timeZone:"UTC"});
  let t=Date.UTC(Math.round((y-1)*0.97-0)+622-0,0,1);/* تقريب ثم بحث */t=Date.UTC(Math.floor(y*0.970229+621.5643),0,1)-400*864e5;
  for(let k=0;k<800;k++){const dt=new Date(t+k*864e5),p=f.formatToParts(dt);const g=n=>+(p.find(x=>x.type===n)||{}).value;if(parseInt(g("year"))===y&&g("month")===m&&g("day")===d)return dt}}catch(e){}return null}
function datesIn(txt){const out=[],T=txt.toUpperCase();let m;
  const re1=/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g;while((m=re1.exec(T))){const y=+m[3],a=+m[1],b=+m[2];if(y>=1400&&y<1500){const g=hijriToG(y,b,a);if(g)out.push({d:g,h:`${a}/${b}/${y}هـ`})}else if(y>1900&&b<=12)out.push({d:new Date(Date.UTC(y,b-1,a))})}
  const re2=/\b(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/g;while((m=re2.exec(T))){const y=+m[1],b=+m[2],a=+m[3];if(y>=1400&&y<1500){const g=hijriToG(y,b,a);if(g)out.push({d:g,h:`${y}/${b}/${a}هـ`})}else if(y>1900&&b<=12)out.push({d:new Date(Date.UTC(y,b-1,a))})}
  const re3=/\b(\d{1,2})\s?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s?(\d{4}|\d{2})\b/g;while((m=re3.exec(T))){let y=+m[3];if(y<100)y+=2000;out.push({d:new Date(Date.UTC(y,MON[m[2]]-1,+m[1]))})}
  return out}

/* ---------- الحجز / التذكرة ---------- */
const APT="RUH JED DMM MED AJF ELQ AHB TUF TIF GIZ HOF TBK HAS AQI DWD ULH YNB EAM BHH RAE WAE URY TUU KMC ABT BHA DXB AUH SHJ DWC RKT DOH BAH KWI MCT SLL CAI HBE SSH HRG LXR ASW AMM AQJ BEY BGW BSR EBL NJF IST SAW AYT ESB ADB TZX KHI LHE ISB PEW MUX SKT LYP MUL DAC CGP ZYL KTM CMB BOM DEL HYD MAA BLR COK CCJ TRV LKO ATQ AMD GOI JAI CCU IXE MNL CEB CGK DPS SUB KUL PEN BKK HKT SGN HAN ADD NBO EBB DAR KRT PZU JUB MGQ JIB ASM LOS ABV ACC TUN ALG CMN RBA TIP MLE LHR LGW MAN CDG FRA MUC AMS BRU ZRH VIE FCO MXP MAD BCN ATH LCA SVO DME JFK IAD ORD LAX YYZ SYD MEL PEK PVG CAN HKG ICN NRT HND SIN GYD TBS EVN TAS ALA".split(" ");
const APS=new Set(APT);
function parseBooking(txt){const T=txt.toUpperCase();const r={codes:[],flights:[],names:[],pnr:""};
  for(const m of T.matchAll(/\b([A-Z]{3})\b/g))if(APS.has(m[1])&&r.codes[r.codes.length-1]!==m[1])r.codes.push(m[1]);
  for(const m of T.matchAll(/\b([A-Z]{3})([A-Z]{3})\b/g))if(APS.has(m[1])&&APS.has(m[2])){if(r.codes[r.codes.length-1]!==m[1])r.codes.push(m[1]);r.codes.push(m[2])}
  for(const m of T.matchAll(/\b((?:[A-Z]{2}|[A-Z]\d|\d[A-Z]))\s?(\d{2,4})\b/g)){const c=m[1];if(/^(\d\d|[A-Z]\d{1})$/.test(c)&&!/[A-Z]/.test(c))continue;if(["NO","TO","OF","IN","ON","AT","PM","AM","MR","MS"].includes(c))continue;const f=c+m[2];if(!r.flights.includes(f))r.flights.push(f)}
  for(const m of T.matchAll(/\b([A-Z]{2,})\/([A-Z]{2,}(?: [A-Z]{2,})*?)(?:\s?(MR|MRS|MS|MISS|MSTR|CHD|INF))?\b/g))r.names.push({sur:m[1],giv:m[2].replace(/\s?(MR|MRS|MS|MISS|MSTR)$/,"")});
  const pm=T.match(/\b(?:PNR|BOOKING REF(?:ERENCE)?|RECORD LOCATOR|REF)[:\s]+([A-Z0-9]{6})\b/);if(pm)r.pnr=pm[1];
  const now=Date.now();r.dates=datesIn(T).map(x=>x.d).filter(d=>d-now>-400*864e5&&d-now<730*864e5);return r}

/* ---------- الحالة والواجهة ---------- */
const SLOTS=[{k:"tim",t:"شاشة TIMATIC",s:"صوّر الشاشة من أماديوس — صورة أو أكثر لو النص طويل",ic:"🖥️",multi:true},{k:"pp",t:"الجواز",s:"صفحة البيانات كاملة مع الشريط السفلي <<<",ic:"🛂"},
  {k:"vs",t:"الفيزا / الإقامة",s:"تأشيرة الوجهة أو الإقامة أو تأشيرة الخروج والعودة",ic:"🪪",multi:true},{k:"bk",t:"الحجز / التذكرة",s:"شاشة الحجز أو التذكرة الإلكترونية",ic:"🎫",multi:true}];
const S={files:{tim:[],pp:[],vs:[],bk:[]},date:"",busy:false,res:null};
let root=null;
const todayISO=()=>{const d=new Date(Date.now()+3*3600e3);return d.toISOString().slice(0,10)};
function mount(el){root=el;if(S.note==null)try{S.note=localStorage.getItem("ajf_tx_note")||""}catch(x){S.note=""}if(!S.date)S.date=todayISO();paint();if(S.res)relate()}
function paint(){if(!root)return;
  root.innerHTML=`<div class="tx-intro"><b>فحص وثائق الراكب</b><span>صوّر شاشة TIMATIC ووثائق الراكب، والتطبيق يقرأها ويطلع لك المطلوب بوضوح. الصور تُقرأ على جوالك فقط ولا تُرفع ولا تُحفظ.</span></div>
  <div class="tx-slots">${SLOTS.map(sl=>{const n=S.files[sl.k].length;return`<div class="tx-slot ${n?"on":""}"><label><input type="file" accept="image/*" ${sl.multi?"multiple":""} data-slot="${sl.k}" hidden><i>${sl.ic}</i><b>${sl.t}</b><small>${n?`✓ ${n} صورة`:sl.s}</small></label>${n?`<button class="tx-x" data-clr="${sl.k}" aria-label="حذف">✕</button>`:""}</div>`}).join("")}</div>
  <label class="tx-note-in"><span>📝 معلومات إضافية <small>(اختياري)</small></span><textarea id="txNote" rows="2" placeholder="مثال: معه تأشيرة عمل للإمارات، أو مقيم في قطر، أو مرافق لراكب — بدون الاسم ورقم الجواز">${E(S.note||"")}</textarea></label>
  <label class="tx-date"><span>تاريخ السفر</span><input type="date" id="txDate" value="${S.date}"></label>
  <button class="tx-go" id="txGo" ${S.busy||!S.files.tim.length&&!S.files.pp.length?"disabled":""}>${S.busy?"… جاري القراءة":"🔍 اقرأ وحلّل"}</button>
  <div class="tx-prog" id="txProg" ${S.busy?"":"hidden"}><i id="txBar"></i><span id="txPT"></span></div>
  <div id="txRes">${S.res?S.res:""}</div>`;paintAI()}
function prog(p,t){const b=root&&root.querySelector("#txBar"),s=root&&root.querySelector("#txPT");if(b)b.style.width=Math.round(p*100)+"%";if(s)s.textContent=t}
async function run(){if(S.busy)return;S.busy=true;S.res=null;S.ctx=null;S.aictx=undefined;S.ai=[];S.aerr="";S.aq="";paint();
  const jobs=[];SLOTS.forEach(sl=>S.files[sl.k].forEach((f,i)=>jobs.push({k:sl.k,f,i})));const txt={tim:[],pp:[],vs:[],bk:[]},mrz={pp:null,vs:[]};
  try{prog(.02,"تحميل محرك القراءة… (أول مرة فقط ~4MB)");await getWorker(m=>{if(m.status==="loading language traineddata")prog(.05,"تحميل لغة القراءة…")});
    for(let j=0;j<jobs.length;j++){const J=jobs[j],lbl=SLOTS.find(s=>s.k===J.k).t;prog((j+.1)/jobs.length,`قراءة ${lbl} (${j+1}/${jobs.length})…`);
      const im=await loadImg(J.f);
      if(J.k==="tim"){txt.tim.push(await ocr(prep(im,"screen"),6))}
      else{const t1=await ocr(prep(im,"doc"),J.k==="bk"?4:3);txt[J.k].push(t1);
        if(J.k==="pp"||J.k==="vs"){let m=parseMRZ(t1);
          const good=m=>m&&Object.values(m.ok).every(Boolean),score=m=>m?Object.values(m.ok).filter(Boolean).length:-1;
          /* محاولات إضافية على أسفل الصورة بحروف الشريط فقط، بقصّات ودقة وعتبات مختلفة لين تطابق الأرقام الضابطة */
          const tries=[[.38,"doc",0],[.28,"hi",0],[.5,"hi",1],[.22,"hi",1]];
          for(let k=0;k<tries.length&&!good(m);k++){const[fr,md,bin]=tries[k];prog((j+.3+k*.15)/jobs.length,`قراءة ${lbl} — محاولة ${k+2}…`);
            const cv=prepMRZ(im,fr,md==="hi"?3000:2000,bin);const w=await getWorker();await w.setParameters({tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",tessedit_pageseg_mode:"6"});
            const t2=(await w.recognize(cv)).data.text||"";await w.setParameters({tessedit_char_whitelist:""});const m2=parseMRZ(t2);if(score(m2)>score(m)){if(m&&m2&&!m2.sur&&m.sur){m2.sur=m.sur;m2.giv=m.giv}m=m2}}
          if(m){if(J.k==="pp"&&m.type!=="visa"&&!mrz.pp)mrz.pp=m;else mrz.vs.push(m)}
          else if(J.k==="vs"){const v=parseVisaText(t1,mrz.pp?byA3(mrz.pp.nat):null);if(v)mrz.vs.push(v)}}}}
    prog(1,"تحليل…");
    /* دمج صور تيماتيك وحذف الأسطر المكررة بين الصور */
    const seen=new Set(),lines=[];txt.tim.forEach(t=>cleanLines(t).forEach(l=>{const k=l.replace(/[^A-Z]/g,"");if(k.length>8&&seen.has(k))return;seen.add(k);lines.push(l)}));
    const T=lines.length?parseTim(lines):null;
    S.res=report(T,mrz,txt)}
  catch(e){console.error(e);S.res=`<div class="tx-err">تعذّرت القراءة: ${e.message==="lib"?"ما قدرنا نحمّل محرك القراءة — تأكد من الإنترنت.":"جرّب صورة أوضح."}</div>`}
  S.busy=false;paint();const r=root.querySelector("#txRes");if(r)r.scrollIntoView({behavior:"smooth",block:"start"});relate();
  const nt=(S.note||"").trim();if(S.ctx&&nt.length>1&&S.aictx!==undefined){S.aq=nt;askAI()}}
function relate(){const el=root&&root.querySelector("#txCirc");if(el&&S.ctx&&window.CIRCM)CIRCM.related(S.ctx,el)}
const fD=d=>d?`${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`:"—";
const mBetween=(a,b)=>(b.getUTCFullYear()-a.getUTCFullYear())*12+(b.getUTCMonth()-a.getUTCMonth())-(b.getUTCDate()<a.getUTCDate()?1:0);
function report(T,M,txt){S.ctx={T,P:M.pp,B:null,V:M.vs,date:S.date,note:(S.note||"").trim().slice(0,160)};const travel=new Date(S.date+"T00:00:00Z"),chk=[],LV={r:3,a:2,i:1,g:0};
  const SM={pp:null,vs:null,bk:null,tim:null,block:[],cond:[],look:[]},st=(k,m,t)=>{SM[k]={m,t}},cond=x=>{if(!SM.cond.includes(x))SM.cond.push(x)};
  const ask=(lv,ar)=>chk.push({lv,ar});
  const P=M.pp,nat=P?byA3(P.nat):null,natC=nat||(T&&T.hdr.nat)||null;
  M.vs.forEach(v=>{if(v.ocr&&natC&&v.c&&v.c.a2===natC.a2){v.c=guessC(v.raw,natC);v.state=v.c?v.c.a3:""}});
  /* 1) الجواز */
  if(P){if(P.exp&&P.exp<travel){ask("r",`<b>الجواز منتهي</b> (${fD(P.exp)}) — لا يُقبل للسفر`);st("pp","✗",`منتهي (${fD(P.exp)})`);SM.block.push("الجواز منتهي")}
    else if(P.exp)st("pp",P.ok.exp?"✓":"⚠️",`ساري لين ${fD(P.exp)} · باقي ${mBetween(travel,P.exp)} شهر${P.ok.exp?"":" — تأكد من التاريخ بعينك"}`);else st("pp","⚠️","تاريخ الانتهاء ما انقرأ — تأكد بعينك");
    if(!P.ok.exp||!P.ok.num)SM.look.push("رقم الجواز وتاريخ انتهائه");
    if(!P.ok.exp||!P.ok.num)ask("a","قراءة الشريط السفلي للجواز <b>غير مؤكدة</b> — طابق رقم الجواز وتاريخ الانتهاء بعينك");
    if(T&&T.hdr.nat&&nat&&T.hdr.nat.a2!==nat.a2){ask("r",`<b>الجنسية في شاشة تيماتيك (${T.hdr.nat.ar}) غير جنسية الجواز (${nat.ar})</b> — أعد الاستعلام بالجنسية الصحيحة`);SM.block.push("جنسية الاستعلام في تيماتيك غير جنسية الجواز — أعد الاستعلام")}}
  else if(S.files.pp.length){ask("a","ما قدرت أقرأ الشريط السفلي للجواز — صوّر صفحة البيانات كاملة ومستقيمة بدون لمعة");st("pp","⚠️","مرفق لكن ما انقرأ — تأكد من الصلاحية بعينك");cond("جواز ساري (تأكد بعينك)")}
  else{st("pp","—","لم يُرفق");cond("جواز ساري")}
  /* 2) شروط تيماتيك */
  if(T){const allIt=[];T.secs.forEach(s=>s.items.forEach(it=>allIt.push({...it,sec:s})));
    const need=Math.max(0,...T.secs.filter(s=>s.months!=null).map(s=>s.months));
    if(P&&P.exp&&P.exp>=travel){const left=mBetween(travel,P.exp);if(need>0&&left<need){ask("r",`صلاحية الجواز <b>${left} شهر</b> فقط والمطلوب <b>${need} شهور</b> — لا يُقبل`);st("pp","✗",`باقي ${left} شهر والمطلوب ${need}`);SM.block.push(`صلاحية الجواز أقل من ${need} شهور`)}
      else if(need>0){ask("g",`صلاحية الجواز ${left} شهر ✓ (المطلوب ${need})`);if(SM.pp&&SM.pp.m==="✓")SM.pp.t+=` (المطلوب ${need}) ✓`}else if(T.secs.some(s=>s.months===0))ask("g",`الجواز ساري يوم السفر ✓ (باقي ${left} شهر)`)}
    const vsOf=c=>M.vs.find(v=>v.type!=="passport"&&c&&(byA3(v.state)||{}).a2===c.a2)||(M.vs.length===1&&M.vs[0].ocr&&!M.vs[0].c?M.vs[0]:null);
    T.secs.filter(s=>s.kind==="dst").forEach(s=>{const vr=s.items.some(i=>i.lv==="r"&&/تأشيرة .* مطلوبة/.test(i.ar)),vx=s.items.some(i=>/مطلوبة إلا/.test(i.ar)),vn=s.items.some(i=>i.lv==="g"&&/غير مطلوبة/.test(i.ar)),cn=s.c?s.c.ar:"الوجهة";
      if(vn&&!vr){st("vs","✓",`غير مطلوبة لدخول ${cn}`);return}if(!vr&&!vx)return;
      const v=vsOf(s.c);
      if(v){if(v.exp&&v.exp<travel){ask("r",`تأشيرة ${cn} <b>منتهية</b> (${fD(v.exp)})`);st("vs","✗",`تأشيرة ${cn} منتهية (${fD(v.exp)})`);SM.block.push(`تأشيرة ${cn} منتهية`)}
        else if(v.exp){ask("g",`تأشيرة ${cn} موجودة وسارية لين ${fD(v.exp)} ✓`);st("vs","✓",`تأشيرة ${v.kind?v.kind+" ":""}${cn} سارية لين ${fD(v.exp)}${v.ocr?" (قراءة نصية — طابقها بعينك)":""}`);if(v.ocr)SM.look.push("تاريخ التأشيرة واسم الراكب فيها")}
        else{ask("a",`تأشيرة ${cn} <b>مرفقة</b> لكن تاريخ انتهائها ما انقرأ — تأكد بعينك`);st("vs","⚠️",`تأشيرة ${cn} مرفقة — تأكد من تاريخ الانتهاء بعينك`);SM.look.push(`تاريخ انتهاء تأشيرة ${cn}`)}
        const vp=v.ocr?v.pass:v.num;if(P&&vp&&P.num&&vp!==P.num&&!(v.lines[1]||"").includes(P.num)){ask("a","رقم الجواز في التأشيرة <b>ما يطابق</b> الجواز — تأكد إنها على الجواز الحالي");SM.look.push("رقم الجواز في التأشيرة")}}
      else if(vx){st("vs","⚠️",`تأشيرة ${cn} مطلوبة إلا بشروط — ما فيه تأشيرة مرفقة`)}
      else{const other=M.vs.find(v=>v.type!=="passport");
        ask("r",`<b>اطلب تأشيرة ${cn}</b> — ${other?`الصورة المرفقة تبيّن ${other.type==="res"?"إقامة":"تأشيرة"} ${other.c?other.c.ar:"دولة غير واضحة"} وليست تأشيرة ${cn}، تأكد بعينك`:S.files.vs.length?"ما قدرت أقرأ الصورة المرفقة، تأكد بعينك":"ما فيه صورة تأشيرة"}`);
        st("vs","✗",other?`المرفقة ${other.c?"لـ"+other.c.ar:"غير واضحة"} — تأشيرة ${cn} غير مؤكدة`:`تأشيرة ${cn} مطلوبة — ${S.files.vs.length?"الصورة ما انقرأت":"غير مرفقة"}`);cond(`تأشيرة ${cn} سارية`)}});
    allIt.filter(i=>i.lv==="r"&&!/تأشيرة .* مطلوبة/.test(i.ar)).forEach(i=>ask("r",i.ar));
    allIt.filter(i=>i.lv==="r"&&!/تأشيرة .* مطلوبة/.test(i.ar)).forEach(i=>SM.block.push(i.ar.replace(/<[^>]+>/g,"")));
    if(allIt.some(i=>/منع دخول لفئة/.test(i.ar)))SM.look.push("إن الراكب مو من الفئة الممنوعة من الدخول");
    allIt.filter(i=>i.lv==="a"&&!/الجواز لازم يكون/.test(i.ar)).forEach(i=>{ask("a",i.ar);if(i.sh&&!(/تأشيرة/.test(i.sh)&&SM.vs&&(SM.vs.m==="✓"||SM.cond.some(c=>/تأشيرة/.test(c)))))cond(i.sh)});
    st("tim","✓",`مقروءة${T.hdr.dst?" — الوجهة "+T.hdr.dst.ar:""}${T.hdr.tr?" · ترانزيت "+T.hdr.tr.ar:""}`);
    if(T.hdr.res&&T.hdr.res.a2==="SA"&&nat&&nat.a2!=="SA")ask("i","مقيم في السعودية: تأكد من <b>تأشيرة خروج وعودة أو خروج نهائي</b> سارية (تتحقق منها الجوازات)")}
  else if(S.files.tim.length){ask("a","ما قدرت أقرأ شاشة تيماتيك بوضوح — صوّرها مستقيمة وقريبة وبدون انعكاس، أو قسّمها على أكثر من صورة");st("tim","⚠️","ما انقرأت — الحكم ناقص")}
  else st("tim","—","لم تُرفق — الحكم ناقص");
  if(!SM.vs){const v=M.vs.find(v=>v.type!=="passport");if(v)st("vs",v.exp&&v.exp<travel?"✗":v.exp?"✓":"⚠️",`${v.type==="res"?"إقامة":"تأشيرة"} ${v.c?v.c.ar:""}${v.exp?(v.exp<travel?" منتهية ":" سارية لين ")+fD(v.exp):" — تأكد من التاريخ بعينك"}`);else if(S.files.vs.length)st("vs","⚠️","مرفقة لكن ما انقرأت — تأكد بعينك");else st("vs","—",T?"غير مطلوبة حسب تيماتيك أو لم تُرفق":"لم تُرفق")}
  /* 3) الحجز */
  let B=null;if(txt.bk.length){B=parseBooking(txt.bk.join("\n"));S.ctx.B=B;
    if(P&&B.names.length){const ok=B.names.some(n=>lev(n.sur,P.sur.replace(/\s/g,""))<=1||P.sur.replace(/\s/g,"").includes(n.sur));if(!ok){ask("a",`الاسم في الحجز (${E(B.names[0].sur)}/${E(B.names[0].giv)}) <b>ما يطابق الجواز</b> (${E(P.sur)}) — تأكد`);st("bk","⚠️","الاسم ما يطابق الجواز — تأكد");SM.look.push("الاسم في الحجز مع الجواز")}else st("bk","✓","الاسم يطابق الجواز")}
    if(!SM.bk)st("bk","✓",`مقروء${B.names[0]?" — "+E(B.names[0].sur)+"/"+E(B.names[0].giv):""}${B.flights[0]?" · "+B.flights.slice(0,3).join(" "):""}`);
    if(T&&T.hdr.tr&&B.codes.length<2)ask("i","ما قدرت أقرأ مسار الحجز كامل — تأكد من نقطة الترانزيت ووقت الرحلة التالية");
    const tw=T&&T.secs.some(s=>s.kind==="tr"&&s.items.some(i=>/تذكرة مؤكدة/.test(i.ar)));if(tw)ask("a",`تأكد من الحجز: الرحلة التالية من الترانزيت <b>مؤكدة</b> وضمن المدة المسموحة`)}
  else st("bk","—","لم يُرفق");
  /* الحكم العام */
  const worst=chk.reduce((m,c)=>Math.max(m,LV[c.lv]),0);
  if(!T)cond("التأكد من شاشة TIMATIC");
  const FV=SM.block.length?{c:"r",t:"⛔ لا يُسمح له بالسفر",d:"السبب: "+SM.block.map(E).join(" · ")}:SM.cond.length?{c:"a",t:"⚠️ يُسمح له بالسفر إذا معه:",d:SM.cond.map(x=>"• "+E(x)).join("<br>")}:{c:"g",t:"✅ يُسمح له بالسفر",d:"حسب الوثائق المقروءة ما فيه مانع"};
  const V={c:FV.c,t:FV.c==="r"?"⛔ لا يُسمح له بالسفر — شف الخلاصة تحت":FV.c==="a"?"⚠️ يُسمح له بالسفر بشروط — شف الخلاصة تحت":"✅ يُسمح له بالسفر"};
  const SUMR=[["🛂","الجواز",SM.pp],["🪪","التأشيرة / الإقامة",SM.vs],["🎫","الحجز",SM.bk],["🖥️","شاشة تيماتيك",SM.tim]].filter(r=>r[2]);
  const mk=m=>m==="✓"?"g":m==="✗"?"r":m==="⚠️"?"a":"n";
  const sumH=`<div class="tx-sum"><h5>📋 الخلاصة</h5>${SUMR.map(r=>`<div class="tx-sr ${mk(r[2].m)}"><i>${r[2].m==="✓"?"✓":r[2].m==="✗"?"✕":r[2].m==="⚠️"?"!":"—"}</i><b>${r[0]} ${r[1]}</b><span>${r[2].t}</span></div>`).join("")}
    ${SM.look.length?`<p class="tx-look">👁️ طابق بعينك: ${[...new Set(SM.look)].map(E).join(" · ")}</p>`:""}
    <div class="tx-fv ${FV.c}"><b>${FV.t}</b><p>${FV.d}</p></div></div>`;
  const ord=c=>-LV[c.lv];chk.sort((a,b)=>ord(a)-ord(b));
  const trip=T?`<div class="tx-trip">${[T.hdr.nat&&`الجنسية: <b>${T.hdr.nat.ar}</b>`,T.hdr.res&&`الإقامة: <b>${T.hdr.res.ar}</b>`,T.hdr.emb&&`من: <b>${T.hdr.emb.ar}</b>`,T.hdr.tr&&`ترانزيت: <b>${T.hdr.tr.ar}</b>`,T.hdr.dst&&`الوجهة: <b>${T.hdr.dst.ar}</b>`,T.hdr.date&&`تيماتيك: ${E(T.hdr.date)}`].filter(Boolean).map(x=>`<span>${x}</span>`).join("")}</div>`:"";
  const docP=P?`<div class="tx-doc"><h6>🛂 الجواز ${P.ok.exp&&P.ok.num?'<em class="g">مقروء ✓</em>':'<em class="a">تأكد بعينك</em>'}</h6><div class="kv">
    <span>الاسم</span><b dir="ltr">${E(P.sur)} / ${E(P.giv)}</b><span>رقم الجواز</span><b dir="ltr">${E(P.num)}</b><span>الجنسية</span><b>${nat?nat.ar:E(P.nat)}</b><span>الميلاد</span><b dir="ltr">${fD(P.dob)}</b>
    <span>الانتهاء</span><b dir="ltr" class="${P.exp&&P.exp<travel?"r":""}">${fD(P.exp)}${P.exp&&P.exp>=travel?` · باقي ${mBetween(travel,P.exp)} شهر`:""}</b></div></div>`:"";
  const docV=M.vs.filter(v=>v.type!=="passport").map(v=>`<div class="tx-doc"><h6>🪪 ${v.type==="visa"?"تأشيرة "+(v.kind?v.kind+" ":"")+cAr(byA3(v.state)):"بطاقة / إقامة "+cAr(byA3(v.state))}${v.ocr?' <em class="a">قراءة نصية — طابق بعينك</em>':""}</h6><div class="kv">${v.sur?`<span>الاسم</span><b dir="ltr">${E(v.sur)}${v.giv?" / "+E(v.giv):""}</b>`:""}${v.num?`<span>رقم الوثيقة</span><b dir="ltr">${E(v.num)}</b>`:""}${v.pass?`<span>رقم الجواز</span><b dir="ltr">${E(v.pass)}</b>`:""}<span>الانتهاء</span><b dir="ltr" class="${v.exp&&v.exp<travel?"r":""}">${fD(v.exp)}</b></div></div>`).join("")+
    (txt.vs.length&&!M.vs.length?`<div class="tx-doc"><h6>🪪 الفيزا / الإقامة</h6><p>ما فيها شريط مقروء آلياً. التواريخ اللي قدرت أقرأها: ${datesIn(txt.vs.join("\n")).map(x=>`<b dir="ltr">${fD(x.d)}</b>${x.h?` (${x.h})`:""}`).join(" · ")||"—"} — تأكد من تاريخ الانتهاء بعينك.</p></div>`:"");
  const docB=B?`<div class="tx-doc"><h6>🎫 الحجز${B.pnr?` <em dir="ltr">${E(B.pnr)}</em>`:""}</h6><div class="kv">${B.names[0]?`<span>الاسم</span><b dir="ltr">${E(B.names[0].sur)} / ${E(B.names[0].giv)}</b>`:""}<span>المسار</span><b dir="ltr">${B.codes.join(" → ")||"—"}</b><span>الرحلات</span><b dir="ltr">${B.flights.slice(0,6).join(" · ")||"—"}</b>${B.dates.length?`<span>التواريخ</span><b dir="ltr">${B.dates.slice(0,4).map(fD).join(" · ")}</b>`:""}</div></div>`:"";
  const secs=T?T.secs.map(s=>`<details class="tx-sec" ${s.kind==="dst"?"open":""}><summary>${s.health?"🩺 الصحة":s.kind==="tr"?"🔁 ترانزيت":"🎯 الوجهة"} · <b>${cAr(s.c)}</b></summary>
    ${s.items.length?s.items.map(i=>`<div class="tx-it ${i.lv}"><p>${i.ar}</p>${i.src?`<small dir="ltr">${E(i.src)}</small>`:""}</div>`).join(""):`<p class="tx-m">ما طلعت بنود واضحة — راجع النص.</p>`}
    <details class="tx-raw"><summary>النص المقروء</summary><pre dir="ltr">${E(s.lines.join("\n"))}</pre></details></details>`).join(""):"";
  const strip=h=>String(h).replace(/<[^>]+>/g,"").replace(/&[a-z#0-9]+;/g," ");
  S.aictx=["تاريخ السفر: "+fD(travel),
    T?`من شاشة TIMATIC: الجنسية ${cAr(T.hdr.nat)} · الإقامة ${cAr(T.hdr.res)} · من ${cAr(T.hdr.emb)} · ترانزيت ${cAr(T.hdr.tr)} · الوجهة ${cAr(T.hdr.dst)}`:"ما فيه شاشة TIMATIC مقروءة",
    P?`الجواز (قراءة آلية): جنسية ${nat?nat.ar:P.nat} · ينتهي ${fD(P.exp)}${P.ok.exp?"":" (غير مؤكد)"}`:"الجواز: "+(S.files.pp.length?"مرفق لكن ما انقرأ":"لم يُرفق"),
    M.vs.filter(v=>v.type!=="passport").map(v=>`${v.type==="res"?"إقامة":"تأشيرة"} ${v.kind||""} (قراءة آلية): دولة ${v.c?v.c.ar:cAr(byA3(v.state))} · تنتهي ${fD(v.exp)}`).join("\n")||("التأشيرة/الإقامة: "+(S.files.vs.length?"مرفقة لكن ما انقرأت":"لم تُرفق")),
    B?`الحجز: المسار ${B.codes.join("-")||"؟"} · الرحلات ${B.flights.slice(0,4).join(" ")||"؟"}`:"الحجز: لم يُرفق",
    "ملاحظات التحليل الآلي:\n"+chk.map(c=>"- "+strip(c.ar)).join("\n"),
    "حكم التحليل الآلي: "+strip(FV.t+" "+FV.d),
    T?"نص شاشة TIMATIC:\n"+T.secs.map(s=>`[${s.health?"HEALTH":s.kind==="tr"?"TRANSIT":"DESTINATION"} ${s.c?s.c.en:""}]\n`+s.lines.join("\n")).join("\n\n"):""].filter(Boolean).join("\n");
  return`<div class="tx-v ${V.c}">${V.t}</div>${trip}
    ${chk.length?`<div class="tx-chk"><h5>انتبه / اطلب من الراكب</h5>${chk.map((c,i)=>`<div class="${c.lv}"><i>${i+1}</i><p>${c.ar}</p></div>`).join("")}</div>`:""}
    ${docP}${docV}${docB}${secs}
    <div id="txCirc"></div>
    ${sumH}
    <div id="txAI"></div>
    <p class="tx-note">الخلاصة قراءة آلية للمساعدة فقط — القرار النهائي حسب شاشة TIMATIC في أماديوس. لو فيه شك اقرأ النص الإنجليزي تحت كل بند.</p>`}
/* ---------- المساعد الذكي: يكمل التحليل بكلام الموظف (Gemini عبر دالة ajf-dc) — بدون أسماء أو أرقام وثائق ---------- */
const fmtA=t=>E(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[*-]\s+/gm,"• ").replace(/\n/g,"<br>");
function paintAI(){const el=root&&root.querySelector("#txAI");if(!el||!S.res)return;const T=S.ai||[];
  el.innerHTML=`<div class="tx-ai"><h5>🤖 المساعد الذكي <small>اكتب له الناقص أو الصحيح وبيكمل التحليل</small></h5>
    ${T.map(t=>`<div class="ax-q">${E(t.q)}</div><div class="ax-a">${fmtA(t.a)}</div>`).join("")}
    ${S.abusy?`<div class="ax-q">${E(S.pending||"")}</div><div class="bd-empty">… المساعد يراجع شاشة تيماتيك ووثائق الراكب (10–25 ثانية)</div>`:""}
    ${S.aerr?`<div class="bd-empty">${S.aerr}</div>`:""}
    <textarea id="txAQ" rows="3" placeholder="مثال: الراكبة معها تأشيرة عمل للإمارات سارية لين 20/03/2027، وجوازها ساري لين 05/2030">${E(S.aq||"")}</textarea>
    <div class="tx-ai-b"><button class="tx-ai-go" id="txAsk" ${S.abusy?"disabled":""}>إرسال</button>${T.length?`<button class="tx-ai-new" id="txAINew">＋ محادثة جديدة</button>`:""}</div>
    <p class="tx-note">ما يُرسل للمساعد اسم الراكب ولا أرقام وثائقه — فقط الجنسية والوجهة والتواريخ ونص تيماتيك. لا تكتب له الاسم أو رقم الجواز.</p></div>`}
async function askAI(){const q=(S.aq||"").trim();if(q.length<2||S.abusy)return;S.abusy=true;S.aerr="";S.pending=q;S.aq="";paintAI();
  try{const r=await fetch(SB_URL+"/functions/v1/ajf-dc",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY},
      body:JSON.stringify({token:AUTH.tok||"",device:AUTH.dev,kind:"tim",q,ctx:S.aictx||"",h:(S.ai||[]).slice(-6)})});
    if(!r.ok)throw new Error(r.status===404?"nofn":"fn");const j=await r.json();if(j.s!=="ok")throw new Error(j.s||"err");
    if(!j.answer||/^(bad)$/.test(j.s))throw new Error("old");S.ai=(S.ai||[]).concat([{q,a:j.answer}])}
  catch(e){S.aq=q;const m=e.message;S.aerr=m==="nofn"?"دالة ajf-dc غير موجودة في Supabase.":m==="bad"||m==="old"?"المساعد يحتاج تحديث دالة ajf-dc في Supabase (المشرف).":m==="nokey"?"مفتاح Gemini ناقص في Supabase.":m==="aierr"?"المساعد مشغول أو وصل الحد المجاني بالدقيقة — جرّب بعد شوي.":m==="out"?"سجّل دخولك أول.":"تعذّر الاتصال، تأكد من الإنترنت."}
  S.abusy=false;paintAI();const a=root&&root.querySelectorAll("#txAI .ax-a");if(a&&a.length)a[a.length-1].scrollIntoView({behavior:"smooth",block:"start"})}
function onEv(e){const t=e.target;if(t.id==="txAQ"){S.aq=t.value;return}
  if(t.matches&&t.matches("input[data-slot]")){const k=t.dataset.slot,sl=SLOTS.find(s=>s.k===k);const fs=[...t.files];S.files[k]=sl.multi?S.files[k].concat(fs).slice(0,6):fs.slice(0,1);S.res=null;paint();return}
  if(t.id==="txNote"){S.note=t.value;try{localStorage.setItem("ajf_tx_note",t.value)}catch(x){}return}
  if(t.id==="txDate"){S.date=t.value||todayISO();return}}
function onClick(e){if(e.target.closest("#txAsk")){const ta=root.querySelector("#txAQ");if(ta)S.aq=ta.value;askAI();return}if(e.target.closest("#txAINew")){S.ai=[];S.aerr="";paintAI();return}
  const c=e.target.closest("[data-clr]");if(c){S.files[c.dataset.clr]=[];S.res=null;paint();return}if(e.target.closest("#txGo"))run()}
window.TIM={countries:CTRY,mount:el=>{mount(el);if(!el.__tx){el.__tx=1;el.addEventListener("change",onEv);el.addEventListener("input",onEv);el.addEventListener("click",onClick)}},
  /* للاختبار */_parse:(raw)=>parseTim(cleanLines(raw)),_mrz:parseMRZ,_bk:parseBooking,_vt:parseVisaText,_rep:(T,M,txt,f)=>{if(f)S.files=f;if(!S.date)S.date=todayISO();return report(T,M,txt)}};
})();
