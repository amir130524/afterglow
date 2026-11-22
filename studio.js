/* Afterglow Studio / v6 — client-side authoring, art direction, and media export.
   No external APIs or third-party trackers. Works over file:// in Chrome/Edge.
   Uploaded audio must be owned/licensed by the user. */
(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const D = window.AfterglowDirector;
  const THEMES = {
    analogue: {title:'ANALOGUE',desc:'Плёнка · свет · ностальгия',base:'#d9ad74',dark:'#251912'},
    nocturne: {title:'NOCTURNE',desc:'Тень · тишина · воздух',base:'#8aaec4',dark:'#101b2d'},
    construct: {title:'CONSTRUCT',desc:'Геометрия · импульс · контраст',base:'#f47b50',dark:'#17242e'}
  };
  let active = null;
  let liveTimer = 0;
  let exportBusy = false;
  let waveformTimer = null;
  const slug = s => String(s).normalize('NFKD').replace(/[^a-zA-Z0-9а-яёА-ЯЁ-]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'memory';
  const formatDate = value => new Date(value+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const download = (blob,name) => {
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),90000);
  };
  function manualDownload(blob,name,label){
    const url=URL.createObjectURL(blob),host=q('#studioStatus');if(!host)return;
    const link=document.createElement('a');link.href=url;link.download=name;link.textContent=label;
    link.style.cssText='display:inline-flex;margin-left:14px;padding:7px 12px;color:#162018;background:#e0edca;font-weight:bold;text-decoration:none';
    host.appendChild(link);setTimeout(()=>URL.revokeObjectURL(url),10*60*1000);
  }
  const toDataUrl = blob => new Promise((yes,no) => {const reader=new FileReader();reader.onload=()=>yes(reader.result);reader.onerror=()=>no(reader.error);reader.readAsDataURL(blob)});
  function fromDataUrl(src){
    const match=/^data:([\w/+.-]+);base64,([\s\S]+)$/i.exec(src||'');
    if(!match)throw new Error('Некорректный файл в архиве');
    const binary=atob(match[2].replace(/\s/g,''));const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:match[1]});
  }
  const any = (value, fallback) => typeof value==='string'&&value.trim()?value.trim():fallback;
  const setStatus=(txt,progress=false)=>{const el=q('#studioStatus');if(el){el.textContent=txt;el.classList.toggle('busy',progress)}};
  function improveEditor(event){
    const memory=event.detail.memory,plan=window.AfterglowCinema.makePlan(memory),editor=memory.editor||{};
    active=memory;
    attachWaveform(memory);
    q('#studioWorkbench')?.remove();
    const p=event.detail.pics;
    const styles=Object.entries(THEMES).map(([key,val])=>`<button class="studio-theme ${plan.theme===key?'selected':''}" type="button" data-studio-theme="${key}"><span class="studio-theme-mark ${key}"></span><strong>${val.title}</strong><small>${val.desc}</small></button>`).join('');
    const scenes=plan.scenes.map((s,i)=>`<article class="studio-scene" data-scene-card="${i}" data-role="${s.kind}">
      <div class="studio-scene-head"><span class="studio-pos">${String(i+1).padStart(2,'0')} / ${s.kind==='intro'?'ПРОЛОГ':s.kind==='outro'?'ЭПИЛОГ':'ГЛАВА'}</span><span>${esc(s.feeling.label)}</span></div>
      <div class="studio-scene-image"><img src="${p[s.photo]}" alt="Сцена ${i+1}"></div>
      <label>ФОТО <select data-studio-photo aria-label="Фото для сцены ${i+1}">${memory.photos.map((_,n)=>`<option value="${n}" ${n===s.photo?'selected':''}>Фотография ${n+1}</option>`).join('')}</select></label>
      <label>НАДПИСЬ <textarea rows="3" maxlength="120" data-studio-text>${esc(s.text)}</textarea></label>
      ${s.kind==='moment'?'<div class="studio-reorder"><button type="button" data-studio-move="-1" aria-label="Поменять фотографию с предыдущей">← Фото раньше</button><button type="button" data-studio-move="1" aria-label="Поменять фотографию со следующей">Фото позже →</button></div>':''}</article>`).join('');
    q('#detailContent').insertAdjacentHTML('beforeend',`
      <section class="studio-workbench" id="studioWorkbench">
        <div class="studio-header"><div><div class="eyebrow">005 / DIRECTOR'S CUT · VERSION 9</div><h2>Режиссёрская <em>монтажная.</em></h2><p>Вся история идёт последовательно, без пропусков: для длинного текста создаются дополнительные сцены. Меняй фото, короткие надписи и оформление.</p></div><span class="studio-chapter">✳ YOUR EDITION</span></div>
        <div class="studio-rail"><div class="studio-rail-label">ХУДОЖЕСТВЕННЫЙ ПОЧЕРК</div><div class="studio-theme-switch" role="group" aria-label="Визуальный стиль">${styles}</div>
          <div class="studio-settings-grid"><div class="studio-speed"><label for="studioDuration">СРЕДНЯЯ ДЛИТЕЛЬНОСТЬ СЦЕНЫ <output id="studioDurationOutput">${Math.round(plan.scenes[Math.min(1,plan.scenes.length-1)].duration/100)/10} с</output></label><input type="range" min="1800" max="8500" step="100" id="studioDuration" value="${editor.duration||plan.baseDuration}"><span>Темп из текста и музыки или задай его вручную.</span></div>
            <label class="studio-format-label" for="studioFormat">ФОРМАТ КАДРА<select id="studioFormat"><option value="16:9" ${plan.format==='16:9'?'selected':''}>16:9 · Кино</option><option value="9:16" ${plan.format==='9:16'?'selected':''}>9:16 · Stories</option><option value="1:1" ${plan.format==='1:1'?'selected':''}>1:1 · Квадрат</option></select></label>
            <label class="studio-format-label" for="studioQuality">КАЧЕСТВО ЭКСПОРТА<select id="studioQuality"><option value="hd" ${editor.quality!=='compact'?'selected':''}>HD · лучшее</option><option value="compact" ${editor.quality==='compact'?'selected':''}>Compact · быстрее</option></select></label></div></div>
        <div class="studio-rail-label">РАСКАДРОВКА / ${plan.scenes.length} СЦЕН · ${memory.photos.length} ФОТО</div><div class="studio-scene-grid" id="studioScenes">${scenes}</div>
        <div class="studio-toolbar"><div><div class="studio-toolbar-eyebrow">MAKE IT LAST</div><strong>Монтаж сохраняется локально.</strong><p>Экспорт использует тот же canvas-рендерер, что и плеер. Для музыки в WebM нужен аудиофайл.</p></div><div class="studio-buttons"><button type="button" class="studio-button studio-button-save" id="studioSave">✓ Сохранить монтаж</button><button type="button" class="studio-button" id="studioPoster">↧ Постер PNG</button><button type="button" class="studio-button" id="studioVideo">▶ Скачать WebM</button><button type="button" class="studio-button" id="studioPackage">↧ Резервная копия JSON</button></div></div>
        <div class="studio-status" id="studioStatus" role="status" aria-live="polite">Для просмотра изменённого фильма нажми «Сохранить монтаж».</div>
        <p class="studio-disclaimer">WebM записывается в реальном времени через Chrome/Edge. Не переключай вкладку до завершения. MP4 браузер напрямую не гарантирует. Данные остаются на этом устройстве, пока не скачана резервная копия.</p>
      </section>`);
    const root=q('#studioWorkbench'),grid=q('#studioScenes');
    q('#studioDuration').oninput=ev=>{ev.target.dataset.touched='1';q('#studioDurationOutput').textContent=(ev.target.value/1000).toFixed(1)+' с';};
    root.addEventListener('click',ev=>{
      const style=ev.target.closest('[data-studio-theme]');
      if(style){root.querySelectorAll('[data-studio-theme]').forEach(b=>b.classList.toggle('selected',b===style));setStatus('Стиль изменён — сохрани монтаж для просмотра.');}
      const mover=ev.target.closest('[data-studio-move]');if(!mover)return;
      const card=mover.closest('[data-scene-card]'),dir=Number(mover.dataset.studioMove);
      const sibling=dir<0?card.previousElementSibling:card.nextElementSibling;
      if(sibling?.dataset.role!=='moment')return;
      // Rearrange photographs ONLY. The story/caption sequence remains chronological.
      const here=card.querySelector('[data-studio-photo]'),there=sibling.querySelector('[data-studio-photo]');
      const old=here.value;here.value=there.value;there.value=old;
      card.querySelector('img').src=p[Number(here.value)];
      sibling.querySelector('img').src=p[Number(there.value)];
      setStatus('Фотографии поменялись местами; хронология текста сохранена. Сохрани монтаж.');
    });
    grid.addEventListener('change',ev=>{
      const select=ev.target.closest('[data-studio-photo]');
      if(select)select.closest('.studio-scene').querySelector('img').src=p[Number(select.value)];
    });
    function renumber(){[...grid.children].forEach((card,i)=>{card.querySelector('.studio-pos').textContent=String(i+1).padStart(2,'0')+' / '+(card.dataset.role==='intro'?'ПРОЛОГ':card.dataset.role==='outro'?'ЭПИЛОГ':'ГЛАВА');});}
    async function saveEdits(reopen){
      if(exportBusy)return null;
      const cards=[...grid.querySelectorAll('[data-scene-card]')];
      const scenePhoto=cards.map(card=>Number(card.querySelector('[data-studio-photo]').value));
      const order=scenePhoto.slice(1,-1);
      const validOrder=new Set(order).size===memory.photos.length&&order.length===memory.photos.length;
      const newEditor={...memory.editor,theme:root.querySelector('.studio-theme.selected')?.dataset.studioTheme||plan.theme,
        duration:(q('#studioDuration').dataset.touched==='1'||editor.duration)?Number(q('#studioDuration').value):null,format:q('#studioFormat').value,quality:q('#studioQuality').value,
        captionVersion:2,
        text:cards.map(card=>card.querySelector('[data-studio-text]').value.trim()),photo:scenePhoto};
      if(validOrder)newEditor.order=order;
      else delete newEditor.order;
      memory.editor=newEditor;await dbPut(memory);
      setStatus('Монтаж сохранён ✓');
      if(reopen){showDetail(memory.id);q('#film').scrollIntoView({behavior:'smooth',block:'center'});}return memory;
    }
    q('#studioSave').onclick=async()=>{try{await saveEdits(true);}catch(err){console.error(err);setStatus('Не удалось сохранить: '+err.message);}};
    q('#studioPoster').onclick=async()=>{try{const m=await saveEdits(false);if(m){setStatus('Готовлю постер…',true);await renderPoster(m);setStatus('Постер PNG готов ✓');}}catch(err){console.error(err);setStatus('Ошибка постера: '+err.message);}};
    q('#studioVideo').onclick=async()=>{try{const m=await saveEdits(false);if(m)await renderVideo(m);}catch(err){console.error(err);setStatus('Ошибка видео: '+err.message);}finally{exportBusy=false;q('#studioVideo').disabled=false;}};
    q('#studioPackage').onclick=async()=>{try{const m=await saveEdits(false);if(m)await exportMemory(m);}catch(err){console.error(err);setStatus('Ошибка резервной копии: '+err.message);}};
  }
  function attachWaveform(memory){
    if(waveformTimer)clearInterval(waveformTimer);
    const controls=q('.film-controls');if(!controls)return;
    const wave=document.createElement('span');wave.className='film-waveform';wave.setAttribute('aria-label','Визуализация ритма');
    wave.innerHTML=Array.from({length:30},()=>'<i></i>').join('');
    controls.insertBefore(wave,controls.querySelector('.film-song'));
    const bars=Array.from(wave.querySelectorAll('i'));
    const env=memory.audioProfile?.envelope;
    function step(){
      if(!document.contains(wave)){clearInterval(waveformTimer);waveformTimer=null;return}
      const time=(typeof filmAudio!=='undefined'&&filmAudio?.currentTime)||performance.now()/1100;
      const length=typeof filmAudio!=='undefined'&&filmAudio?.duration||memory.audioProfile?.duration||24;
      const root=env?.length?Math.floor((time%Math.max(1,length))/Math.max(1,length)*env.length):Math.floor(time*7);
      bars.forEach((bar,i)=>{
        const value=env?.length?env[(root+i*2)%env.length]:(.28+.17*Math.sin(i*.45+time*.9));
        const height=Math.round(14+clamp(value,0,1)*78 + 6*Math.sin(i*.81+time*2));
        bar.style.height=clamp(height,10,92)+'%';
        bar.style.opacity=String(.5+.4*clamp(value,0,1));
      });
    }
    step();waveformTimer=setInterval(step,120);
  }
  function getComposer(){
    const host=q('.preview-art');if(!host)return;
    host.insertAdjacentHTML('afterend',`<section class="live-lab" aria-label="Анализ атмосферы"><div class="live-lab-top"><span>◈ MOOD ENGINE / LIVE</span><span id="liveTheme">ANALOGUE</span></div><div class="live-lab-stage" id="liveStage"><div class="live-orbit orbit-one"></div><div class="live-orbit orbit-two"></div><div class="live-lab-caption"><small>YOUR DAY / BEFORE IT BECOMES A FILM</small><strong id="liveTitle">Здесь появится настроение твоего дня</strong></div></div><div class="live-swatches" id="liveSwatches"></div><div class="live-lab-bars" id="liveBars"></div><p class="live-lab-reason" id="liveReason">Напиши первые строки, чтобы увидеть, какие эмоции, цвета и ритм система извлекает из истории.</p></section>`);
    const text=q('#memoryText'),song=q('#songTitle');
    [text,song].forEach(el=>el.addEventListener('input',()=>{clearTimeout(liveTimer);liveTimer=setTimeout(updateLab,150)}));
    q('#photos').addEventListener('change',()=>setTimeout(updateLab,250));document.addEventListener('afterglow:photos',()=>setTimeout(updateLab,50));
    q('#songFile').addEventListener('change',()=>{q('#liveReason').textContent='Аудио будет проанализировано при создании воспоминания: энергия и изменения громкости влияют на движение.'});
    document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>setTimeout(updateLab,100)));
    updateLab();
  }
  async function updateLab(){
    const text=q('#memoryText')?.value||'',song=q('#songTitle')?.value||'';
    const profile=D.profileFor(text,song),theme=THEMES[profile.theme];
    q('#liveTheme').textContent=theme.title;
    q('#liveStage').style.setProperty('--lab-accent',theme.base);
    q('#liveStage').style.setProperty('--lab-deep',theme.dark);
    q('#liveTitle').textContent=text.length>20?makeTitle(text,q('#memoryDate').value):'Напиши о дне — он оживёт здесь';
    const axes=[['Тепло','warmth'],['Ностальгия','nostalgia'],['Энергия','energy'],['Напряжение','tension']];
    q('#liveBars').innerHTML=axes.map(([label,k])=>`<div class="live-axis"><span>${label}</span><i><b style="width:${Math.round((profile.axes[k]||0)*100)}%"></b></i><small>${Math.round((profile.axes[k]||0)*100)}%</small></div>`).join('');
    q('#liveReason').textContent=profile.reason+' · Предварительная оценка по тексту и названию песни; фото и аудиофайл дополнительно влияют на итоговый кадр.';
    let colors=theme.base+' '+theme.dark;
    let rgb=null;if(typeof photoFiles!=='undefined'&&photoFiles[0]){try{rgb=await photoColor(photoFiles[0])}catch{}}
    const photo=rgb?'rgb('+rgb.join(',')+')':theme.base;
    const swatch=q('#liveSwatches');if(swatch)swatch.innerHTML=`<span style="--swatch:${theme.base}">ЭМОЦИЯ</span><span style="--swatch:${photo}">ФОТО</span><span style="--swatch:${theme.dark}">ТЕНЬ</span>`;
  }
  function createArchiveControls(){
    const target=q('#archiveCards');if(!target || q('#studioArchiveTools'))return;
    target.insertAdjacentHTML('beforebegin',`<div id="studioArchiveTools" class="archive-tools"><label><span>⌕</span><input type="search" id="archiveSearch" placeholder="Поиск по воспоминаниям…" aria-label="Поиск по воспоминаниям"></label><div class="archive-filters" role="group" aria-label="Фильтр художественных стилей"><button type="button" class="chosen" data-archive-filter="all">Все дни</button><button type="button" data-archive-filter="analogue">Тёплые</button><button type="button" data-archive-filter="nocturne">Тихие</button><button type="button" data-archive-filter="construct">Энергичные</button></div><button type="button" class="archive-import" id="archiveImport">＋ Импортировать день</button><input type="file" id="archiveImportFile" accept=".json,application/json" hidden></div><div id="archiveFilteredEmpty" class="archive-filter-empty" hidden>По этому запросу воспоминаний не найдено.</div>`);
    const bar=q('#studioArchiveTools');
    bar.addEventListener('input',filterArchive);
    bar.addEventListener('click',ev=>{const btn=ev.target.closest('[data-archive-filter]');if(btn){bar.querySelectorAll('[data-archive-filter]').forEach(el=>el.classList.toggle('chosen',el===btn));filterArchive()}});
    q('#archiveImport').onclick=()=>q('#archiveImportFile').click();
    q('#archiveImportFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100*1024*1024)throw new Error('Файл слишком большой (максимум 100 МБ)');const record=JSON.parse(await file.text());if(record.format!=='afterglow-day' || record.version!==1 || !record.memory || !Array.isArray(record.photos))throw new Error('Это не файл Afterglow');const data=record.memory;if(typeof data.text!=='string'||data.text.length<15||typeof data.date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(data.date)||record.photos.length===0||record.photos.length>12)throw new Error('В файле неполные данные');const photos=record.photos.map((src,i)=>{const blob=fromDataUrl(src);if(!blob.type.startsWith('image/')||blob.size>12*1024*1024)throw new Error('Некорректное изображение');return blob});let songFile=null;if(record.audio){songFile=fromDataUrl(record.audio);if(!songFile.type.startsWith('audio/')||songFile.size>35*1024*1024)throw new Error('Некорректный аудиофайл')};const id=Date.now()+Math.floor(Math.random()*10000);const item={...data,id,photos,songFile,title:any(data.title,'Без названия'),text:data.text.slice(0,15000),date:data.date};await dbPut(item);memories.push(item);render();toast('Воспоминание импортировано');q('#archiveImportFile').value=''}catch(err){toast('Ошибка импорта: '+err.message)}};
    filterArchive();
  }
  function filterArchive(){
    const query=(q('#archiveSearch')?.value||'').toLocaleLowerCase('ru');const filter=q('.archive-filters .chosen')?.dataset.archiveFilter||'all';
    let shown=0;
    q('#archiveCards')?.querySelectorAll('.card').forEach(el=>{const m=memories.find(x=>Number(x.id)===Number(el.dataset.id));if(!m)return;const theme=m.editor?.theme||m.direction?.type||m.creative?.theme||'analogue';const okay=(filter==='all'||theme===filter)&&`${m.title} ${m.text} ${m.songTitle||''}`.toLocaleLowerCase('ru').includes(query);el.hidden=!okay;if(okay)shown++});
    const empty=q('#archiveFilteredEmpty');if(empty)empty.hidden=shown!==0||memories.length===0;
  }
  function patchArchive(){createArchiveControls();filterArchive()}
  async function renderPoster(memory){
    const C=window.AfterglowCinema,plan=C.makePlan(memory),imgs=await C.loadImages(memory);
    try{
      const can=document.createElement('canvas');can.width=1200;can.height=1500;
      const poster={...plan,format:'9:16'};C.drawFrame(can.getContext('2d',{alpha:false}),imgs,poster,memory,Math.min(1,plan.scenes.length-1),.40);
      const blob=await new Promise(res=>can.toBlob(res,'image/png'));
      if(!blob)throw Error('PNG не удалось создать');download(blob,'afterglow-v9-poster-'+slug(memory.title)+'.png');
    }finally{imgs.forEach(x=>x.close());}
  }
  async function renderVideo(memory){
    if(exportBusy)return;exportBusy=true;
    const button=q('#studioVideo');button.disabled=true;
    try {
    if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)throw Error('Для WebM нужен Chrome или Edge');
    const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));
    if(!mime)throw Error('В браузере отсутствует запись WebM');
    const C=window.AfterglowCinema,plan=C.makePlan(memory),imgs=await C.loadImages(memory);
    let audioCtx=null,source=null,recorder=null,stream=null,raf=0;
    try{
      const canvas=document.createElement('canvas');
      [canvas.width,canvas.height]=C.dimensions(plan.format,memory.editor?.quality||'hd');
      const ctx=canvas.getContext('2d',{alpha:false});
      stream=canvas.captureStream(24);
      let hasSound=false;
      if(memory.songFile){
        try{
          audioCtx=new (window.AudioContext||window.webkitAudioContext)();
          const sound=await audioCtx.decodeAudioData(await memory.songFile.arrayBuffer());
          source=audioCtx.createBufferSource();source.buffer=sound;source.loop=true;
          const gain=audioCtx.createGain();gain.gain.value=.74;
          const dest=audioCtx.createMediaStreamDestination();source.connect(gain);gain.connect(dest);
          for(const track of dest.stream.getAudioTracks())stream.addTrack(track);
          await audioCtx.resume();hasSound=true;
        }catch(e){console.warn('Audio not included',e);setStatus('Аудио не декодировалось. Видео будет без звука.');source=null;await audioCtx?.close().catch(()=>{});audioCtx=null;}
      }
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:memory.editor?.quality==='compact'?2100000:4800000});
      const chunks=[];let recordError=null;
      const finished=new Promise((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onerror=e=>{recordError=e.error||Error('Ошибка записи видео');};
        recorder.onstop=()=>recordError?reject(recordError):resolve(new Blob(chunks,{type:'video/webm'}));
      });
      C.drawFrame(ctx,imgs,plan,memory,0,0);recorder.start(900);if(source)source.start(0,Math.min(memory.highlightStart||0,Math.max(0,source.buffer.duration-1)));
      const began=performance.now();
      await new Promise(resolve=>{
        const tick=now=>{
          const elapsed=Math.min(plan.duration,Math.max(0,now-began));
          const pos=C.locate(plan,elapsed);
          C.drawFrame(ctx,imgs,plan,memory,pos.index,pos.progress);
          setStatus(`Экспорт ${Math.floor(elapsed/plan.duration*100)}% · ${plan.scenes.length} сцен · не закрывай вкладку`,true);
          if(elapsed>=plan.duration)resolve();else raf=requestAnimationFrame(tick);
        };raf=requestAnimationFrame(tick);
      });
      if(recorder.state==='recording')recorder.stop();
      const blob=await finished;
      if(!blob.size)throw Error('Файл получился пустым');
      const filename='afterglow-v9-'+plan.format.replace(':','x')+'-'+slug(memory.title)+'.webm';
      download(blob,filename);manualDownload(blob,filename,'↓ Скачать повторно');
      setStatus(`Видео готово ✓ ${(blob.size/1024/1024).toFixed(1)} МБ · ${plan.scenes.length} сцен${hasSound?' · со звуком':' · без звука'}`);
    }finally{
      cancelAnimationFrame(raf);
      if(recorder?.state==='recording')try{recorder.stop();}catch{}
      if(source)try{source.stop();}catch{}
      if(audioCtx)await audioCtx.close().catch(()=>{});
      if(stream)stream.getTracks().forEach(track=>track.stop());
      imgs.forEach(img=>img.close());
    }
    } finally { exportBusy=false;button.disabled=false; }
  }
  async function exportMemory(m){
    setStatus('Упаковываю день…',true);
    const {photos,songFile,...meta}=m;
    const data={format:'afterglow-day',version:1,memory:meta,photos:await Promise.all(photos.map(toDataUrl)),audio:songFile?await toDataUrl(songFile):null};
    download(new Blob([JSON.stringify(data)],{type:'application/json'}),'afterglow-day-'+slug(m.title)+'.json');
    setStatus('Файл воспоминания готов ✓ Его можно импортировать в другой браузер.');
  }
  document.addEventListener('DOMContentLoaded',()=>{getComposer();createArchiveControls()});
  window.addEventListener('afterglow:detail',improveEditor);
  window.AfterglowStudio={enhanceArchive:patchArchive};
})();
