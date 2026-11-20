/* ---------- 📊 التقرير اليومي: تعبئة جدول Local Station Flight SKD من التطبيق ----------
   للمالك فقط (15024232). البيانات تنحفظ على جواله، ورحلات اليوم تنعبّى تلقائياً من اللوحة والكوردينيتر شيت.
   زر «إضافة للملف»: يختار ملف الإكسل، والتطبيق يضيف الأسطر في جدول FlightSKD بنفس التنسيق والمعادلات
   (يعبّي الأسطر الفاضية الجاهزة في آخر الجدول أولاً، وإذا خلصت يمدّ الجدول) ويرجّع الملف محدّث.
   باقي الجداول في الملف ما تنلمس. */
(function(G){
"use strict";
/* ===== محرك الإكسل (يشتغل في المتصفح وفي Node للاختبار) ===== */
const XL=(()=>{
const enc=new TextEncoder(),dec=new TextDecoder();
const colN=s=>{let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n};
const colL=n=>{let s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26}return s};
const xe=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const xu=s=>String(s).replace(/&#x([0-9a-f]+);/gi,(m,h)=>String.fromCharCode(parseInt(h,16))).replace(/&#(\d+);/g,(m,d)=>String.fromCharCode(+d))
  .replace(/&(lt|gt|quot|apos|amp);/g,(m,k)=>({lt:"<",gt:">",quot:'"',apos:"'",amp:"&"})[k]);
const attr=(tag,n)=>{const m=tag.match(new RegExp("\\s"+n.replace(":","\\:")+'="([^"]*)"'));return m?m[1]:null};
/* تحريك مراجع الخلايا النسبية في المعادلة بعدد صفوف (FlightSKD[[#This Row],...] ما تتأثر) */
const shiftF=(f,d)=>f.replace(/(^|[^A-Za-z0-9_.\[\]])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(A-Za-z_])/g,(m,p,a,c,b,r)=>p+a+c+b+(b?r:String(+r+d)));
const join=(base,t)=>{if(t.startsWith("/"))return t.slice(1);const a=base.split("/").filter(Boolean);for(const s of t.split("/")){if(s==="..")a.pop();else if(s&&s!==".")a.push(s)}return a.join("/")};
const rels=(x,base)=>{const o={};for(const m of x.matchAll(/<Relationship\b[^>]*>/g)){const id=attr(m[0],"Id"),t=attr(m[0],"Target");if(id&&t)o[id]=attr(m[0],"TargetMode")==="External"?null:join(base,t)}return o};
/* أسماء أعمدة الجدول ← مفاتيح داخلية (بالاسم مو بالترتيب، عشان لو تغيّر ترتيب الأعمدة) */
const HK={"day":"day","month":"mon","week":"wk","station":"stn","airline":"al","airline category":"cat","arrival flight number":"fin","departure flight number":"fout","dest":"dest",
  "arrival pax (j|c)":"aj","arrival pax (y|c)":"ay","arrival pax (inf)":"ai","total in pax":"atot","departure pax (j|c)":"dj","departure pax (y|c)":"dy","departure pax (inf)":"di","total out pax":"dtot",
  "arrival baggage":"ab","departure baggage":"db","a\\c reg":"reg","a/c reg":"reg","ac type":"typ","sta":"sta","ata":"ata","std":"std","atd":"atd",
  "gain time departure":"gtd","actual ground time":"agt","gain time":"gt","gpu":"gpu","acu":"acu","asu":"asu","m/lift":"ml","wchr":"wch","cargo kg":"cgo",
  "depature left behaind baggage":"lb","departure left behind baggage":"lb","no show":"ns","statue":"st","status":"st","reason for delay":"rsn"};
const FORM=new Set(["wk","atot","dtot","gtd","agt","gt"]);
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const isoWeek=d=>{const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const w=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-w);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y)/864e5+1)/7)};
const tf=v=>{const m=/^(\d{1,2}):(\d{2})$/.exec(v||"");return m?(+m[1]*60+ +m[2])/1440:null};
const r10=x=>Math.round(x*1e10)/1e10;
const cellsOf=x=>{const o={};if(x)for(const m of x.matchAll(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)){const r=attr(m[0],"r");if(r)o[r]=m[0]}return o};

