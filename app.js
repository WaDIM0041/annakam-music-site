'use strict';
(() => {
 const headline=document.getElementById('headline');
 headline.setAttribute('aria-label','на своей волне');
 let letterIndex=0;
 for(const part of [headline,headline.querySelector('.hero-line')]){
  for(const node of [...part.childNodes]){
   if(node.nodeType!==Node.TEXT_NODE)continue;
   const fragment=document.createDocumentFragment();
   for(const letter of node.textContent){
    if(/\s/.test(letter)){fragment.append(document.createTextNode(letter));continue;}
    const span=document.createElement('span');span.className='headline-letter';span.textContent=letter;
    span.setAttribute('aria-hidden','true');span.style.animationDelay=(letterIndex++*.12)+'s';fragment.append(span);
   }
   node.replaceWith(fragment);
  }
 }
 const tracks=[
  {"id":"winter-evening-vocal-trance","title":"Зимний вечер (Vocal Trance)","file":"audio/winter-evening-vocal-trance.mp3","cover":"winter-evening-vocal-trance","word":"Зимний вечер.","tag":"VOCAL TRANCE · ELECTRONIC","description":"Вокальный транс с зимним настроением и мелодичным электронным звучанием.","duration":387.21},
  {"id":"servants-of-earth","title":"Слуги Земли","file":"audio/servants-of-earth.mp3","cover":"servants-of-earth","word":"Слуги Земли","tag":"ANNAKAM · ORIGINAL SOUND","description":"Композиция из проекта «Опера Вселенной», посвящённая Земле и природе.","duration":356.37},
  {"id":"this-quiet-hour-deep-slap-house-mix","title":"This Quiet Hour (Deep Slap House Mix)","file":"audio/this-quiet-hour-deep-slap-house-mix.mp3","cover":"this-quiet-hour-deep-slap-house-mix","word":"Quiet hour.","tag":"DEEP SLAP HOUSE · VOCAL","description":"Новая глубокая slap house-версия тихого часа: упругий бас, ночной ритм и вокальная атмосфера.","duration":266.48},
  {"id": "measured-groove", "title": "Measured Groove", "file": "audio/measured-groove.mp3", "cover": "measured-groove", "word": "Groove.", "tag": "MINIMAL GROOVE · ELECTRONIC", "description":"Ровный электронный грув для движения в собственном темпе.", "duration": 227.24},
  {"id":"silent-house-trance","title":"Тихий Дом — Trance of the Instruments (Trance RU)","file":"audio/silent-house-trance.mp3","cover":"silent-house-trance","word":"Сирени.","tag":"PROGRESSIVE TRANCE · DARK R&B · DUET","description":"Тёмный утренний дуэт: тишина дома, сирень и свет после ночи.","duration":343.76},
  {"id": "wake-thanks-violin", "title": "I Wake Up and Give Thanks++Скрипка припев", "file": "audio/wake-thanks-violin.mp3", "cover": "wake-thanks-violin", "word": "Thanks.", "tag": "CINEMATIC ELECTRONIC · VIOLIN", "description":"Светлая электронная композиция с ведущей скрипкой в припеве.", "duration": 333.6},
  {"id": "wake-thanks-ru-1", "title": "I Wake Up Я просыпаюсь и Благодарю 1", "file": "audio/wake-thanks-ru-1.mp3", "cover": "wake-thanks-ru-1", "word": "Благодарю.", "tag": "AMBIENT POP · GRATITUDE", "description":"Мягкая песня благодарности о новом утре и внутреннем свете.", "duration": 289.6},
  {"id": "own-wave-trance-v9", "title": "На своей волне (Melodic Trance • 76 BPM • 5-Minute Edit • v9)", "file": "audio/own-wave-trance-v9.mp3", "cover": "own-wave-trance-v9", "word": "Волна.", "tag": "MELODIC TRANCE · 76 BPM", "description":"Неспешный мелодичный trance-поток: пространство, дыхание и волна.", "duration": 314},
  {"id":"quiet-hour","title":"Благодарю за этот тихий час","file":"audio/quiet-hour.mp3","cover":"quiet-hour","word":"Тихий час.","tag":"ATMOSPHERIC ELECTRONIC · SOFT VOCAL","description":"Тёплая пауза среди дня — музыка благодарности и домашнего покоя.","duration":233.84},

  {id:'pulse',title:'Пульс Вакума (Vocal)',file:'audio/pulse.mp3',cover:'pulse',word:'Пульс.',tag:'VOCAL · SOUND EXPLORATIONS',description:'Вокальная электронная композиция о внутреннем импульсе и движении.',duration:217.88},
  {id:'chrono',title:'Chrono Loop Anomaly',file:'audio/chrono.mp3',cover:'chrono',word:'Chrono.',tag:'MINIMAL ELECTRONIC · SOUND EXPLORATIONS',description:'Короткая звуковая аномалия: петля времени, ритм и цифровое эхо.',duration:123.04}
 ];
 const $=id=>document.getElementById(id),audio=$('audio'),list=$('tracks'),toggle=$('toggle'),seek=$('seek'),queue=$('queue-panel');
 let current=0,requestId=0,buffering=false,failed=false,sunoActive=false,activeLikedPlayer=null;
 const format=n=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'—:—';
 const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
 const cards=new Map();
 function message(text,retry=false){$('status-text').textContent=text;$('status').hidden=!text;$('retry').hidden=!retry;}
 function setBuffer(value){buffering=value;document.querySelector('.player').classList.toggle('is-buffering',value);toggle.setAttribute('aria-busy',String(value));}
 function render(){
  list.replaceChildren();$('queue-tracks').replaceChildren();
  tracks.forEach((t,i)=>{
   const card=document.createElement('article');card.className='track reveal';card.dataset.id=t.id;
   const cover=document.createElement('div');cover.className='cover '+t.cover;
   cover.innerHTML='<div class="cover-art" aria-hidden="true"></div><span class="cover-number" aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><span class="cover-note" aria-hidden="true">ANNAKAM / ORIGINAL SOUND</span>'+(i===1?'<span class="cover-orbit" aria-hidden="true"></span>':'');
   const word=document.createElement('span');word.className='cover-word';word.textContent=t.word;word.setAttribute('aria-hidden','true');cover.append(word);
   const play=document.createElement('button');play.className='cover-play';play.dataset.play=t.id;cover.append(play);
   const info=document.createElement('div');info.className='track-info';
   const names=document.createElement('div'),tag=document.createElement('p'),title=document.createElement('h3'),description=document.createElement('p'),artist=document.createElement('p');
   tag.className='eyebrow';tag.textContent=t.tag;title.textContent=t.title;description.className='track-description';description.textContent=t.description;artist.className='track-artist';artist.textContent='AnnaKam';
   const eq=document.createElement('span');eq.className='track-equalizer';eq.setAttribute('aria-hidden','true');eq.innerHTML='<i></i><i></i><i></i>';eq.hidden=true;artist.append(eq);names.append(tag,title,description,artist);
   const tail=document.createElement('div');tail.className='track-tail';const duration=document.createElement('span');duration.className='track-duration';duration.textContent=format(t.duration)+' / MP3';
   const download=document.createElement('a');download.className='download';download.href=t.file;download.download=t.title+'.mp3';download.setAttribute('aria-label','Скачать '+t.title+' в MP3');download.title='Скачать MP3';download.innerHTML=icon('down');tail.append(duration,download);
   info.append(names,tail);card.append(cover,info);list.append(card);cards.set(t.id,{card,play,eq});
   const q=document.createElement('button');q.className='queue-track';q.dataset.play=t.id;q.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span><span></span>'+icon('play');q.children[1].textContent=t.title;$('queue-tracks').append(q);
  });
  $('track-count').textContent=$('nav-count').textContent=String(tracks.length).padStart(2,'0');
  window.AnnaAtmosphere?.observe();
 }
 function update(){
  const playing=!audio.paused&&!audio.ended,t=tracks[current];
  document.body.classList.toggle('is-playing',playing);
  toggle.innerHTML=icon(playing?'pause':'play');toggle.setAttribute('aria-label',playing?'Пауза':'Воспроизвести');
  $('now-title').textContent=t.title;$('now-label').textContent=playing?'СЕЙЧАС ИГРАЕТ':failed?'НЕТ СОЕДИНЕНИЯ':'ВЫБРАННЫЙ ТРЕК';
  $('player-cover').className='mini-cover '+t.cover;
  $('object-state').textContent=playing?'ВЫ НА СВОЕЙ ВОЛНЕ':'ВАША ВОЛНА ЖДЁТ';
  document.querySelector('.sound-button').dataset.play=t.id;document.querySelector('.sound-button').setAttribute('aria-label',(playing?'Пауза: ':'Слушать: ')+t.title);
  document.querySelector('.core-play-icon').innerHTML=icon(playing?'pause':'play');
  for(const track of tracks){const c=cards.get(track.id),active=track===t;c.card.classList.toggle('active',active);c.play.innerHTML=icon(active&&playing?'pause':'play');c.play.setAttribute('aria-label',(active&&playing?'Пауза: ':'Слушать: ')+track.title);c.eq.hidden=!active;}
  document.querySelectorAll('.queue-track').forEach(q=>{q.classList.toggle('active',q.dataset.play===t.id);q.setAttribute('aria-label',(q.dataset.play===t.id&&playing?'Пауза: ':'Слушать: ')+tracks.find(x=>x.id===q.dataset.play).title);});
  if('mediaSession'in navigator){navigator.mediaSession.playbackState=playing?'playing':'paused';}
 }
 function pauseLocalForSuno(){
  sunoActive=true;
  if(!audio.paused){audio.pause();setBuffer(false);message('Локальный MP3 приостановлен перед открытием Suno.');update();}
 }
 function stopLikedPlayer(){
  if(!activeLikedPlayer)return;
  activeLikedPlayer.frame.remove();
  activeLikedPlayer.card.classList.remove('is-active');
  activeLikedPlayer.button.textContent='Слушать в Suno';
  activeLikedPlayer.button.setAttribute('aria-pressed','false');
  activeLikedPlayer=null;
 }
 function updateTime(){
  const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:tracks[current].duration;
  $('elapsed').textContent=format(audio.currentTime);$('duration').textContent=format(duration);
  seek.disabled=!Number.isFinite(audio.duration)||audio.duration<=0;
  seek.value=String(duration?Math.round(audio.currentTime/duration*1000):0);
  seek.style.setProperty('--fill',(+seek.value/10)+'%');seek.setAttribute('aria-valuetext',format(audio.currentTime)+' из '+format(duration));
 }
 function updateMedia(){
  if(!('mediaSession'in navigator)||!('MediaMetadata'in window))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:tracks[current].title,artist:'AnnaKam',album:'AnnaKam Originals',artwork:[{src:new URL('assets/aurora-coast-v001.png',location.href).href,sizes:'1672x941',type:'image/png'}]});
 }
 async function playTrack(index){
  if(index<0||index>=tracks.length)return;
  stopLikedPlayer();
  const id=++requestId;failed=false;sunoActive=false;message('');setBuffer(true);
  if(current!==index){current=index;audio.src=tracks[index].file;updateTime();updateMedia();}
  window.AnnaAtmosphere?.connectAudio(audio);
  try{await audio.play();if(id===requestId){setBuffer(false);message('');}}
  catch(error){if(id===requestId&&error.name!=='AbortError'){failed=true;setBuffer(false);message('Не удалось включить трек. Повторите попытку или скачайте MP3.',true);}}
  update();
 }
 function togglePlay(){if(audio.paused||audio.ended){playTrack(current);}else{audio.pause();setBuffer(false);message('');}}
 document.addEventListener('click',event=>{const button=event.target.closest('[data-play]');if(!button)return;const index=tracks.findIndex(t=>t.id===button.dataset.play);if(index===current&&!audio.paused){togglePlay();}else{playTrack(index);}});
 toggle.addEventListener('click',togglePlay);
 $('prev').addEventListener('click',()=>{if(audio.currentTime>3){audio.currentTime=0;updateTime();}else{playTrack((current-1+tracks.length)%tracks.length);}});
 $('next').addEventListener('click',()=>playTrack((current+1)%tracks.length));
 $('hero-prev').addEventListener('click',()=>{if(audio.currentTime>3){audio.currentTime=0;updateTime();}else{playTrack((current-1+tracks.length)%tracks.length);}});
 $('hero-next').addEventListener('click',()=>playTrack((current+1)%tracks.length));
 $('retry').addEventListener('click',()=>{audio.load();playTrack(current);});
 seek.addEventListener('input',()=>{if(!seek.disabled){audio.currentTime=(+seek.value/1000)*audio.duration;updateTime();}});
 $('volume').addEventListener('input',()=>{audio.volume=+$('volume').value;audio.muted=false;});
 $('mute').addEventListener('click',()=>{audio.muted=!audio.muted;});
 audio.addEventListener('volumechange',()=>{const muted=audio.muted||audio.volume===0;$('mute').innerHTML=icon(muted?'muted':'volume');$('mute').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');$('volume').value=String(audio.muted?0:audio.volume);});
 audio.addEventListener('loadedmetadata',()=>{updateTime();setBuffer(false);});
 audio.addEventListener('timeupdate',updateTime);
 audio.addEventListener('playing',()=>{failed=false;setBuffer(false);message('');update();});
 audio.addEventListener('waiting',()=>{if(!audio.paused){setBuffer(true);message('Загружаем музыку…');}});
 audio.addEventListener('pause',()=>{setBuffer(false);if(!failed&&!sunoActive)message('');update();});
 audio.addEventListener('play',update);
 audio.addEventListener('ended',()=>{if(current+1<tracks.length)playTrack(current+1);else{update();updateTime();}});
 audio.addEventListener('error',()=>{failed=true;setBuffer(false);message('Аудиофайл недоступен. Повторите попытку или скачайте MP3.',true);update();});
 const search=$('search');
 function filter(){const query=search.value.trim().toLocaleLowerCase();let count=0;tracks.forEach(t=>{const card=cards.get(t.id).card;card.hidden=!t.title.toLocaleLowerCase().includes(query);if(!card.hidden){count++;card.classList.remove('waiting');}});$('empty').hidden=count>0;}
 search.addEventListener('input',filter);
 $('clear-search').addEventListener('click',()=>{search.value='';filter();search.focus();});
 function showQueue(open){queue.hidden=!open;$('queue').setAttribute('aria-expanded',String(open));$('queue').setAttribute('aria-label',open?'Закрыть очередь треков':'Открыть очередь треков');}
 async function renderLiked(){
  const target=$('liked-grid');
  try{
   const response=await fetch('liked-tracks.json');if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();const items=Array.isArray(data.tracks)?data.tracks:[];
   $('liked-note').textContent='Подборка избранного AnnaKam.';
   $('liked-count').textContent=String(items.length).padStart(2,'0');
   $('liked-count').setAttribute('aria-label',items.length+' композиций');
   $('liked-nav-count').textContent=String(items.length).padStart(2,'0');
   target.replaceChildren();
   for(const item of items){
    if(!/^[0-9a-f-]{36}$/i.test(item.id)||!item.embedUrl?.startsWith('https://suno.com/embed/'))continue;
    const card=document.createElement('article');card.className='liked-card reveal';
    const head=document.createElement('div');head.className='liked-track-head';
    const preview=document.createElement('img');
    preview.className='liked-cover';
    preview.alt='Обложка: '+item.title;
    preview.decoding='async';
    preview.fetchPriority='low';
    preview.src=item.cover;
    const info=document.createElement('div'),tag=document.createElement('p'),title=document.createElement('h3'),artist=document.createElement('span');
    tag.className='eyebrow';tag.textContent='SUNO · ВСТРОЕННЫЙ ПЛЕЕР';title.textContent=item.title;artist.textContent=item.artist||'AnnaKam';info.append(tag,title,artist);
    const actions=document.createElement('div');actions.className='liked-actions';
    const listen=document.createElement('button');listen.className='liked-play';listen.type='button';listen.textContent='Слушать в Suno';listen.setAttribute('aria-pressed','false');listen.setAttribute('aria-label','Открыть плеер: '+item.title);
    const link=document.createElement('a');link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='↗';link.setAttribute('aria-label','Открыть '+item.title+' на Suno');link.addEventListener('click',pauseLocalForSuno);actions.append(listen,link);head.append(info,actions);
    const mount=document.createElement('div');mount.className='liked-player';
    listen.addEventListener('click',()=>{
     if(activeLikedPlayer?.id===item.id){stopLikedPlayer();return;}
     stopLikedPlayer();pauseLocalForSuno();
     const frame=document.createElement('iframe');frame.title=item.title+' — плеер Suno';frame.src=item.embedUrl;frame.loading='lazy';frame.allow='autoplay; encrypted-media';frame.referrerPolicy='strict-origin-when-cross-origin';
     mount.append(frame);card.classList.add('is-active');listen.textContent='Закрыть плеер';listen.setAttribute('aria-pressed','true');activeLikedPlayer={id:item.id,card,button:listen,frame};
    });
    const source=document.createElement('p');source.className='liked-source';source.textContent='Источник: Suno. Воспроизведение и доступность контролирует Suno.';
    head.prepend(preview);card.append(head,mount,source);target.append(card);
   }
   window.AnnaAtmosphere?.observe();
  }catch(error){$('liked-note').textContent='Не удалось загрузить избранное. Обновите страницу или откройте треки в Suno.';}
 }
 $('queue').addEventListener('click',()=>showQueue(queue.hidden));
 $('close-queue').addEventListener('click',()=>{showQueue(false);$('queue').focus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!queue.hidden){showQueue(false);$('queue').focus();}});
 document.addEventListener('click',e=>{if(!queue.hidden&&!queue.contains(e.target)&&!$('queue').contains(e.target))showQueue(false);});
 if('mediaSession'in navigator){const actions={play:()=>playTrack(current),pause:()=>audio.pause(),previoustrack:()=>playTrack((current-1+tracks.length)%tracks.length),nexttrack:()=>playTrack((current+1)%tracks.length),seekto:d=>{if(Number.isFinite(audio.duration))audio.currentTime=d.seekTime;}};Object.entries(actions).forEach(([key,handler])=>{try{navigator.mediaSession.setActionHandler(key,handler);}catch{}});}
 render();renderLiked();update();updateTime();updateMedia();document.body.classList.add('enhanced');
})();
