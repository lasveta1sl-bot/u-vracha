/* Pure language model: the UI and audio inventory use the same permitted forms. */
window.UV_FRAMES_MODEL = (() => {
  const D=window.UV_FRAMES_DATA;
  const defaults={frame:'pain',level:2,role:'patient',body:'голова',intensity:'',symptom:'кашель',quality:'',second:'',absence:false,disease:'ангина',mode:'have',linked:false,careKind:'medicine',medicine:'лекарство',place:'больница',careDoctor:'врач'};
  const owner=s=>s.role==='doctor'?'вас':'меня';
  const whoZh=s=>s.role==='doctor'?'您':'我';
  const body=s=>D.bodies.find(b=>b.ru===s.body)||D.bodies[0];
  function normalise(input){
    const s={...defaults,...input};
    if(!['pain','symptoms','disease','care'].includes(s.frame))s.frame='pain';
    s.level=[1,2,3].includes(Number(s.level))?Number(s.level):2;
    if(!['patient','doctor'].includes(s.role))s.role='patient';
    if(!D.bodies.some(b=>b.ru===s.body))s.body=defaults.body;
    if(!D.intensities.some(i=>i.ru===s.intensity))s.intensity='';
    if(!D.symptoms[s.symptom])s.symptom=defaults.symptom;
    const d=D.symptoms[s.symptom];
    if(!d.qualities.some(q=>q.ru===s.quality))s.quality='';
    if(s.symptom==='пульс'){s.absence=false;s.second='';s.quality=s.quality||'нормальный';}
    if(!D.symptoms[s.second]||s.second===s.symptom||s.second==='пульс')s.second='';
    if(s.absence){s.quality='';s.second='';}
    if(!D.diseases.some(d=>d.ru===s.disease))s.disease=defaults.disease;
    if(!['have','verb'].includes(s.mode))s.mode='have';
    if(s.frame==='disease'){s.mode='have';s.level=2;}
    if(!['medicine','place','careDoctor'].includes(s.careKind))s.careKind='medicine';
    for(const key of ['medicine','place','careDoctor'])if(!D.care[key].some(x=>x.ru===s[key]))s[key]=defaults[key];
    return s;
  }
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function pain(s){return cap([s.level>=2?'у '+owner(s):'',s.level===3?s.intensity:'',body(s).number===1?'болит':'болят',s.body].filter(Boolean).join(' '))+'.';}
  function symptom(s){const d=D.symptoms[s.symptom],quality=!s.absence&&(s.level>=2||s.symptom==='пульс')?s.quality:'';return cap(['у '+owner(s),s.absence?'нет':'',quality,s.absence?d.gen:s.symptom,!s.absence&&s.level===3&&s.second?'и '+s.second:''].filter(Boolean).join(' '))+'.';}
  function disease(s){return 'У '+owner(s)+' '+s.disease+'.';}
  const subject=s=>s.role==='doctor'?'Вы':'Я';
  function illness(s){return subject(s)+(s.role==='doctor'?' болеете ':' болею ')+D.diseases.find(d=>d.ru===s.disease).instrumental+'.';}
  function treatment(s){const t=D.care[s.careKind].find(t=>t.ru===s[s.careKind]);return subject(s)+(s.careKind==='medicine'?(s.role==='doctor'?' принимаете ':' принимаю '):(s.role==='doctor'?' лечитесь ':' лечусь '))+t.form+'.';}
  function careZh(s){const t=D.care[s.careKind].find(t=>t.ru===s[s.careKind]);return whoZh(s)+t.phraseZh+'。';}
  function painZh(s){const i=s.level===3?D.intensities.find(i=>i.ru===s.intensity):null;return(s.level>=2?whoZh(s):'')+body(s).zh+(i?.zh||'')+'疼。';}
  function symptomZh(s){
    const d=D.symptoms[s.symptom],q=(s.level>=2||s.symptom==='пульс')?d.qualities.find(q=>q.ru===s.quality):null;
    let z=whoZh(s);
    if(s.absence)return z+d.negativeZh+'。';
    if(s.symptom==='температура')z+=q?'的体温'+q.zh:'发烧了';
    else if(s.symptom==='пульс')z+='的脉搏'+q.zh;
    else z+=s.quality==='небольшой'&&q?'有点'+d.zh:d.zh+(s.quality==='сильный'&&q?'很严重':'');
    if(s.level===3&&s.second)z+=s.second==='температура'?'，还发烧':'，还有'+D.symptoms[s.second].zh;
    return z+'。';
  }
  function diseaseZh(s){return whoZh(s)+'患有'+D.diseases.find(d=>d.ru===s.disease).zh+'。';}
  function sentences(s){s=normalise(s);if(s.frame==='care')return s.level===1?[illness(s)]:s.level===2?[treatment(s)]:[illness(s),treatment(s)];if(s.linked&&s.level===3&&['pain','symptoms'].includes(s.frame))return[pain(s),symptom(s)];return[s.frame==='pain'?pain(s):s.frame==='symptoms'?symptom(s):disease(s)];}
  function translation(s){s=normalise(s);if(s.frame==='care')return s.level===1?diseaseZh(s):s.level===2?careZh(s):diseaseZh(s)+careZh(s);if(s.linked&&s.level===3&&['pain','symptoms'].includes(s.frame))return painZh(s)+symptomZh(s);return s.frame==='pain'?painZh(s):s.frame==='symptoms'?symptomZh(s):diseaseZh(s);}
  function annotatedSentences(s){
    s=normalise(s);
    return sentences(s).map((text,i)=>{
      if(s.frame==='care'){
        if(s.level===1||(s.level===3&&i===0))return text.replace(subject(s),subject(s)+' (П1)').replace(/\.$/,' (П5).');
        return text.replace(subject(s),subject(s)+' (П1)').replace(/\.$/,' (П'+(s.careKind==='medicine'?4:s.careKind==='place'?6:2)+').');
      }
      text=text.replace('У '+owner(s),'У '+owner(s)+' (П2)');
      const combined=s.linked&&s.level===3&&['pain','symptoms'].includes(s.frame);
      const symptomRow=combined?i===1:s.frame==='symptoms';
      if(symptomRow){const d=D.symptoms[s.symptom],w=s.absence?d.gen:s.symptom;text=text.replace(w,w+' (П'+(s.absence?2:1)+')');if(s.level===3&&s.second&&!s.absence)text=text.replace(s.second,s.second+' (П1)');return text;}
      return text.replace(/\.$/,' (П1).');
    });
  }
  function inventory(){
    const phrases=new Map();
    const add=(text,group)=>phrases.set(text,group);
    D.bodies.forEach(b=>add(b.ru,'words'));
    Object.keys(D.symptoms).forEach(w=>add(w,'words'));
    D.diseases.forEach(d=>{add(d.ru,'words');add(d.instrumental,'words');});
    D.intensities.filter(i=>i.ru).forEach(i=>add(i.ru,'words'));
    D.frames.forEach(f=>add(f.question,'questions'));
    ['Чем вы болеете?','Как вы лечитесь?'].forEach(q=>add(q,'questions'));
    ['patient','doctor'].forEach(role=>{
      for(const level of [1,2,3]){
        D.bodies.forEach(b=>D.intensities.forEach(i=>add(pain(normalise({frame:'pain',role,level,body:b.ru,intensity:i.ru})),'pain')));
        Object.entries(D.symptoms).forEach(([w,d])=>{
          for(const absence of [false,true])for(const q of [{ru:''},...d.qualities])for(const second of ['',...Object.keys(D.symptoms)]){
            const s=normalise({frame:'symptoms',role,level,symptom:w,quality:q.ru,second,absence});
            add(symptom(s),'symptoms');
          }
        });
        D.diseases.forEach(d=>['have','verb'].forEach(mode=>add(disease(normalise({frame:'disease',role,level,disease:d.ru,mode})),'disease')));
        D.diseases.forEach(d=>add(illness(normalise({frame:'care',role,level,disease:d.ru})),'care'));
        for(const kind of ['medicine','place','careDoctor'])for(const t of D.care[kind])add(treatment(normalise({frame:'care',role,careKind:kind,[kind]:t.ru})),'care');
      }
    });
    return Array.from(phrases,([text,group])=>({text,group}));
  }
  return{defaults,normalise,owner,subject,body,pain,symptom,disease,illness,treatment,sentences,translation,annotatedSentences,inventory};
})();