function append(buf,rows,fflate){
  fflate=fflate||G.fflate;
  const Z=fflate.unzipSync(buf),T=p=>{if(!Z[p])throw new Error("missing "+p);return dec.decode(Z[p])};
  let wb=T("xl/workbook.xml");const d1904=/<workbookPr\b[^>]*date1904="(1|true)"/.test(wb);
  const sheets=[...wb.matchAll(/<sheet\b[^>]*>/g)].map(m=>({name:xu(attr(m[0],"name")||""),rid:attr(m[0],"r:id")}));
  const sh=sheets.find(s=>/flight\s*skd/i.test(s.name))||sheets[0];if(!sh)throw new Error("nosheet");
  const wrels=rels(T("xl/_rels/workbook.xml.rels"),"xl"),sp=wrels[sh.rid];if(!sp||!Z[sp])throw new Error("nosheet");
  const sdir=sp.replace(/[^/]+$/,""),srp=sdir+"_rels/"+sp.slice(sdir.length)+".rels",srels=Z[srp]?rels(T(srp),sdir):{};
  let tp=null,tx=null;
  for(const id in srels){const p=srels[id];if(p&&/tables\/[^/]+\.xml$/.test(p)&&Z[p]){const x=T(p);if(/displayName="FlightSKD"/i.test(x)||!tx){tp=p;tx=x}}}
  if(!tx)throw new Error("notable");
  const tTag=tx.match(/<table\b[^>]*>/)[0],ref=attr(tTag,"ref"),rm=/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref||"");if(!rm)throw new Error("notable");
  const c0=colN(rm[1]),hdr=+rm[2],cEnd=colN(rm[3]),tEnd=+rm[4],first=hdr+1;
  const cols=[...tx.matchAll(/<tableColumn\b[^>]*?(?:\/>|>[\s\S]*?<\/tableColumn>)/g)].map(m=>{const nm=xu(attr(m[0].match(/<tableColumn\b[^>]*>/)[0],"name")||"");
    const cf=(m[0].match(/<calculatedColumnFormula[^>]*>([\s\S]*?)<\/calculatedColumnFormula>/)||[])[1];
    return{name:nm,key:HK[nm.trim().replace(/\s+/g," ").toLowerCase()]||null,calc:cf!=null?xu(cf):null}});
  const K={};cols.forEach((c,i)=>{if(c.key&&K[c.key]==null)K[c.key]=i});
  for(const k of["day","al","fin"])if(K[k]==null)throw new Error("cols");
  const L=i=>colL(c0+i);
  /* الشيرد سترنقز (للمقارنة ومنع التكرار) */
  const sst=[];if(Z["xl/sharedStrings.xml"])for(const m of T("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g))sst.push(xu([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join("")));
  const cv=cx=>{if(!cx)return"";const t=attr(cx.match(/<c\b[^>]*>/)[0],"t");if(t==="inlineStr")return xu([...cx.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join(""));
    const v=(cx.match(/<v>([\s\S]*?)<\/v>/)||[])[1];if(v==null)return"";return t==="s"?(sst[+v]||""):xu(v)};
  /* الصفوف */
  let sx=T(sp);const a0=sx.indexOf("<sheetData"),a1=sx.indexOf(">",a0)+1;if(a0<0)throw new Error("nosheet");
  let selfClose=sx[a1-2]==="/";const b0=selfClose?a1:sx.indexOf("</sheetData>",a1);if(b0<0)throw new Error("nosheet");
  const inner=sx.slice(a1,b0),R=new Map();
  for(const m of inner.matchAll(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)){const r=+attr(m[0],"r");if(r)R.set(r,m[0])}
  const norm=v=>String(v).trim().toUpperCase();
  const keys=new Set();let last=hdr;
  for(let r=first;r<=tEnd;r++){const x=R.get(r);if(!x)continue;const c=cellsOf(x);const dv=cv(c[L(K.day)+r]),al=cv(c[L(K.al)+r]),fn=cv(c[L(K.fin)+r]);
    if(dv!==""||al!==""||fn!==""){last=r;if(dv!=="")keys.add(Math.round(+dv)+"|"+norm(al)+"|"+norm(fn))}}
  const tplR=last>hdr?last:null,tpl=tplR?R.get(tplR):null,tplC=cellsOf(tpl);
  /* سطر قالب للمعادلة الأصلية (أول سطر بيانات) — معادلة الجدول مكتوبة نسبةً لأول سطر */
  const promote=(Lc,rn,fx)=>{/* خلية فيها معادلة مشتركة رئيسية بتنكتب فوقها قيمة: نخلّي أول خلية تابعة هي الرئيسية */
    const si=attr(fx,"si"),rr=/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(attr(fx,"ref")||"");if(si==null||!rr)return;const end=+rr[4],txt=xu((fx.match(/>([\s\S]*?)<\/f>/)||[])[1]||"");
    for(let k=rn+1;k<=end;k++){const x=R.get(k);if(!x)continue;const re=new RegExp('<c r="'+Lc+k+'"[^>]*?>(?:(?!</c>)[\\s\\S])*?<f\\b[^>]*\\bsi="'+si+'"[^>]*?(?:/>|>[\\s\\S]*?</f>)');
      const m=x.match(re);if(!m)continue;const fo=m[0].match(/<f\b[^>]*\bsi="\d+"[^>]*?(?:\/>|>[\s\S]*?<\/f>)$/)[0];
      R.set(k,x.replace(m[0],m[0].slice(0,m[0].length-fo.length)+`<f t="shared" ref="${Lc}${k}:${Lc}${end}" si="${si}">${xe(shiftF(txt,k-rn))}</f>`));return}};
  const cell=(ref,sa,v)=>v==null||v===""?`<c r="${ref}"${sa}/>`:typeof v==="number"&&isFinite(v)?`<c r="${ref}"${sa}><v>${r10(v)}</v></c>`:`<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
  const ep=d1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30);
  const added=[],skipped=[];let rn=last,maxR=tEnd;
  for(const row of rows){
    const dt=new Date(row.day+"T00:00:00Z"),ser=Math.round((dt-ep)/864e5),key=ser+"|"+norm(row.al)+"|"+norm(row.fin);
    if(keys.has(key)){skipped.push(row);continue}keys.add(key);
    rn++;if(rn>maxR)maxR=rn;
    const ex=R.get(rn)||null,exC=cellsOf(ex);
    /* القيم المحسوبة (نفس معادلات الجدول) — عبور منتصف الليل يُحسب صح */
    const n=k=>+row[k]||0,sta=tf(row.sta),ata=tf(row.ata),std=tf(row.std),atd=tf(row.atd);
    let gtd=(std||0)-(sta||0),agt=(atd||0)-(ata||0);const wGtd=gtd<0&&sta!=null&&std!=null,wAgt=agt<0&&ata!=null&&atd!=null;if(wGtd)gtd+=1;if(wAgt)agt+=1;
    const C={mon:MON[dt.getUTCMonth()],wk:isoWeek(dt),atot:n("aj")+n("ay")+n("ai"),dtot:n("dj")+n("dy")+n("di"),gtd,agt,gt:gtd-agt};
    const V={...row,day:ser,sta,ata,std,atd,mon:C.mon.toUpperCase()};
    let out="";
    cols.forEach((c,i)=>{const Lc=L(i),ref=Lc+rn,old=exC[ref],tc=tplC[Lc+tplR],s=attr((old||tc||"<c>").match(/<c\b[^>]*>/)[0],"s"),sa=s!=null?` s="${s}"`:"";
      const fo=old&&(old.match(/<f\b[^>]*?(?:\/>|>[\s\S]*?<\/f>)/)||[])[0];
      if(c.key&&FORM.has(c.key)&&(fo||c.calc)){
        let fx=fo||`<f>${xe(shiftF(c.calc,rn-first))}</f>`;
        if((c.key==="gtd"&&wGtd||c.key==="agt"&&wAgt)&&/^<f>[\s\S]*<\/f>$/.test(fx))fx=`<f>MOD(${fx.slice(3,-4)},1)</f>`;
        const v=C[c.key];out+=typeof v==="string"?`<c r="${ref}"${sa} t="str">${fx}<v>${xe(v)}</v></c>`:`<c r="${ref}"${sa}>${fx}<v>${r10(v)}</v></c>`;return}
      if(fo&&/\sref="/.test(fo))promote(Lc,rn,fo);
      out+=cell(ref,sa,c.key&&V[c.key]!=null?V[c.key]:"")});
    /* خلايا خارج الجدول في نفس السطر تبقى مثل ما هي */
    for(const r in exC){const cn=colN(r.replace(/\d+$/,""));if(cn<c0||cn>cEnd)out+=exC[r]}
    const base=ex||tpl||`<row r="${rn}">`,at=base.match(/^<row\b([^>]*?)\/?>/)[1].replace(/\sr="\d+"/,` r="${rn}"`);
    R.set(rn,`<row${/\sr="/.test(at)?at:` r="${rn}"`+at}>${out}</row>`);added.push(rn)}
  if(added.length){
    const body=[...R.keys()].sort((a,b)=>a-b).map(k=>R.get(k)).join("");
    sx=selfClose?sx.slice(0,a0)+"<sheetData>"+body+"</sheetData>"+sx.slice(a1):sx.slice(0,a1)+body+sx.slice(b0);
    if(maxR>tEnd){const nr=rm[1]+rm[2]+":"+rm[3]+maxR;tx=tx.replace(/(<table\b[^>]*?\sref=")[^"]*"/,`$1${nr}"`).replace(/(<autoFilter\b[^>]*?\sref=")[^"]*"/,`$1${nr}"`);Z[tp]=enc.encode(tx);
      sx=sx.replace(/(<dimension\b[^>]*?\sref="[A-Z]+\d+:[A-Z]+)(\d+)"/,(m,p,r)=>p+Math.max(+r,maxR)+'"')}
    Z[sp]=enc.encode(sx);
    /* Excel يعيد الحساب عند الفتح، وسلسلة الحساب القديمة تنحذف (Excel يبنيها من جديد) */
    if(Z["xl/calcChain.xml"]){delete Z["xl/calcChain.xml"];
      Z["xl/_rels/workbook.xml.rels"]=enc.encode(T("xl/_rels/workbook.xml.rels").replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g,""));
      Z["[Content_Types].xml"]=enc.encode(T("[Content_Types].xml").replace(/<Override\b[^>]*calcChain[^>]*\/>/g,""))}
    wb=/<calcPr\b/.test(wb)?wb.replace(/<calcPr\b([^>]*?)(\/?)>/,(m,a,s)=>`<calcPr${a.replace(/\sfullCalcOnLoad="[^"]*"/,"")} fullCalcOnLoad="1"${s}>`):wb.replace(/<\/sheets>(\s*<definedNames>[\s\S]*?<\/definedNames>)?/,m=>m+'<calcPr fullCalcOnLoad="1"/>');
    Z["xl/workbook.xml"]=enc.encode(wb)}
  return{buf:added.length?fflate.zipSync(Z,{level:6}):null,added,skipped,last:rn,sheet:sh.name}}
/* قراءة نص رسالة رحلة غير مجدولة (بعد OCR على الجوال): إيميل SPA (Service Request) أو رسالة ROYAL OPS */
const ICAO={OEDR:"DHA",OERK:"RUH",OEJN:"JED",OEDF:"DMM",OEMA:"MED",OESH:"SHW",OEGN:"GIZ",OEAB:"AHB",OETB:"TUU",OEHL:"HAS",OEPA:"AQI",OERF:"RAH",OETF:"TIF",OENG:"EAM",OEBH:"BHH",OEWJ:"EJH",OEGS:"ELQ",OEAO:"ULH",OESK:"AJF"};
function parseFlt(raw){
  let t=String(raw||"").toUpperCase().replace(/[‐-―]/g,"-").replace(/[|]/g," ");
  const d={},hm=x=>{const m=/(\d{1,2})[:.](\d{2})/.exec(x||"");return m&&+m[1]<24&&+m[2]<60?String(m[1]).padStart(2,"0")+":"+m[2]:""};
  const hm4=x=>{x=String(x||"").replace(/O/g,"0");return/^\d{4}$/.test(x)&&+x.slice(0,2)<24&&+x.slice(2)<60?x.slice(0,2)+":"+x.slice(2):""};
  const ap=x=>{x=String(x||"").replace(/[^A-Z]/g,"");if(x.length===4&&ICAO[x])return ICAO[x];return x.length===3?x:x.length===4?x:""};
  const reg=/(?:REGISTRATION|\bREG)[:\s]+([A-Z0-9-]{3,8})/.exec(t);if(reg)d.reg=reg[1].replace(/-/g,"");
  const typ=/(?:AIRCRAFT TYPE|\bEQPT)[:\s]+([A-Z0-9]{2,5})/.exec(t);if(typ)d.typ=typ[1];
  const roy=/ROYAL\s+FLIGHT\s+([A-Z]{2})?\s*(\d{3,5})/.exec(t);
  if(roy){d.al="ROYAL FLEET";d.fin=d.fout=roy[2];
    /* سطر المسار: ETD JED 0720 AJF 0900/1000 JED 1135Z */
    const line=t.split(/\n/).find(l=>/\bAJF\b/.test(l)&&/\b[A-Z]{3}\s+[0-9O]{4}/.test(l))||"";
    const P=[...line.matchAll(/\b([A-Z]{3})\s+([0-9O]{4})(?:\s*\/\s*([0-9O]{4}))?(Z)?/g)].map(m=>({s:m[1],a:hm4(m[2]),b:m[3]?hm4(m[3]):"",z:!!m[4]}));
    const utc=/\d{4}Z\b/.test(line),i=P.findIndex(p=>p.s==="AJF");
    if(i>=0){const p=P[i];if(p.b){d.sta=p.a;d.std=p.b}else if(i===P.length-1)d.sta=p.a;else d.std=p.a;
      d.dest=(P[i+1]||P[i-1]||{}).s||"";d.utc=utc}
    for(const m of t.matchAll(/SCTR\s+([A-Z]{3})\s*-\s*([A-Z]{3})[^\n]*?(\d{1,3})\s*PAX/g)){if(m[1]==="AJF")d.dy=+m[3];else if(m[2]==="AJF")d.ay=+m[3]}
    return d}
  /* إيميل SPA: Inbound / Outbound */
  const ref=/REF\s*(?:NUMBER|NO)?[:.\s]+([A-Z]{3}\s*-\s*)?(\d{3,7})/.exec(t);
  const io=t.search(/OUTBOUND/),IN=io>0?t.slice(0,io):t,OUT=io>0?t.slice(io):"";
  const fn=b=>{const m=/FLIGHT\s*(?:NUMBER|NO)[:.\s]+([A-Z0-9-]{2,10})/.exec(b);return m&&/\d/.test(m[1])?m[1].replace(/^[A-Z]{2,3}(?=\d)/,""):""};
  d.fin=fn(IN)||(ref?ref[2]:"");d.fout=fn(OUT)||d.fin;if(!d.fin&&d.fout)d.fin=d.fout;
  const tm=(b,k)=>{const m=new RegExp(k+"[:\\s][^\\n]*").exec(b);if(!m)return["",false];const L=m[0],lt=/(\d{1,2}:\d{2})\s*\(?\s*LT/.exec(L);
    if(lt)return[hm(lt[1]),false];const z=/UTC|\dZ\b|GMT/.test(L);return[hm(L),z]};
  const[a1,u1]=tm(IN,"(?:ETA|STA)"),[b1,u2]=tm(OUT||IN,"(?:ETD|STD)");d.sta=a1;d.std=b1;d.utc=!!(u1||u2)&&!/\(\s*LT/.test(t);
  const to=/\bTO[:\s]+([A-Z]{3,4})(?:\s*\/\s*([A-Z]{3,4}))?/.exec(OUT),fr=/\bFROM[:\s]+([A-Z]{3,4})(?:\s*\/\s*([A-Z]{3,4}))?/.exec(IN);
  const pick=m=>{if(!m)return"";const c=[m[1],m[2]].filter(Boolean);const i3=c.find(x=>x.length===3);return i3||ap(c[0])};
  d.dest=pick(to)||pick(fr);
  const px=b=>{const m=/\bPAX[:\s]+(\d{1,3})/.exec(b);return m?+m[1]:0};d.ay=px(IN);d.dy=px(OUT);
  return d}
/* قراءة لقطات أماديوس (DCS) لرحلة مغادرة: Flight Information · Acceptance Figures · Customer Weight & Balance.
   كل قيمة تنقرى بس إذا كانت واضحة، وإذا شاشتين تعطي نفس القيمة نتأكد إنها متطابقة. */
function parseAmd(raw){
  const t=String(raw||"").toUpperCase().replace(/[$§]/g,"S").replace(/[|]/g," ").replace(/\r/g,""),L=t.split("\n"),d={};
  const TT=x=>[...String(x||"").matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map(m=>m[1].padStart(2,"0")+":"+m[2]);
  const rt=/\b[0-3]?[0-9OI]\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+([A-Z0-9]{3})\s*[^A-Z0-9\s]{0,3}\s*([A-Z0-9]{3})\b/.exec(t);if(rt){d.org=rt[1];d.dst=rt[2]}
  const fl=/\bS\s*[VY¥]\s*([0-9OIL]{3,4})\b/.exec(t);if(fl){const n=fl[1].replace(/O/g,"0").replace(/[IL]/g,"1");if(/^\d+$/.test(n))d.fno=+n}
  const dt=/\b([0-3]?[0-9OI])\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/.exec(t);if(dt){const x=dt[1].replace(/O/g,"0").replace(/I/g,"1");if(/^\d+$/.test(x)&&+x>=1&&+x<=31)d.dd=+x;d.mon=dt[2]}
  for(const l of L){
    if(/OFF\W{0,2}\w?ON\s*BLOCK|ONBLOCK/.test(l)&&!d.blk)d.blk=TT(l.replace(/^.*BLOCKS?\)?:?/,""));
    else if(/SCHEDULED\s*:/.test(l)&&!d.sch)d.sch=TT(l.replace(/^.*SCHEDULED\s*:/,""));
    else if(/\bA\w?RP\w{0,3}T?\s*:/.test(l)&&!d.aps)d.aps=l.replace(/^.*?:/,"").match(/\b[A-Z0-9]{3}\b/g);
    const r=/\bHZ\s*-?\s*([A-Z0-9]{3,4})\b/.exec(l);if(r){(d.regs=d.regs||[]).push("HZ"+r[1])}
    const ac=/\b[A-Z]{3}\s*-\s*[A-Z]{3}\s+(3[0-9]{2}|7[0-9]{2}|[0-9]{3})\s+(?:HZ|[0-9])/.exec(l);if(ac&&!d.typ)d.typ=ac[1];
    const tp=/TOTAL\s+PASSENGERS\s+(\d{1,3})\W+PLUS\W+INFANTS?\s+(\d{1,2})\b/.exec(l);if(tp){d.tot=+tp[1];d.winf=+tp[2]}
    if((/JOINING/.test(l)||/\bTOTAL\s+\d/.test(l)&&!/^\W*TOTAL/.test(l))&&!/FIGURES|PASSENGERS|\(/.test(l)&&!d.acc){
      const n=(l.replace(/^.*?(?:\bTO\s*[A-Z]{3}\b|\bTOTAL\b)/,"").replace(/\bO\b/g,"0").match(/\b\d{1,3}\b/g)||[]).map(Number);
      if(n.length===6||n.length===8)d.acc={bj:n[0],by:n[1],bi:n[2],j:n[3],y:n[4],i:n[5]};
      else if(n.length>=10)d.acc={bj:n[0],by:n[1],bi:n[2],j:n[5],y:n[6],i:n[7]};
}
    if(/^\W*TOTAL\s*\(/.test(l)||/\bEX\s+[A-Z]{3}\W/.test(l)){const b=bags(l);if(b)(d.bagC=d.bagC||[]).push(b)}}
  if(d.acc&&d.tot!=null&&d.acc.j+d.acc.y!==d.tot)d.accBad=1;
  return d}
/* خانة العفش في أماديوس: قطع@وزن (87@1435) — الـ@ ينقرى أحياناً 0 أو 8 أو Q */
function bags(l){const out=[];for(const tok of l.split(/\s+/).reverse()){const s=tok.replace(/[^0-9A-Z@©]/g,"");if(s.length<3)continue;
    if(/^0\W?0$|^0[@©Q]0$|^000$/.test(s))return{p:0,w:0};
    for(let i=1;i<=3&&i<s.length-1;i++){const p=s.slice(0,i),w=s.slice(i+1);if(!/^\d+$/.test(p)||!/^[1-9]\d{1,4}$/.test(w))continue;const r=+w/+p;if(+p>0&&r>=7&&r<=30)out.push({p:+p,w:+w})}
    if(out.length)return out.length===1?out[0]:null}return null}
return{append,isoWeek,parseFlt,parseAmd}})();
G.DRXL=XL;
if(typeof module!=="undefined"&&module.exports){module.exports={XL};return}

/* ===== واجهة التقرير اليومي ===== */
const OWNER="15024232";
const own=()=>{try{return!!(AUTH.me&&String(AUTH.me.emp)===OWNER)}catch(e){return false}};
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const REGT={"SUBVP":320,"SUBQC":320,"HZASW":321,"HZASK":321,"SUMFY":320,"HZAS51":320,"HZAS57":320,"HZNS62":320,"HZASJ":321,"SUSKE":320,"HZASI":321,"A6FMJ":737,"HZAS74":320,"HZASL":321,"HZAS52":320,"HZAS65":320,"HZAS68":320,"HZAS77":320,"HZAS78":320,"HZAS59":320,"HZAST":321,"HZASM":321,"HZAS69":320,"HZASV":321,"HZMF5":"G300","HZAS73":320,"SUBUY":320,"HZAS56":320,"A6FQC":737,"HZAS66":320,"HZAS62":320,"HZAS82":320,"SUBUU":320,"SUTCE":320,"HZASP":321,"HZAS53":320,"SUBUV":320,"HZAS63":320,"HZASN":321,"HZAS75":320,"HZASG":320,"SUSKC":320,"HZAS84":320,"HZNS24":320,"HZAS60":320,"A6FPA":737,"HZAS58":320,"HZAS54":320,"HZASR":321,"SUNMZ":320,"HZNS89":320,"HZAS61":320,"A6FGE":737,"HZNS54":320,"HZASU":321,"HZASH":321,"HZA5":"A318","HZAS83":320,"HZASO":321,"HZASQ":321,"HZSK2":"G450","SUBVV":320,"SUBUQ":320,"HZAS64":320,"SUBQL":320,"HZAS72":320,"HZ133":"C550","HZA32":"B350","A6FES":737,"HZASD":320,"SUBUJ":320,"HZSH2":"AT6","HZASF":320,"HZAS76":320,"HZA11":"AT76","HZNS92":320,"A6FEK":737,"SUBQN":320,"HZNS25":320,"SUBTM":320,"A6FMU":737,"HZAS79":320,"HZAS67":320,"HZNS93":320,"SUSKB":320,"A6FGF":737,"HZA9":"HS125-700","SUBWE":320,"A6FML":737,"HZMF4":"G300","HZNS49":320,"SUBPX":320,"HZNS46":320,"HZNS52":320,"A6FME":737,"HZNS53":320,"A6FMI":737,"HZNS23":320,"HZNS51":320,"HZNS42":320,"SUNMH":320,"A6FEC":737,"SUBVQ":320,"HZA8":"HS125-700","SUBWW":320,"HZNS78":320,"A6FPB":737,"A6FEJ":"B738","HZNS48":320,"HZASN22":320,"HZA22":"G450","A6FMA":737,"HZAS11":"72-600","HZA25":"CE-680AS","HZNS56":320,"A6FMQ":"B738","SUBCQ":320,"SUNMF":320,"SUTCI":320,"A6FKF":737,"HZN92":320,"A6FGD":737,"HZAS55":320,"A6FMX":737,"A6FGB":738,"HZNS58":320,"HZAS99":318,"SUNML":320,"HZNS77":320,"HZASA":320,"A6FEG":737,"HZNS36":320,"A6FEO":737,"HZNS63":320,"SUBQM":320,"A6FER":373,"HZNS75":320,"A6FQB":373,"HZASC":320,"HZNS29":320,"A6FGI":373,"HZASB":320,"HZA63":320,"HZNS43":320,"SUBUN":320,"HZNS26":320,"HZNS94":320,"A6FQE":737,"SUBUS":320,"HZASE":320,"HZAS94":320,"A6FQD":737,"HZA26":"CE-680AS","SUBUK":320,"A6FQA":737,"SUBWD":320,"HZNS37":320,"HZ5002":"B350","HZNS64":320,"A6FMD":737,"HZA24":"ATR-72-600","HZNS34":320,"SUBVI":"E190","HZNS73":320,"HZNS47":320,"HZNS82":320,"A6FGA":737,"HZNS79":320,"HZNS28":320,"SUBVG":"E190","HZFAY":320,"HZFAV":320,"SUBWF":320,"HZFAA":320,"HZNS95":320,"A6FMN":"7M8","HZFAB":320,"HZFAN":320,"HZFAE":320,"HZFAF":320,"A6FKH":737,"HZFAG":320,"HZFBP":320,"HZFAO":320,"A6FMK":"B38M","SUPTM":320,"HZFAT":320,"HZFBR":320,"HZN42":320,"HZFAK":320,"HZFAZ":320,"HZNS39":320,"HZFAD":320,"HZFAC":320,"A6FMG":737,"HZFBB":320,"HZFAH":320,"HZFAP":320,"HZFBF":320,"SUBWG":320,"HZFAR":320,"HZNS65":320,"A6FEM":737,"HZNS55":320,"SUBQK":320,"HZFAS":320,"HZNS67":320,"HZ136":"C550","HZMF3":"G-IV","HZNS74":320,"HZNS72":320,"HZFBA":320,"A6FPC":737,"HZFBE":320,"HZNS32":320,"SUBQV":320,"HZNS85":320,"HZFAW":320,"HZNS38":320,"SUBWC":320,"HZMS06":"C130","HZFBH":320,"A6FEQ":737,"HZFBC":320,"HZFBI":320,"HZAN38":320,"HZ135":"C550","A6FMR":737,"HZN28":320,"A6FKD":737,"HZSK7":"G450","SUPWD":320,"HZANS68":320,"A6FKN":737,"HZA3":"A320","HZA4":"A319","HZRC68":"D-3","HZFBJ":320,"HZA2":320,"HZATH":"BD700","SUBCP":320,"HZFAM":320,"HZANS44":320,"HZATR":"737-900ER","HZAS23":320,"HZNS45":320,"A6FET":737,"HZAS97":320,"HZFAL":320,"A6FKO":737,"HZFBL":320,"HZMS09":"C130","HZAN42":320,"SUKSC":320,"HZFBS":320,"HZNS83":320,"HZAS93":320,"HZANS42":320,"A6FMB":737,"HZFAU":320,"A6FEU":737,"HZANS87":320,"HZNS66":320,"HZFAQ":320,"HZFAI":320,"HZNS68":320,"HZFBM":320,"HZNS22":320,"A6FPE":737,"A6FKR":737,"HZFBG":320,"HZNS96":320,"HZNS35":320,"HZNS87":320,"HZNS44":320,"SUBWB":320,"A6FMW":737,"HZFBD":320,"SUSMG":350,"HZAS24":320,"HZNS76":320,"HZFBK":320,"SUPWC":320,"HZFBQ":320,"HZFBT":320,"HZNS27":320,"HZFAX":320,"A6FKB":737,"SUBQR":320,"A6FKP":737,"A6FPH":737,"SUBVH":320,"HZNS57":320,"SUBQU":320,"A6FMC":737,"HZA15":320,"HZNS86":320,"HZSKY4":319,"HZNS88":320,"A6FMS":737,"A6FMY":737,"HZMF1":"A318","HZMS75":"BE30","HZFBV":320,"HZMF2":737,"A6FMV":737,"HZMS9":"C130","A6FEW":737,"HZAS42":320,"SUBQO":320,"HZNS33":320,"A6FGC":737,"HZNS84":320,"A6FEV":"B738","HZFBN":320,"A6FQH":737,"A6FEB":"B738","HZAS25":"CE-680AS","A6FGG":"B737","HZAS26":"680AS","A6FKJ":737,"HZAS87":320,"HZA134":"C550","HZMF":"G-IV","A6FMZ":737,"SUBWM":320,"HZAS47":320,"A6FMO":737,"HZNS98":320,"HZAFL":320,"HZNS97":320,"HZAF4":"G-IV","HZ134":"C550","HZMF6":739};
const CAT={SV:"SV",XY:"XY",F3:"F3",SPA:"SPA",VIP:"VIP"};
/* الرحلات غير المجدولة: الشركة والفئة ثابتة مثل ملف AJF */
const XT={"SPA":{al:"SPA",cat:"SPA"},"ALPHA STAR":{al:"ALPHA STAR",cat:"VIP"},"ROYAL FLEET":{al:"ROYAL FLEET",cat:"VIP"}};
const SK="ajf_dr";let S={};try{S=JSON.parse(localStorage.getItem(SK)||"{}")||{}}catch(e){S={}}
/* علامات «مضافة» من النسخة القديمة (طريقة الملف) تنمسح مرة وحدة — ما انلصق شي فعلياً بالطريقة الجديدة */
try{if(!localStorage.getItem("ajf_dr_v2")){for(const k in S)if(S[k])S[k].done={};localStorage.setItem(SK,JSON.stringify(S));localStorage.setItem("ajf_dr_v2","1")}}catch(e){}
const sv=()=>{try{const keep=iso(addDays(TODAY,-20));for(const k in S)if(k<keep)delete S[k];localStorage.setItem(SK,JSON.stringify(S))}catch(e){}};
const dS=k=>S[k]=S[k]||{e:{},x:[],skip:{},done:{}};
let DAY=0,root=null,OPEN=null,RES=null,CP=null,C1=null,PH=null;const PST={};
const dayD=()=>addDays(TODAY,-DAY),dayK=()=>iso(dayD());
const HM=/^([01]\d|2[0-3]):[0-5]\d$/;const TMK=new Set(["sta","ata","std","atd"]);
const numF=v=>/^\d+$/.test(String(v||"").trim())?+String(v).trim():String(v||"").trim();
const regN=v=>String(v||"").replace(/[\s-]/g,"").toUpperCase();
const t5=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(v||"").replace(/^[~@≈]/,""));return m?String(m[1]).padStart(2,"0")+":"+m[2]:""};
const sum=a=>a.reduce((s,x)=>s+(+x||0),0);

const FS={ops:[["reg","Reg","t"],["typ","Type","t"],["sta","STA","tm"],["ata","ATA","tm"],["std","STD","tm"],["atd","ATD","tm"]],
  pa:[["aj","J"],["ay","Y"],["ai","INF"]],pd:[["dj","J"],["dy","Y"],["di","INF"]],
  bag:[["ab","عفش الوصول"],["db","عفش المغادرة"],["cgo","Cargo KG"],["lb","شنط متخلفة"],["ns","No Show"]],
  gse:[["gpu","GPU"],["acu","ACU"],["asu","ASU"],["ml","M/LIFT"],["wch","WCHR"]],
  hd:[["al","Airline"],["cat","Category"],["fin","Arr Flt"],["fout","Dep Flt"],["dest","Dest"]]};
const NUMK=new Set([...FS.pa,...FS.pd,...FS.bag,...FS.gse].map(x=>x[0]));

/* رحلات اليوم من اللوحة + الرحلات الإضافية اللي يضيفها */
function list(){const d=dayD(),k=iso(d),D=dS(k),lv=LV(d).flights;
  const sch=flightsOn(d).filter(f=>!f.off&&(typeof formOk!=="function"||formOk(f))&&!(lv[f.n]&&lv[f.n].s==="canceled")).map(f=>({id:f.n,f}));
  const L=sch.concat(D.x.map(x=>({id:x.id,x})));
  return L.map(r=>({...r,a:auto(r,d)})).sort((p,q)=>(val(p,"sta")||val(p,"std")||"99").localeCompare(val(q,"sta")||val(q,"std")||"99"))}
function auto(r,d){if(!r.f)return{stn:"AJF"};const f=r.f,cd=(()=>{try{return csData(f,d)}catch(e){return null}})()||{pa:{},pd:{},act:{}};
  const al=f.n.slice(0,2),o={stn:"AJF",al,cat:CAT[al]||"FAL",fin:numF((f.ino||f.n).slice(2)),fout:numF(f.n.slice(2)),dest:f.iata,sta:f.ia||"",std:f.t||""};
  const reg=regN(cd.reg);if(reg){o.reg=reg;if(REGT[reg]!=null)o.typ=REGT[reg]}
  let ata=t5(cd.ata);if(!ata)try{const I=inboundInfo(f,d);if(I&&/manual|adsb|exact|fr24/.test(I.kind))ata=fmt(I.m)}catch(e){}if(ata)o.ata=ata;
  let atd="";try{atd=t5(csDerived(f,cd).atd)}catch(e){}if(!atd){const L=LV(d).flights[f.n];if(L&&L.s==="departed"&&L.t)atd=t5(L.t)}if(atd)o.atd=atd;
  const pj=x=>(String(x.F==null?"":x.F)+String(x.J==null?"":x.J)).trim()!==""?(+x.F||0)+(+x.J||0):null;
  const a=cd.pa||{},p=cd.pd||{};if(pj(a)!=null)o.aj=pj(a);if(String(a.Y||"")!=="")o.ay=+a.Y||0;if(pj(p)!=null)o.dj=pj(p);if(String(p.Y||"")!=="")o.dy=+p.Y||0;
  if(/^\d+$/.test(String(cd.pcs||"").trim()))o.db=+cd.pcs;
  if(cd.dlyc)o.dlyc=String(cd.dlyc);return o}
function val(r,k){const D=dS(dayK()),e=D.e[r.id]||{};if(e[k]!==undefined&&e[k]!=="")return e[k];if(r.x&&r.x[k]!==undefined&&r.x[k]!=="")return r.x[k];
  if(k==="typ"){const g=regN(val(r,"reg"));if(g&&REGT[g]!=null)return String(REGT[g]);const lt=LT()[g];if(lt)return lt}
  if(k==="st"){const s=val(r,"std"),a=val(r,"atd");if(!HM.test(s)||!HM.test(a))return"";let m=(toMin(a)-toMin(s)+1440)%1440;if(m>720)m-=1440;return m>0?"DLY":"OT"}
  if(k==="rsn"){const s=val(r,"st");return s==="DLY"?"NOT SGS":s==="OT"?"OT":""}
  const v=r.a?r.a[k]:undefined;return v==null?"":String(v)}
const isAuto=(r,k)=>{const e=(dS(dayK()).e[r.id]||{})[k];return(e===undefined||e==="")&&!(r.x&&r.x[k]!=null&&r.x[k]!=="")&&val(r,k)!==""};
/* أنواع الطائرات اللي أدخلها بنفسه تنحفظ للمرات الجاية */
const LT=()=>{try{return JSON.parse(localStorage.getItem("ajf_dr_rt")||"{}")}catch(e){return{}}};
const ltSet=(g,t)=>{if(!g||!t)return;const o=LT();o[g]=t;try{localStorage.setItem("ajf_dr_rt",JSON.stringify(o))}catch(e){}};
const dlyMin=r=>{const s=val(r,"std"),a=val(r,"atd");if(!HM.test(s)||!HM.test(a))return null;let m=(toMin(a)-toMin(s)+1440)%1440;if(m>720)m-=1440;return m};
const miss=r=>{const m=[];for(const k of["sta","ata","std","atd"])if(!HM.test(val(r,k)))m.push(k.toUpperCase());if(!val(r,"reg"))m.push("Reg");if(!val(r,"typ"))m.push("Type");
  if(!sum(["aj","ay","dj","dy"].map(k=>val(r,k))))m.push("الركاب");if(r.x&&(!val(r,"al")||!val(r,"fin")))m.push("بيانات الرحلة");return m};

const DRCSS=`
.dr{display:grid;gap:12px;padding-bottom:90px;min-width:0;max-width:100%;overflow-x:hidden}
.dr *{box-sizing:border-box}
.dr-hd{display:flex;justify-content:space-between;align-items:center;font:700 14px var(--display);color:var(--muted);padding:4px 2px 0}
.dr-hd small{font:600 12px var(--body)}
.dr-f{background:var(--panel);border:1px solid var(--line);border-inline-start:4px solid var(--line);border-radius:18px;overflow:hidden;min-width:0}
.dr-f.w{border-inline-start-color:var(--amber)}.dr-f.ok{border-inline-start-color:var(--go)}.dr-f.dn{border-inline-start-color:#3b6fd6}.dr-f.skip{opacity:.5}
.dr-c{min-width:0}
.dr-c>summary{list-style:none;padding:12px 12px 10px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 10px;align-items:center;cursor:pointer}
.dr-no{width:26px;height:26px;border-radius:50%;background:var(--raise);display:grid;place-items:center;font:700 13px var(--mono);color:var(--muted)}
.dr-tm{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;direction:ltr}
.dr-tm span{background:var(--raise);border-radius:9px;padding:4px 2px;text-align:center;font:600 13px var(--mono);color:var(--ink);white-space:nowrap;overflow:hidden}
.dr-tm span i{display:block;font:600 10px var(--body);font-style:normal;color:var(--muted)}
.dr-tm span.e{color:var(--muted)}
.dr-dl{grid-column:1/-1;font-size:12px;color:var(--amber);direction:ltr;text-align:right}
.dr-cp{border-top:1px dashed var(--line);padding:10px 12px;display:grid;gap:8px;background:color-mix(in oklab,var(--raise) 40%,var(--panel))}
.dr-cp .dr-row{display:flex;gap:8px}
.dr-cp button{flex:1;min-height:44px;border-radius:12px;border:0;background:#d9b45a;color:#1a1205;font:700 14.5px var(--display);padding:6px}
.dr-cp button.sec{background:var(--raise);color:var(--ink);border:1px solid var(--line)}
.dr-cp button.mk{background:var(--go);color:#0f1a0f}
.dr-cp .dr-h,.dr-cp .dr-warn{font-size:12px}
.dr-c>summary::-webkit-details-marker{display:none}
.dr-c .t{font:700 16px var(--display);direction:ltr;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dr-b{font:700 12px var(--body);padding:3px 9px;border-radius:9px;background:var(--raise);color:var(--muted);white-space:nowrap}
.dr-b.ok{background:color-mix(in oklab,var(--go) 26%,var(--raise));color:var(--ink)}.dr-b.dn{background:#3b6fd6;color:#fff}.dr-b.w{color:var(--amber)}
.dr-in{padding:0 12px 14px;display:grid;gap:12px}
.dr-s{display:grid;gap:6px}.dr-s>b{font:700 13px var(--display);color:var(--muted)}
.dr-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;min-width:0}.dr-g.g5{grid-template-columns:repeat(5,minmax(0,1fr))}.dr-g.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.dr-g.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.dr-g label{display:grid;gap:3px;font-size:11.5px;color:var(--muted);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
.dr-g>button{min-width:0;padding:6px 4px!important;font-size:13px!important;overflow-wrap:anywhere}
.dr-s{background:var(--bg,transparent);min-width:0}
.dr-g input,.dr-g select{width:100%;min-width:0;height:42px;border-radius:11px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:600 15px var(--mono);padding:0 6px;text-align:center;direction:ltr;color-scheme:dark;-webkit-user-select:text;user-select:text}
.dr-g input.au{color:#d9b45a;border-style:dashed}
.dr-g input:focus{outline:2px solid #d9b45a;outline-offset:0}
.dr-tot{font-size:12px;color:var(--muted);text-align:left;direction:ltr}
.dr-st{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px}
.dr-x{display:flex;gap:6px}.dr-x button{flex:1;height:38px;border-radius:11px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:600 13px var(--body)}
.dr-x button.x{color:var(--warn)}
.dr-go{width:100%;min-height:52px;border-radius:15px;border:0;background:#d9b45a;color:#1a1205;font:700 16px var(--display);padding:8px}
.dr-go.sec{background:var(--raise);color:var(--ink);border:1px solid var(--line)}
.dr-go[disabled]{opacity:.5}
.dr-box{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;gap:10px;font-size:13.5px;line-height:1.7}
.dr-box.ok{border-color:var(--go)}.dr-box.bad{border-color:var(--warn)}
.dr-warn{font-size:12.5px;color:var(--amber);line-height:1.7}
.dr-h{font-size:12.5px;color:var(--muted);line-height:1.7}
`;
function css(){if(document.getElementById("drCss"))return;const s=document.createElement("style");s.id="drCss";s.textContent=DRCSS;document.head.appendChild(s)}

function inp(r,k,lbl,type){const v=val(r,k),au=isAuto(r,k);
  const t=type==="tm"?`type="text" inputmode="numeric" maxlength="5" placeholder="--:--"`:NUMK.has(k)?`type="text" inputmode="numeric" pattern="[0-9]*" placeholder="0"`:`type="text" autocapitalize="characters" autocorrect="off" spellcheck="false"`;
  return`<label>${E(lbl)}<input ${t} data-dk="${k}" data-id="${E(r.id)}" value="${E(v)}" class="${au?"au":""}"></label>`}
function card(r,no){const D=dS(dayK()),sk=!!D.skip[r.id],dn=D.done[r.id],ms=miss(r),dm=dlyMin(r),st=val(r,"st");
  const tc=(k,l)=>{const v=val(r,k);return`<span class="${v?"":"e"}"><i>${l}</i>${E(v||"—")}</span>`};
  const fl=(val(r,"al")||"?")+" "+(val(r,"fin")||"—")+(String(val(r,"fout"))!==String(val(r,"fin"))?"/"+(val(r,"fout")||"—"):"")+" · "+(val(r,"dest")||"—");
  const badge=sk?`<span class="dr-b">مستبعدة</span>`:dn?`<span class="dr-b dn">✔ انلصقت في الملف</span>`:ms.length?`<span class="dr-b w">ناقص ${ms.length}</span>`:`<span class="dr-b ok">✓ جاهزة</span>`;
  const sel=(k,opts)=>`<select data-dk="${k}" data-id="${E(r.id)}">${opts.map(o=>`<option ${val(r,k)===o?"selected":""}>${o}</option>`).join("")}</select>`;
  const cls=sk?"skip":dn?"dn":ms.length?"w":"ok";
  return`<section class="dr-f ${cls}" data-f="${E(r.id)}"><details class="dr-c" data-card="${E(r.id)}" ${OPEN===r.id?"open":""}><summary><span class="dr-no">${no||"·"}</span><span class="t">${E(fl)}</span>${badge}
    <div class="dr-tm">${tc("sta","STA")}${tc("ata","ATA")}${tc("std","STD")}${tc("atd","ATD")}</div>${st==="DLY"?`<div class="dr-dl">DLY${dm>0?" +"+dm+"m":""}</div>`:""}</summary>
    <div class="dr-in">
     ${r.x?`<div class="dr-s"><b>الرحلة</b><button class="dr-go sec" data-dphoto="${E(r.id)}" ${PST[r.id]&&PST[r.id].busy?"disabled":""}>📷 تعبئة من صورة بيانات الرحلة</button>
       ${PST[r.id]?`<div class="${PST[r.id].err?"dr-warn":"dr-h"}">${PST[r.id].busy?"⏳ يقرأ الصورة على جوالك… (أول مرة 10–20 ثانية)":E(PST[r.id].err||PST[r.id].msg||"")}</div>`:""}
       <div class="dr-g">${[FS.hd[0],FS.hd[1],FS.hd[4]].map(([k,l])=>inp(r,k,l)).join("")}</div><div class="dr-g g2">${FS.hd.slice(2,4).map(([k,l])=>inp(r,k,l)).join("")}</div></div>`:""}
     <div class="dr-s"><b>التشغيل</b><div class="dr-g g2">${FS.ops.slice(0,2).map(([k,l,t])=>inp(r,k,l,t)).join("")}</div><div class="dr-g g4">${FS.ops.slice(2).map(([k,l,t])=>inp(r,k,l,t)).join("")}</div>
       <div class="dr-g g2"><label>Status ${sel("st",["","OT","DLY"])}</label><label>Reason for delay ${sel("rsn",["","OT","NOT SGS","SGS"])}</label></div>
       ${val(r,"dlyc")?`<div class="dr-h">كود التأخير في الشيت: <b dir="ltr">${E(val(r,"dlyc"))}</b></div>`:""}</div>
     <div class="dr-s"><b>ركاب الوصول</b><div class="dr-g">${FS.pa.map(([k,l])=>inp(r,k,l)).join("")}</div><div class="dr-tot" data-tot="a">Total IN ${sum(["aj","ay","ai"].map(k=>val(r,k)))}</div></div>
     <div class="dr-s"><b>ركاب المغادرة</b><div class="dr-g">${FS.pd.map(([k,l])=>inp(r,k,l)).join("")}</div><div class="dr-tot" data-tot="d">Total OUT ${sum(["dj","dy","di"].map(k=>val(r,k)))}</div></div>
     <div class="dr-s"><b>العفش والشحن</b><div class="dr-g">${FS.bag.map(([k,l])=>inp(r,k,l)).join("")}</div></div>
     <div class="dr-s"><b>المعدات والخدمات</b><div class="dr-g g5">${FS.gse.map(([k,l])=>inp(r,k,l)).join("")}</div></div>
     ${ms.length&&!sk?`<div class="dr-warn">ناقص: ${ms.map(E).join("، ")}</div>`:""}
     <div class="dr-x"><button data-dskip="${E(r.id)}">${sk?"↩︎ رجّعها للتقرير":"استبعاد من التقرير"}</button>${r.x?`<button class="x" data-ddel="${E(r.id)}">حذف الرحلة</button>`:""}${dn?`<button data-dund="${E(r.id)}">إلغاء علامة «انلصقت»</button>`:""}</div>
    </div></details>${cpBar(r)}</section>`}
/* شريط النسخ الخاص بكل رحلة — تحت بطاقتها مباشرة */
function cpBar(r){const D=dS(dayK());if(D.skip[r.id])return"";if(r.x&&!val(r,"fin"))return`<div class="dr-cp"><div class="dr-h">أدخل رقم الرحلة عشان تقدر تنسخها.</div></div>`;
  const ms=miss(r),dn=D.done[r.id],cp=C1&&C1.k===dayK()&&C1.id===r.id;
  if(cp)return`<div class="dr-cp"><div class="dr-h">✓ انسخ سطر الرحلة. في الإكسل: اضغط خانة <b>Day</b> بأول سطر فاضي ← لصق.</div>
    <div class="dr-row"><button class="mk" data-dmk="${E(r.id)}">✔ لصقتها — علّمها</button><button class="sec" data-dcp="${E(r.id)}">📋 نسخ مرة ثانية</button></div></div>`;
  if(dn)return`<div class="dr-cp">${amdSt(r)}<div class="dr-row"><button class="sec" data-dcp="${E(r.id)}">📋 نسخ سطر الرحلة مرة ثانية</button>${amdBtn(r)}</div></div>`;
  return`<div class="dr-cp">${amdSt(r)}${ms.length?`<div class="dr-warn">⚠️ ناقص: ${ms.map(E).join("، ")}</div>`:""}<div class="dr-row"><button data-dcp="${E(r.id)}">📋 نسخ سطر هذي الرحلة</button>${amdBtn(r)}</div></div>`}
const amdBtn=r=>r.f?`<button class="sec" style="flex:0 0 auto;padding:6px 14px" data-damd="${E(r.id)}" ${PST[r.id]&&PST[r.id].busy?"disabled":""} aria-label="تعبئة من صور أماديوس">📷 أماديوس</button>`:"";
const amdSt=r=>{const p=r.f&&PST[r.id];if(!p)return"";return`<div class="${p.err?"dr-warn":"dr-h"}">${p.busy?"⏳ "+E(p.busy===1?"يقرأ الصور على جوالك… (أول مرة 10–20 ثانية)":p.busy):p.err?E(p.err):p.msg}</div>`}

function paint(){if(!root)return;css();
  if(!own()){root.innerHTML=`<div class="dc-lock"><i>🔒</i><b>غير مصرّح لك</b><p>التقرير اليومي خاص بالمشرف.</p></div>`;return}
  const L=list(),D=dS(dayK()),act=L.filter(r=>!D.skip[r.id]&&!(r.x&&!val(r,"fin"))),todo=act.filter(r=>!D.done[r.id]),inc=todo.filter(r=>miss(r).length);
  root.innerHTML=`<div class="dr">
    <div class="bd-days">${[2,1,0].map(i=>`<button data-drday="${i}" class="${i===DAY?"on":""}">${["اليوم","أمس","قبل أمس"][i]} · ${dLabel(addDays(TODAY,-i))}</button>`).join("")}</div>
    <div class="dr-h">جدول <b dir="ltr">Local Station Flight SKD</b>. الأرقام الذهبية المنقّطة تعبّت تلقائياً من اللوحة والكوردينيتر شيت، غيّر اللي يحتاج. الخانة الفاضية = 0.</div>
    ${L.length?`<div class="dr-hd"><span>✈️ رحلات ${["اليوم","أمس","قبل أمس"][DAY]}</span><small>${L.length} رحلة · ${act.length-todo.length} انلصقت</small></div>`+L.map((r,i)=>card(r,i+1)).join(""):`<div class="bd-empty">ما فيه رحلات بهذا اليوم</div>`}
    <div class="dr-s"><b>📷 رحلة غير مجدولة من صورة</b><div class="dr-g">${Object.keys(XT).map(k=>`<button class="dr-go" style="min-height:46px;font-size:14px" data-dtype="${k}">${k}</button>`).join("")}</div></div>
    <button class="dr-go sec" id="drAdd">＋ رحلة إضافية يدوي (خاصة، VIP، SPA…)</button>
    ${RES?resBox():""}
    <div class="dr-box">
      <b>📋 أو انسخ كل الرحلات الباقية مرة وحدة</b>
      <div class="dr-h">${todo.length?`${todo.length} رحلة ما انلصقت بعد${inc.length?` (منها ${inc.length} فيها نواقص)`:""}. نفس ترتيب أعمدة Local Station Flight SKD — التطبيق ما يلمس الملف أبداً.`:"كل رحلات هذا اليوم معلّمة إنها انلصقت في الملف."}</div>
      <button class="dr-go sec" id="drCopy" ${todo.length?"":"disabled"}>📋 نسخ ${todo.length} سطر</button>
      ${CP&&CP.k===dayK()?`<div class="dr-box ok"><b>✓ انسخت ${CP.n} سطر</b>
        <div class="dr-h">1) افتح ملف AJF في الإكسل ← شيت Local Station Flight SKD.<br>2) انزل لأول سطر فاضي تحت آخر رحلة، واضغط مرة على خانة <b>Day</b> (العمود A).<br>3) اضغط على الخانة مرة ثانية ← <b>لصق</b>.<br>4) تأكد إن الأسطر نزلت صح، بعدها اضغط الزر تحت.</div>
        <button class="dr-go sec" id="drMark">✔ لصقتها في الملف — علّمها</button></div>`:""}
    </div></div>`}
