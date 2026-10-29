(()=>{
const IMG="{{IMG}}";
const L={home:"{{L:home}}",collectie:"{{L:collectie}}",product:"{{L:product}}",inspiratie:"{{L:inspiratie}}",samenstellen:"{{L:samenstellen}}",showrooms:"{{L:showrooms}}"};
const root=document.getElementById('ph'), page=root.dataset.page;
const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
const eur=n=>'€ '+n.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------- catalogue ---------- */
const COLL={
  surface:{n:'Surface by Sergio Herman',s:'Surface',img:'surface-sets-green.jpg',d:'Steengoed met een reactief glazuur. Geen stuk is gelijk.'},
  silhouette:{n:'Silhouette',s:'Silhouette',img:'silhouette-kom.jpg',d:'Wit porselein met een zacht gegolfde rand.'},
  inku:{n:'Inku by Sergio Herman',s:'Inku',img:'inku-set.jpg',d:'Geribbelde randen, geïnspireerd op Japans keramiek.'},
  dune:{n:'Dune',s:'Dune',img:'dune-espresso.jpg',d:'Matte tinten van zand en albast.'}
};
/* first four: as listed on pabsthagedoorn.nl; the rest are example lines */
const P=[
 {id:'B5225009-001',c:'silhouette',name:'Bord L',dim:'260 × 260 × 15 mm',color:'Wit',price:14.32,box:8,img:'silhouette-bord.jpg',copy:'Het platte bord uit Silhouette. Een gegolfde vlag die het licht vangt, een vlakke spiegel die het gerecht de ruimte geeft.'},
 {id:'B5225003-001',c:'silhouette',name:'Zijbordje hoog L',dim:'185 × 185 × 36 mm',color:'Wit',price:11.46,box:8,img:'silhouette-zijbord.jpg',copy:'Een hoog zijbord voor brood, amuse of dessert. Stapelt compact in de pass.'},
 {id:'B5225019-001',c:'silhouette',name:'Bord diep ovaal M',dim:'300 × 210 × 32 mm',color:'Wit',price:15.75,box:6,img:'silhouette-ovaal.jpg',copy:'Ovaal en diep, voor vis, pasta of een gerecht om te delen.'},
 {id:'B4023211-001',c:'dune',name:'Espressokopje',dim:'Ø 75 mm · H 60 mm',color:'Alabaster',price:10.62,box:4,img:'dune-espresso.jpg',copy:'Een oorloos kopje in mat alabaster. Ligt warm in de hand en sluit het diner rustig af.',flag:'Dune'},
 {id:'B5225021-001',c:'silhouette',name:'Serveerkom ovaal M',dim:'280 × 200 × 70 mm',color:'Wit',price:22.90,box:4,img:'silhouette-kom.jpg',copy:'De serveerkom uit Silhouette, voor gerechten die midden op tafel komen.'},
 {id:'B5116211-001',c:'surface',name:'Bord plat L',dim:'Ø 270 mm',color:'Indi grey',price:16.95,box:6,img:'surface-plate.jpg',copy:'Het platte bord van Surface. Elk exemplaar krijgt in de oven een eigen tekening.',flag:'Chef’s pick'},
 {id:'B5116219-001',c:'surface',name:'Kom & borden set',dim:'Ø 160 / 220 / 270 mm',color:'Camo green',price:48.50,box:2,img:'surface-camo.jpg',cover:1,copy:'Drie stukken in camo green: kom, diep bord en plat bord. De basis van een Surface-couvert.'},
 {id:'B5116230-001',c:'surface',name:'Diep bord set',dim:'Ø 200 / 270 mm',color:'Black',price:34.20,box:4,img:'surface-black.jpg',cover:1,copy:'Diep en plat bord in zwart, met een glans die per stuk verschilt.'},
 {id:'B5116290-001',c:'surface',name:'Botermes',dim:'L 170 mm',color:'Indi grey',price:9.80,box:6,img:'botermes.jpg',copy:'Een botermes van geglazuurd steengoed. Een detail dat de gast onthoudt.'},
 {id:'B4019900-001',c:'inku',name:'Servies 28-delig',dim:'Set voor 4 personen',color:'Wit',price:289.00,box:1,img:'inku-set.jpg',cover:1,copy:'Borden, kommen, koppen en schotels in de geribbelde Inku-vorm. Voor een proefopstelling of chef’s table.'},
 {id:'B5116240-001',c:'surface',name:'Couvert met glas',dim:'14 stukken',color:'Camo green',price:164.00,box:1,img:'surface-set-glass.jpg',cover:1,copy:'Borden, kommen, bekers en kopjes in camo green, aangevuld met glas.'}
];
const STOCK={'B5116290-001':'Leverbaar in 2 weken','B4019900-001':'Op bestelling'};
const byId=id=>P.find(p=>p.id===id);
const href=p=>L.product+'#'+p.id;
const imgTag=p=>`<img src="${IMG+p.img}" alt="Serax ${esc(COLL[p.c].s+' '+p.name+' '+p.color)}"${p.cover?' class="cover"':''} loading="lazy">`;
const stockTag=p=>`<span class="stock${STOCK[p.id]?' later':''}">${STOCK[p.id]||'Direct leverbaar'}</span>`;
const unitTxt=p=>p.box>1?'per stuk · verpakt per '+p.box:'per set';
const plus='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 2v12M2 8h12"/></svg>';
const card=p=>`<article class="card">
 <a class="pic" href="${href(p)}" aria-label="${esc(p.name)} bekijken">${imgTag(p)}${p.flag?`<span class="flag">${p.flag}</span>`:''}</a>
 <div class="meta"><span class="coll-n">Serax &middot; ${COLL[p.c].s}</span><h3><a href="${href(p)}">${esc(p.name)} &ndash; ${esc(p.color)}</a></h3><span class="dim">${p.dim}</span>${stockTag(p)}
 <div class="foot"><span class="price">${eur(p.price)}<small>${unitTxt(p)}</small></span>
 <button class="add" type="button" data-add="${p.id}" aria-label="${p.box>1?'Doos':'Set'} ${esc(p.name)} toevoegen">${plus}</button></div></div></article>`;
root.addEventListener('click',e=>{const a=e.target.closest('[data-add]');if(!a)return;const p=byId(a.dataset.add);add(p,p.box);toast(`${p.box>1?'Doos à '+p.box:'Set'} ${p.name} toegevoegd`)});

/* ---------- cart (kept in this browser only) ---------- */
let cart=(store.get('ph-bestellijst')||[]).filter(l=>byId(l.id)&&l.qty>0);
const save=()=>store.set('ph-bestellijst',cart);
function add(p,qty){const l=cart.find(x=>x.id===p.id);if(l)l.qty+=qty;else cart.push({id:p.id,qty});save();drawCart()}
function drawCart(){
  const n=cart.reduce((s,l)=>s+Math.ceil(l.qty/byId(l.id).box),0),b=$('#ph-badge');b.textContent=n;b.classList.toggle('on',n>0);
  const body=$('#ph-cartbody'),foot=$('#ph-cartfoot');
  if(!cart.length){body.innerHTML='<div class="done"><h4>Nog leeg</h4><p class="note">Voeg artikelen toe of stel een compleet servies samen.</p></div>';foot.innerHTML=`<a class="btn ghost" href="${L.collectie}">Naar de collectie</a>`;return}
  body.innerHTML=cart.map((l,i)=>{const p=byId(l.id),bx=Math.ceil(l.qty/p.box);return `<div class="ci"><a class="th" href="${href(p)}">${imgTag(p)}</a><div style="min-width:0"><h4>${esc(p.name)} &ndash; ${esc(p.color)}</h4><p>Serax ${COLL[p.c].s} &middot; ${p.id}</p><p>${p.box>1?l.qty+' st. · '+bx+(bx===1?' doos':' dozen'):l.qty+(l.qty===1?' set':' sets')}</p></div><div class="r">${eur(p.price*l.qty)}<br><button type="button" data-rm="${i}">Verwijderen</button></div></div>`}).join('');
  const sub=cart.reduce((s,l)=>s+byId(l.id).price*l.qty,0),ship=sub>=750?0:39.5;
  foot.innerHTML=`<div class="tl"><span>Subtotaal excl. btw</span><span>${eur(sub)}</span></div><div class="tl"><span>Levering${ship?' (gratis vanaf '+eur(750)+')':''}</span><span>${ship?eur(ship):'Gratis'}</span></div><div class="tl"><span>Btw 21%</span><span>${eur((sub+ship)*.21)}</span></div><div class="tl big"><span>Totaal incl. btw</span><span>${eur((sub+ship)*1.21)}</span></div><button class="btn" type="button" data-done="order">Bestelling plaatsen</button><button class="btn ghost" type="button" data-done="quote">Offerte aanvragen</button>`;
}
$('#ph-cartbody').addEventListener('click',e=>{const r=e.target.closest('[data-rm]');if(r){cart.splice(+r.dataset.rm,1);save();drawCart()}});
$('#ph-cartfoot').addEventListener('click',e=>{const t=e.target.closest('[data-done]');if(!t)return;const q=t.dataset.done==='quote';cart=[];save();drawCart();
  $('#ph-cartbody').innerHTML=`<div class="done"><h4>${q?'Offerte aangevraagd':'Bestelling ontvangen'}</h4><p class="note">${q?'Uw accountmanager neemt binnen één werkdag contact op.':'U ontvangt de orderbevestiging per e-mail.'}<br>Dit is een concept: er is niets verzonden.</p></div>`});
const openCart=()=>{drawCart();$('#ph-cart').classList.add('on');$('#ph-cart').setAttribute('aria-hidden','false');$('#ph-scrim').classList.add('on')};
const closeCart=()=>{$('#ph-cart').classList.remove('on');$('#ph-cart').setAttribute('aria-hidden','true');$('#ph-scrim').classList.remove('on')};
$('#ph-cartbtn').addEventListener('click',openCart);
$('#ph-close').addEventListener('click',closeCart);
$('#ph-scrim').addEventListener('click',closeCart);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
let tt;function toast(m){const t=$('#ph-toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
$('#ph-login').addEventListener('click',()=>toast('Inloggen voor de vakhandel volgt in de volgende versie'));

/* ---------- header: search + active menu ---------- */
$('#ph-search').addEventListener('submit',e=>{e.preventDefault();const q=$('#ph-q').value.trim();
  if(page==='collectie'){location.hash='';filterTo('alle',q);$('#ph-grid').scrollIntoView({behavior:'smooth'});return}
  try{sessionStorage.setItem('ph-q',q)}catch(err){}location.href=L.collectie});
function markNav(key){$$('.sub a[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===key))}
markNav({collectie:'collectie',product:'collectie',inspiratie:'inspiratie',samenstellen:'samenstellen',showrooms:'showrooms'}[page]);

/* ---------- home ---------- */
if(page==='home'){
  $('#ph-colls').innerHTML=Object.entries(COLL).map(([k,c])=>`<a class="coll" href="${L.collectie}#${k}"><div class="ph"><img src="${IMG+c.img}" alt="${c.n}" loading="lazy"></div><h3>${c.n}</h3><p>${c.d}</p></a>`).join('');
  $('#ph-featured').innerHTML=P.slice(0,4).map(card).join('');
}

/* ---------- collectie ---------- */
let filt='alle',query='';
function filterTo(f,q){filt=f;query=(q||'').toLowerCase();if($('#ph-q'))$('#ph-q').value=q||'';renderGrid()}
function renderGrid(){
  $$('#ph-chips .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.f===filt));
  markNav(filt==='alle'?'collectie':filt);
  $('#ph-ctitle').innerHTML=filt==='alle'?'Serax, <em>per doos.</em>':`${COLL[filt].n.replace(/ by .*/,'')}${COLL[filt].n.includes(' by ')?' <em>by Sergio Herman.</em>':'<em>.</em>'}`;
  const list=P.filter(p=>(filt==='alle'||p.c===filt)&&(!query||(COLL[p.c].n+' '+p.name+' '+p.color+' '+p.id).toLowerCase().includes(query)));
  $('#ph-count').textContent=(query?`“${query}” · `:'')+list.length+(list.length===1?' artikel':' artikelen');
  $('#ph-grid').innerHTML=list.length?list.map(card).join(''):`<p class="empty">Geen artikelen gevonden voor &ldquo;${esc(query)}&rdquo;. Probeer een collectie, kleur of artikelnummer.</p>`;
}
if(page==='collectie'){
  $('#ph-chips').innerHTML=[['alle','Alle'],...Object.entries(COLL).map(([k,c])=>[k,c.s])].map(([k,l])=>`<button class="chip" type="button" data-f="${k}">${l}</button>`).join('');
  $('#ph-chips').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(b){history.replaceState(null,'',b.dataset.f==='alle'?location.pathname+location.search:'#'+b.dataset.f);filterTo(b.dataset.f,'')}});
  $('#ph-q').addEventListener('input',e=>filterTo('alle',e.target.value.trim()));
  const fromHash=()=>{const h=location.hash.slice(1);filterTo(COLL[h]?h:'alle','')};
  window.addEventListener('hashchange',fromHash);
  let q0='';try{q0=sessionStorage.getItem('ph-q')||'';sessionStorage.removeItem('ph-q')}catch(e){}
  if(q0)filterTo('alle',q0);else fromHash();
}

/* ---------- product ---------- */
if(page==='product'){
  let boxes=1,p;
  const draw=()=>{
    const n=boxes*p.box,unit=p.box>1?(boxes===1?'doos':'dozen'):(boxes===1?'set':'sets');
    $('#ph-pdp').innerHTML=`<div class="gallery">${imgTag(p).replace(' loading="lazy"','')}</div>
    <div><p class="label m">Serax &middot; ${COLL[p.c].n}</p><h1 class="display">${esc(p.name)} &ndash; <em>${esc(p.color)}</em></h1>${stockTag(p)}
    <p class="bigprice">${eur(p.price)}<small>${unitTxt(p)} · excl. btw</small></p>
    <p class="copy">${p.copy}</p>
    <div class="buyrow"><div class="qty"><button type="button" data-q="-1" aria-label="Minder">−</button><output>${boxes} ${unit}</output><button type="button" data-q="1" aria-label="Meer">+</button></div>
    <button class="btn" type="button" id="ph-padd">Toevoegen &middot; ${eur(p.price*n)}</button></div>
    <p class="note" style="margin-top:12px">${p.box>1?n+' stuks':boxes+' '+unit} excl. btw. Uw netto-prijs ziet u na inloggen.</p>
    <div class="specs"><div><span>Artikelnummer</span><span>${p.id}</span></div><div><span>Afmeting</span><span>${p.dim}</span></div><div><span>Kleur</span><span>${esc(p.color)}</span></div><div><span>Verpakt per</span><span>${p.box>1?p.box+' stuks':'set'}</span></div><div><span>Materiaal</span><span>${p.c==='silhouette'?'Porselein':'Steengoed'}</span></div><div><span>Vaatwasser &amp; magnetron</span><span>Geschikt</span></div></div>
    <div class="usps"><div><b>Levering 2–4 werkdagen</b>uit voorraad Breda</div><div><b>Gratis vanaf € 750</b>excl. btw per order</div><div><b>Showroom</b>bekijk het op afspraak</div></div></div>`;
    $('#ph-crumbs').innerHTML=`<a href="${L.home}">Home</a><span>/</span><a href="${L.collectie}">Collectie</a><span>/</span><a href="${L.collectie}#${p.c}">${COLL[p.c].s}</a><span>/</span><span>${esc(p.name)}</span>`;
  };
  const load=()=>{p=byId(decodeURIComponent(location.hash.slice(1)))||P[0];boxes=1;draw();
    document.title=`${p.name} – ${p.color} | Serax | Pabst & Hagedoorn`;
    const rel=P.filter(x=>x.c===p.c&&x.id!==p.id),more=P.filter(x=>x.c!==p.c&&x.id!==p.id);
    $('#ph-related').innerHTML=[...rel,...more].slice(0,4).map(card).join('');
    $('#ph-reltitle').innerHTML=rel.length?`Meer uit <em>${COLL[p.c].s}.</em>`:'Maak het <em>couvert af.</em>'};
  $('#ph-pdp').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
    if(t.dataset.q){boxes=Math.max(1,boxes+ +t.dataset.q);draw()}
    if(t.id==='ph-padd'){add(p,boxes*p.box);toast(`${boxes*p.box} × ${p.name} toegevoegd`);openCart()}});
  window.addEventListener('hashchange',()=>{load();window.scrollTo({top:0,behavior:'smooth'})});
  load();
}

/* ---------- inspiratie ---------- */
if(page==='inspiratie')$('#ph-looksh').innerHTML=['B5116211-001','B5116219-001','B5116230-001','B4019900-001'].map(id=>card(byId(id))).join('');

/* ---------- servies samenstellen ---------- */
if(page==='samenstellen'){
  const SETS={
    silhouette:{label:'Silhouette · Wit',img:'silhouette-bord.jpg',hero:'table-scene.jpg',items:['B5225009-001','B5225019-001','B5225003-001','B4023211-001']},
    surface:{label:'Surface · Indi grey',img:'surface-plate.jpg',hero:'surface-lava.jpg',items:['B5116211-001','B5116230-001','B5116290-001','B4023211-001']},
    camo:{label:'Surface · Camo green',img:'surface-camo.jpg',hero:'surface-set-glass.jpg',items:['B5116219-001','B5116290-001','B4023211-001']}
  };
  const B={set:'silhouette',on:new Set(SETS.silhouette.items),n:80};
  $('#ph-bopts').innerHTML=Object.entries(SETS).map(([k,s])=>`<button class="opt" type="button" data-k="${k}"><img src="${IMG+s.img}" alt=""><span><b>${s.label}</b><small>${s.items.length} stukken</small></span></button>`).join('');
  $('#ph-bopts').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b){B.set=b.dataset.k;B.on=new Set(SETS[B.set].items);drawB()}});
  $('#ph-bitems').addEventListener('change',e=>{const i=e.target.closest('input');if(i){i.checked?B.on.add(i.value):B.on.delete(i.value);drawSum()}});
  $('#ph-covers').addEventListener('input',e=>{B.n=+e.target.value;drawSum()});
  function drawB(){
    $$('#ph-bopts .opt').forEach(o=>o.setAttribute('aria-pressed',o.dataset.k===B.set));
    $('#ph-bcoll').textContent=SETS[B.set].label;
    const im=$('#ph-bimg');im.src=IMG+SETS[B.set].hero;im.alt=SETS[B.set].label;
    $('#ph-bitems').innerHTML=SETS[B.set].items.map(id=>{const p=byId(id);return `<label class="item" for="i${id}"><input type="checkbox" id="i${id}" value="${id}" ${B.on.has(id)?'checked':''}><span>${esc(p.name)} &ndash; ${esc(p.color)}<small>${p.dim} · verpakt per ${p.box}</small></span><b>${eur(p.price)}</b></label>`}).join('');
    drawSum();
  }
  function drawSum(){
    const ps=[...B.on].map(byId);
    const per=ps.reduce((s,p)=>s+p.price,0),boxes=ps.reduce((s,p)=>s+Math.ceil(B.n/p.box),0),tot=ps.reduce((s,p)=>s+Math.ceil(B.n/p.box)*p.box*p.price,0);
    $('#ph-bn').textContent=B.n+' gasten';$('#ph-tper').textContent=eur(per);
    $('#ph-tboxes').textContent=ps.length?`${boxes} ${boxes===1?'doos':'dozen'}, ${ps.length} ${ps.length===1?'artikel':'artikelen'}`:'Kies minstens één stuk';
    $('#ph-tsum').textContent=eur(tot);$('#ph-addset').disabled=!ps.length;
  }
  drawB();
  $('#ph-addset').addEventListener('click',()=>{[...B.on].forEach(id=>{const p=byId(id);add(p,Math.ceil(B.n/p.box)*p.box)});toast(`Servies voor ${B.n} couverts op de bestellijst`);openCart()});
  $('#ph-quoteset').addEventListener('click',()=>{try{sessionStorage.setItem('ph-msg',`Offerte voor ${B.n} couverts ${SETS[B.set].label}: `+[...B.on].map(id=>byId(id).name).join(', '))}catch(e){}location.href=L.showrooms+'#afspraak'});
}

/* ---------- showrooms & contact ---------- */
if(page==='showrooms'){
  $$('[data-room]').forEach(a=>a.addEventListener('click',()=>{$('#f-room').value=a.dataset.room}));
  try{const m=sessionStorage.getItem('ph-msg');if(m){$('#f-msg').value=m;sessionStorage.removeItem('ph-msg')}}catch(e){}
  $('#ph-form').addEventListener('submit',e=>{e.preventDefault();const naam=esc($('#f-naam').value.trim().split(' ')[0]||''),room=esc($('#f-room').value);
    $('#ph-form').innerHTML=`<div class="sent"><h4>Dank u${naam?', '+naam:''}.</h4><p class="note">Uw aanvraag voor ${room} is genoteerd. Uw accountmanager neemt binnen één werkdag contact op. Dit is een concept: er is niets verzonden.</p></div>`});
}

drawCart();
})();
