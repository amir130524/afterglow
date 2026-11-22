/* Afterglow v9.1 — multi-region Apple Music catalogue search.
   Apple/iTunes does not index every song. Search results are previews only,
   not full licensed tracks. Audio files can always be uploaded manually. */
(()=>{
'use strict';
const input=document.querySelector('#songTitle');if(!input)return;
let list=[],picked=null,timer=0,seq=0,previewAudio=null;
const box=document.createElement('div');box.className='song-results';box.hidden=true;input.after(box);
const card=document.createElement('div');card.className='song-pick';card.hidden=true;box.after(card);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[‐‑–—−]/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=s=>norm(s).split(/\s+/).filter(Boolean);
const clean=s=>String(s||'').replace(/\s*[—–-]\s*/g,' ').replace(/\s*\([^)]*(official|lyrics|video|audio)[^)]*\)/ig,' ').trim();
function score(x,q){
 const query=norm(q),all=norm(x.artistName+' '+x.trackName),title=norm(x.trackName);
 const ts=tokens(q),hits=ts.filter(t=>all.includes(t)).length;
 let points=ts.length?hits/ts.length*100:0;
 if(title===query)points+=70;
 if(all===query||norm(x.trackName+' '+x.artistName)===query)points+=90;
 if(title.includes(query)&&query.length>3)points+=30;
 if(x.previewUrl)points+=3;
 return points;
}
async function get(q,country,signal){
 const params=new URLSearchParams({term:q,country,media:'music',entity:'song',limit:'50'});
 // Same-origin proxy: works from bundled Python server or Vercel even when browser CORS fails.
 if(location.protocol==='http:'||location.protocol==='https:'){
   const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),6500);
   try {
     const r=await fetch('/api/music?'+new URLSearchParams({q,country}),{signal:controller.signal});
     if(r.ok){const data=await r.json();return {items:data.results||[],ok:true};}
   }catch{}finally{clearTimeout(timeout);}
 }
 // Static-host/file fallback: direct iTunes fetch, then JSONP (if provider permits).
 const url='https://itunes.apple.com/search?'+params;
 try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
   try{const r=await fetch(url,{signal:controller.signal});if(r.ok){const d=await r.json();return {items:d.results||[],ok:true};}}finally{clearTimeout(timer);}
 }catch{}
 return await new Promise(resolve=>{
   const id='afterglowMusicCB'+Math.random().toString(36).slice(2);
   const script=document.createElement('script');let ended=false;
   const finish=(items,ok)=>{if(ended)return;ended=true;clearTimeout(timer);script.remove();delete window[id];resolve({items,ok});};
   const timer=setTimeout(()=>finish([],false),5000);
   window[id]=data=>finish(Array.isArray(data?.results)?data.results:[],true);
   script.onerror=()=>finish([],false);
   script.src=url+'&callback='+id;
   document.head.append(script);
   signal?.addEventListener('abort',()=>finish([],false),{once:true});
 });
}
async function search(q,signal){
 const regions=['US','JP','KZ'];
 let all=[],connected=false;
 const batches=await Promise.all(regions.map(c=>get(q,c,signal)));
 for(const b of batches){all.push(...b.items);connected ||= b.ok;}
 const normalizedQuery=clean(q);
 if(!all.length&&normalizedQuery!==q){const b=await get(normalizedQuery,'US',signal);all.push(...b.items);connected ||= b.ok;}
 if(!all.length&&q.includes(' ')){
   const terms=q.split(/\s+/);
   const b=await get(terms.slice(-2).join(' '),'US',signal);all.push(...b.items);connected ||= b.ok;
 }
 const seen=new Set();
 const results=all.filter(x=>{
   const id=norm(x.artistName+'|'+x.trackName);
   if(!x.trackName||seen.has(id))return false;
   seen.add(id);return true;
 }).map(x=>({title:x.trackName,artist:x.artistName,art:(x.artworkUrl100||'').replace('100x100','200x200'),preview:x.previewUrl||'',url:x.trackViewUrl||'',label:x.artistName+' — '+x.trackName,rank:score(x,q)}))
 .sort((a,b)=>b.rank-a.rank).slice(0,15);
 // Keep a permissive match fallback for alternate script spellings and transliteration.
 return {results:results.filter(x=>x.rank>=15).length?results.filter(x=>x.rank>=15):results.slice(0,8),connected};
}
function note(t){box.textContent='';const el=document.createElement('div');el.className='sr-note';el.textContent=t;box.append(el);box.hidden=false;}
function show(){box.innerHTML=list.map((s,i)=>`<div class="sr" data-i="${i}" tabindex="0" role="option"><img src="${esc(s.art)}" alt="" referrerpolicy="no-referrer"><span><b>${esc(s.title)}</b><small>${esc(s.artist)}</small></span>${s.preview?`<button type="button" class="sr-play" data-i="${i}" aria-label="Послушать фрагмент">▶</button>`:'<small>Без превью</small>'}</div>`).join('');box.hidden=!list.length;}
function choose(i){const item=list[i];if(!item)return;stopAudio();picked=item;input.value=item.label;clearTimeout(timer);seq++;box.hidden=true;
 card.innerHTML=`<img src="${esc(item.art)}" alt=""><div><small>ПЕСНЯ НАЙДЕНА</small><b>${esc(item.label)}</b><small>${item.preview?'Доступен фрагмент до 30 секунд':'Только информация о песне — загрузи аудиофайл для звука'}</small></div><button type="button" class="sp-x" aria-label="Убрать песню">×</button>`;card.hidden=false;
}
function stopAudio(){if(previewAudio){previewAudio.pause();previewAudio.src='';previewAudio=null;}}
input.addEventListener('input',()=>{
 picked=null;card.hidden=true;clearTimeout(timer);const q=input.value.trim();if(q.length<2){box.hidden=true;seq++;return;}
 const my=++seq;note('Ищем в музыкальном каталоге…');
 timer=setTimeout(async()=>{const result=await search(q);if(my!==seq)return;list=result.results;list.length?show():note(result.connected?'В каталоге Apple Music совпадений нет. Можно загрузить свой аудиофайл ниже.':'Не удалось подключиться к музыкальному каталогу. Проверь интернет или загрузи свой MP3/WAV ниже.');},450);
});
box.addEventListener('click',e=>{const row=e.target.closest('.sr');if(!row)return;const i=Number(row.dataset.i);if(e.target.closest('.sr-play')){stopAudio();previewAudio=new Audio(list[i].preview);previewAudio.play().catch(()=>note('Браузер не разрешил воспроизвести этот фрагмент.'));return;}choose(i);});
box.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('.sr')){e.preventDefault();choose(Number(e.target.closest('.sr').dataset.i));}});
card.addEventListener('click',e=>{if(e.target.closest('.sp-x')){picked=null;card.hidden=true;input.value='';input.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.song-results')&&e.target!==input)box.hidden=true;});
async function resolve(title){
 let tr=picked;if(!tr&&title?.trim().length>=2){const found=await search(title.trim());tr=found.results.find(x=>x.rank>=55)||null;}
 if(!tr)return null;
 const out={title:tr.label,url:tr.url};
 if(tr.preview){try{const r=await fetch(tr.preview);if(r.ok){const b=await r.blob();out.file=new File([b],tr.label.replace(/[\\/:*?"<>|]/g,'')+'.m4a',{type:b.type||'audio/mp4'});}}catch{}}
 return out;
}
function resetSelection(){picked=null;list=[];clearTimeout(timer);seq++;stopAudio();box.hidden=true;card.hidden=true;}
window.AfterglowSong={resolve,resetSelection,get picked(){return picked},search};
})();