function resBox(){const r=RES;if(r.busy)return`<div class="dr-box"><b>⏳ جاري تجهيز الملف…</b><div class="dr-h">ملف كبير، ياخذ ثواني.</div></div>`;
  if(r.err)return`<div class="dr-box bad"><b>تعذّر تعديل الملف</b><div class="dr-h">${E(r.err)}</div></div>`;
  return`<div class="dr-box ok"><b>✓ انضافت ${r.n} رحلة${r.sk.length?` · ${r.sk.length} كانت موجودة من قبل وما تكررت`:""}</b>
    <div class="dr-h">الملف الجديد: <b dir="ltr">${E(r.name)}</b>. اضغط «حفظ الملف» واختر <b>حفظ في الملفات</b> (OneDrive مثلاً)، أو أرسله مباشرة.</div>
    <button class="dr-go" id="drSave">💾 حفظ الملف</button></div>`}

let FF=null;const ffLoad=()=>G.fflate?Promise.resolve():FF||(FF=ldJs("lib/fflate.min.js?v=1").catch(e=>{FF=null;throw e}));
const ERR={notable:"ما لقيت جدول FlightSKD في الملف. تأكد إنه ملف التقرير اليومي.",nosheet:"ما لقيت شيت Local Station Flight SKD في الملف.",cols:"أعمدة الجدول مو مثل المتوقع."};
async function run(file){const k=dayK(),D=dS(k),L=list().filter(r=>!D.skip[r.id]&&!D.done[r.id]);if(!L.length)return;
  RES={busy:1};paint();await new Promise(r=>setTimeout(r,60));
  try{if(!/\.xlsx$/i.test(file.name))throw new Error("اختر ملف بصيغة xlsx");await ffLoad();
    const rows=L.map(r=>{const o={day:k};for(const kk of["stn","al","cat","fin","fout","dest","reg","typ","sta","ata","std","atd","st","rsn"])o[kk]=val(r,kk);
      for(const kk of NUMK)o[kk]=+val(r,kk)||0;o.stn=o.stn||"AJF";o.fin=numF(o.fin);o.fout=numF(o.fout);o.typ=numF(o.typ);o.reg=regN(o.reg);return o});
    const buf=new Uint8Array(await file.arrayBuffer()),res=XL.append(buf,rows);
    const sk=new Set(res.skipped.map(x=>x.al+"|"+x.fin));
    L.forEach((r,i)=>{D.done[r.id]=Date.now();ltSet(regN(val(r,"reg")),val(r,"typ"))});sv();
    RES={n:res.added.length,sk:res.skipped,name:file.name,blob:res.buf?new Blob([res.buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}):null};
    if(!res.buf)RES={err:"كل هذي الرحلات موجودة في الملف من قبل، ما انضاف شي."};
    try{ajfAct("dr_x",k+" +"+res.added.length)}catch(e){}}
  catch(e){console.error(e);RES={err:ERR[e.message]||e.message||"خطأ غير معروف"}}
  paint();const g=root&&root.querySelector("#drSave");if(g)g.scrollIntoView({block:"center",behavior:"smooth"})}
