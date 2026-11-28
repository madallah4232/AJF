/* اختبارات ثابتة لاشتراطات السفر — شغّلها قبل أي نشر: node tools/tvtest.js
   كل حالة: المدخلات + الحكم المتوقع (ok / w / x). أي حالة تفشل = لا تنشر. */
const fs=require("fs"),vm=require("vm"),path=require("path");const D=path.join(__dirname,"..");
const ctx={window:{},sessionStorage:{getItem:()=>null,setItem:()=>{}},console,Intl,
  fetch:async u=>{const f=path.join(D,String(u).split("?")[0]);return{ok:fs.existsSync(f),json:async()=>JSON.parse(fs.readFileSync(f,"utf8"))}},document:{}};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(D,"tvkb.js"),"utf8"),ctx);vm.runInContext(fs.readFileSync(path.join(D,"tv.js"),"utf8"),ctx);
const T=ctx.TV._t;const far="2030-01-01";
const P=o=>({pt:"N",ppx:far,pur:"tour",rt:1,days:null,yf:false,qa:{},il:{},nat:"",st:"visit",res:"",age:null,sex:"",sup:[],ebola:false,ticket:"one",legs:[],visas:{},...o,res:o.res||o.nat,qa:{sa_exit:1,...(o.qa||{})}});
const leg=(to,car,h,bag)=>({to,car,h:h||"",bag:bag||""});
const C=[
 ["خليجي (كويتي) إلى الكويت",P({nat:"KW",st:"cit",legs:[leg("KWI","SV")]}),"ok"],
 ["مصري إلى دبي بتأشيرة — قبل أسئلة التأكيد",P({nat:"EG",legs:[leg("DXB","FZ")],visas:{AE:1}}),"w"],
 ["مصري إلى دبي بتأشيرة — بعد التأكيد",P({nat:"EG",legs:[leg("DXB","FZ")],visas:{AE:1},qa:{ae_ext:1}}),"ok"],
 ["مصري إلى دبي بدون تأشيرة",P({nat:"EG",legs:[leg("DXB","FZ")],visas:{AE:0}}),"x"],
 ["مصري إلى الكويت بدون تأشيرة",P({nat:"EG",legs:[leg("KWI","KU")],visas:{KW:0}}),"x"],
 ["مغربي إلى بانكوك بدون تأشيرة (تعميم تايلند)",P({nat:"MA",legs:[leg("BKK","SV")],visas:{TH:0}}),"x"],
 ["سعودي إلى بانكوك بعد تأكيد TDAC",P({nat:"SA",st:"cit",legs:[leg("BKK","SV")],qa:{th_tdac:1}}),"ok"],
 ["سعودي إلى بانكوك بدون TDAC",P({nat:"SA",st:"cit",legs:[leg("BKK","SV")],qa:{th_tdac:0}}),"x"],
 ["سوداني إلى عمّان بدون شهادة حمى صفراء",P({nat:"SD",legs:[leg("AMM","RJ")],visas:{JO:1},qa:{jo_yf:0}}),"x"],
 ["سوداني إلى عمّان مع الشهادة",P({nat:"SD",legs:[leg("AMM","RJ")],visas:{JO:1},qa:{jo_yf:1}}),"ok"],
 ["سعودي إلى كولومبو بدون ETA",P({nat:"SA",st:"cit",legs:[leg("CMB","SV")],visas:{LK:0}}),"x"],
 ["مغربي ترانزيت بانكوك تذاكر منفصلة على فيت جيت بدون تأشيرة تايلند",P({nat:"MA",ticket:"sep",legs:[leg("BKK","SV","5","thru"),leg("HAN","VJ")],visas:{TH:0,VN:1}}),"x"],
 ["مصري إلى نيروبي بدون التأمين الكيني",P({nat:"EG",legs:[leg("NBO","SV")],visas:{KE:1},qa:{ke_ins:0}}),"x"],
 ["الجواز منتهي",P({nat:"EG",ppx:"2020-01-01",legs:[leg("CAI","SV")]}),"x"],
 ["يمني 30 سنة ترانزيت القاهرة 10 ساعات بدون موافقة أمنية",P({nat:"YE",age:30,legs:[leg("CAI","MS","10","thru"),leg("IST","MS")],visas:{EG:0,TR:1},qa:{eg_ye_sec:0}}),"x"],
 ["يمني 30 سنة إلى القاهرة — قبل سؤال الموافقة الأمنية",P({nat:"YE",age:30,legs:[leg("CAI","SV")]}),"w"],
 ["يمني 30 سنة إلى القاهرة بدون موافقة أمنية",P({nat:"YE",age:30,legs:[leg("CAI","SV")],qa:{eg_ye_sec:0}}),"x"],
 ["يمني 30 سنة إلى القاهرة مع موافقة أمنية",P({nat:"YE",age:30,legs:[leg("CAI","SV")],qa:{eg_ye_sec:1}}),"ok"],
 ["يمني 16 سنة إلى القاهرة بدون موافقة",P({nat:"YE",age:16,legs:[leg("CAI","SV")],qa:{eg_ye_sec:0}}),"x"],
 ["يمني 50 سنة إلى القاهرة بدون موافقة",P({nat:"YE",age:50,legs:[leg("CAI","SV")],qa:{eg_ye_sec:0}}),"x"],
 ["يمني 15 سنة إلى القاهرة — بدون موافقة",P({nat:"YE",age:15,legs:[leg("CAI","SV")]}),"ok"],
 ["يمني 51 سنة إلى القاهرة — بدون موافقة",P({nat:"YE",age:51,legs:[leg("CAI","SV")]}),"ok"],
 ["يمني بدون عمر إلى القاهرة — ما يُقبل قبل العمر",P({nat:"YE",legs:[leg("CAI","SV")]}),"w"],
 ["سوري 10 سنين إلى القاهرة بدون تأشيرة",P({nat:"SY",age:10,legs:[leg("CAI","SV")],visas:{EG:0}}),"x"],
 ["سوري 60 سنة معه تأشيرة بدون موافقة أمنية",P({nat:"SY",age:60,legs:[leg("CAI","SV")],visas:{EG:1},qa:{"vok:EG:SY":0}}),"x"],
 ["سوداني 70 سنة معه تأشيرة بدون موافقة أمنية",P({nat:"SD",age:70,legs:[leg("CAI","SV")],visas:{EG:1},qa:{"vok:EG:SD":0}}),"x"],
 ["سوداني معه تأشيرة وموافقة أمنية",P({nat:"SD",age:30,legs:[leg("CAI","SV")],visas:{EG:1},qa:{"vok:EG:SD":1}}),"ok"],
 ["هندي مقيم: القصيم ثم دبي على السعودية ثم كوتشي على إنديغو (ما لها اتفاقية) بدون تأشيرة إمارات",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","2","thru"),leg("DXB","SV","6","thru"),leg("COK","6E")],visas:{AE:0}}),"x"],
 ["نفس الحالة ومعه تأشيرة إمارات وأكد الجواز",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","2","thru"),leg("DXB","SV","6","thru"),leg("COK","6E")],visas:{AE:1},qa:{ae_ext:1}}),"ok"],
 ["باكستاني ترانزيت أبوظبي ثم Air Sial — اختار العفش لآخر محطة وبدون تأشيرة: لا يُقبل والعفش ما يغيّر الحكم",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","2","thru"),leg("AUH","SV","5","thru"),leg("ISB","PF")],visas:{AE:0}}),"x"],
 ["باكستاني ترانزيت أبوظبي ثم Air Sial (بدون اتفاقية) بدون تأشيرة",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("AUH","SV","5","out"),leg("ISB","PF")],visas:{AE:0}}),"x"],
 ["سعودي: الرياض ثم دبي على السعودية ثم القاهرة على السعودية (نفس الناقل) — يُقبل",P({nat:"SA",st:"cit",legs:[leg("DXB","SV","3","thru"),leg("CAI","SV")],qa:{ae_ext:1}}),"ok"],
 ["هندي بدون عفش (دبي ثم إنديغو) — قبل سؤال بطاقة الصعود",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1}}),"w"],
 ["هندي بدون عفش — معه بطاقة صعود",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1,bp_DXB:1}}),"ok"],
 ["هندي بدون عفش — ما معه بطاقة صعود ولا تأشيرة إمارات",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1,bp_DXB:0}}),"x"],
 ["باكستاني بدون عفش ترانزيت أبوظبي ثم Air Sial — التعميم يشترط تأشيرة",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("AUH","SV","5","none"),leg("ISB","PF")],visas:{AE:0}}),"x"],
 ["باكستاني بدون عفش: القصيم ثم أبوظبي 25 ساعة على السعودية بدون تأشيرة إمارات",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","","none"),leg("AUH","SV","25","none"),leg("ISB","SV")],visas:{AE:0},qa:{ae_ext:1}}),"x"],
 ["نفس الحالة لكن الانتظار 5 ساعات",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","","none"),leg("AUH","SV","5","none"),leg("ISB","SV")],visas:{AE:0},qa:{ae_ext:1}}),"ok"],
 ["سعودي ينتظر في دبي 30 ساعة (ما يحتاج تأشيرة) — يُقبل",P({nat:"SA",st:"cit",legs:[leg("DXB","SV","30","thru"),leg("CAI","SV")],qa:{ae_ext:1}}),"ok"],
 ["سعودي مباشر إلى القاهرة",P({nat:"SA",st:"cit",legs:[leg("CAI","SM")]}),"ok"],
 ["سعودي عن طريق أبوظبي إلى القاهرة",P({nat:"SA",st:"cit",legs:[leg("AUH","EY","4","thru"),leg("CAI","EY")],qa:{ae_ext:1}}),"ok"],
 ["سعودي عن طريق الدوحة إلى القاهرة",P({nat:"SA",st:"cit",legs:[leg("DOH","QR","3","thru"),leg("CAI","QR")]}),"ok"],
 ["كويتي إلى القاهرة — يبقى «تأكد»",P({nat:"KW",st:"cit",legs:[leg("CAI","SV")]}),"w"],
 ["سعودي: دبي 3 ساعات على السعودية ثم عمّان (دبي تُقبل)",P({nat:"SA",st:"cit",legs:[leg("DXB","SV","3","thru"),leg("AMM","SV")],qa:{ae_ext:1}}),"ok"],
 ["يمني ينتظر في إسطنبول 30 ساعة بدون تأشيرة تركية",P({nat:"YE",st:"res",res:"SA",pur:"tour",legs:[leg("IST","TK","30","thru"),leg("CAI","TK")],visas:{TR:0,EG:1}}),"x"],
 ["مقيم ما معه خروج وعودة",P({nat:"EG",st:"res",res:"SA",pur:"home",legs:[leg("CAI","SV")],qa:{sa_exit:0}}),"x"],
 ["سعودي إلى بانكوك سياحة 45 يوم (الإعفاء 30)",P({nat:"SA",st:"cit",days:45,legs:[leg("BKK","SV")],qa:{th_tdac:1}}),"x"],
 ["سعودي إلى بانكوك بدون تذكرة عودة",P({nat:"SA",st:"cit",rt:0,legs:[leg("BKK","SV")],qa:{th_tdac:1}}),"x"],
 ["سعودي إلى بانكوك للعمل بدون تأشيرة",P({nat:"SA",st:"cit",pur:"work",legs:[leg("BKK","SV")],visas:{TH:0},qa:{th_tdac:1}}),"x"],
 ["سعودي جوازه ينتهي قبل نهاية الإقامة",P({nat:"SA",st:"cit",days:20,ppx:new Date(Date.now()+10*864e5).toISOString().slice(0,10),legs:[leg("IST","TK")]}),"x"],
 ["باكستاني ترانزيت فرانكفورت بدون ATV",P({nat:"PK",st:"res",res:"SA",legs:[leg("FRA","LH","3","thru"),leg("JFK","LH")],visas:{DE:0,US:1},qa:{atv_DE:0}}),"x"],
 ["باكستاني ترانزيت فرانكفورت ومعه تأشيرة أمريكية (معفى من ATV)",P({nat:"PK",st:"res",res:"SA",sup:["US"],legs:[leg("FRA","LH","3","thru"),leg("JFK","LH")],visas:{DE:0,US:1}}),"ok"],
 ["هندي ترانزيت إسطنبول للمكسيك بدون e-ATV",P({nat:"IN",st:"res",res:"SA",legs:[leg("IST","TK","4","thru"),leg("MEX","TK")],visas:{TR:0,MX:1},qa:{tr_atv:0}}),"x"],
 ["مصري ترانزيت الكويت (الترانزيت موقوف) بدون تأشيرة كويتية",P({nat:"EG",st:"res",res:"SA",legs:[leg("KWI","KU","3","thru"),leg("CAI","KU")],visas:{KW:0}}),"x"],
 ["يمني ترانزيت القاهرة 7 ساعات (أكثر من 6) بدون تأشيرة مصرية",P({nat:"YE",st:"res",res:"SA",legs:[leg("CAI","MS","7","thru"),leg("KUL","MS")],visas:{EG:0,MY:1}}),"x"],
 ["سوداني ترانزيت الدوحة 5 ساعات على القطرية",P({nat:"SD",st:"res",res:"SA",legs:[leg("DOH","QR","5","thru"),leg("KRT","QR")],visas:{QA:0}}),"ok"],
 ["مصري ترانزيت فرانكفورت ثم باريس (دخول شنغن) بدون تأشيرة شنغن",P({nat:"EG",st:"res",res:"SA",legs:[leg("FRA","LH","3","thru"),leg("CDG","LH")],visas:{DE:0,FR:0}}),"x"],
 ["كاتماندو (التنبيه المؤقت انتهى) — ما يمنع",P({nat:"NP",legs:[leg("KTM","SV")]}),"ok"],
];
T.loadPI().then(()=>{let f=0;C.forEach(([n,p,exp])=>{const o=T.analyze(p);/* بدون تعميم مطابق في مراجعة الذكاء الاصطناعي: بطاقة «حسب التعميم» تصير حسب باقي القواعد */o.cards.forEach(c=>{if(c.circ&&c.lv==="w"&&!c.L.some(l=>l.lv==="w"&&!/📢/.test(l.t)))c.lv="ok"});o.lv=o.cards.reduce((a,c)=>({ok:0,w:1,x:2}[c.lv]>{ok:0,w:1,x:2}[a]?c.lv:a),"ok");const ok=o.lv===exp;if(!ok)f++;
  console.log((ok?"✓":"✗")+" "+n+" → "+o.lv+(ok?"":" (المتوقع "+exp+")"));if(!ok)o.cards.forEach(c=>console.log("   ["+c.t+"] "+c.lv+" "+(c.head||"")+"\n"+c.L.map(l=>"     ("+l.lv+") "+l.t.slice(0,90)).join("\n")))});
  console.log(f?`\n${f} حالة فشلت`:`\nكل الحالات نجحت (${C.length})`);process.exit(f?1:0)});
