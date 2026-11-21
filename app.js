(function(){
  "use strict";
  const PREFIX = "skin:", SHIFT = 5*3600*1000, DAY = 86400000;
  const p2 = n => String(n).padStart(2,"0");
  const fmtK = d => d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
  const dayKey = t => fmtK(new Date(t - SHIFT));
  const kDate = k => new Date(k+"T12:00:00");
  const addDays = (k,n) => { const d = kDate(k); d.setDate(d.getDate()+n); return fmtK(d); };
  const addMonths = (k,m) => { const d = kDate(k); d.setMonth(d.getMonth()+m); return fmtK(d); };
  const daysBetween = (a,b) => Math.round((Date.parse(b)-Date.parse(a))/DAY);
  const fmtD = (k,y) => kDate(k).toLocaleDateString("ru-RU", y ? {day:"numeric",month:"long",year:"numeric"} : {day:"numeric",month:"long"}).replace(" г.","");
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const $ = id => document.getElementById(id);

  function load(k){ try{ return JSON.parse(localStorage.getItem(PREFIX+k)) || {}; }catch(e){ return {}; } }
  function save(k,v){ if(migrationError)return; try{ localStorage.setItem(PREFIX+k, JSON.stringify(v)); }catch(e){} }
  function ui(k,v){ try{ if(v===undefined) return localStorage.getItem("skin-ui:"+k); localStorage.setItem("skin-ui:"+k, v); }catch(e){} }
  const DAYRE = /^skin:(\d{4}-\d{2}-\d{2})$/;
  function eachDay(fn){
    try{ for(let i=0;i<localStorage.length;i++){ const key = localStorage.key(i), m = key && key.match(DAYRE); if(m) fn(m[1], key); } }catch(e){}
  }
  function getStart(){
    // начало курса = самый ранний отмеченный адапален (после последнего «Начать заново»)
    let best = null, from = "";
    try{ from = localStorage.getItem(PREFIX+"reset") || ""; }catch(e){}
    eachDay((k,key)=>{ if(k < from) return; let v={}; try{ v = JSON.parse(localStorage.getItem(key))||{}; }catch(e){} if(v["pm-adapalene"] && (!best || k < best)) best = k; });
    return best;
  }
  function firstDayWith(ids){
    let best = null;
    eachDay((k,key)=>{ let v={}; try{ v = JSON.parse(localStorage.getItem(key))||{}; }catch(e){} if((!ids || ids.some(id => v[id])) && (!best || k < best)) best = k; });
    return best;
  }

  // ---------- шаги по умолчанию ----------
  const DEF = [
    {id:"am-wash", g:"am", name:"Умыться", prod:"SaliZink на лоб и нос, Kora на щёки и подбородок", next:"SaliZink на лоб и нос, Aravia Galactomyces на щёки и подбородок", notes:[], zone:"split"},
    {id:"am-brow", g:"am", name:"Сыворотка на брови", prod:"Almea", lash:"am", zone:"brows", notes:["Только брови, ресницы утром не нужно. Если краситься, за 20 минут до макияжа."]},
    {id:"am-eye", g:"am", name:"Крем для век", prod:"Clean+ Total Repair", next:"Vivienne Sabo", zone:"eyecream", notes:["По косточке под глазом и под бровью. Не у самых ресниц."]},
    {id:"am-serum", g:"am", name:"Сыворотка на лоб и нос", prod:"Librederm Seracin", zone:"tzone", notes:["С серой и цинком, щёки и подбородок пропускай."]},
    {id:"am-cream", g:"am", name:"Крем на всё лицо и шею", prod:"Fito гиалуроновый", zone:"fullneck", notes:["На лоб и нос тонко или пропустить, если жирнятся - там уже Seracin.","На шелушащиеся места можно Cerafavit."]},
    {id:"am-spf", g:"am", name:"SPF, если выходишь на улицу", prod:"", opt:true, zone:"fullneck", notes:["На лицо, шею и декольте.","Дома не нужен, если не сидишь у окна на солнце."]},
    {id:"pm-makeup", g:"pm", name:"Если был макияж: мицеллярка", prod:"", opt:true, zone:"wash", notes:["На глаза прижать диск на 10–15 секунд, не тереть. Потом всё равно умыться."]},
    {id:"pm-wash", g:"pm", name:"Умыться", prod:"Aravia Galactomyces Therapy", zone:"wash", notes:["Без SaliZink."]},
    {id:"pm-lash", g:"pm", name:"Сыворотка для ресниц и бровей", prod:"Almea", lash:"pm", zone:"lashbrow", notes:["Тонкая линия по росту верхних ресниц (нижние не трогать) и на брови. На чистую сухую кожу, минимум за 20 минут до сна."]},
    {id:"pm-wait1", g:"pm", kind:"wait", adOnly:true, min:5, name:"Подождать 5–10 минут", notes:["Промокни полотенцем, кожа должна стать полностью сухой."]},
    {id:"pm-buffer", g:"pm", name:"Крем на щёки и подбородок", prod:"Librederm Cerafavit", zone:"cheeks", notes:["Буфер от шелушения. Лоб и нос не трогать."]},
    {id:"pm-wait2", g:"pm", kind:"wait", adOnly:true, min:5, name:"Подождать 5 минут", notes:["Пока крем впитается и перестанет скользить."]},
    {id:"pm-adapalene", g:"pm", name:"Адапален на всё лицо", prod:"Дифферин крем 0,1%", zone:"adapalene", notes:["Горошина на всё лицо, тонким слоем. Мимо глаз, губ и складок у крыльев носа. На шею не наносить."]},
    {id:"pm-dry", g:"pm", name:"Крем на сухие места", prod:"Librederm Cerafavit", opt:true, zone:"cheeks", notes:["Если что-то стянуло или шелушится."]},
    {id:"pm-neck", g:"pm", name:"Крем на шею", prod:"Librederm Cerafavit", zone:"neck", notes:["Тонким слоем, можно захватить декольте. Без адапалена."]}
  ];
  const DEFMAP = Object.fromEntries(DEF.map(s => [s.id, s]));
  const ZONES = [["","без схемы"],["wash","всё лицо"],["full","лицо без глаз и губ"],["fullneck","лицо и шея"],["tzone","лоб и нос"],["cheeks","щёки и подбородок"],["split","лоб и нос + щёки отдельно"],["eyecream","веки"],["brows","брови"],["lashbrow","ресницы и брови"],["adapalene","лицо мимо глаз, губ, складок"],["neck","шея и декольте"]];
  const FIELDS = ["name","prod","next","notes","pao","opened","zone","opt","hidden","min"];

  let migrationError = "";
  try { SkinCore.migrate(localStorage, DEF); } catch(e) { migrationError = e.message; try{localStorage.setItem("skin2:safety:corrupt",JSON.stringify({app:"umyvanie",v:1,data:SkinCore.snapshot(localStorage)}))}catch(x){} }
  let cfg = loadCfg();
  function loadCfg(){ const c = load("cfg"); c.steps = c.steps||{}; c.custom = Array.isArray(c.custom)?c.custom:[]; c.order = c.order||{}; return c; }
  function saveCfg(){ save("cfg", cfg); }
  const isCustom = id => cfg.custom.some(s => s.id===id);
  function raw(id){ return DEFMAP[id] || cfg.custom.find(s => s.id===id); }
  function ov(id){ if(isCustom(id)) return cfg.custom.find(s => s.id===id); return cfg.steps[id] || (cfg.steps[id] = {}); }
  function eff(id){
    const d = raw(id); if(!d) return null;
    const e = Object.assign({}, d, DEFMAP[id] ? (cfg.steps[id]||{}) : {});
    e.notes = typeof e.notes === "string" ? e.notes.split("\n").map(s=>s.trim()).filter(Boolean) : (e.notes||[]);
    e.custom = !DEFMAP[id];
    return e;
  }
  function order(g){
    const ids = DEF.filter(s=>s.g===g).map(s=>s.id).concat(cfg.custom.filter(s=>s.g===g).map(s=>s.id));
    const o = (cfg.order[g]||[]).filter(id => ids.includes(id));
    ids.forEach(id => { if(!o.includes(id)) o.push(id); });
    return o;
  }
  function expiry(e){
    if(!e.opened) return null;
    const pao = +e.pao || 0;
    if(!pao) return {opened:e.opened};
    const until = addMonths(e.opened, pao), left = daysBetween(today, until);
    return {opened:e.opened, until, left};
  }

  // ---------- схемы лица (рисунок: face.png, 1024×1024) ----------
  let fn = 0;
  const FACE='M358 302 C380 255 440 205 512 194 C584 205 644 255 666 302 L670 332 C672 400 668 465 655 500 C640 555 600 608 562 630 C540 641 484 641 462 630 C424 608 384 555 369 500 C356 465 352 400 354 332 Z';
  const NECK='M416 588 C440 618 480 640 512 641 C544 640 584 618 608 588 L610 700 C616 762 660 806 752 830 L742 858 Q512 878 282 858 L272 830 C364 806 408 762 414 700 Z';
  const P={
    forehead:'<path d="M358 302 C380 255 440 205 512 194 C584 205 644 255 666 302 L670 336 L354 336 Z"/>',
    nose:'<path d="M495 402 L529 402 L550 505 Q512 516 474 505 Z"/>',
    cheeks:'<ellipse cx="418" cy="480" rx="44" ry="38"/><ellipse cx="606" cy="480" rx="44" ry="38"/>',
    chin:'<ellipse cx="512" cy="611" rx="44" ry="20"/>',
    eyes:'<ellipse cx="430" cy="393" rx="56" ry="26"/><ellipse cx="594" cy="393" rx="56" ry="26"/>',
    lips:'<ellipse cx="512" cy="555" rx="62" ry="25"/>',
    folds:'<circle cx="471" cy="505" r="12"/><circle cx="553" cy="505" r="12"/>'
  };
  function masked(cls,holes){ const id='fm'+(++fn);
    return '<mask id="'+id+'"><path d="'+FACE+'" fill="#fff"/><g fill="#000">'+holes.map(h=>P[h]).join('')+'</g></mask><path class="'+cls+'" d="'+FACE+'" mask="url(#'+id+')"/>'; }
  function clip(cls,inner){ const id='fc'+(++fn);
    return '<clipPath id="'+id+'"><path d="'+FACE+'"/></clipPath><g class="'+cls+'" clip-path="url(#'+id+')">'+inner+'</g>'; }
  const browL='M372 362 Q425 340 478 360', browR='M546 360 Q599 340 652 362';
  const lashL='M388 390 Q430 368 470 392', lashR='M554 392 Q594 368 636 390';
  const Z={
    tzone:()=>clip('z1',P.forehead+P.nose),
    adt:()=>clip('z1',P.forehead+P.nose),
    cheeks:()=>clip('z1',P.cheeks+P.chin),
    split:()=>clip('z1',P.forehead+P.nose)+clip('z2',P.cheeks+P.chin),
    full:()=>masked('z1',['eyes','lips']),
    fullneck:()=>masked('z1',['eyes','lips'])+'<path class="z1" d="'+NECK+'"/>',
    wash:()=>masked('z1',[]),
    adapalene:()=>masked('z1',['eyes','lips','folds']),
    neck:()=>'<path class="z1" d="'+NECK+'"/>',
    eyecream:()=>'<path class="hl" d="M392 421 Q430 437 470 421"/><path class="hl" d="M554 421 Q594 437 632 421"/><path class="hl" style="stroke-width:7" d="M394 375 Q430 366 466 373"/><path class="hl" style="stroke-width:7" d="M558 373 Q594 366 630 375"/>',
    brows:()=>'<path class="hl" d="'+browL+'"/><path class="hl" d="'+browR+'"/>',
    lashbrow:()=>'<path class="hl" d="'+browL+'"/><path class="hl" d="'+browR+'"/><path class="hl" style="stroke-width:8" d="'+lashL+'"/><path class="hl" style="stroke-width:8" d="'+lashR+'"/>'
  };
  const VB = {neck:"283 430 458 470", fullneck:"283 100 458 790"};
  function face(z){
    if(!Z[z]) return "";
    return '<svg class="face'+(z==="fullneck"?' tall':'')+'" viewBox="'+(VB[z]||"283 100 458 550")+'" role="img" aria-label="Зона нанесения">'
      +'<image href="face.png" x="0" y="0" width="1024" height="1024"/>'+Z[z]()+'</svg>'
      +(z==="split"?'<span class="legend"><span><i style="background:var(--grad)"></i>SaliZink</span><span><i style="background:#c9932f"></i>Kora / Aravia</span></span>':'');
  }

  // ---------- состояние ----------
  let today = dayKey(Date.now());
  let state = load(today);
  let sel = today, calOffset = 0, calMode = ui("calMode") || "ad";
  let cheeksPrev = false;
  const openIds = new Set(), edOpen = new Set(), asking = new Set();
  function syncDay(){ const k = dayKey(Date.now()); if(k!==today){ if(sel===today) sel=k; today=k; state=load(k); } }
  const boxes = () => [...document.querySelectorAll(".step input")];

  // ---------- списки шагов ----------
  function buildLists(){
    ["am","pm"].forEach(g=>{
      const ol = $("ol-"+g); ol.innerHTML = "";
      order(g).forEach(id=>{
        const e = eff(id), wait = e.kind==="wait";
        const li = document.createElement("li");
        li.dataset.id = id;
        if(wait) li.className = "waitstep";
        const hasMore = e.notes.length || (e.zone && Z[e.zone]) || !wait || DEFMAP[id] && (e.lash || id==="am-spf" || id==="pm-buffer");
        li.innerHTML =
          '<div class="row"><label class="step"><input type="checkbox" id="'+esc(id)+'" data-g="'+g+'"'+(e.opt?' data-opt="1"':'')+'>'
          +'<span class="txt"><span class="name"><span class="nm">'+esc(e.name)+'</span>'+(e.opt?' <span class="tag">необяз.</span>':'')+'<span class="tag exp" hidden>срок</span></span>'
          +'<span class="prod">'+esc(e.prod||"")+'</span>'
          +'</span></label>'
          +(hasMore?'<button type="button" class="where" aria-expanded="false" aria-label="Подробности: '+esc(e.name)+'"><span aria-hidden="true">⌄</span></button>':'')
          +(wait?'<button class="timer" type="button" data-for="'+esc(id)+'" data-min="'+(+e.min||5)+'"></button>':'')
          +'</div>'
          +'<div class="more" hidden>'
          + e.notes.map(n=>'<span class="note">'+esc(n)+'</span>').join('')
          +'<span class="note dyn"></span>'
          +(e.zone && Z[e.zone] ? '<span class="facebox" data-z="'+e.zone+'">'+face(e.zone)+'</span>' : '')
          +(wait ? '' :
            '<div class="pbox"><span class="pinfo"></span><span class="pnext"'+(e.next?'':' hidden')+'>Когда закончится: '+esc(e.next||"")+'</span>'
            +'<div class="btns"><button type="button" class="mini" data-act="out">Закончилось</button><button type="button" class="mini" data-act="new">Открыла новую банку</button></div>'
            +'<div class="pask"'+(asking.has(id)?'':' hidden')+'><input class="inp" placeholder="Чем заменишь?"><button type="button" class="mini acc" data-act="set">Сохранить</button></div></div>')
          +'</div>';
        if(openIds.has(id)){ li.querySelector(".more").hidden = false; const w = li.querySelector(".where"); if(w) w.setAttribute("aria-expanded","true"); }
        ol.appendChild(li);
      });
    });
    updateTimers();
  }

  // ---------- главный рендер ----------
  function render(){
    syncDay();
    const now = new Date(Date.now()-SHIFT);
    $("date").textContent = now.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
    const start = getStart();
    const n = start ? daysBetween(start, today) + 1 : 0;   // день курса, 0 = ещё не начат
    const yesterdayAd = !!load(addDays(today,-1))["pm-adapalene"];
    const eod = n <= 21 || !!cfg.eod;
    const rest = eod && n > 0 && yesterdayAd && !state["pm-adapalene"];
    cheeksPrev = !!(load(addDays(today,-1))["ad-cheeks"] || load(addDays(today,-2))["ad-cheeks"]);
    const cheekDay = !cfg.cheeks || (state["pm-adapalene"] ? !!state["ad-cheeks"] : !cheeksPrev);

    // этап
    const t = $("phase-title"), pn = $("phase-note");
    let note;
    if(!start){ t.textContent = "Сегодня первый вечер с адапаленом"; note = "Первые 3 недели наносишь через день."; }
    else if(n <= 21){ t.textContent = "День "+n+" · адапален через день"; note = rest ? "Вчера был адапален, сегодня вечером отдых." : "Сегодня вечером адапален."; }
    else if(cfg.eod){ t.textContent = "День "+n+" · через день, пока кожа раздражена"; note = rest ? "Вчера был адапален, сегодня вечером отдых." : "Сегодня вечером адапален."; }
    else if(n <= 30){ t.textContent = "День "+n+" · можно каждый вечер"; note = "Если кожа спокойная, мажь каждый вечер. Если шелушится, включи режим через день."; }
    else { t.textContent = "День "+n+" · кожа привыкла"; note = "Адапален каждый вечер."; }
    if(cfg.cheeks && !rest) note += cheekDay ? " Сегодня и на щёки тоже." : " Щёки сегодня пропускаешь.";
    pn.textContent = note;
    $("sw-eod-wrap").hidden = n <= 21;
    $("sw-eod").checked = !!cfg.eod;
    $("sw-cheeks").checked = !!cfg.cheeks;

    // подсказка из дневника
    const hints = [], IRR = ["шелушится","стянуто","покраснение","жжение"];
    const last = k => load("diary:"+k);
    const irr3 = [0,-1,-2].filter(i => (last(addDays(today,i)).t||[]).some(x => IRR.includes(x))).length;
    const peel3 = [0,-1,-2].filter(i => (last(addDays(today,i)).t||[]).includes("шелушится")).length;
    if(n > 21 && !cfg.eod && irr3 >= 2) hints.push("В дневнике раздражение "+irr3+" дня из 3 последних. Включи режим через день, пусть кожа отдохнёт.");
    if(!cfg.cheeks && peel3 >= 2) hints.push("Шелушится уже "+peel3+" дня. Если это щёки, включи режим для щёк.");
    if(cfg.eod || cfg.cheeks){
      const w = [...Array(7)].map((_,i) => last(addDays(today,-i))).filter(d => d.s);
      const calm = w.length >= 5 && w.every(d => !(d.t||[]).some(x => IRR.includes(x))) && w.reduce((a,d)=>a+d.s,0)/w.length >= 4;
      if(calm) hints.push("Неделю кожа спокойная. Можно выключить "+(cfg.eod&&cfg.cheeks?"оба режима":cfg.eod?"режим через день":"режим для щёк")+".");
    }
    $("phase-hint").hidden = !hints.length;
    $("phase-hint").textContent = hints.join(" ");

    // курс сыворотки для ресниц: 90 дней каждый день, потом пн/ср/пт вечером (начало 21 октября 2026)
    const LASH_START = "2026-10-21";
    const lsMark = firstDayWith(["pm-lash","am-brow"]) || (state["pm-lash"]||state["am-brow"] ? today : null);
    const ls = (!lsMark || LASH_START < lsMark) ? LASH_START : lsMark;
    const ln = daysBetween(ls, today) + 1;
    const maint = ln > 90, maintDay = [1,3,5].includes(now.getDay());
    const lashSt = maint ? "Поддержка: только вечером по пн, ср и пт." : "Курс: день "+ln+" из 90"+(ln>=84 ? ". Скоро переход на поддержку, пн/ср/пт." : ".");

    // SPF по сезону и закат в Петербурге
    const mon = now.getMonth()+1;
    let sun = "";
    (function(){
      const y0=new Date(now.getFullYear(),0,0), dn=Math.floor((now-y0)/DAY), g=2*Math.PI/365*(dn-1), R=Math.PI/180, lat=59.94*R, lon=30.31;
      const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
      const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
      const ha=Math.acos(Math.cos(90.833*R)/(Math.cos(lat)*Math.cos(dec))-Math.tan(lat)*Math.tan(dec))/R;
      const m=Math.round(720-4*(lon-ha)-eq+180), f=x=>Math.floor(x/60)+":"+p2(x%60);
      const until=(mon>=5 && mon<=8) ? 18*60 : m-60;
      sun = "Закат сегодня в "+f(m)+". После "+f(until)+" солнце уже слабое, SPF не нужен.";
    })();

    // применяем к шагам
    document.querySelectorAll("ol li[data-id]").forEach(li=>{
      const id = li.dataset.id, e = eff(id); if(!e) return;
      let hidden = !!e.hidden, dyn = "", name = e.name, prod = e.prod||"";
      if(e.lash==="am" && maint) hidden = true;
      if(e.lash==="pm" && maint && !maintDay) hidden = true;
      if(e.lash) dyn = lashSt;
      if(e.adOnly && rest) hidden = true;
      if(id==="am-spf"){ if(!prod) prod = (mon>=10 || mon<=2) ? "Skin1004 Air-Fit Light SPF 30" : "Goodal Heartleaf SPF 50+"; dyn = sun; }
      if(id==="pm-buffer" && rest) dyn = "Сегодня без адапалена, просто увлажнить.";
      if(id==="pm-adapalene"){
        li.classList.toggle("rest", rest);
        li.querySelector("input").disabled = rest;
        if(rest) name = "Адапален: сегодня отдых";
        else if(cfg.cheeks && !cheekDay){ name = "Адапален на лоб и нос"; dyn = "Щёки сегодня пропускаешь, им хватит 2–3 раз в неделю."; }
        else if(cfg.cheeks) dyn = "Сегодня день для щёк, наносишь на всё лицо.";
        const fb = li.querySelector(".facebox"), z = (cfg.cheeks && !cheekDay) ? "adt" : (e.zone||"adapalene");
        if(fb && fb.dataset.z !== z){ fb.dataset.z = z; fb.innerHTML = face(z); }
      }
      li.hidden = hidden;
      li.querySelector(".nm").textContent = name;
      li.querySelector(".prod").textContent = prod;
      li.querySelector(".dyn").textContent = dyn;
      // срок годности
      const pi = li.querySelector(".pinfo");
      if(pi){
        const x = expiry(e); let txt = "", warn = false;
        if(!x) txt = 'Дату вскрытия не знаю. Нажми "Открыла новую банку", когда начнёшь новую.';
        else if(!x.until) txt = "Открыто "+fmtD(x.opened)+". Срок после вскрытия можно указать в настройках шагов.";
        else {
          txt = "Открыто "+fmtD(x.opened)+" · годно до "+fmtD(x.until, true)+".";
          if(x.left < 0){ txt = "Срок вышел "+fmtD(x.until)+". Лучше заменить."; warn = true; }
          else if(x.left <= 14){ txt += " Осталось "+x.left+" дн."; warn = true; }
        }
        pi.textContent = txt; pi.classList.toggle("warnline", warn);
        li.querySelector(".tag.exp").hidden = !warn;
      }
    });

    // галочки и счётчики
    const bx = boxes();
    bx.forEach(b => b.checked = !!state[b.id]);
    let changed = false;
    ["am","pm"].forEach(g=>{
      const req = bx.filter(b => b.dataset.g===g && !b.dataset.opt && !b.closest("li").hidden && !b.disabled);
      const k = req.filter(b=>b.checked).length, done = k===req.length;
      const el = $("c-"+g);
      el.textContent = done ? "готово" : k+" из "+req.length;
      el.classList.toggle("done", done);
      if((state["_"+g]||0) !== (done?1:0)){ state["_"+g] = done?1:0; changed = true; }
      const gv = bx.filter(b=>b.dataset.g===g && !b.closest("li").hidden && !b.disabled), gk = gv.filter(b=>b.checked).length, gb = $("all-"+g);
      const gon = gv.length>0 && gk===gv.length, gmix = gk>0 && !gon;
      gb.classList.toggle("on",gon); gb.classList.toggle("mix",gmix); gb.setAttribute("aria-checked",gmix?"mixed":String(gon));
      gb.querySelector(".gt").textContent = gon ? "Готово" : "Отметить всё: "+(g==="am"?"утро":"вечер");
    });
    if(changed && Object.keys(state).some(k => k[0] !== "_")) save(today, state);

    renderCal(n, rest, start);
    renderDiary();
    if(window.Skin2 && Skin2.ready) Skin2.render();
  }

  // ---------- план адапалена ----------
  function computePlan(n, rest, start){
    const plan = new Set();
    let prev = !!state["pm-adapalene"] || !rest;   // сегодня: был или по плану
    const course = start ? n : 1;
    for(let i=1;i<=75;i++){
      const eodI = course+i <= 21 || !!cfg.eod;
      const ad = eodI ? !prev : true;
      if(ad) plan.add(addDays(today,i));
      prev = ad;
    }
    return plan;
  }

  // ---------- выполнение ----------
  function dayDone(k){
    const st = k===today ? state : load(k);
    const a = st._am!=null ? !!st._am : !!(st["am-wash"] && st["am-cream"]);
    const p = st._pm!=null ? !!st._pm : !!st["pm-wash"];
    return [a,p];
  }

  const SC = ["#ff5a5a","#ff9a4d","#e8c547","#9bd36b","#46cf8a"];
  const SCL = ["плохо","так себе","норм","хорошо","отлично"];
  const TAGS = ["спокойная","шелушится","стянуто","покраснение","жжение","высыпания","жирнится"];
  const IRRT = ["шелушится","стянуто","покраснение","жжение"];

  function renderCal(n, rest, start){
    const plan = computePlan(n, rest, start);
    const wrap = $("days"); wrap.innerHTML = "";
    const now = new Date(Date.now()-SHIFT);
    const vm = new Date(now.getFullYear(), now.getMonth()+calOffset, 1);
    const title = vm.toLocaleDateString("ru-RU",{month:"long", year:"numeric"}).replace(" г.","");
    $("cal-title").textContent = title.charAt(0).toUpperCase()+title.slice(1);
    $("cal-next").disabled = calOffset >= 1;
    document.querySelectorAll("#cal-tabs button").forEach(b => b.classList.toggle("on", b.dataset.m===calMode));
    $("cal-legend").textContent = calMode==="ad" ? "Закрашено - был адапален, пунктир - по плану. Нажми на день, чтобы поправить или записать, как была кожа."
      : calMode==="skin" ? "Цвет - как была кожа, от красного (плохо) до зелёного (отлично). Оранжевая обводка - было раздражение."
      : "Полный кружок - сделаны и утро, и вечер, половинка - что-то одно.";
    const lead = (vm.getDay()+6)%7, dim = new Date(vm.getFullYear(), vm.getMonth()+1, 0).getDate();
    for(let i=0;i<lead;i++) wrap.appendChild(document.createElement("div"));
    for(let d=1; d<=dim; d++){
      const k = fmtK(new Date(vm.getFullYear(), vm.getMonth(), d));
      const isToday = k===today, isFuture = k>today;
      const st = isToday ? state : (isFuture ? {} : load(k));
      const el = document.createElement("div");
      let cls = "dot", style = "", tip = d+"";
      if(calMode==="ad"){
        if(st["pm-adapalene"]){ cls += " on"; tip += " · адапален был"; }
        else if(isFuture ? plan.has(k) : (isToday && !rest)){ cls += " plan"; tip += " · по плану адапален"; }
      } else if(calMode==="skin"){
        const dd = isFuture ? {} : load("diary:"+k);
        if(dd.s){ cls += " sk"; style = "background:"+SC[dd.s-1]; tip += " · кожа: "+SCL[dd.s-1]; }
        if((dd.t||[]).some(x => IRRT.includes(x))) cls += " irr";
        if(dd.t && dd.t.length) tip += " · "+dd.t.join(", ");
      } else if(!isFuture){
        const [a,p] = dayDone(k);
        if(a && p) cls += " on"; else if(a || p) cls += " half";
        tip += a&&p ? " · всё сделано" : a ? " · только утро" : p ? " · только вечер" : "";
      }
      el.className = "day"+(isToday?" today":"")+(isFuture?" future":"")+(k===sel?" sel":"");
      el.innerHTML = '<span class="'+cls+'"'+(style?' style="'+style+'"':'')+'>'+d+'</span>';
      el.title = tip;
      if(!isFuture){
        el.setAttribute("role","button"); el.tabIndex = 0;
        const pick = ()=>{ sel = k; render(); };
        el.addEventListener("click", pick);
        el.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(); } });
      }
      wrap.appendChild(el);
    }
    // статистика
    let streak = 0, k = today;
    const [ta,tp] = dayDone(today);
    if(!(ta && tp)) k = addDays(today,-1);
    for(let i=0;i<500;i++){ const [a,p] = dayDone(k); if(!(a&&p)) break; streak++; k = addDays(k,-1); }
    const first = firstDayWith(null);
    const mStart = fmtK(vm), mEnd = fmtK(new Date(vm.getFullYear(), vm.getMonth()+1, 0));
    let from = first && first > mStart ? first : mStart, to = mEnd < today ? mEnd : today;
    if(to===today && !(ta && tp)) to = addDays(today,-1);
    let tot = 0, am = 0, pm = 0;
    if(first) for(let x = from; x <= to; x = addDays(x,1)){ const [a,p] = dayDone(x); tot++; if(a) am++; if(p) pm++; }
    const pc = v => Math.round(v*100/tot)+"%";
    let s = "Серия: <b>"+streak+" "+plural(streak,"день","дня","дней")+"</b> подряд всё сделано.";
    if(tot >= 3){
      s += " За "+(calOffset===0?"этот месяц":"месяц")+": утро <b>"+pc(am)+"</b>, вечер <b>"+pc(pm)+"</b>.";
      if(am - pm >= 3) s += " Чаще пропускаешь вечер.";
      else if(pm - am >= 3) s += " Чаще пропускаешь утро.";
    }
    $("stats").innerHTML = s;
  }
  function plural(n,a,b,c){ const m10=n%10, m100=n%100; return m10===1&&m100!==11 ? a : m10>=2&&m10<=4&&(m100<12||m100>14) ? b : c; }

  // ---------- дневник кожи ----------
  function renderDiary(){
    const d = load("diary:"+sel), isToday = sel===today;
    $("dp-date").textContent = isToday ? "Как кожа сегодня?" : "Кожа "+fmtD(sel);
    $("dp-today").hidden = isToday;
    $("dp-ad").checked = !!(isToday ? state : load(sel))["pm-adapalene"];
    $("dp-ad-wrap").hidden = isToday;
    $("dp-scores").innerHTML = SCL.map((l,i)=>'<button type="button" data-s="'+(i+1)+'"'+(d.s===i+1?' class="on" style="background:'+SC[i]+'"':'')+'><b>'+(i+1)+'</b><span>'+l+'</span></button>').join('');
    $("dp-tags").innerHTML = TAGS.map(t=>'<button type="button" class="chip'+((d.t||[]).includes(t)?' on':'')+'" data-t="'+t+'">'+t+'</button>').join('');
    const ta = $("dp-note"); if(document.activeElement !== ta) ta.value = d.n || "";
  }
  function editDiary(fn){ const d = load("diary:"+sel); fn(d); if(!d.s) delete d.s; if(d.t && !d.t.length) delete d.t; if(!d.n) delete d.n;
    if(Object.keys(d).length) save("diary:"+sel, d); else { try{ localStorage.removeItem(PREFIX+"diary:"+sel); }catch(e){} } }
  $("dp-scores").addEventListener("click", e=>{ const b = e.target.closest("[data-s]"); if(!b) return; const v = +b.dataset.s; editDiary(d=>{ d.s = d.s===v ? 0 : v; }); render(); });
  $("dp-tags").addEventListener("click", e=>{ const b = e.target.closest("[data-t]"); if(!b) return; const t = b.dataset.t;
    editDiary(d=>{ const s = new Set(d.t||[]); if(s.has(t)) s.delete(t); else { s.add(t); if(t==="спокойная") IRRT.concat(["высыпания"]).forEach(x=>s.delete(x)); else if(IRRT.includes(t)) s.delete("спокойная"); } d.t = [...s]; }); render(); });
  $("dp-note").addEventListener("input", e=>{ const v = e.target.value; editDiary(d=>{ d.n = v.trim() ? v : ""; }); });
  $("dp-today").addEventListener("click", ()=>{ sel = today; calOffset = 0; render(); });
  $("dp-ad").addEventListener("change", e=>{ setAd(sel, e.target.checked); render(); });
  function setAd(k, val){
    if(k===today){ state["pm-adapalene"] = val; state["ad-cheeks"] = val && (!cfg.cheeks || !cheeksPrev); save(today, state); }
    else { const st = load(k); st["pm-adapalene"] = val; st["ad-cheeks"] = val; save(k, st); }
  }

  // ---------- события ----------
  document.addEventListener("change", e=>{
    const b = e.target;
    if(b.matches && b.matches(".step input")){
      syncDay();
      if(b.id==="pm-adapalene") setAd(today, b.checked);
      else { state[b.id] = b.checked; save(today, state); }
      render();
    }
  });
  ["am","pm"].forEach(g=>{
    $("all-"+g).addEventListener("click", ()=>{
      syncDay();
      const vis = boxes().filter(b => b.dataset.g===g && !b.closest("li").hidden && !b.disabled);
      const val = !vis.every(b => b.checked);
      vis.forEach(b => { if(b.id==="pm-adapalene") setAd(today, val); else state[b.id] = val; });
      save(today, state); render();
    });
  });
  document.addEventListener("click", e=>{
    const w = e.target.closest(".where");
    if(w){
      e.preventDefault(); e.stopPropagation();
      const li = w.closest("li"), more = li.querySelector(".more"), open = more.hidden;
      more.hidden = !open; w.setAttribute("aria-expanded", String(open));
      if(open) openIds.add(li.dataset.id); else openIds.delete(li.dataset.id);
      return;
    }
    const a = e.target.closest("[data-act]");
    if(a && a.closest("ol")){
      const li = a.closest("li"), id = li.dataset.id, e2 = eff(id), o = ov(id), act = a.dataset.act;
      if(act==="new"){ o.opened = today; saveCfg(); buildLists(); render(); buildEditor(); }
      else if(act==="out"){
        if(e2.next){ o.prod = e2.next; o.next = ""; o.opened = today; saveCfg(); buildLists(); render(); buildEditor(); }
        else { asking.add(id); const pa = li.querySelector(".pask"); pa.hidden = false; pa.querySelector("input").focus(); }
      } else if(act==="set"){
        const v = li.querySelector(".pask input").value.trim();
        if(v){ o.prod = v; o.next = ""; o.opened = today; saveCfg(); }
        asking.delete(id); buildLists(); render(); buildEditor();
      }
    }
  });
  document.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.closest && e.target.closest(".pask")){ e.preventDefault(); e.target.closest(".pask").querySelector("[data-act=set]").click(); } });

  $("sw-eod").addEventListener("change", e=>{ cfg.eod = e.target.checked; saveCfg(); render(); });
  $("sw-cheeks").addEventListener("change", e=>{ cfg.cheeks = e.target.checked; saveCfg(); render(); });
  $("cal-prev").addEventListener("click",()=>{ calOffset--; render(); });
  $("cal-next").addEventListener("click",()=>{ if(calOffset<1){ calOffset++; render(); } });
  $("cal-tabs").addEventListener("click", e=>{ const b = e.target.closest("[data-m]"); if(!b) return; calMode = b.dataset.m; ui("calMode", calMode); render(); });
  $("reset").addEventListener("click", async ()=>{
    if(!confirm("Снять все галочки за сегодня? Отметки других дней и записи дневника останутся.")) return;
    await Skin2.safety(); state = {}; save(today,state); render();
  });
  $("restart").addEventListener("click", async ()=>{
    if(!confirm("Начать курс адапалена заново? Старые отметки и дневник сохранятся, но перестанут учитываться для начала курса.")) return;
    await Skin2.safety();
    try{ localStorage.setItem(PREFIX+"reset", today); }catch(e){}
    render();
  });
  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState==="visible"){ syncDay(); render(); if(Object.keys(timers).length) wakeOn(); }
  });

  // ---------- таймеры: экран не гаснет, пока идут ----------
  const timers = {}; let tiv = null, wl = null;
  async function wakeOn(){ try{ if("wakeLock" in navigator && !wl){ wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", ()=>{ wl = null; }); } }catch(e){} }
  function wakeOff(){ try{ if(wl) wl.release(); }catch(e){} wl = null; }
  function updateTimers(){
    document.querySelectorAll(".timer").forEach(btn=>{
      const id = btn.dataset.for, end = timers[id];
      if(end && end !== "done"){ const left = Math.max(0, Math.round((end-Date.now())/1000)); btn.textContent = Math.floor(left/60)+":"+p2(left%60); btn.classList.add("running"); }
      else { btn.classList.remove("running"); btn.textContent = end==="done" ? "Готово" : "Таймер "+btn.dataset.min+" мин"; }
    });
  }
  function tick(){
    Object.keys(timers).forEach(id=>{
      const end = timers[id]; if(end==="done" || end > Date.now()) return;
      timers[id] = "done";
      setTimeout(()=>{ if(timers[id]==="done"){ delete timers[id]; updateTimers(); } }, 5000);
      syncDay();
      if(!state[id]){ state[id] = true; save(today, state); render(); }
      try{ navigator.vibrate && navigator.vibrate([300,150,300]); }catch(e){}
      try{ const c=new (window.AudioContext||window.webkitAudioContext)(), o=c.createOscillator(), g=c.createGain(); o.frequency.value=880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.2,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+1); o.start(); o.stop(c.currentTime+1); }catch(e){}
    });
    const running = Object.values(timers).some(v => v !== "done");
    if(!running){ wakeOff(); if(!Object.keys(timers).length){ clearInterval(tiv); tiv = null; } }
    updateTimers();
  }
  document.addEventListener("click", e=>{
    const btn = e.target.closest(".timer"); if(!btn) return;
    const id = btn.dataset.for;
    if(timers[id] && timers[id] !== "done"){ delete timers[id]; }
    else { timers[id] = Date.now() + (+btn.dataset.min)*60000; wakeOn(); if(!tiv) tiv = setInterval(tick, 1000); }
    tick();
  });

  // ---------- настройка шагов ----------
  function buildEditor(){
    const box = $("ed"); box.innerHTML = "";
    ["am","pm"].forEach(g=>{
      const h = document.createElement("h4"); h.textContent = g==="am" ? "Утро" : "Вечер"; box.appendChild(h);
      const ul = document.createElement("ul");
      order(g).forEach((id, i, arr)=>{
        const e = eff(id), wait = e.kind==="wait", li = document.createElement("li");
        li.className = "ed-item"+(e.hidden?" off":""); li.dataset.id = id;
        const zsel = ZONES.map(([v,l])=>'<option value="'+v+'"'+((e.zone||"")===v?' selected':'')+'>'+l+'</option>').join('');
        li.innerHTML =
          '<div class="ed-row"><button type="button" class="mini" data-ed="up"'+(i?'':' disabled')+' aria-label="Выше">↑</button><button type="button" class="mini" data-ed="down"'+(i<arr.length-1?'':' disabled')+' aria-label="Ниже">↓</button>'
          +'<button type="button" class="ed-name" data-ed="open">'+esc(e.name)+'</button>'
          +'<label class="fchk"><input type="checkbox" data-f="show"'+(e.hidden?'':' checked')+'>видно</label></div>'
          +'<div class="ed-form"'+(edOpen.has(id)?'':' hidden')+'>'
          +'<label class="fld">Название<input data-f="name" value="'+esc(e.name)+'"></label>'
          +(wait ? '<label class="fld">Таймер, минут<input type="number" min="1" max="60" data-f="min" value="'+esc(e.min||5)+'"></label>' :
            '<label class="fld">Средство<input data-f="prod" value="'+esc(e.prod||"")+'"'+(id==="am-spf"?' placeholder="пусто - по сезону"':'')+'></label>'
            +'<label class="fld">Когда закончится, перейду на<input data-f="next" value="'+esc(e.next||"")+'"></label>'
            +'<div class="fld2"><label class="fld">Дата вскрытия<input type="date" data-f="opened" value="'+esc(e.opened||"")+'"></label>'
            +'<label class="fld">Годно после вскрытия, мес<input type="number" min="1" max="60" data-f="pao" value="'+esc(e.pao||"")+'" placeholder="на банке: 6M, 12M"></label></div>')
          +'<label class="fld">Подсказки (каждая с новой строки)<textarea rows="3" data-f="notes">'+esc(e.notes.join("\n"))+'</textarea></label>'
          +(wait ? '' : '<label class="fld">Схема на лице<select data-f="zone">'+zsel+'</select></label>'
            +'<label class="fchk"><input type="checkbox" data-f="opt"'+(e.opt?' checked':'')+'>необязательный шаг</label>')
          +'<div class="btns">'+(e.custom ? '<button type="button" class="mini danger" data-ed="del">Удалить шаг</button>'
            : '<button type="button" class="mini" data-ed="reset">Вернуть как было</button>')+'</div>'
          +'</div>';
        ul.appendChild(li);
      });
      box.appendChild(ul);
      const add = document.createElement("button"); add.type = "button"; add.className = "mini acc"; add.dataset.ed = "add"; add.dataset.g = g;
      add.textContent = "+ Добавить шаг: "+(g==="am"?"утро":"вечер"); box.appendChild(add);
    });
  }
  function setField(id, f, v){
    const o = ov(id);
    if(f==="show"){ o.hidden = !v; }
    else if(f==="pao" || f==="min"){ const x = parseInt(v,10); if(x>0) o[f] = x; else delete o[f]; }
    else o[f] = v;
    saveCfg();
  }
  const edBox = $("ed");
  edBox.addEventListener("input", e=>{
    const f = e.target.dataset.f; if(!f) return;
    const li = e.target.closest(".ed-item"), id = li.dataset.id;
    setField(id, f, e.target.type==="checkbox" ? e.target.checked : e.target.value);
    if(f==="name") li.querySelector(".ed-name").textContent = e.target.value;
    if(f==="show") li.classList.toggle("off", !e.target.checked);
    buildLists(); render();
  });
  edBox.addEventListener("click", e=>{
    const b = e.target.closest("[data-ed]"); if(!b) return;
    const act = b.dataset.ed, li = b.closest(".ed-item"), id = li && li.dataset.id;
    if(act==="open"){ const f = li.querySelector(".ed-form"); f.hidden = !f.hidden; if(f.hidden) edOpen.delete(id); else edOpen.add(id); return; }
    if(act==="up" || act==="down"){
      const g = raw(id).g, o = order(g), i = o.indexOf(id), j = act==="up" ? i-1 : i+1;
      if(j<0 || j>=o.length) return;
      [o[i],o[j]] = [o[j],o[i]]; cfg.order[g] = o;
    } else if(act==="reset"){ delete cfg.steps[id]; }
    else if(act==="del"){
      if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Точно удалить?"; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent = "Удалить шаг"; } }, 4000); return; }
      cfg.custom = cfg.custom.filter(s => s.id!==id);
    } else if(act==="add"){
      const g = b.dataset.g, nid = "c"+Date.now().toString(36);
      cfg.custom.push({id:nid, g, name:"Новый шаг", prod:"", notes:""});
      cfg.order[g] = order(g); edOpen.add(nid);
      saveCfg(); buildEditor(); buildLists(); render();
      const inp = edBox.querySelector('.ed-item[data-id="'+nid+'"] [data-f=name]'); if(inp){ inp.focus(); inp.select(); }
      return;
    }
    saveCfg(); buildEditor(); buildLists(); render();
  });

  // ---------- резервная копия ----------
  (function(){
    const st = $("bk-status");
    function stamp(){ try{ const d=localStorage.getItem(PREFIX+"lastBackup"); if(d) st.textContent="Последняя копия: "+new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})+". Скачивай новую раз в неделю."; }catch(e){} }
    function collect(){ const data={};
      try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith(PREFIX) && k!==PREFIX+"lastBackup") data[k]=localStorage.getItem(k); } }catch(e){}
      return data; }
    try{ if(window.YDS) YDS.init({app:"umyvanie",title:"Уход",cid:"02760b58a041462481b0b3fd09c33d7b",redir:"https://sofaleya.github.io/umyvanie/",prefix:PREFIX,exclude:[PREFIX+"lastBackup"],accent:"#ff4fa0",accentText:"#fff"}); }catch(e){}
    try{ if(window.TGBK) TGBK.init({app:"umyvanie",title:"Уход",accent:"var(--accent)",accentText:"var(--bg)",
      file:d=>"uhod-kopiya-"+d+".json",
      data:async()=>{ const data=collect(); return Object.keys(data).length? JSON.stringify({app:"umyvanie",v:2,data,photos:await Skin2.photosExport()},null,1) : ""; }}); }catch(e){}
    $("bk-save").addEventListener("click",()=>Skin2.exportBackup());
    $("bk-file").addEventListener("change",async e=>{
      const f=e.target.files[0]; if(!f)return;
      try { await Skin2.importBackup(JSON.parse(await f.text())); }
      catch(err){ st.textContent="Ошибка восстановления: "+err.message; }
      e.target.value="";
    });
    stamp();
  })();

  buildLists(); buildEditor(); render();
  Skin2.init({DEF,eff,order,get cfg(){return cfg},get state(){return state},get today(){return today},get sel(){return sel},select(k){sel=k;calOffset=(new Date(k+"T12:00:00").getFullYear()-new Date().getFullYear())*12+new Date(k+"T12:00:00").getMonth()-new Date().getMonth();render();},saveCfg,buildLists,buildEditor,render,reload(){cfg=loadCfg();state=load(today);buildLists();buildEditor();render()},clearMigrationError(){migrationError=""},migrationError});
})();
