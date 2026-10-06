
const DATA=window.LESSON_DATA,TOPICS=DATA.topics,ITEMS=DATA.items;
const loadedPacks=new Set(),pendingPacks=new Map();
function loadAssetPack(topic,kind){
 const key=kind+'-'+topic;
 if(loadedPacks.has(key))return Promise.resolve();
 if(pendingPacks.has(key))return pendingPacks.get(key);
 const promise=new Promise((resolve,reject)=>{
  let attempt=0;
  const request=()=>{
   const script=document.createElement('script');
   script.src='assets/packs/'+kind+'-'+(topic+1)+'.js?v=3'+(attempt?'&retry='+Date.now():'');
   script.onload=()=>{
    const images=window.LESSON_ASSET_PACKS?.[key],rows=ITEMS.filter(x=>x.topic===topic);
    if(!Array.isArray(images)||images.length!==rows.length){pendingPacks.delete(key);reject(new Error('Incomplete lesson package'));return;}
    rows.forEach((item,i)=>item[kind==='icons'?'icon':'card']=images[i]);
    loadedPacks.add(key);pendingPacks.delete(key);resolve();script.remove();
   };
   script.onerror=()=>{
    script.remove();attempt++;
    if(attempt<3)setTimeout(request,attempt*800);
    else{pendingPacks.delete(key);reject(new Error('Lesson package unavailable'));}
   };
   document.head.appendChild(script);
  };
  request();
 });
 pendingPacks.set(key,promise);return promise;
}
function waitForAssets(topic,kind){
 const stillHere=()=>state.area==='lexicon'&&state.topic===topic&&(state.mode==='cards'?'cards':state.mode==='meaning'?null:'icons')===kind;
 el('main').innerHTML=`<div class="head"><div><div class="code">2.${topic+1} · ЛЕКСИКА ПО ТЕМАМ</div><h1>${esc(TOPICS[topic].title)}</h1><p role="status">Загружаем ${kind==='cards'?'исходные карточки':'картинки этой темы'}…</p></div></div>`;
 loadAssetPack(topic,kind).then(()=>{if(stillHere())render();}).catch(()=>{
  if(!stillHere())return;
  el('main').innerHTML=`<div class="head"><div><h1>${esc(TOPICS[topic].title)}</h1><p role="status">Не удалось загрузить картинки. Попробуйте ещё раз.</p><button id="retryAssets">Повторить загрузку</button></div></div>`;
  el('retryAssets').onclick=()=>render();
 });
}
const state={area:'lexicon',grammar:null,grammarNode:-1,table:0,case:0,topic:null,mode:'learn',group:0,core:false,index:0,revealed:false};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>esc(s).replace(/\[([^\]]+)\]/g,'<span class="hl">$1</span>');
const el=id=>document.getElementById(id);
function list(){const t=TOPICS[state.topic];let ls=ITEMS.filter(x=>x.topic===state.topic);if(state.group>=0)ls=ls.filter(x=>t.groups[state.group].ids.includes(x.id));if(state.core)ls=ls.filter(x=>x.group.trim()==='А'||x.group.trim()==='A');return ls;}
function selectTopic(i){state.area='lexicon';state.topic=i;state.mode='learn';state.group=0;state.index=0;state.revealed=false;render();window.scrollTo(0,0);}
function nav(){el('nav').innerHTML=TOPICS.map((t,i)=>`<button data-topic="${i}" class="${state.topic===i?'active':''}" style="--accent:${t.color}"><span class="num">2.${i+1}</span>${esc(t.title)}</button>`).join('');el('nav').querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>selectTopic(+b.dataset.topic));}
function overview(){document.documentElement.style.setProperty('--accent','#218578');el('main').innerHTML=`<div class="overview-title"><div class="code">ПЕРВЫЙ БЛОК · 6 ТЕМ</div><h1>Говорим о здоровье</h1><p>От предмета и ситуации — к слову, его значению и короткой реплике.</p></div><div class="map-wrap"><svg class="map-links" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path d="M500 500 H165 V442 M500 500 V442 M500 500 H835 V442" stroke="#218578" stroke-width="3" fill="none"/><path d="M500 500 H165 V558 M500 500 V558 M500 500 H835 V558" stroke="#805BB4" stroke-width="3" fill="none"/></svg><div class="map-core">У врача<span>Лексика по темам</span></div><div class="map">${TOPICS.map((t,i)=>`<button class="branch" data-open="${i}" style="--c:${t.color}"><img decoding="async" src="${t.scene}" alt="${esc(t.title)}"><div><span class="n">2.${i+1} · ${ITEMS.filter(x=>x.topic===i).length} слов и моделей</span><h2>${esc(t.title)}</h2><p>${esc(t.question)}</p></div></button>`).join('')}</div></div><div class="flow"><b>Ситуация</b><span>→</span><b>Картинка и слово</b><span>→</span><b>Значение</b><span>→</span><b>Реплика</b></div>`;el('main').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>selectTopic(+b.dataset.open));}
function render(){if(state.area==='grammar'){renderGrammar();return;}el('nav').hidden=false;nav();if(state.topic===null){overview();return;}const t=TOPICS[state.topic];document.documentElement.style.setProperty('--accent',t.color);const kind=state.mode==='cards'?'cards':state.mode==='meaning'?null:'icons';if(kind&&!loadedPacks.has(kind+'-'+state.topic)){waitForAssets(state.topic,kind);return;}const ls=list();state.index=Math.min(state.index,Math.max(0,ls.length-1));let content='';
if(state.mode==='learn')content=`<section class="learn"><aside class="scene"><img decoding="async" src="${t.scene}" alt="${esc(t.question)}"><div class="models"><h2>${esc(t.question)}</h2>${t.models.map(x=>`<p>${rich(x)}</p>`).join('')}</div></aside><div><div class="grid">${ls.map(x=>`<article class="tile ${x.word.length>24?'long':''}"><img decoding="async" src="${x.icon}" alt="Пиктограмма: ${esc(x.word)}"><div class="word">${esc(x.word)}</div><p class="ex">${rich(x.example)}</p></article>`).join('')}</div></div></section>`;
else if(state.mode==='cards')content=`<div class="cardgrid">${ls.map(x=>`<div class="sourcecard"><img loading="lazy" decoding="async" src="${x.card}" alt="Исходная карточка: ${esc(x.word)}"></div>`).join('')}</div>`;
else if(ls.length){const x=ls[state.index],picture=state.mode==='picture';content=`<div class="deck"><p class="task">${esc(picture?t.picq:t.wordq)}</p>${picture?`<img class="pic" src="${x.icon}" alt="Пиктограмма для называния">`:`<div class="bigword">${esc(x.word)}</div>`}${state.revealed?(picture?`<div class="bigword">${esc(x.word)}</div>`:`<p class="meaning">${esc(x.meaning)}</p><p class="chinese">${esc(x.chinese)}</p>`)+`<p class="example">${rich(x.example)}</p>`:''}</div><div class="deck-controls"><button class="arrow" id="prev" aria-label="Предыдущая карточка">←</button><span class="counter">${state.index+1} / ${ls.length}</span><button id="reveal">${state.revealed?'Скрыть ответ':'Показать ответ'}</button><button class="arrow" id="next" aria-label="Следующая карточка">→</button></div><p class="deck-note">Управление преподавателя: ← → — смена карточки; пробел — раскрытие ответа.</p>`;}else content='<div class="empty">В этой группе нет слов активного ядра. Выберите «А + Б».</div>';
el('main').innerHTML=`<div class="head"><div><div class="code">2.${state.topic+1} · ЛЕКСИКА ПО ТЕМАМ</div><h1>${esc(t.title)}</h1><p>${esc(t.question)}</p></div></div><div class="modes">${[['learn','Знакомство'],['cards','Исходные карточки'],['picture','Картинка → слово'],['meaning','Слово → значение']].map(([m,label])=>`<button data-mode="${m}" class="${state.mode===m?'active':''}">${label}</button>`).join('')}</div><div class="groups">${t.groups.map((g,i)=>`<button data-group="${i}" class="${state.group===i?'active':''}">${esc(g.label)}</button>`).join('')}<button data-group="-1" class="${state.group===-1?'active':''}">Вся тема</button><button id="core">${state.core?'А · активное ядро':'А + Б · все слова'}</button></div>${content}<div class="status"><span>${ls.length} слов и моделей в выбранной группе</span><span>А — активное ядро · Б — расширение с опорой</span></div>`;
el('main').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;state.index=0;state.revealed=false;render();});el('main').querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{state.group=+b.dataset.group;state.index=0;state.revealed=false;render();});el('core').onclick=()=>{state.core=!state.core;state.index=0;state.revealed=false;render();};if(el('reveal')){el('reveal').onclick=()=>{state.revealed=!state.revealed;render();};el('prev').onclick=()=>step(-1);el('next').onclick=()=>step(1);}}
function step(n){const ls=list();state.index=(state.index+n+ls.length)%ls.length;state.revealed=false;render();}
el('mapBtn').onclick=()=>{state.area='lexicon';state.topic=null;render();window.scrollTo(0,0);};el('presentBtn').onclick=()=>document.body.classList.toggle('projector');el('exit').onclick=()=>document.body.classList.remove('projector');
window.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('projector');return;}if(state.area==='grammar'||state.topic===null||!['picture','meaning'].includes(state.mode))return;if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}if(e.code==='Space'){e.preventDefault();state.revealed=!state.revealed;render();}});