async function save(){if(!RES||!RES.blob)return;const f=new File([RES.blob],RES.name,{type:RES.blob.type});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==="AbortError")return}
  const u=URL.createObjectURL(RES.blob),a=document.createElement("a");a.href=u;a.download=RES.name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},4000)}

/* أسطر جاهزة للصق: نفس ترتيب أعمدة الجدول (A..AL). الأعمدة المحسوبة تنلصق كمعادلات الجدول نفسها، والتاريخ كمعادلة DATE (ما يتأثر بإعدادات الجوال) */
const T="FlightSKD";
/* إكسل الآيفون يلصق المعادلات كنص، فكل الخانات تنلصق قيم جاهزة محسوبة (نفس نتيجة معادلات الجدول) */
const mn=v=>HM.test(v||"")?toMin(v):null,hh=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const gd=(a,b)=>{const x=mn(a),y=mn(b);return x==null||y==null?null:((y-x)%1440+1440)%1440};
const COLS=[r=>r.day,r=>["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][+r.day.slice(5,7)-1],
  r=>XL.isoWeek(new Date(r.day+"T00:00:00Z")),r=>r.stn,r=>r.al,r=>r.cat,r=>r.fin,r=>r.fout,r=>r.dest,r=>r.aj,r=>r.ay,r=>r.ai,
  r=>r.aj+r.ay+r.ai,r=>r.dj,r=>r.dy,r=>r.di,r=>r.dj+r.dy+r.di,r=>r.ab,r=>r.db,r=>r.reg,r=>r.typ,
  r=>r.sta,r=>r.ata,r=>r.std,r=>r.atd,r=>{const g=gd(r.sta,r.std);return g==null?"":hh(g)},r=>{const g=gd(r.ata,r.atd);return g==null?"":hh(g)},
  r=>{const a=gd(r.sta,r.std),b=gd(r.ata,r.atd);return a==null||b==null?"":+((a-b)/1440).toFixed(10)},
  r=>r.gpu,r=>r.acu,r=>r.asu,r=>r.ml,r=>r.wch,r=>r.cgo,r=>r.lb,r=>r.ns,r=>r.st,r=>r.rsn];
function rowsOut(L){const k=dayK();return L.map(r=>{const o={day:k};for(const kk of["stn","al","cat","fin","fout","dest","reg","typ","sta","ata","std","atd","st","rsn"])o[kk]=val(r,kk);
  for(const kk of NUMK)o[kk]=+val(r,kk)||0;o.stn=o.stn||"AJF";o.reg=regN(o.reg);return o})}
const tsv=L=>rowsOut(L).map(o=>COLS.map(f=>String(f(o)==null?"":f(o)).replace(/[\t\r\n]/g," ")).join("\t")).join("\r\n");
async function copyTxt(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}
  const a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;opacity:0";document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);let ok=false;try{ok=document.execCommand("copy")}catch(e){}a.remove();return ok}
/* 📷 قراءة صورة بيانات الرحلة على الجوال نفسه (Tesseract) — الصورة ما تطلع من الجوال أبداً، وما تنحفظ.
   يعبّي كل شي ماعدا ATA وATD. يفهم إيميل SPA (Service Request) ورسائل ROYAL OPS */
const TESS=window.TESS_BASE||"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/";
let TW=null,TWP=null;
const ldS=u=>new Promise((ok,no)=>{if(window.Tesseract)return ok();const x=document.createElement("script");x.src=u;x.onload=ok;x.onerror=()=>no(new Error("lib"));document.head.appendChild(x)});
async function tw(){if(TW)return TW;if(TWP)return TWP;TWP=(async()=>{await ldS(TESS+"tesseract.min.js");const o={};if(window.TESS_LOCAL)Object.assign(o,window.TESS_LOCAL);
  TW=await Tesseract.createWorker("eng",1,o);await TW.setParameters({preserve_interword_spaces:"1"});return TW})();try{return await TWP}catch(e){TWP=null;throw e}}
/* تجهيز الصورة: تكبير الصغيرة، رمادي، وقلب الألوان إذا الإيميل بالوضع الداكن */
function prep(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const w0=im.naturalWidth,h0=im.naturalHeight,
  sc=Math.min(2400/Math.max(w0,h0),Math.max(1,1500/w0)),c=document.createElement("canvas");c.width=Math.round(w0*sc);c.height=Math.round(h0*sc);
  const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
  const D=g.getImageData(0,0,c.width,c.height),px=D.data;let sum=0;for(let i=0;i<px.length;i+=4){const y=.299*px[i]+.587*px[i+1]+.114*px[i+2];px[i]=px[i+1]=px[i+2]=y;sum+=y}
  if(sum/(px.length/4)<110)for(let i=0;i<px.length;i+=4)px[i]=px[i+1]=px[i+2]=255-px[i];g.putImageData(D,0,0);ok(c)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("img"))};im.src=u})}
