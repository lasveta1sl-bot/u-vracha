(() => {
  'use strict';
  const D=window.UV_FRAMES_DATA,M=window.UV_FRAMES_MODEL,$=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const zh=(t,cls='')=>'<span class="zh '+cls+'" lang="zh-Hans">'+esc(t)+'</span>';
  const pic=w=>D.icons[w]?'<img src="'+D.icons[w]+'" alt="" width="40" height="40">':'';
  let s=M.normalise({}),returnFocus=null,voiceToken=0,loading=new Map();
  const audio=$('voice'),dialog=$('choices');
  try{const saved=JSON.parse(localStorage.getItem('uv-concept-map-v1'));if(saved?.state)s=M.normalise(saved.state);document.body.classList.toggle('hide-zh',saved?.chinese===false);}catch{}
  if(D.frames.some(f=>f.id===location.hash.slice(1)))s.frame=location.hash.slice(1);
  const f=()=>D.frames.find(f=>f.id===s.frame);
  const question=()=>s.frame==='care'&&s.level===1?{question:'Чем вы болеете?',questionZh:'您患了什么病？'}:s.frame==='care'&&s.level===2?{question:'Как вы лечитесь?',questionZh:'您怎么治疗？'}:f();
  const wordZh=w=>D.bodies.find(b=>b.ru===w)?.zh||D.symptoms[w]?.zh||D.diseases.find(d=>d.ru===w)?.zh||Object.values(D.care).flat().find(t=>t.ru===w)?.zh||'';
  function save(){try{localStorage.setItem('uv-concept-map-v1',JSON.stringify({state:s,chinese:!document.body.classList.contains('hide-zh')}));}catch{}}
  function stop(){voiceToken++;audio.pause();audio.removeAttribute('src');audio.load();$('audio-status').textContent='';}
  function loadPack(name){
    if(window.UV_FRAME_AUDIO?.[name])return Promise.resolve();
    if(loading.has(name))return loading.get(name);
    const p=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=D.audioPacks[name];
      script.onload=()=>{script.remove();if(window.UV_FRAME_AUDIO?.[name])resolve();else{loading.delete(name);reject(new Error('empty'));}};
      script.onerror=()=>{script.remove();loading.delete(name);reject(new Error('network'));};
      document.head.append(script);
    });loading.set(name,p);return p;
  }
  async function listen(texts,slow=false){
    stop();const token=voiceToken;
    $('audio-status').textContent='Подготовка озвучки…';
    try{
      const entries=texts.map(text=>{const entry=D.audio[text];if(!entry)throw new Error('missing recording');return entry;});
      await Promise.all([...new Set(entries.map(e=>e.pack))].map(loadPack));
      if(token!==voiceToken)return;
      let index=0;
      const play=async()=>{
        if(token!==voiceToken)return;
        const entry=entries[index];audio.src=window.UV_FRAME_AUDIO[entry.pack][entry.id];audio.playbackRate=slow?.8:1;audio.preservesPitch=true;
        audio.onended=()=>{if(token!==voiceToken)return;if(++index<entries.length)play();else $('audio-status').textContent=document.body.classList.contains('hide-zh')?'Запись закончилась.':'Запись закончилась. 录音结束。';};
        await audio.play();if(token===voiceToken)$('audio-status').textContent=(slow?'Медленно: ':'Слушаем: ')+texts[index];
      };
      await play();
    }catch(e){if(token!==voiceToken)return;$('audio-status').textContent=e.name==='NotAllowedError'?'Запись готова. Нажмите «Слушать» ещё раз.':'Не удалось открыть запись. Нажмите «Слушать» ещё раз или используйте скачанную офлайн-версию.';}
  }
  function drawMap(){
    const map=$('map'),svg=map.querySelector('svg'),root=$('patient-root'),r=map.getBoundingClientRect(),a=root.getBoundingClientRect();
    svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);
    const narrow=matchMedia('(max-width:1000px)').matches;
    svg.innerHTML=D.frames.map(frame=>{
      const b=document.querySelector('.branch[data-frame="'+frame.id+'"]').getBoundingClientRect();
      let path;
      if(narrow){const x=22;path='M'+(a.left-r.left+a.width/2)+' '+(a.bottom-r.top)+' V'+(a.bottom-r.top+10)+' H'+x+' V'+(b.top-r.top+24)+' H'+(b.left-r.left);}
      else{const x=a.left-r.left+a.width/2,y=a.bottom-r.top,tx=b.left-r.left+b.width/2,ty=b.top-r.top;path='M'+x+' '+y+' V'+(y+14)+' H'+tx+' V'+ty;}
      return '<path d="'+path+'" stroke="'+frame.color+'" fill="none" stroke-width="1.8" opacity=".65"/>';
    }).join('');
  }
  function map(){
    $('patient-root').querySelectorAll('[data-action="role"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===s.role)));
    const doctorRelations={pain:['уточняет','询问'],symptoms:['оценивает','评估'],disease:['называет диагноз','作出诊断'],care:['уточняет лечение','询问治疗情况']};
    const mapFrames=D.frames.map(frame=>{
      const [relation,relationZh]=s.role==='doctor'?doctorRelations[frame.id]:[frame.relation,frame.relationZh];
      return {...frame,relation,relationZh,example:M.annotatedSentences({frame:frame.id,role:s.role,level:frame.id==='care'?1:2})[0],exampleZh:s.role==='doctor'?frame.exampleZh.replace(/^我/,'您'):frame.exampleZh};
    });
    $('branches').innerHTML=mapFrames.map(frame=>'<article class="branch '+(frame.id===s.frame?'active':'')+'" data-frame="'+frame.id+'"><div class="relation-label">'+esc(frame.relation)+' <span lang="zh-Hans">'+esc(frame.relationZh)+'</span></div><button type="button" class="branch-main" data-action="frame" data-value="'+frame.id+'" aria-pressed="'+(s.frame===frame.id)+'"><h2>'+esc(frame.title)+'<span lang="zh-Hans">'+esc(frame.zh)+'</span></h2><p>'+esc(frame.question)+' <span lang="zh-Hans">'+esc(frame.questionZh)+'</span></p></button><p class="branch-example">'+esc(frame.example)+zh(frame.exampleZh)+'</p><div class="branch-examples">'+frame.chips.map(w=>'<button class="concept-chip" type="button" data-concept="'+esc(w)+'" data-frame="'+frame.id+'">'+pic(w)+'<span>'+esc(w)+'<span lang="zh-Hans">'+esc(wordZh(w))+'</span></span></button>').join('')+'<span class="chip-more">'+(frame.id==='pain'?'+ 11 форм':frame.id==='symptoms'?'+ 2 понятия':frame.id==='care'?'+ лечение':'+ 1 болезнь')+'</span></div></article>').join('');
    requestAnimationFrame(drawMap);
  }
  const caseTag=n=>n?'<span class="case-tag" data-case="'+n+'"> (П'+n+')</span>':'';
  function slot(label,chinese,value,key,kind,picture=''){
    const number=key==='body'||key==='second'&&s.second?1:key==='symptom'?(s.absence?2:1):key==='disease'?(s.frame==='care'?5:1):key==='medicine'?4:key==='place'?6:key==='careDoctor'?2:0;
    return '<div class="slot" data-kind="'+kind+'"><span class="slot-label">'+esc(label)+'<span lang="zh-Hans">'+esc(chinese)+'</span></span><button type="button" data-open="'+key+'" aria-haspopup="dialog" aria-controls="choices"><span class="slot-word">'+pic(picture)+(value?esc(value)+caseTag(number):'<span class="plus">+ уточнение</span>')+'</span><span class="chevron" aria-hidden="true">⌄</span></button></div>';
  }
  function fixedOwner(value,number=2,kind='owner'){
    return '<div class="slot fixed" data-kind="'+kind+'"><div class="fixed-token">'+esc(value)+caseTag(number)+'</div></div>';
  }
  function careSlots(){
    let result='';
    if(s.level===1||s.level===3){
      const d=D.diseases.find(d=>d.ru===s.disease);
      result+='<section class="care-part"><p>Болею чем? <span lang="zh-Hans">患什么病？</span></p><div class="care-slots">'+fixedOwner(M.subject(s),1)+fixedOwner(s.role==='doctor'?'болеете':'болею',0,'verb')+slot('Чем?','第五格',d.instrumental,'disease','body',d.ru)+'</div></section>';
    }
    if(s.level>=2){
      const t=D.care[s.careKind].find(t=>t.ru===s[s.careKind]);
      const verb=s.careKind==='medicine'?(s.role==='doctor'?'принимаете':'принимаю'):(s.role==='doctor'?'лечитесь':'лечусь');
      const label=s.careKind==='medicine'?'Что?':s.careKind==='place'?'Где?':'У кого?';
      result+='<section class="care-part"><p>Лечение <span lang="zh-Hans">治疗</span></p><div class="care-slots">'+fixedOwner(M.subject(s),1)+fixedOwner(verb,0,'verb')+slot(label,'选择',t.form,s.careKind,'body',t.ru)+'</div></section>';
    }
    return result;
  }
  function render(){
    s=M.normalise(s);map();
    const frame=f();document.documentElement.style.setProperty('--active',frame.color);document.documentElement.style.setProperty('--soft',frame.soft);
    const bench=document.querySelector('.workbench');bench.style.setProperty('--active',frame.color);bench.style.setProperty('--soft',frame.soft);
    $('frame-eyebrow').innerHTML='ВЕТКА '+(D.frames.indexOf(frame)+1)+' · '+esc(frame.title.toUpperCase())+' <span lang="zh-Hans">'+esc(frame.zh)+'</span>';
    $('builder-title').innerHTML='Собираем реплику <span lang="zh-Hans">组合表达</span>';
    $('question-audio').innerHTML='▶ '+esc(question().question)+zh(question().questionZh);
    const labels=s.frame==='care'?[['Болею чем?','患什么病'],['Лечение','治疗'],['Болезнь + лечение','疾病 + 治疗']]:s.frame==='pain'?[['Коротко','简短表达'],['Полная реплика','完整表达'],['Уточняем и связываем','补充并连接']]:s.frame==='symptoms'?[['Называем симптом','说出症状'],['Добавляем признак','补充特征'],['Соединяем симптомы','连接症状']]:[['Называем болезнь','说出疾病'],['Полная реплика','完整表达'],['Болею чем?','患什么病？']];
    $('levels').hidden=s.frame==='disease';
    $('levels').innerHTML=labels.map(([ru,cn],i)=>'<button type="button" data-action="level" data-value="'+(i+1)+'" aria-pressed="'+(s.level===i+1)+'"><b class="level-number">'+(i+1)+'</b><span>'+ru+'<span lang="zh-Hans">'+cn+'</span></span></button>').join('');
    $('frame-content').innerHTML=s.frame==='symptoms'&&s.symptom!=='пульс'?'<button type="button" data-open="presence" aria-haspopup="dialog" aria-controls="choices">'+(s.absence?'Нет симптома':'Есть симптом')+' <span lang="zh-Hans">'+(s.absence?'没有症状':'有症状')+'</span> ⌄</button>':'';
    if(s.frame==='care'&&s.level>=2)$('frame-content').innerHTML=[['medicine','Принимаю что?','服用什么'],['place','Лечусь где?','在哪里治疗'],['careDoctor','Лечусь у кого?','在谁处治疗']].map(([key,ru,cn])=>'<button type="button" data-action="careKind" data-value="'+key+'" aria-pressed="'+(s.careKind===key)+'">'+ru+' <span lang="zh-Hans">'+cn+'</span></button>').join('');
    $('frame-content').hidden=!$('frame-content').innerHTML;
    let slots='',rule='',ruleZh='';
    if(s.frame==='pain'){
      if(s.level>=2)slots+=fixedOwner('У '+M.owner(s));
      if(s.level===3)slots+=slot('Как сильно?','疼痛程度',s.intensity,'intensity','intensity');
      slots+=slot('Что происходит?','怎么了？',M.body(s).number===1?'болит':'болят','number','verb');
      slots+=slot('Что болит?','哪里疼？',s.body,'body','body',s.body);
      rule='<b>'+esc(s.body)+'</b> → '+(M.body(s).number===1?'единственное число → <b>болит</b>':'множественное число → <b>болят</b>')+'.';
      ruleZh=(M.body(s).number===1?'名词为单数 → 用 болит。':'名词为复数 → 用 болят。')+'例如：болит ухо ↔ болят уши。';
    }else if(s.frame==='symptoms'){
      const d=D.symptoms[s.symptom];slots+=fixedOwner('У '+M.owner(s));
      if(s.absence)slots+=slot('Есть или нет?','有还是没有？','нет','presence','verb');
      else if(s.level>=2||s.symptom==='пульс')slots+=slot(d.question.replace(/\?$/,''),'特征',s.quality,'quality','intensity');
      slots+=slot(d.kind==='measure'?'Показатель':'Симптом',d.kind==='measure'?'指标':'症状',s.absence?d.gen:s.symptom,'symptom','body',s.symptom);
      if(s.level===3&&!s.absence&&s.symptom!=='пульс')slots+=slot('Что ещё?','还有什么？',s.second?'и '+s.second:'','second','body',s.second);
      rule=s.absence?'<b>нет</b> → чего? → <b>'+d.gen+'</b> ('+s.symptom+' → '+d.gen+').':s.quality&&(s.level>=2||s.symptom==='пульс')?'<b>'+s.quality+' '+s.symptom+'</b> — признак подходит к названию.':'<b>У '+M.owner(s)+' + '+s.symptom+'</b> — называем симптом или показатель.';
      ruleZh=s.absence?'нет 后面的名词用第二格。«Нет температуры» 在此表示«没有发烧»。':s.symptom==='пульс'?'пульс 是指标，需要说明：частый（快）、редкий（慢）、нормальный（正常）。':'形容词随名词变化：сильный кашель，высокая температура。';
    }else if(s.frame==='care'){
      slots=careSlots();
      rule=s.level===1?'болеть → чем? → <b>П5</b>':s.careKind==='medicine'?'принимать → что? → <b>П4</b>':s.careKind==='place'?'лечиться → где? → в + <b>П6</b>':'лечиться → у кого? → у + <b>П2</b>';
      ruleZh=s.level===1?'болеть（患病）后接第五格。':'按句型选形式：принимать + 第四格；в + 第六格；у + 第二格。';
    }else{
      slots=fixedOwner('У '+M.owner(s))+slot('Какая болезнь?','什么病？',s.disease,'disease','body',s.disease);
      rule='<b>У '+M.owner(s)+' (П2)</b> + название болезни <b>(П1)</b>.';
      ruleZh='у меня / у вас 用第二格；疾病名称用第一格。';
    }
    $('construction').innerHTML=slots;$('rule').innerHTML=rule+zh(ruleZh);
    $('sentence').textContent=M.sentences(s).join(' ');$('sentence-zh').textContent=M.translation(s);
    $('next-step').innerHTML=s.frame==='disease'?'<span>Связь с картой: пациент сообщает известную болезнь, врач называет диагноз.'+zh('概念联系：患者说明已知疾病，医生作出诊断。')+'</span>':s.level<3?'<span>Следующий шаг — добавить одну деталь.'+zh('下一步：补充一个细节。')+'</span><button type="button" data-action="level" data-value="'+(s.level+1)+'">Дальше → <span lang="zh-Hans">下一步</span></button>':'<span>Боль и симптом можно связать в одном сообщении.'+zh('可以把疼痛和其他症状连起来表达。')+'</span><button type="button" data-action="linked" data-value="'+(!s.linked)+'" aria-pressed="'+s.linked+'">'+(s.linked?'Оставить одну реплику':'Боль + симптом')+' <span lang="zh-Hans">'+(s.linked?'只保留一句':'疼痛 + 症状')+'</span></button>';
    if(s.linked&&['pain','symptoms'].includes(s.frame)&&s.level===3)$('next-step').innerHTML+='<button type="button" data-action="frame" data-value="'+(s.frame==='pain'?'symptoms':'pain')+'">'+(s.frame==='pain'?'Настроить симптом':'Настроить боль')+' <span lang="zh-Hans">'+(s.frame==='pain'?'修改症状':'修改疼痛')+'</span> →</button>';
    if(s.frame==='disease')$('next-step').innerHTML='<span>Другая модель и лечение — в отдельном фрейме.'+zh('另一种疾病表达和治疗内容在独立框架中。')+'</span><button type="button" data-action="frame" data-value="care">Болеть и лечиться → <span lang="zh-Hans">生病与治疗</span></button>';
    if(s.frame==='care')$('next-step').innerHTML=s.level<3?'<span>От болезни — к описанию своего лечения.'+zh('从疾病名称过渡到描述自己的治疗。')+'</span><button type="button" data-action="level" data-value="'+(s.level+1)+'">Дальше → <span lang="zh-Hans">下一步</span></button>':'<span>Две модели связаны в одном сообщении.'+zh('把两个句型连成一段表达。')+'</span>';
    $('chinese').textContent=document.body.classList.contains('hide-zh')?'中文 · выкл.':'中文 · вкл.';$('chinese').setAttribute('aria-pressed',String(!document.body.classList.contains('hide-zh')));save();
  }
  function option(ru,cn,key,value,selected=false,icon=''){
    const text=D.audio[value]?value:D.audio[ru]?ru:'';
    return '<div class="choice-item"><button class="choice" type="button" data-action="'+key+'" data-value="'+esc(value)+'" aria-pressed="'+selected+'">'+pic(icon)+'<span><strong>'+esc(ru)+'</strong>'+zh(cn)+'</span></button>'+(text?'<button class="word-audio" type="button" data-speak="'+esc(text)+'" aria-label="Слушать слово: '+esc(text)+'">▶</button>':'')+'</div>';
  }
  function openChoices(key,trigger){
    returnFocus=trigger;let title='',cn='',html='';
    if(key==='body'||key==='number'){
      title='Часть тела → число → болит / болят';cn='身体部位 → 单复数 → 动词形式';
      html='<div class="choice-grid">'+[1,2].map(n=>'<section class="choice-column"><h3>'+(n===1?'Единственное число → болит':'Множественное число → болят')+'<span lang="zh-Hans">'+(n===1?'名词单数 → болит':'名词复数 → болят')+'</span></h3><div class="options">'+D.bodies.filter(b=>b.number===n).map(b=>option(b.ru,b.zh,'body',b.ru,s.body===b.ru,b.ru)).join('')+'</div></section>').join('')+'</div><p class="dialog-note">Форма зависит от числа слова: болит ухо, болят уши. Одно ухо тоже может болеть.'+zh('动词形式取决于名词的单复数，而不是器官是否成对。一只耳朵疼：болит ухо；双耳疼：болят уши。')+'</p>';
    }else if(key==='owner'){
      title='Кто говорит?';cn='谁在说？';html='<div class="options">'+option('Пациент → у меня','患者说：我……','role','patient',s.role==='patient')+option('Врач → у вас','医生说：您……','role','doctor',s.role==='doctor')+'</div>';
    }else if(key==='intensity'){
      title='Как сильно болит?';cn='疼痛程度';html='<div class="options">'+D.intensities.map(i=>option(i.ru||'Без уточнения',i.zh||'不补充程度','intensity',i.ru,s.intensity===i.ru)).join('')+'</div>';
    }else if(key==='symptom'){
      title='Симптом или показатель';cn='症状或指标';html='<div class="choice-grid">'+[['symptom','Симптомы','症状'],['measure','Показатели','指标']].map(([kind,ru,cn])=>'<section class="choice-column"><h3>'+ru+'<span lang="zh-Hans">'+cn+'</span></h3><div class="options">'+Object.entries(D.symptoms).filter(([w,d])=>d.kind===kind).map(([w,d])=>option(w,d.zh,'symptom',w,s.symptom===w,w)).join('')+'</div></section>').join('')+'</div>';
    }else if(key==='quality'){
      const d=D.symptoms[s.symptom];title=d.question;cn=d.questionZh;html='<div class="options">'+d.qualities.map(q=>option(q.ru,q.zh,'quality',q.ru,s.quality===q.ru)).join('')+(s.symptom==='пульс'?'':option('Без уточнения','不补充特征','quality','',!s.quality))+'</div>';
    }else if(key==='presence'){
      title='Есть симптом или нет?';cn='有症状还是没有症状？';html='<div class="options">'+option('У '+M.owner(s)+' '+s.symptom,'有这个症状','absence','false',!s.absence)+option('У '+M.owner(s)+' нет '+D.symptoms[s.symptom].gen,'没有这个症状','absence','true',s.absence)+'</div>';
    }else if(key==='second'){
      title='Добавляем ещё один симптом';cn='再补充一个症状';html='<div class="options">'+Object.entries(D.symptoms).filter(([w])=>w!==s.symptom&&w!=='пульс').map(([w,d])=>option('и '+w,d.zh,'second',w,s.second===w,w)).join('')+option('Один симптом','只说一个症状','second','',!s.second)+'</div>';
    }else if(key==='disease'){
      title=s.frame==='care'?'Болею чем?':'Какая болезнь?';cn='患什么病？';html='<div class="options">'+D.diseases.map(d=>option(s.frame==='care'?d.ru+' → '+d.instrumental:d.ru,d.zh,'disease',d.ru,s.disease===d.ru,d.ru)).join('')+'</div>';
    }else if(['medicine','place','careDoctor'].includes(key)){
      title=key==='medicine'?'Принимаю что?':key==='place'?'Лечусь где?':'Лечусь у кого?';cn=key==='medicine'?'服用什么？':key==='place'?'在哪里治疗？':'在谁处治疗？';html='<div class="options">'+D.care[key].map(t=>option(t.ru+' → '+t.form,t.zh,key,t.ru,s[key]===t.ru,t.ru)).join('')+'</div>';
    }else if(key==='mode'){
      title='Две модели — одно содержание';cn='两种句型表达相同的内容';const who=s.role==='doctor'?'您':'我';html='<div class="options">'+option('У '+M.owner(s)+' ангина',who+'患有扁桃体炎','mode','have',s.mode==='have')+option((s.role==='doctor'?'Вы болеете':'Я болею')+' ангиной',who+'患有扁桃体炎','mode','verb',s.mode==='verb')+'</div>';
    }
    $('choices-title').innerHTML=esc(title)+zh(cn);$('choices-body').innerHTML=html;dialog.showModal();
  }
  function change(key,value){
    stop();
    if(['frame','body','intensity','symptom','quality','second','disease','mode','role','careKind','medicine','place','careDoctor'].includes(key))s[key]=value;
    if(key==='frame'){if(value==='care')s.level=1;history.replaceState(null,'','#'+value);}
    if(key==='level')s.level=Number(value);
    if(key==='absence'||key==='linked')s[key]=value==='true';
    if(key==='body'&&s.level<1)s.level=1;
    if(key==='symptom'){s.quality='';s.absence=false;s.second='';}
    s=M.normalise(s);
    const wasOpen=dialog.open;if(wasOpen)dialog.close();
    const focusedOpen=returnFocus?.dataset.open;
    render();
    if(wasOpen&&focusedOpen)document.querySelector('[data-open="'+focusedOpen+'"]')?.focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{
    const speak=e.target.closest('[data-speak]');if(speak){listen([speak.dataset.speak]);return;}
    const action=e.target.closest('[data-action]'),open=e.target.closest('[data-open]'),concept=e.target.closest('[data-concept]');
    if(action){change(action.dataset.action,action.dataset.value);return;}
    if(open){openChoices(open.dataset.open,open);return;}
    if(concept){const frame=concept.dataset.frame,word=concept.dataset.concept;s.frame=frame;if(frame==='care'){s.level=word==='лекарство'?2:1;if(word==='лекарство'){s.careKind='medicine';s.medicine=word;}else s.disease=word;}else s[frame==='pain'?'body':frame==='symptoms'?'symptom':'disease']=word;if(frame==='symptoms'){s.quality='';s.second='';s.absence=false;}stop();render();}
  });
  $('close-choices').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('chinese').onclick=()=>{document.body.classList.toggle('hide-zh');render();};
  $('presentation').onclick=()=>{const on=document.body.classList.toggle('projector');$('presentation').setAttribute('aria-pressed',String(on));requestAnimationFrame(drawMap);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open){document.body.classList.remove('projector');$('presentation').setAttribute('aria-pressed','false');requestAnimationFrame(drawMap);}});
  $('listen').onclick=()=>listen(M.sentences(s));$('slow').onclick=()=>listen(M.sentences(s),true);$('stop').onclick=stop;$('question-audio').onclick=()=>listen([question().question]);
  audio.onerror=()=>{$('audio-status').textContent='Не удалось воспроизвести аудио. Попробуйте ещё раз.';};
  window.addEventListener('pagehide',stop);window.addEventListener('resize',drawMap);
  if(window.ResizeObserver)new ResizeObserver(drawMap).observe($('map'));
  render();
})();
