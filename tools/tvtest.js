/* اختبارات ثابتة لاشتراطات السفر — شغّلها قبل أي نشر: node tools/tvtest.js
   كل حالة: المدخلات + الحكم المتوقع (ok / w / x). أي حالة تفشل = لا تنشر. */
const fs=require("fs"),vm=require("vm"),path=require("path");const D=path.join(__dirname,"..");
const ctx={window:{},sessionStorage:{getItem:()=>null,setItem:()=>{}},console,Intl,
  fetch:async u=>{const f=path.join(D,String(u).split("?")[0]);return{ok:fs.existsSync(f),json:async()=>JSON.parse(fs.readFileSync(f,"utf8"))}},document:{}};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(D,"tvkb.js"),"utf8"),ctx);vm.runInContext(fs.readFileSync(path.join(D,"tv.js"),"utf8"),ctx);
const T=ctx.TV._t;const far="2030-01-01";
const P=o=>({pt:"N",ppx:far,pur:"tour",rt:1,days:null,yf:false,qa:{},il:{},nat:"",st:"visit",res:"",age:null,sex:"",sup:[],ebola:false,ticket:"one",legs:[],visas:{},...o,res:o.res||o.nat});
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
 ["مصري ترانزيت القاهرة 10 ساعات بدون تأشيرة يمني",P({nat:"YE",legs:[leg("CAI","MS","10","thru"),leg("IST","MS")],visas:{EG:0,TR:1}}),"x"],
 ["هندي مقيم: القصيم ثم دبي على السعودية ثم كوتشي على إنديغو (ما لها اتفاقية) بدون تأشيرة إمارات",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","2","thru"),leg("DXB","SV","6","thru"),leg("COK","6E")],visas:{AE:0}}),"x"],
 ["نفس الحالة ومعه تأشيرة إمارات وأكد الجواز",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("ELQ","SV","2","thru"),leg("DXB","SV","6","thru"),leg("COK","6E")],visas:{AE:1},qa:{ae_ext:1}}),"ok"],
 ["باكستاني ترانزيت أبوظبي ثم Air Sial (بدون اتفاقية) بدون تأشيرة",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("AUH","SV","5","out"),leg("ISB","PF")],visas:{AE:0}}),"x"],
 ["سعودي: الرياض ثم دبي على السعودية ثم القاهرة على السعودية (نفس الناقل)",P({nat:"SA",st:"cit",legs:[leg("DXB","SV","3","thru"),leg("CAI","SV")],qa:{ae_ext:1}}),"ok"],
 ["هندي بدون عفش (دبي ثم إنديغو) — قبل سؤال بطاقة الصعود",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1}}),"w"],
 ["هندي بدون عفش — معه بطاقة صعود",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1,bp_DXB:1}}),"ok"],
 ["هندي بدون عفش — ما معه بطاقة صعود ولا تأشيرة إمارات",P({nat:"IN",st:"res",res:"SA",pur:"home",legs:[leg("DXB","SV","6","none"),leg("COK","6E")],visas:{AE:0},qa:{ae_ext:1,bp_DXB:0}}),"x"],
 ["باكستاني بدون عفش ترانزيت أبوظبي ثم Air Sial — التعميم يشترط تأشيرة",P({nat:"PK",st:"res",res:"SA",pur:"home",legs:[leg("AUH","SV","5","none"),leg("ISB","PF")],visas:{AE:0}}),"x"],
 ["كاتماندو (التنبيه المؤقت انتهى) — ما يمنع",P({nat:"NP",legs:[leg("KTM","SV")]}),"ok"],
];
T.loadPI().then(()=>{let f=0;C.forEach(([n,p,exp])=>{const o=T.analyze(p);const ok=o.lv===exp;if(!ok)f++;
  console.log((ok?"✓":"✗")+" "+n+" → "+o.lv+(ok?"":" (المتوقع "+exp+")"));if(!ok)o.cards.forEach(c=>console.log("   ["+c.t+"] "+c.lv+" "+(c.head||"")+"\n"+c.L.map(l=>"     ("+l.lv+") "+l.t.slice(0,90)).join("\n")))});
  console.log(f?`\n${f} حالة فشلت`:`\nكل الحالات نجحت (${C.length})`);process.exit(f?1:0)});
