(() => {
 'use strict';
 const D=window.UV_VOICE_DATA;if(!D)return;
 const norm=s=>String(s).normalize('NFC').replace(/\u0301/g,'').toLowerCase().replace(/ё/g,'е').replace(/\(п[1-6]\)/g,'').replace(/№\s*5/g,'номер пять').replace(/[^а-я0-9]+/g,' ').trim();
 const resolve=text=>{const exact=D.audio[norm(text)];if(exact)return [exact];const parts=String(text).split(/\s+[—/]\s+/);if(parts.length>1){const entries=parts.map(p=>D.audio[norm(p)]);if(entries.every(Boolean))return entries;}return null;};
 let token=0,current=null,rate=1,bar,status,label,audio;const loading=new Map();
 function stop(){token++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();}if(current)current.classList.remove('is-playing');current=null;if(status)status.textContent='';}
 function loadPack(name){
  if(window.UV_FRAME_AUDIO?.[name])return Promise.resolve();
  if(loading.has(name))return loading.get(name);
  const p=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=D.packs[name];script.onload=()=>{script.remove();if(window.UV_FRAME_AUDIO?.[name])resolve();else{loading.delete(name);reject(Error('empty'));}};script.onerror=()=>{script.remove();loading.delete(name);reject(Error('network'));};document.head.append(script);});loading.set(name,p);return p;
 }
 async function play(text,button){
  const entries=resolve(text);if(!entries)return;
  stop();document.dispatchEvent(new CustomEvent('uv-voice-start'));const ownToken=token;current=button||null;if(current)current.classList.add('is-playing');bar.hidden=false;label.textContent=text;status.textContent='Подготовка записи · 正在加载录音';
  try{
   await Promise.all([...new Set(entries.map(e=>e.pack))].map(loadPack));if(ownToken!==token)return;
   let i=0;
   const next=async()=>{if(ownToken!==token)return;const e=entries[i];audio.src=window.UV_FRAME_AUDIO[e.pack][e.id];audio.playbackRate=rate;audio.preservesPitch=true;audio.onended=()=>{if(ownToken!==token)return;if(++i<entries.length)next().catch(()=>{status.textContent='Не удалось воспроизвести запись. Повторите. · 请重试。';});else{status.textContent='Запись закончилась · 录音结束';current?.classList.remove('is-playing');current=null;}};await audio.play();if(ownToken===token)status.textContent=rate===1?'Слушаем · 正在播放':'Медленно · 慢速';};
   await next();
  }catch(e){if(ownToken!==token)return;status.textContent=e.name==='NotAllowedError'?'Нажмите на динамик ещё раз · 请再次点击播放':'Не удалось загрузить запись. Повторите или откройте офлайн-файл. · 请重试或使用离线版。';current?.classList.remove('is-playing');current=null;}
 }
 function russian(element){const copy=element.cloneNode(true);copy.querySelectorAll('.zh,[lang^="zh"],.manual-zh,[data-manual-zh],.uv-sound,ul').forEach(n=>n.remove());return copy.textContent.trim();}
 function add(element,text,after=false){
  if(element.dataset.uvAudio||!resolve(text))return;element.dataset.uvAudio='1';
  const button=document.createElement('button');button.type='button';button.className='uv-sound';button.setAttribute('aria-label','Слушать: '+text);button.title='Слушать: '+text+' · 听录音';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3Z" fill="currentColor"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();play(text,button);});button.addEventListener('keydown',e=>{if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))e.stopPropagation();});
  if(after)element.after(button);else element.append(button);
 }
 let scheduled=false;let observer;
 function scan(){
  scheduled=false;observer?.disconnect();
  document.querySelectorAll('.tile .word,.tile .ex,.models p,.deck .bigword,.deck .example,.scheme-card p,.pattern-example,.branch-example,.map-panel .childru,.map-panel .node>h3,.map-panel .root>strong,.map-panel .term>summary,.map-panel .model strong').forEach(e=>add(e,russian(e)));
  document.querySelectorAll('.sourcecard img').forEach(img=>add(img,russianSource(img),true));
  document.querySelectorAll('.concept-chip').forEach(button=>add(button,russian(button),true));
  observer?.observe(document.body,{subtree:true,childList:true});
 }
 function russianSource(img){return (img.getAttribute('alt')||'').replace(/^Исходная карточка:\s*/,'').trim();}
 function start(){
  audio=document.createElement('audio');audio.id='uv-teacher-voice';audio.preload='none';document.body.append(audio);
  bar=document.createElement('aside');bar.id='uv-voice-panel';bar.hidden=true;bar.setAttribute('aria-label','Прослушивание записи');bar.innerHTML='<div class="uv-voice-copy"><strong id="uv-voice-label"></strong><span id="uv-voice-status" role="status" aria-live="polite"></span></div><div class="uv-voice-actions"><button type="button" id="uv-rate" aria-pressed="false" title="Медленное воспроизведение · 慢速播放">0,8×</button><button type="button" id="uv-stop" aria-label="Остановить запись · 停止播放">■</button><button type="button" id="uv-close" aria-label="Закрыть проигрыватель · 关闭播放器">×</button></div>';document.body.append(bar);label=document.getElementById('uv-voice-label');status=document.getElementById('uv-voice-status');
  document.getElementById('uv-rate').onclick=e=>{rate=rate===1?.8:1;audio.playbackRate=rate;audio.preservesPitch=true;e.currentTarget.setAttribute('aria-pressed',String(rate!==1));if(!audio.paused)status.textContent=rate===1?'Слушаем · 正在播放':'Медленно · 慢速';};document.getElementById('uv-stop').onclick=stop;document.getElementById('uv-close').onclick=()=>{stop();bar.hidden=true;};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){stop();bar.hidden=true;}});window.addEventListener('pagehide',stop);window.addEventListener('hashchange',stop);
  observer=new MutationObserver(ms=>{if(ms.some(m=>m.target.id==='main'))stop();if(!scheduled){scheduled=true;requestAnimationFrame(scan);}});scan();
 }
 window.UV_VOICE={play,stop,resolve,norm};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
