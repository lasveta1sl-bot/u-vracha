/* Pure language model: the UI and audio inventory use the same permitted forms. */
window.UV_FRAMES_MODEL = (() => {
  const D=window.UV_FRAMES_DATA;
  const defaults={frame:'pain',level:2,role:'patient',body:'голова',intensity:'',symptom:'кашель',quality:'',second:'',absence:false,disease:'ангина',mode:'have',linked:false};
  const owner=s=>s.role==='doctor'?'вас':'меня';
  const whoZh=s=>s.role==='doctor'?'您':'我';
  const body=s=>D.bodies.find(b=>b.ru===s.body)||D.bodies[0];
  function normalise(input){
    const s={...defaults,...input};
    if(!['pain','symptoms','disease'].includes(s.frame))s.frame='pain';
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
    return s;
  }
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function pain(s){return cap([s.level>=2?'у '+owner(s):'',s.level===3?s.intensity:'',body(s).number===1?'болит':'болят',s.body].filter(Boolean).join(' '))+'.';}
  function symptom(s){const d=D.symptoms[s.symptom],quality=!s.absence&&(s.level>=2||s.symptom==='пульс')?s.quality:'';return cap(['у '+owner(s),s.absence?'нет':'',quality,s.absence?d.gen:s.symptom,!s.absence&&s.level===3&&s.second?'и '+s.second:''].filter(Boolean).join(' '))+'.';}
  function disease(s){const d=D.diseases.find(d=>d.ru===s.disease);return s.level===3&&s.mode==='verb'?(s.role==='doctor'?'Вы болеете ':'Я болею ')+d.instrumental+'.':'У '+owner(s)+' '+d.ru+'.';}
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
  function sentences(s){s=normalise(s);if(s.linked&&s.level===3&&s.frame!=='disease')return[pain(s),symptom(s)];return[s.frame==='pain'?pain(s):s.frame==='symptoms'?symptom(s):disease(s)];}
  function translation(s){s=normalise(s);if(s.linked&&s.level===3&&s.frame!=='disease')return painZh(s)+symptomZh(s);return s.frame==='pain'?painZh(s):s.frame==='symptoms'?symptomZh(s):diseaseZh(s);}
  function inventory(){
    const phrases=new Map();
    const add=(text,group)=>phrases.set(text,group);
    D.bodies.forEach(b=>add(b.ru,'words'));
    Object.keys(D.symptoms).forEach(w=>add(w,'words'));
    D.diseases.forEach(d=>{add(d.ru,'words');add(d.instrumental,'words');});
    D.intensities.filter(i=>i.ru).forEach(i=>add(i.ru,'words'));
    D.frames.forEach(f=>add(f.question,'questions'));
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
      }
    });
    return Array.from(phrases,([text,group])=>({text,group}));
  }
  return{defaults,normalise,owner,body,pain,symptom,disease,sentences,translation,inventory};
})();