const PERR={img:"ما قدرت أفتح الصورة، جرّب صورة ثانية.",lib:"أول مرة يحتاج إنترنت عشان يحمّل برنامج القراءة، تأكد من الاتصال وجرّب.",none:"ما لقيت بيانات رحلة في الصورة. صوّر الإيميل كامل وواضح (من REF لين Outbound).",amdnone:"ما قدرت أقرأ بيانات من الصور. صوّر الشاشة مستقيمة وقريبة وبدون انعكاس: Flight Information وAcceptance Figures أو Weight & Balance.",aierr:"ما قدرت أقرأ الصورة، جرّب صورة أوضح."};
async function readPhoto(file,ph){const{id,k}=ph;PST[id]={busy:1};paint();
  try{const lim=(p,ms,e)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error(e)),ms))]);
    const cv=await prep(file),w=await lim(tw(),90000,"lib"),rr=await lim(w.recognize(cv),90000,"aierr"),d=XL.parseFlt(rr.data.text||"");
    if(!d.reg&&!d.fin&&!d.sta&&!d.std)throw new Error("none");
    const D=dS(k),o=D.e[id]=D.e[id]||{},put=(kk,v)=>{if(v==null)return;v=String(v).trim();if(v===""||v==="0"&&NUMK.has(kk))return;o[kk]=v};
    const tm=v=>{const m=/^(\d{1,2})[:.]?(\d{2})/.exec(String(v||"").trim());if(!m)return"";let x=+m[1]*60+ +m[2];if(d.utc===true)x=(x+180)%1440;return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0")};
    const x0=D.x.find(z=>z.id===id);if(!(x0&&x0.al))put("al",String(d.al||"").toUpperCase());["fin","fout","dest"].forEach(kk=>put(kk,String(d[kk]||"").toUpperCase()));put("reg",regN(d.reg));put("typ",String(d.typ||"").toUpperCase());
    put("sta",tm(d.sta));put("std",tm(d.std));
    ["aj","ay","ai","dj","dy","di","ab","db","cgo"].forEach(kk=>{const n=parseInt(d[kk],10);if(n>0)o[kk]=String(n)});
    if(!o.fout&&o.fin)o.fout=o.fin;if(!o.fin&&o.fout)o.fin=o.fout;
    const x=D.x.find(z=>z.id===id);if(x&&!o.cat&&(o.al||x.al)==="SPA")o.cat="SPA";
    sv();PST[id]={msg:"✓ تعبّت من الصورة — راجعها، وأضف ATA وATD"+(d.utc===true?" (الأوقات كانت UTC وتحوّلت لتوقيت السعودية)":"")+(d.note?" · "+d.note:"")};OPEN=id}
  catch(e){console.error(e);PST[id]={err:PERR[e.message]||PERR.aierr}}
  if(dayK()===k)paint()}
