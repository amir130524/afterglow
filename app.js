const $=s=>document.querySelector(s);let memories=[],photoFiles=[];const moods=[{id:'warm',name:'Тёплая ностальгия',words:/тепл|уют|какао|кофе|солн|осен|лист|люб|друз|семь|обним|радост|счаст|smile|happy|love|sunset|warm|cozy|autumn/gi,colors:['#e7c59a','#8e654e'],style:'мягкий свет и плёночное зерно',tempo:'плавный'},{id:'calm',name:'Тихое спокойствие',words:/тихо|спокой|медлен|дожд|туман|вечер|тишин|море|небо|звезд|нежн|peace|calm|quiet|rain|slow|ambient|piano/gi,colors:['#b7c9c4','#506b75'],style:'много воздуха и мягкая композиция',tempo:'медленный'},{id:'energy',name:'Пульс момента',words:/концерт|танц|весел|энерг|быстр|побед|праздн|смея|счаст|драйв|рок|электрон|party|dance|fast|electronic|rock|excited|win/gi,colors:['#e2a476','#a74948'],style:'контраст и динамический коллаж',tempo:'быстрый'},{id:'tense',name:'Ночь и концентрация',words:/дедлайн|сроч|ночь|работ|экзамен|устал|стресс|проект|страх|тревог|сложн|deadline|stress|night|work|exam|focus|techno/gi,colors:['#a4b2c2','#354c69'],style:'геометрия и холодные контрасты',tempo:'чёткий'},{id:'melancholy',name:'Тихая грусть',words:/груст|скуч|один|прощ|пуст|плак|печал|тоск|расстав|sad|miss|alone|lonely|goodbye|melanchol/gi,colors:['#aab1c4','#65677e'],style:'приглушённый цвет и длинные паузы',tempo:'медленный'}];
const openDb=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('afterglow-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('days',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});async function dbAll(){const db=await openDb();return new Promise((res,rej)=>{const r=db.transaction('days').objectStore('days').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}async function dbPut(item){const db=await openDb();return new Promise((res,rej)=>{const r=db.transaction('days','readwrite').objectStore('days').put(item);r.onsuccess=res;r.onerror=()=>rej(r.error)})}async function dbDelete(id){const db=await openDb();return new Promise((res,rej)=>{const r=db.transaction('days','readwrite').objectStore('days').delete(id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3200)}function go(view){if(view!=='detail')stopFilm();document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===view));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===view));window.scrollTo(0,0)}document.addEventListener('click',e=>{let b=e.target.closest('[data-go],[data-view]');if(b)go(b.dataset.go||b.dataset.view)});
function scoreMood(text,song){const s=(text+' '+song).toLowerCase();let scored=moods.map(m=>({...m,score:(s.match(m.words)||[]).length}));scored.sort((a,b)=>b.score-a.score);return scored[0].score?scored[0]:moods[1]}
function normalizeDayTitle(candidate,text){
 const words=String(candidate||'').replace(/[\n\r]+/g,' ').trim().split(/\s+/).filter(Boolean);
 if(words.length>=3&&words.length<=7)return words.join(' ');
 const backup=String(makeTitle(text,'')||'').trim().split(/\s+/).filter(Boolean);
 if(backup.length>=3&&backup.length<=7)return backup.join(' ');
 const source=(words.length?words:backup).slice(0,7);
 while(source.length<3)source.push(['этого','особенного','дня'][source.length]||'дня');
 return source.join(' ');
}
function makeTitle(text,date){const t=text.toLowerCase();if(/полноч|ночью|ночн/.test(t)&&/пуст|улиц|неон|останов|тишин/.test(t))return 'Тишина после полуночи';if(/дожд|ливень|мокр/.test(t)&&/одиноко|груст|тишин/.test(t))return 'Город и тихий дождь';if(/дожд|ливень|мокр|промок/.test(t)&&/кафе|друз|какао|разгов|прогул/.test(t))return 'Тепло после дождя';if(/дедлайн|экзамен|проект|сдач/.test(t)&&/ноч|поздно|устал/.test(t))return 'Пока город не спал';if(/осен|желт|лист/.test(t)&&/гуля|парк|вечер/.test(t))return 'Под светом осенних фонарей';if(/концерт|танц|музык|фестиваль/.test(t))return 'Там, где звучала музыка';if(/море|пляж|лето|берег/.test(t))return 'День, наполненный светом';const fragments=text.replace(/[.!?\n]/g,'|').split('|').map(s=>s.trim()).filter(Boolean);let chosen=fragments.find(s=>s.split(/\s+/).length>=4)||fragments[0]||'Один особенный день';let words=chosen.replace(/[«»"“”]/g,'').split(/\s+/).filter(Boolean);const stop=/^(я|мы|и|а|но|это|сегодня|вчера|было|были|как|в|на|у|с|the|i|we|it)$/i;while(words.length>3&&stop.test(words[0]))words.shift();return words.slice(0,6).join(' ').replace(/^./,x=>x.toUpperCase())||'День, который останется'}
async function photoColor(file){return new Promise(resolve=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=24;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,24,24);try{const data=ctx.getImageData(0,0,24,24).data;let rgb=[0,0,0],n=0;for(let i=0;i<data.length;i+=16){for(let j=0;j<3;j++)rgb[j]+=data[i+j];n++}resolve(rgb.map(v=>Math.round(v/n)))}catch{resolve([180,180,170])}URL.revokeObjectURL(url)};img.onerror=()=>{URL.revokeObjectURL(url);resolve([180,180,170])};img.src=url})}function blend(rgb,hex,weight=.35){const h=hex.replace('#','');const base=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));return '#'+rgb.map((v,i)=>Math.round(v*weight+base[i]*(1-weight)).toString(16).padStart(2,'0')).join('')}
async function findHighlight(file){
 if(!file)return 0;
 let ac;try{ac=new (window.AudioContext||window.webkitAudioContext)();const decoded=await ac.decodeAudioData(await file.arrayBuffer());const duration=decoded.duration;
 if(duration<=32)return 0;
 const samples=decoded.getChannelData(0),sr=decoded.sampleRate,step=sr*2,windowSize=12,energy=[];
 for(let i=0;i<samples.length;i+=step){let sum=0,n=0;for(let j=i;j<Math.min(i+step,samples.length);j+=8){sum+=samples[j]*samples[j];n++;}energy.push(sum/Math.max(1,n));}
 let best=-1,at=0;for(let i=0;i+windowSize/2<=energy.length;i++){let total=0;for(let j=i;j<Math.min(i+windowSize/2,energy.length);j++)total+=energy[j];if(total>best){best=total;at=i*2;}}
 return Math.max(0,Math.min(at,duration-25));
 }catch{return 0}finally{await ac?.close().catch(()=>{});}
}
async function audioEnergy(file){if(!file)return null;try{const context=new (window.AudioContext||window.webkitAudioContext)();const buffer=await file.arrayBuffer();const decoded=await context.decodeAudioData(buffer);const samples=decoded.getChannelData(0);let sum=0,count=0;for(let i=0;i<samples.length;i+=Math.max(1,Math.floor(samples.length/10000))){sum+=samples[i]**2;count++}await context.close();return Math.sqrt(sum/count)}catch{return null}}
async function optimizeImage(file){
  try{
    const bmp=await createImageBitmap(file),maxSize=1800,scale=Math.min(1,maxSize/Math.max(bmp.width,bmp.height));
    if(scale===1 && file.size<1200000){bmp.close();return file}
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close();
    return await new Promise((resolve)=>c.toBlob(blob=>resolve(blob||file),'image/jpeg',.85));
  }catch{return file}
}
const cardObjectUrls=new Map();function urlFor(blob){if(!blob)return '';if(!cardObjectUrls.has(blob))cardObjectUrls.set(blob,URL.createObjectURL(blob));return cardObjectUrls.get(blob)}function card(m,i){const image=urlFor(m.photos[0]);return `<article class="card" tabindex="0" role="button" aria-label="Открыть воспоминание: ${escapeHtml(m.title)}" data-id="${m.id}"><div class="card-art" style="background:linear-gradient(135deg,${m.colors[0]},${m.colors[1]})"><img loading="lazy" src="${image}" alt="Фотография дня"><span class="card-index">MEMORY ${String(i+1).padStart(3,'0')} / ${escapeHtml(m.moodName)}</span><span class="card-arrow">↗</span></div><div class="card-meta"><small>${new Date(m.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</small><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.text.slice(0,83))}${m.text.length>83?'…':''}</p></div></article>`}function render(){const used=new Set(memories.map(m=>m.photos?.[0]).filter(Boolean));for(const [blob,url] of cardObjectUrls){if(!used.has(blob)){URL.revokeObjectURL(url);cardObjectUrls.delete(blob)}}memories.sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);$('#archiveCount').textContent=`${String(memories.length).padStart(2,'0')} / ENTRIES`;const empty='<div class="empty"><strong>Здесь начнётся твоя история.</strong><p>Пока нет сохранённых воспоминаний. Добавь первый момент — и он появится в архиве.</p><button data-go="create">Создать первую запись ↗</button></div>';$('#recent').innerHTML=memories.length?memories.slice(0,3).map(card).join(''):empty;$('#archiveCards').innerHTML=memories.length?memories.map(card).join(''):empty;window.AfterglowStudio?.enhanceArchive()}document.addEventListener('click',e=>{const c=e.target.closest('.card');if(c)showDetail(Number(c.dataset.id))});document.addEventListener('keydown',e=>{const c=e.target.closest('.card');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(Number(c.dataset.id))}});
let filmTimer=null,filmAudio=null,filmUrls=[];
function stopFilm(){window.afterglowPreviewStop?.();if(filmTimer)clearTimeout(filmTimer);filmTimer=null;if(filmAudio){filmAudio.pause();filmAudio.src='';filmAudio=null}const dock=document.getElementById('filmMusicDock');if(dock){dock.replaceChildren();dock.hidden=true}filmUrls.forEach(u=>URL.revokeObjectURL(u));filmUrls=[];filmController=null;document.removeEventListener('keydown',filmKeys)}
let filmController=null;
function filmKeys(e){if(!filmController||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;if(e.key==='ArrowRight')filmController.next();if(e.key==='ArrowLeft')filmController.prev();if(e.key==='Escape')filmController.close();if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();filmController.toggle()}}
function storyBeats(text){let parts=text.match(/[^.!?\n]+[.!?]?/g)||[text];parts=parts.map(x=>x.trim()).filter(x=>x.length>12);if(parts.length<3){const words=text.split(/\s+/);parts=[words.slice(0,Math.ceil(words.length/3)).join(' '),words.slice(Math.ceil(words.length/3),Math.ceil(words.length*2/3)).join(' '),words.slice(Math.ceil(words.length*2/3)).join(' ')].filter(Boolean)}const indexes=[0,Math.floor(parts.length/2),parts.length-1];return [...new Set(indexes)].map(i=>parts[i]).filter(Boolean).map(s=>s.length>150?s.slice(0,147)+'…':s)}
function embeddedMusic(link){
  try{
    const u=new URL(link);const host=u.hostname.replace(/^www\./,'').toLowerCase();let id='';
    if(host==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
    if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){
      if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
      else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';
    }
    if(/^[a-zA-Z0-9_-]{11}$/.test(id))return {type:'YouTube',src:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1'};
    if(host==='open.spotify.com'){
      const seg=u.pathname.split('/').filter(Boolean);const i=seg[0]==='intl-ru'||seg[0]?.startsWith('intl-')?1:0;
      const kind=seg[i],track=seg[i+1];
      if(['track','album','playlist','episode','show'].includes(kind)&&/^[a-zA-Z0-9]{22}$/.test(track))return {type:'Spotify',src:'https://open.spotify.com/embed/'+kind+'/'+track};
    }
  }catch{}return null;
}
function filmTitle(m){return m.title}
function showDetail(id){
  stopFilm();
  const m=memories.find(x=>x.id===id);if(!m)return;
  const C=window.AfterglowCinema,D=window.AfterglowDirector;
  const plan=C.makePlan(m),creative=m.creative||D.profileFor(m.text,m.songTitle||'');
  const director=plan.director,date=new Date(m.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const pics=m.photos.map(blob=>{const u=URL.createObjectURL(blob);filmUrls.push(u);return u});
  const embed=embeddedMusic(m.songUrl);
  const link=m.songUrl&&/^https?:\/\//i.test(m.songUrl)?`<a class="film-link" href="${escapeHtml(m.songUrl)}" rel="noopener noreferrer" target="_blank">♫ Песня ↗</a>`:'';
  const [w,h]=C.dimensions(plan.format);
  $('#detailContent').innerHTML=`
    <div class="film film-v9" id="film" data-direction="${escapeHtml(plan.theme)}" data-v9-format="${plan.format}" style="--scene-accent:${plan.scenes[0].feeling.accent}">
      <canvas id="filmCanvas" width="${w}" height="${h}" role="img" aria-label="Кинематографическое воспоминание"></canvas>
      <div class="film-audio-tools"><button type="button" id="filmSoundBtn" class="film-sound">♫ Музыка</button><button type="button" id="filmAttachBtn" class="film-attach">＋ Аудиофайл</button><input type="file" id="filmAudioUpload" accept="audio/*" hidden></div>
      <div class="film-music-dock" id="filmMusicDock" hidden></div>
      <div class="film-bottom"><div class="film-progress" id="filmProgress">${plan.scenes.map((_,i)=>`<button type="button" class="film-segment" data-scene="${i}" aria-label="Перейти к сцене ${i+1}"><span></span></button>`).join('')}</div>
        <div class="film-controls"><button id="filmBack" aria-label="Назад">←</button><button id="filmPlay" aria-label="Пауза">Ⅱ</button><button id="filmNext" aria-label="Вперёд">→</button><span id="filmCounter">01 / ${String(plan.scenes.length).padStart(2,'0')}</span><span class="film-spacer"></span><span class="film-song">♫ ${escapeHtml(m.songTitle||'Без музыки')}</span>${link}</div></div>
    </div>
    <section class="emotional-map" id="emotionalMap" aria-label="Эмоциональная карта фильма">
      <div class="map-top"><div><div class="map-eyebrow">THE EMOTIONAL STORYBOARD / ${plan.scenes.length} SCENES</div><h3>Как менялось <em>ощущение.</em></h3></div><p class="map-help">${plan.scenes.length} сцен · ${m.photos.length} фотографий. Нажми на эмоцию и перейди к этому кадру.</p></div>
      <div class="emotional-steps">${plan.scenes.map((s,i)=>`<button type="button" class="emotional-step" data-arc-index="${i}" style="--step-color:${s.feeling.accent}" aria-pressed="false"><span class="step-bar"></span><span class="step-num">${String(i+1).padStart(2,'0')} / ${escapeHtml(s.feeling.tag)}</span><span class="step-name">${escapeHtml(s.feeling.label)}</span><span class="step-tag">${Math.round(s.duration/100)/10} СЕК · КАДР ${i+1}</span></button>`).join('')}</div>
      <p class="arc-explainer" id="arcExplainer" role="status"></p>
    </section>
    <div class="film-after"><div><div class="eyebrow">ВОСПОМИНАНИЕ / ${escapeHtml(creative.label||m.moodName)}</div><h2>${escapeHtml(m.title)}</h2><p>${escapeHtml(m.text)}</p></div>
      <aside><div class="eyebrow">АРТ-ДИРЕКТОР / ${escapeHtml(director.style.name)}</div><div class="director-badge">${creative.source==='gemini'?'✦ Gemini':'◈ Локальный анализ'}</div>
      ${[['ТЕПЛО','warmth'],['НОСТАЛЬГИЯ','nostalgia'],['НАПРЯЖЕНИЕ','tension']].map(([label,key])=>`<div class="director-axis"><span>${label} <b>${Math.round((director.axes[key]||0)*100)}%</b></span><i style="--value:${Math.round((director.axes[key]||0)*100)}%"></i></div>`).join('')}
      <div class="director-axis"><span>ПУЛЬС МУЗЫКИ <b>${Math.round(director.pulse*100)}%</b></span><i style="--value:${Math.round(director.pulse*100)}%"></i></div>
      <p><b>Почему выбран этот стиль:</b> ${escapeHtml(director.reasons.join('. '))}.</p><p><b>Монтаж:</b> в видео попадает каждая из ${m.photos.length} фотографий. Частота смены сцен зависит от художественного профиля и приближённой динамики аудио, если она доступна.</p>
      <p class="film-disclaimer">${creative.source==='gemini'?'Текст обработан Gemini на сервере.':'Использован локальный словарный анализ, не нейросеть.'} Это художественная интерпретация, не психологическая диагностика. Ссылки на чужую музыку не встраиваются в скачиваемое видео.</p>
      <button class="outline" id="filmReplay">↻ Сначала</button><button class="outline" id="remove">Удалить день</button></aside></div>`;
  go('detail');
  const canvas=$('#filmCanvas'),ctx=canvas.getContext('2d',{alpha:false}),play=$('#filmPlay'),soundBtn=$('#filmSoundBtn'),attachBtn=$('#filmAttachBtn'),audioUpload=$('#filmAudioUpload'),dock=$('#filmMusicDock');
  const progress=[...document.querySelectorAll('#filmProgress .film-segment')],steps=[...document.querySelectorAll('[data-arc-index]')];
  let images=null,playing=true,ended=false,elapsed=0,last=performance.now(),lastPaint=0,raf=0,disposed=false,wantsSound=false,lastIndex=-1;
  const updateScene=index=>{
    if(index===lastIndex)return;lastIndex=index;
    const scene=plan.scenes[index];
    $('#filmCounter').textContent=`${String(index+1).padStart(2,'0')} / ${String(plan.scenes.length).padStart(2,'0')}`;
    $('#arcExplainer').textContent=`${scene.feeling.reason} · ${scene.feeling.tag} · ${Math.round(scene.duration/100)/10} с.`;
    $('#emotionalMap').style.setProperty('--arc-active',scene.feeling.accent);
    steps.forEach((step,i)=>step.setAttribute('aria-pressed',String(i===index)));
  };
  function draw(){
    const position=C.locate(plan,elapsed),idx=position.index;
    updateScene(idx);
    progress.forEach((bar,i)=>{
      bar.classList.toggle('done',i<idx);bar.classList.toggle('current',i===idx);
      bar.querySelector('span').style.width=i<idx?'100%':i===idx?`${Math.max(0,position.progress)*100}%`:'0%';
    });
    if(images)C.drawFrame(ctx,images,plan,m,idx,position.progress);
    else {ctx.fillStyle='#131c1b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f4f1dd';ctx.font=`${Math.max(17,canvas.width*.026)}px Georgia`;ctx.fillText('Подготавливаем кадры…',canvas.width*.1,canvas.height*.55);}
  }
  function frame(now){
    if(disposed)return;
    if(playing&&!document.hidden){elapsed+=Math.min(100,Math.max(0,now-last));if(elapsed>=plan.duration){elapsed=plan.duration;playing=false;ended=true;play.textContent='▶';if(wantsSound)filmAudio?.pause();}}
    last=now;if(now-lastPaint>=48){draw();lastPaint=now;}raf=requestAnimationFrame(frame);
  }
  const seek=index=>{elapsed=plan.scenes[index].start;ended=false;lastIndex=-1;last=performance.now();if(wantsSound&&filmAudio?.duration&&Number.isFinite(filmAudio.duration))filmAudio.currentTime=((m.highlightStart||0)+elapsed/1000)%filmAudio.duration;draw();};
  function toggle(){if(ended){seek(0);ended=false;}playing=!playing;play.textContent=playing?'Ⅱ':'▶';last=performance.now();if(wantsSound&&filmAudio){if(playing)filmAudio.play().catch(()=>toast('Включи музыку кнопкой звука'));else filmAudio.pause();}}
  function next(){seek(Math.min(plan.scenes.length-1,C.locate(plan,elapsed).index+1));}
  function prev(){seek(Math.max(0,C.locate(plan,elapsed).index-1));}
  filmController={next,prev,toggle,close:()=>{stopFilm();go('archive')}};
  document.addEventListener('keydown',filmKeys);
  $('#filmBack').onclick=prev;$('#filmNext').onclick=next;play.onclick=toggle;
  $('#filmReplay').onclick=()=>{seek(0);playing=true;play.textContent='Ⅱ';if(wantsSound&&filmAudio){filmAudio.currentTime=m.highlightStart||0;filmAudio.play().catch(()=>{});}$('#film').scrollIntoView({behavior:'smooth',block:'center'});};
  progress.forEach((bar,i)=>bar.onclick=()=>seek(i));
  steps.forEach((btn,i)=>btn.onclick=()=>{seek(i);$('#film').scrollIntoView({behavior:'smooth',block:'center'});});
  window.afterglowPreviewStop=()=>{disposed=true;cancelAnimationFrame(raf);images?.forEach(x=>x.close());images=null;window.afterglowPreviewStop=null;};
  C.loadImages(m).then(result=>{if(disposed)result.forEach(im=>im.close());else {images=result;draw();}}).catch(err=>{console.error(err);toast('Не удалось открыть фотографии для фильма');});
  raf=requestAnimationFrame(frame);
  function fileAudio(){
    filmAudio?.pause();if(filmAudio){filmAudio.src='';filmAudio=null;}
    const u=URL.createObjectURL(m.songFile);filmUrls.push(u);
    filmAudio=new Audio(u);filmAudio.volume=.72;filmAudio.loop=true;filmAudio.preload='auto';wantsSound=false;
    dock.replaceChildren();dock.hidden=true;
    attachBtn.textContent='↻ Заменить аудио';soundBtn.textContent='▶ Смотреть со звуком';
    soundBtn.onclick=async()=>{
      if(wantsSound){wantsSound=false;filmAudio.pause();soundBtn.textContent='♫ Включить звук';return;}
      try{if(filmAudio.duration&&Number.isFinite(filmAudio.duration))filmAudio.currentTime=((m.highlightStart||0)+elapsed/1000)%filmAudio.duration;await filmAudio.play();wantsSound=true;if(!playing)toggle();soundBtn.textContent='🔊 Выключить звук';}
      catch(e){wantsSound=false;toast('Не удалось воспроизвести аудиофайл');}
    };
  }
  function linkAudio(){
    attachBtn.textContent='＋ Добавить аудиофайл';
    if(embed){soundBtn.textContent='♫ Открыть плеер '+embed.type;soundBtn.onclick=()=>{
      if(!dock.hidden){dock.hidden=true;dock.replaceChildren();soundBtn.textContent='♫ Открыть плеер '+embed.type;return;}
      dock.hidden=false;dock.innerHTML=`<div class="film-dock-head"><span>♫ ${embed.type} · нажми Play внутри плеера</span><button type="button" id="filmDockClose">✕</button></div><iframe title="Музыка дня" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src="${embed.src}"></iframe><p>Музыка по ссылке не входит в экспорт.</p>`;
      soundBtn.textContent='✕ Скрыть плеер';$('#filmDockClose').onclick=()=>{dock.hidden=true;dock.replaceChildren();soundBtn.textContent='♫ Открыть плеер '+embed.type;};
    };}else{soundBtn.textContent=m.songUrl?'↗ Открыть песню':'♫ Добавить музыку';soundBtn.onclick=()=>m.songUrl?window.open(m.songUrl,'_blank','noopener,noreferrer'):audioUpload.click();}
  }
  attachBtn.onclick=()=>audioUpload.click();
  audioUpload.onchange=async()=>{
    const file=audioUpload.files?.[0];if(!file)return;
    if(!file.type.startsWith('audio/')&&!/\.(mp3|m4a|ogg|wav|aac|flac|webm)$/i.test(file.name))return toast('Выбери аудиофайл');
    if(file.size>35*1024*1024)return toast('Аудио должно быть меньше 35 МБ');
    m.songFile=file;fileAudio();
    try{m.audioProfile=await D.analyzeAudio(file);m.direction=D.direct(creative,m.photoColors||[],m.audioProfile,m.songTitle);await dbPut(m);toast('Музыка добавлена. Открой запись заново для обновления ритма.');}
    catch(e){console.error(e);toast('Аудио добавлено, но сохранение не удалось');}
    audioUpload.value='';
  };
  if(m.songFile)fileAudio();else linkAudio();
  $('#remove').onclick=async()=>{if(!confirm('Удалить это воспоминание?'))return;stopFilm();await dbDelete(id);memories=memories.filter(x=>x.id!==id);render();go('archive');toast('Воспоминание удалено');};
  window.dispatchEvent(new CustomEvent('afterglow:detail',{detail:{memory:m,creative,director,pics,plan}}));
}
const MAXP=12,pURL=new Map(),pu=f=>{if(!pURL.has(f))pURL.set(f,URL.createObjectURL(f));return pURL.get(f)},photosChanged=()=>document.dispatchEvent(new CustomEvent('afterglow:photos'));
function cleanupPreviewUrls(){for(const [file,url] of pURL){if(!photoFiles.includes(file)){URL.revokeObjectURL(url);pURL.delete(file)}}}
window.addEventListener('pagehide',()=>{for(const url of pURL.values())URL.revokeObjectURL(url);for(const url of cardObjectUrls.values())URL.revokeObjectURL(url)});
function setPhotos(files,replace){const key=f=>f.name+'|'+f.size+'|'+f.lastModified,next=replace?[]:[...photoFiles],seen=new Set(next.map(key));let skipped=0;
for(const f of files.filter(f=>f.type.startsWith('image/'))){if(seen.has(key(f)))continue;if(next.length>=MAXP){skipped++;continue}seen.add(key(f));next.push(f)}
photoFiles=next;renderPhotos();if(skipped)toast('Максимум '+MAXP+' фотографий, лишние не добавлены');photosChanged()}
function renderPhotos(){cleanupPreviewUrls();$('#photoPreviews').innerHTML=photoFiles.map((f,i)=>`<figure class="pv${i?'':' cover'}" data-i="${i}" title="${i?'Сделать обложкой':'Обложка дня'}"><img src="${pu(f)}" alt="Фото ${i+1}"><span class="pv-n">${String(i+1).padStart(2,'0')}</span><button type="button" class="pv-x" aria-label="Убрать фото ${i+1}">×</button></figure>`).join('')+(photoFiles.length?'<button type="button" class="pv-clear">Очистить всё</button>':'')+(photoFiles.length>1?'<p class="pv-hint">Нажми на фото, чтобы сделать его обложкой. Кадры в фильме идут в этом порядке.</p>':'');
const lab=$('#dropzone strong');if(lab)lab.textContent=photoFiles.length?`Фото: ${photoFiles.length} из ${MAXP} · добавить ещё`:'Добавить фотографии'}
$('#photos').addEventListener('change',e=>{setPhotos([...e.target.files]);e.target.value=''});
$('#photoPreviews').addEventListener('click',e=>{if(e.target.closest('.pv-clear')){photoFiles=[];renderPhotos();photosChanged();return}const fig=e.target.closest('.pv');if(!fig)return;const i=+fig.dataset.i;if(e.target.closest('.pv-x'))photoFiles.splice(i,1);else if(i)photoFiles.unshift(photoFiles.splice(i,1)[0]);else return;renderPhotos();photosChanged()});
document.addEventListener('paste',e=>{const f=[...(e.clipboardData&&e.clipboardData.files||[])];if(f.length&&$('#create').classList.contains('active'))setPhotos(f)});
const dz=$('#dropzone');dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');setPhotos([...e.dataTransfer.files])});
$('#memoryForm').addEventListener('submit',async e=>{
e.preventDefault();
let text=$('#memoryText').value.trim(),date=$('#memoryDate').value,
songTitle=$('#songTitle').value.trim(),songUrl=$('#songUrl').value.trim(),songFile=$('#songFile').files[0]||null;
if(!photoFiles.length)return toast('Добавь хотя бы одну фотографию');
if(!songFile&&!songUrl&&!songTitle)return toast('Добавь песню: ссылку, название для поиска или аудиофайл');

if(text.length<15)return toast('Расскажи о дне чуть подробнее');
const btn=$('#generateBtn');btn.disabled=true;btn.textContent='Арт-директор анализирует историю…';
try{
const D=window.AfterglowDirector;
if(!songFile&&window.AfterglowSong){btn.textContent='Ищу песню…';let f=null;try{f=await AfterglowSong.resolve(songTitle)}catch{}
if(f){if(f.file)songFile=f.file;if(!songUrl)songUrl=f.url||'';songTitle=f.title||songTitle;if(!f.file)toast('Песня найдена, но фрагмент не загрузился. Добавлена ссылка.')}else if(songTitle&&!songUrl&&!songFile){toast('Песня не найдена. Вставь ссылку на музыкальный сервис или загрузи аудиофайл.');return;}btn.textContent='Арт-директор анализирует историю…'}
const optimizedPhotos=await Promise.all(photoFiles.map(optimizeImage));
const colorsRGB=await Promise.all(optimizedPhotos.map(photoColor));
const highlightStart=await findHighlight(songFile);
const audioProfile=await D.analyzeAudio(songFile);
const creative=await D.analyze({text,songTitle,photoColors:colorsRGB,audioProfile});
const direction=D.direct(creative,colorsRGB,audioProfile,songTitle);
const mood=moods.find(x=>x.id===(direction.type==='construct'?'tense':direction.type==='nocturne'?'melancholy':'warm'))||moods[0];
const item={id:Date.now(),date,text,songTitle,songUrl,songFile,highlightStart,photos:optimizedPhotos,
title:normalizeDayTitle(creative.title||makeTitle(text,date),text),mood:mood.id,moodName:creative.label,colors:direction.colors,
style:direction.style.desc,tempo:direction.type==='construct'?'быстрый':direction.type==='nocturne'?'медленный':'плавный',
audioEnergy:audioProfile?.energy??null,audioProfile,photoColors:colorsRGB,creative,direction};item.feel=window.AfterglowMood?window.AfterglowMood.analyze(text,window.AfterglowMood.picked(),creative.axes):null;
await dbPut(item);memories.push(item);render();$('#memoryForm').reset();photoFiles=[];renderPhotos();window.AfterglowSong?.resetSelection();
showDetail(item.id);toast(creative.source==='gemini'?'Воспоминание создано с AI ✦':'Воспоминание создано локальным арт-директором ✦');
}catch(err){console.error(err);toast('Не удалось сохранить. Возможно, хранилище браузера заполнено.')}
finally{btn.disabled=false;btn.innerHTML='Создать воспоминание <span class="arrow-round">↗</span>'}
});
(async()=>{$('#today').textContent=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();$('#memoryDate').value=new Date().toLocaleDateString('en-CA');try{memories=await dbAll();render()}catch(e){console.error(e);toast('Не удалось открыть локальное хранилище')}})();