const SCHEMES=DATA.grammar;
const SCHEME_COLORS=['#218578','#337bb0','#805bb4','#c6614d','#b17a18','#556ba0'];
const schemeColor=i=>SCHEME_COLORS[i%SCHEME_COLORS.length];
const grammarText=s=>rich(s).replace(/(?<![а-яё])(болит|болят|болеет|болеют|лечит|лечится|осмотрел|принимал|принял|выздоравливал|выздоровел|нет|нужно|необходимо)(?![а-яё])/gi,'<strong class="hl">$1</strong>');
function openScheme(i){state.area='grammar';state.grammar=i;state.grammarNode=-1;state.table=0;state.case=0;render();window.scrollTo(0,0);}
function schemeCard(node,i,kind=''){return `<article class="scheme-card ${kind}" style="--node:${schemeColor(i)}"><h2>${esc(node[0])}</h2>${node.slice(1).map(x=>`<p>${grammarText(x)}</p>`).join('')}</article>`;}
function schemeOverview(){
 document.documentElement.style.setProperty('--accent','#218578');
 el('main').innerHTML=`<div class="overview-title"><div class="code">ЯЗЫКОВОЙ МАТЕРИАЛ</div><h1>От слова — к речи</h1><p>Связи, формы и модели для разговора о здоровье.</p></div><div class="scheme-directory">${SCHEMES.map((b,i)=>`<button class="scheme-entry" data-scheme="${i}" style="--node:${schemeColor(i)}"><span class="scheme-no">${String(b.n).padStart(2,'0')}</span><h2>${esc(b.title)}</h2><p>${esc(b.lead)}</p><span class="entry-kind">${({mind:'Интеллект-карта',declension:'Формы и примеры',conjugation:'Формы и значения',aspect:'Процесс и результат',government:'Вопрос и падеж',patterns:'Модель и пример',contrasts:'Сравнение',situations:'Вопросы и ответы',actions:'Действия участников'})[b.kind]}</span></button>`).join('')}</div>`;
 el('main').querySelectorAll('[data-scheme]').forEach(b=>b.onclick=()=>openScheme(+b.dataset.scheme));
}
function tableView(b){
 const t=b.tables[state.table];
 const examples=['У меня болит [голова].','У меня нет [лекарства].','Пациент обратился [к врачу].','Врач осмотрел [пациента].','Маша болеет [гриппом].','Пациент лечится [в больнице].'];
 const questions=['Кто? Что?','Кого? Чего?','Кому? Чему?','Кого? Что?','Кем? Чем?','О ком? О чём?'];
 return `<div class="table-options">${b.tables.map((t,i)=>`<button data-table="${i}" class="${state.table===i?'active':''}">${esc(t.title)}</button>`).join('')}</div><div class="case-options" aria-label="Выделить падеж">${questions.map((q,i)=>`<button data-case="${i}" class="${state.case===i?'active':''}">П${i+1}<span>${q}</span></button>`).join('')}</div><div class="case-example"><span>П${state.case+1} · ${questions[state.case]}</span><p>${rich(examples[state.case])}</p></div><div class="grammar-table-wrap"><table class="grammar-table"><caption>${esc(t.title)}</caption><thead><tr>${t.heads.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((row,i)=>`<tr class="${state.case===i?'selected':''}">${row.map((x,j)=>`<${j?'td':'th scope="row"'}>${esc(x)}</${j?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>${schemeCard(b.nodes[4],4)}`;
}
function mindView(b){
 const focused=state.grammarNode>=0;
 return `<div class="mind-tools"><button data-node="-1" class="${!focused?'active':''}">Вся карта</button>${b.nodes.map((n,i)=>`<button data-node="${i}" class="${state.grammarNode===i?'active':''}" style="--accent:${schemeColor(i)}">${esc(n[0])}</button>`).join('')}</div>${focused?`<div class="mind-focus"><div class="mind-root">${esc(b.root)}</div><div class="mind-connector"></div>${schemeCard(b.nodes[state.grammarNode],state.grammarNode)}</div>`:`<div class="mindmap"><svg class="mind-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path d="M500 500 H165 V440 M500 500 V440 M500 500 H835 V440 M500 500 H165 V560 M500 500 V560 M500 500 H835 V560" fill="none" stroke="#b3c5cc" stroke-width="3"/></svg><div class="mind-root">${esc(b.root)}</div><div class="mind-branches">${b.nodes.map((n,i)=>`<button class="scheme-card mind-branch" data-node="${i}" style="--node:${schemeColor(i)}"><h2>${esc(n[0])}</h2>${n.slice(1).map(x=>`<p>${grammarText(x)}</p>`).join('')}</button>`).join('')}</div></div>`}`;
}
function situationView(b){
 const focused=state.grammarNode>=0;
 return `<div class="mind-tools"><button data-node="-1" class="${!focused?'active':''}">Все ситуации</button>${b.nodes.map((n,i)=>`<button data-node="${i}" class="${state.grammarNode===i?'active':''}">${esc(n[0])}</button>`).join('')}</div><div class="scheme-grid ${focused?'single':''}">${b.nodes.map((n,i)=>focused&&i!==state.grammarNode?'':schemeCard(n,i)).join('')}</div><h2 class="subheading">Вопрос ↔ ответ</h2><div class="dialogues">${b.links.map(([q,a])=>`<div class="dialogue"><p class="doctor-line">${grammarText(q)}</p><span aria-hidden="true">↔</span><p class="patient-line">${grammarText(a)}</p></div>`).join('')}</div>`;
}
function patternView(b){
 return `<div class="pattern-grid">${b.nodes.map((n,i)=>`<article class="pattern-card" style="--node:${schemeColor(i)}"><h2>${esc(n[0])}</h2><div class="formula">${esc(n[1])}</div><p class="pattern-example">${grammarText(n[2])}</p><p class="replacement">${grammarText(n[3])}</p></article>`).join('')}</div>`;
}
function actionsView(b){
 return `<div class="role-flow"><div class="role-heading"><h2>Пациент</h2><h2>Врач</h2></div>${b.links.map(([p,d],i)=>`<div class="role-row"><span class="role-step">${i+1}</span><p>${grammarText(p)}</p><p>${grammarText(d)}</p></div>`).join('')}</div><h2 class="subheading">Действия и сочетания слов</h2><div class="scheme-grid">${b.nodes.map((n,i)=>schemeCard(n,i)).join('')}</div><details class="extension"><summary>Б · Дополнительные слова с опорой</summary><div class="scheme-grid">${b.extension.map((n,i)=>schemeCard(n,i)).join('')}</div></details>`;
}
function drawMindLinks(){
 const map=document.querySelector('.mindmap'),svg=map?.querySelector('.mind-lines');if(!svg||getComputedStyle(svg).display==='none')return;
 const box=map.getBoundingClientRect(),root=map.querySelector('.mind-root').getBoundingClientRect();
 svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
 svg.innerHTML=Array.from(map.querySelectorAll('.mind-branch')).map((card,i)=>{
  const r=card.getBoundingClientRect(),above=i<3,x=r.left-box.left+r.width/2,y=(above?r.bottom:r.top)-box.top;
  const rx=root.left-box.left+root.width/2,ry=(above?root.top:root.bottom)-box.top,mid=(y+ry)/2;
  return `<path d="M${x} ${y} V${mid} H${rx} V${ry}" fill="none" stroke="${schemeColor(i)}" stroke-opacity=".45" stroke-width="3"/>`;
 }).join('');
}
function renderGrammar(){
 el('nav').hidden=true;
 if(state.grammar===null){schemeOverview();return;}
 const b=SCHEMES[state.grammar];document.documentElement.style.setProperty('--accent',schemeColor(state.grammar));
 let content='';
 if(b.kind==='mind')content=mindView(b);
 else if(b.kind==='declension')content=tableView(b);
 else if(b.kind==='situations')content=situationView(b);
 else if(b.kind==='patterns')content=patternView(b);
 else if(b.kind==='actions')content=actionsView(b);
 else {
  content=`<div class="scheme-grid ${b.kind==='contrasts'?'contrast-grid':''}">${b.nodes.map((n,i)=>schemeCard(n,i)).join('')}</div>`;
  if(b.links)content+=`<h2 class="subheading">${b.kind==='aspect'?'Сравните формы в ситуации':'Сравните значения'}</h2><div class="pair-grid">${b.links.map(([left,right])=>`<div class="verb-pair"><p>${grammarText(left)}</p><span aria-hidden="true">→</span><p>${grammarText(right)}</p></div>`).join('')}</div>`;
  if(b.note)content+=`<div class="grammar-note">${grammarText(b.note)}</div>`;
 }
 el('main').innerHTML=`<div class="scheme-navigation"><button id="schemeHome">Все схемы</button><span>${b.n} / 11</span></div><div class="head"><div><div class="code">СХЕМЫ УРОКА · ${String(b.n).padStart(2,'0')}</div><h1>${esc(b.title)}</h1><p>${esc(b.lead)}</p></div></div>${content}<div class="scheme-navigation bottom"><button id="schemePrev" ${state.grammar===0?'disabled':''}>← Предыдущий блок</button><button id="schemeNext" ${state.grammar===SCHEMES.length-1?'disabled':''}>Следующий блок →</button></div>`;
 el('schemeHome').onclick=()=>{state.grammar=null;render();window.scrollTo(0,0);};
 el('schemePrev').onclick=()=>openScheme(state.grammar-1);el('schemeNext').onclick=()=>openScheme(state.grammar+1);
 el('main').querySelectorAll('[data-node]').forEach(btn=>btn.onclick=()=>{state.grammarNode=+btn.dataset.node;render();});
 el('main').querySelectorAll('[data-table]').forEach(btn=>btn.onclick=()=>{state.table=+btn.dataset.table;render();});
 el('main').querySelectorAll('[data-case]').forEach(btn=>btn.onclick=()=>{state.case=+btn.dataset.case;render();});
 requestAnimationFrame(drawMindLinks);
}
window.addEventListener('resize',drawMindLinks);
el('grammarBtn').onclick=()=>{state.area='grammar';state.grammar=null;render();window.scrollTo(0,0);};

render();