/* 📷 صور أماديوس لرحلة مجدولة: تنقرى على الجوال (نفس Tesseract)، الصور ما تطلع من الجوال وما تنحفظ */
function prepA(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const w0=im.naturalWidth,h0=im.naturalHeight,sc=2400/Math.max(w0,h0),W=Math.round(w0*sc),H=Math.round(h0*sc);
  const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d",{willReadFrequently:true});g.imageSmoothingQuality="high";g.drawImage(im,0,0,W,H);URL.revokeObjectURL(u);
  /* تنظيف تصوير الشاشة: نقسم على خلفية مموّهة (يشيل الإضاءة غير المتساوية) ونرفع التباين */
  let s=c;for(let f=2;f<=24;f*=2){const n=document.createElement("canvas");n.width=Math.max(1,Math.round(W/f));n.height=Math.max(1,Math.round(H/f));const x=n.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(s,0,0,n.width,n.height);s=n}
  const b=document.createElement("canvas");b.width=W;b.height=H;const bg=b.getContext("2d",{willReadFrequently:true});bg.drawImage(s,0,0,W,H);
  const D=g.getImageData(0,0,W,H),B=bg.getImageData(0,0,W,H).data,px=D.data;
  for(let i=0;i<px.length;i+=4){const y=.299*px[i]+.587*px[i+1]+.114*px[i+2],k=.299*B[i]+.587*B[i+1]+.114*B[i+2]+1;let v=(y/k*255-150)*3+128;v=v<0?0:v>255?255:v;px[i]=px[i+1]=px[i+2]=v}
  g.putImageData(D,0,0);ok(c)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("img"))};im.src=u})}
const MON=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
async function readAmd(files,ph){const{id,k}=ph;PST[id]={busy:1};OPEN=id;paint();
  try{const lim=(p,ms,e)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error(e)),ms))]);const w=await lim(tw(),90000,"lib"),R=[];
    try{await w.setParameters({tessedit_pageseg_mode:"6"});
      for(let i=0;i<files.length;i++){if(files.length>1){PST[id]={busy:`يقرأ الصورة ${i+1} من ${files.length}…`};if(dayK()===k)paint()}
        const rr=await lim(w.recognize(await prepA(files[i])),90000,"aierr");R.push(XL.parseAmd(rr.data.text||""))}}
    finally{try{await w.setParameters({tessedit_pageseg_mode:"3"})}catch(e){}}
    const r=list().find(x=>x.id===id);if(!r)throw new Error("none");
    /* كل صورة نعرف هي للوصول ولا للمغادرة: من المسار (JED → AJF) ورقم الرحلة (الوصول/المغادرة) */
    const isA=x=>/^A[JI1LU]F$/.test(x||""),num=x=>+String(x||"").replace(/\D/g,""),fi=num(val(r,"fin")),fo=num(val(r,"fout")),dd=dayD(),G2={a:[],d:[]},warn=[];
    for(const d of R){if(!d.blk&&!d.acc&&d.tot==null&&!(d.bagC||[]).length)continue;
      let dir=d.dst&&isA(d.dst)&&!isA(d.org)?"a":d.org&&isA(d.org)&&!isA(d.dst)?"d":null;
      if(d.fno){if(fi!==fo&&d.fno===fi)dir="a";else if(d.fno===fo){if(fi!==fo)dir="d"}else throw new Error(`صورة لرحلة ${d.fno} مو ${fi===fo?fo:fi+"/"+fo} — ما تعبّى شي.`)}
      if(d.dd&&(d.dd!==dd.getDate()||(d.mon&&d.mon!==MON[dd.getMonth()])))throw new Error(`صورة بتاريخ ${d.dd}${d.mon||""} واليوم المختار ${dd.getDate()}${MON[dd.getMonth()]} — ما تعبّى شي.`);
      if(!dir){warn.push("صورة ما عرفت إذا هي للوصول أو المغادرة (رقم الرحلة والمسار ما انقروا) — تجاهلتها");continue}
      G2[dir].push(d)}
    if(!G2.a.length&&!G2.d.length)throw new Error(warn.length?warn[0]:"amdnone");
    const D=dS(k),o=D.e[id]=D.e[id]||{},out=[],regs=[];let typ="";
    for(const dir of["a","d"]){const L=G2[dir];if(!L.length)continue;const K=dir==="a"?{t:"ata",s:"sta",j:"aj",y:"ay",i:"ai",b:"ab",n:"الوصول"}:{t:"atd",s:"std",j:"dj",y:"dy",i:"di",b:"db",n:"المغادرة"};
      const m={bagC:[]};for(const d of L){for(const kk of["blk","sch","aps","tot","winf","acc","accBad"])if(m[kk]==null&&d[kk]!=null)m[kk]=d[kk];m.bagC.push(...(d.bagC||[]));regs.push(...(d.regs||[]));if(!typ&&d.typ)typ=d.typ}
      const got=[],ix=a=>{if(!a||!a.length)return"";const p=(m.aps||[]).findIndex(isA);return p>=0&&p<a.length&&(m.aps.length===a.length)?a[p]:dir==="d"?a[0]:a[a.length-1]};
      const tm=ix(m.blk),st=ix(m.sch);if(tm){o[K.t]=tm;got.push(K.t.toUpperCase()+" "+tm)}
      if(st&&HM.test(val(r,K.s))&&st!==val(r,K.s))warn.push(`${K.s.toUpperCase()} في أماديوس ${st} والجدول ${val(r,K.s)} — ما غيّرته.${dir==="d"?" إذا الرحلة معدّلة الوقت غيّر STD بيدك، لأن OT/DLY يتحسب منه":""}`);
      const inf=m.acc?m.acc.i:m.winf;if(m.acc&&m.winf!=null&&m.acc.i!==m.winf)warn.push(`عدد الرضّع (${K.n}) مختلف بين الشاشتين — ما عبّيته`);else if(inf!=null){o[K.i]=String(inf);got.push("INF "+inf)}
      if(m.acc&&(m.accBad||m.tot!=null&&m.acc.j+m.acc.y!==m.tot))warn.push(`ركاب ${K.n}: J+Y (${m.acc.j}+${m.acc.y}) ما يطابق الإجمالي ${m.tot} — ما عبّيتهم`);
      else if(m.acc){o[K.j]=String(m.acc.j);o[K.y]=String(m.acc.y);got.push(`J ${m.acc.j} · Y ${m.acc.y}`)}
      else if(m.tot!=null)warn.push(`${K.n}: قرأت إجمالي الركاب ${m.tot} بس، صوّر Acceptance Figures عشان يتقسّم J وY`);
      /* عدد القطع: لو انقرى من سطرين لازم يتطابقون، غير كذا ما يتعبّى */
      const bp=[...new Set(m.bagC.map(b=>b.p))];if(bp.length===1){o[K.b]=String(bp[0]);got.push("عفش "+bp[0]);if(m.bagC.length<2)warn.push(`عفش ${K.n} ${bp[0]} انقرى من سطر واحد بس — تأكد منه`)}else if(bp.length>1)warn.push(`عفش ${K.n} ما انقرى بوضوح — أدخله بيدك`);
      if(got.length)out.push(`<b>${K.n}:</b> <b dir="ltr">${E(got.join(" · "))}</b>`)}
    const rg=regs.map(regN),okR=rg.find(g=>REGT[g]!=null)||rg.find(g=>/^HZ[A-Z]{2}\d{2}$/.test(g));
    if(okR){const cur=regN(val(r,"reg"));if(cur&&cur!==okR)warn.push(`التسجيل في أماديوس ${okR} وكان ${cur}`);o.reg=okR;out.push(`<b dir="ltr">${E(okR)}</b>`)}
    if(typ&&!val(r,"typ"))o.typ=typ;
    if(!out.length)throw new Error("amdnone");sv();
    PST[id]={msg:"✓ من أماديوس — "+out.join("<br>")+"<br>راجعها قبل النسخ"+(warn.length?`<br><span style="color:var(--amber)">⚠️ ${warn.map(E).join("<br>⚠️ ")}</span>`:"")}}
  catch(e){console.error(e);PST[id]={err:PERR[e.message]||e.message||PERR.aierr}}
  if(dayK()===k)paint()}
/* حقل اختيار الصورة برا الصفحة عشان ما ينمسح لما تنعاد الرسمة */
function imgIn(){let f=document.getElementById("drImg");if(!f){f=document.createElement("input");f.type="file";f.accept="image/*";f.id="drImg";f.hidden=true;document.body.appendChild(f);
  f.addEventListener("change",()=>{const fs=[...(f.files||[])];if(!fs.length||!PH)return;if(PH.amd)readAmd(fs.slice(0,4),PH);else readPhoto(fs[0],PH)})}return f}
function upd(id){/* تحديث ملخص البطاقة بدون إعادة رسم الخانات (عشان ما يطير الكيبورد) */
  const c=root.querySelector(`[data-card="${CSS.escape(id)}"]`);if(!c)return;const Ls=list(),ix=Ls.findIndex(x=>x.id===id),r=Ls[ix];if(!r)return;
  const tmp=document.createElement("div");tmp.innerHTML=card(r,ix+1);const n=tmp.firstElementChild;
  c.querySelector("summary").innerHTML=n.querySelector("summary").innerHTML;
  const F=c.closest(".dr-f");if(F){F.className=n.className;const ob=F.querySelector(".dr-cp"),nb=n.querySelector(".dr-cp");if(ob&&nb)ob.replaceWith(nb);else if(ob)ob.remove();else if(nb)F.appendChild(nb)}
  ["a","d"].forEach(t=>{const o=c.querySelector(`[data-tot="${t}"]`),m=n.querySelector(`[data-tot="${t}"]`);if(o&&m)o.textContent=m.textContent});
  ["st","rsn","typ"].forEach(k=>{const el=c.querySelector(`[data-dk="${k}"]`);if(el&&el!==document.activeElement){el.value=val(r,k);if(el.tagName==="INPUT")el.className=isAuto(r,k)?"au":""}});
  const w=c.querySelector(".dr-warn"),nw=n.querySelector(".dr-warn");if(w&&!nw)w.remove();else if(w&&nw)w.innerHTML=nw.innerHTML;else if(!w&&nw)c.querySelector(".dr-x").before(nw)}
function bind(){
  root.addEventListener("click",e=>{const t=e.target.closest("button");if(!t||!root.contains(t))return;const D=dS(dayK());
    if(t.dataset.drday!=null){DAY=+t.dataset.drday;OPEN=null;RES=null;CP=null;C1=null;paint();return}
    if(t.dataset.dcp){const r=list().find(x=>x.id===t.dataset.dcp);if(!r)return;copyTxt(tsv([r])).then(ok=>{if(!ok){alert("تعذّر النسخ، جرّب مرة ثانية");return}C1={k:dayK(),id:r.id};CP=null;try{ajfAct("dr_copy1",dayK()+" "+r.id)}catch(e){}paint();const b=root.querySelector(`[data-dmk="${CSS.escape(r.id)}"]`);if(b)b.scrollIntoView({block:"center",behavior:"smooth"})});return}
    if(t.dataset.dmk){D.done[t.dataset.dmk]=Date.now();sv();C1=null;paint();return}
    if(t.dataset.damd){PH={id:t.dataset.damd,k:dayK(),amd:1};const f=imgIn();f.value="";f.multiple=true;f.click();return}
    if(t.dataset.dtype||t.dataset.dphoto){let id=t.dataset.dphoto;if(!id){id="x"+Date.now().toString(36);D.x.push({id,stn:"AJF",...XT[t.dataset.dtype]});sv();OPEN=id}
      PH={id,k:dayK()};const f=imgIn();f.value="";f.multiple=false;f.click();if(t.dataset.dtype)setTimeout(paint,50);return}
    if(t.id==="drAdd"){const id="x"+Date.now().toString(36);D.x.push({id,stn:"AJF"});sv();OPEN=id;paint();const c=root.querySelector(`[data-card="${id}"] input`);if(c)c.focus();return}
    if(t.dataset.dskip){const id=t.dataset.dskip;if(D.skip[id])delete D.skip[id];else D.skip[id]=1;sv();paint();return}
    if(t.dataset.ddel){if(!confirm("حذف هذي الرحلة من التقرير؟"))return;const id=t.dataset.ddel;D.x=D.x.filter(x=>x.id!==id);delete D.e[id];delete D.skip[id];delete D.done[id];sv();paint();return}
    if(t.dataset.dund){delete D.done[t.dataset.dund];sv();paint();return}
    if(t.id==="drCopy"){const L=list().filter(r=>!D.skip[r.id]&&!D.done[r.id]&&!(r.x&&!val(r,"fin")));if(!L.length)return;copyTxt(tsv(L)).then(ok=>{if(!ok){alert("تعذّر النسخ، جرّب مرة ثانية");return}CP={k:dayK(),ids:L.map(r=>r.id),n:L.length};C1=null;try{ajfAct("dr_copy",dayK()+" "+L.length)}catch(e){}paint();const m=root.querySelector("#drMark");if(m)m.scrollIntoView({block:"center",behavior:"smooth"})});return}
    if(t.id==="drMark"){if(CP){CP.ids.forEach(id=>{D.done[id]=Date.now()});sv();CP=null;paint()}return}
    if(t.id==="drGo"){RES=null;const f=root.querySelector("#drFile");f.value="";f.click();return}
    if(t.id==="drSave"){save();return}});
  root.addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.dr-c")){if(d.open)OPEN=d.dataset.card;else if(OPEN===d.dataset.card)OPEN=null}},true);
  const put=(el,fin)=>{const id=el.dataset.id,k=el.dataset.dk;if(!id||!k)return;const D=dS(dayK()),o=D.e[id]=D.e[id]||{};
    let v=el.value;if(TMK.has(k)){const d=v.replace(/[٠-٩]/g,x=>"٠١٢٣٤٥٦٧٨٩".indexOf(x)).replace(/\D/g,"").slice(0,4);
      v=!fin?(d.length<=2?d:d.slice(0,2)+":"+d.slice(2)):!d?"":d.length<=2?d.padStart(2,"0")+":00":d.length===3?"0"+d[0]+":"+d.slice(1):d.slice(0,2)+":"+d.slice(2);
      if(el.value!==v)el.value=v;el.style.borderColor=fin&&v&&!HM.test(v)?"var(--warn)":""}
    else if(NUMK.has(k))v=v.replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^\d]/g,"");else if(el.type!=="time"&&el.tagName==="INPUT")v=v.trim().toUpperCase();
    if(NUMK.has(k)&&el.value!==v)el.value=v;o[k]=v;if(el.tagName==="INPUT")el.classList.remove("au");sv();return id};
  root.addEventListener("input",e=>{const el=e.target;if(!el.dataset||!el.dataset.dk)return;const id=put(el,false);if(id&&(NUMK.has(el.dataset.dk)||TMK.has(el.dataset.dk)&&HM.test(el.value))){clearTimeout(upd.t);upd.t=setTimeout(()=>upd(id),250)}});
  root.addEventListener("change",e=>{const el=e.target;if(el.id==="drFile"){const f=el.files&&el.files[0];if(f)run(f);return}if(!el.dataset||!el.dataset.dk)return;const id=put(el,true);if(id)upd(id)})}
G.DR={mount(r){if(root!==r){root=r;bind()}const a=document.activeElement;if(a&&r.contains(a)&&/INPUT|SELECT/.test(a.tagName))return;paint()},own};
})(typeof window!=="undefined"?window:globalThis);
