/* mood.js — глубокое настроение: спектр из 8 оттенков, дуга дня, сверка «чувствовал / прочитано» */
(()=>{
const $=s=>document.querySelector(s),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const MOODS=[
{id:'tender',n:'Нежность',g:0,adj:['нежная','нежный','нежное'],c:'#f2b8a0',d:'близость, забота, мягкий свет'},
{id:'joy',n:'Радость',g:0,adj:['радостная','радостный','радостное'],c:'#f7d56a',d:'лёгкость, смех, солнечный ритм'},
{id:'nost',n:'Ностальгия',g:0,adj:['ностальгическая','ностальгический','ностальгическое'],c:'#d9a56b',d:'узнавание прошлого в настоящем'},
{id:'sad',n:'Тоска',g:0,adj:['грустная','грустный','грустное'],c:'#8fa3d6',d:'пустота, дождь, невысказанное'},
{id:'anx',n:'Тревога',g:0,adj:['тревожная','тревожный','тревожное'],c:'#e0705f',d:'спешка, ожидание, внутреннее напряжение'},
{id:'calm',n:'Покой',g:1,adj:['тихая','тихий','тихое'],c:'#8fd0c0',d:'тишина, воздух, неспешность'},
{id:'drive',n:'Азарт',g:1,adj:['азартная','азартный','азартное'],c:'#c7e66a',d:'скорость, интерес, желание двигаться'},
{id:'spark',n:'Вдохновение',g:2,adj:['вдохновенная','вдохновенный','вдохновенное'],c:'#c9a0f0',d:'смысл, идея, чувство, что ты на своём месте'}];
const LEX={tender:/обним|любим|нежн|забот|рядом|вместе|тепл|уют|друз|девушк|семь|мам|бабуш/g,joy:/смея|радост|счаст|весел|солн|улыб|праздн|ура|круто|лето/g,nost:/вспомин|детств|старый|старая|давно|ностальг|осен|фото|когда-то/g,sad:/груст|скуч|один|одинок|пуст|тоск|прощ|плак|дожд|расстав/g,anx:/страх|тревог|дедлайн|сроч|экзамен|нервн|стресс|паник|успеть|боял/g,calm:/тихо|спокой|тишин|медлен|не спеша|чай|какао|окно|умиротвор|неспешно/g,drive:/быстр|гонк|драйв|концерт|танц|энерг|соревнов|побед|олимпиад|скорост/g,spark:/идея|придума|создал|проект|получилось|горд|вдохнов|понял|открыл|смысл/g};
const sc=(x,text)=>{const a=k=>x&&x[k]!=null?x[k]:.32,t=text.toLowerCase(),c=id=>Math.min(3,(t.match(LEX[id])||[]).length)*.17;
return{tender:.45*a('warmth')+.25*a('calm')+c('tender'),joy:.4*a('warmth')+.45*a('energy')-.25*a('melancholy')+c('joy'),nost:.9*a('nostalgia')+c('nost'),sad:.9*a('melancholy')+c('sad'),anx:.85*a('tension')+c('anx'),calm:.9*a('calm')+c('calm'),drive:.65*a('energy')+.25*a('tension')+c('drive'),spark:.25*a('energy')+.25*a('warmth')+c('spark')+.1}};
const B=sc({warmth:.32,nostalgia:.32,energy:.32,tension:.32,melancholy:.32,calm:.32},'');
const D=()=>window.AfterglowDirector;
const by=id=>MOODS.find(m=>m.id===id);
function chunks(text){let p=(text.match(/[^.!?\n]+[.!?]?/g)||[]).map(s=>s.trim()).filter(s=>s.length>8);
 if(p.length<3){const w=text.split(/\s+/),k=Math.max(1,Math.ceil(w.length/6));p=[];for(let i=0;i<w.length;i+=k)p.push(w.slice(i,i+k).join(' '))}
 while(p.length>8){const m=[];for(let i=0;i<p.length;i+=2)m.push(p[i]+' '+(p[i+1]||''));p=m}return p}
function analyze(text,picked=[],axes){
 const raw=sc(axes,text);picked.forEach(id=>{if(raw[id]!=null)raw[id]+=.45});
 const spec={};MOODS.forEach(m=>spec[m.id]=Math.round((1-Math.exp(-1.7*Math.max(0,(raw[m.id]-B[m.id])/.85)))*100)/100);
 const order=[...MOODS].sort((a,b)=>spec[b.id]-spec[a.id]);
 let dom=order[0],sec=spec[order[1].id]>=.25?order[1]:null,flat=spec[dom.id]<.1;if(flat){dom=by('calm');sec=null}
 const top=order.slice(0,3).map(m=>m.id),contrast=top.some(i=>['tender','joy','spark'].includes(i)&&spec[i]>=.3)&&top.some(i=>['sad','anx'].includes(i)&&spec[i]>=.3);
 let name=flat?'ровный, тихий день':sec?sec.adj[dom.g||0]+' '+dom.n.toLowerCase():dom.n;name=name[0].toUpperCase()+name.slice(1);
 const ch=chunks(text),per=ch.map(s=>{const p=D()?D().profileFor(s,'').axes:null,x=sc(p,s);return{x,v:clamp(.5+((x.tender-B.tender)+(x.joy-B.joy)+(x.spark-B.spark)+.5*(x.drive-B.drive)+.3*(x.calm-B.calm)-(x.sad-B.sad)-(x.anx-B.anx))*.9)}});
 const arc=per.map(p=>Math.round(p.v*100)/100);if(arc.length<2)arc.push(arc[0]||.5);
 const parts=[0,1,2].map(k=>{const s=per.slice(Math.floor(k*per.length/3),Math.max(Math.floor(k*per.length/3)+1,Math.floor((k+1)*per.length/3)));
  const sum={};MOODS.forEach(m=>sum[m.id]=s.reduce((a,p)=>a+p.x[m.id]-B[m.id],0));return MOODS.slice().sort((a,b)=>sum[b.id]-sum[a.id])[0].id});
 return{spec,dom:dom.id,sec:sec&&sec.id,name,contrast,flat,picked:[...picked],color:dom.c,color2:(sec||order[1]).c,intensity:Math.round((spec[order[0].id]+spec[order[1].id])/2*100),arc,parts}}
function panel(f){
 const dom=by(f.dom),rows=MOODS.slice().sort((a,b)=>f.spec[b.id]-f.spec[a.id]).map(m=>`<div class="md-row"><span>${m.n}</span><i><b style="width:${Math.round(f.spec[m.id]*100)}%;background:${m.c}"></b></i><small>${Math.round(f.spec[m.id]*100)}%</small></div>`).join('');
 const n=f.arc.length,pts=f.arc.map((v,i)=>[i*320/(n-1),82-v*70]),line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const svg=`<svg viewBox="0 0 320 96" class="md-svg" role="img" aria-label="Эмоциональная дуга дня"><defs><linearGradient id="mdg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${f.color}" stop-opacity=".45"/><stop offset="1" stop-color="${f.color}" stop-opacity="0"/></linearGradient></defs><path d="${line} L320 96 L0 96Z" fill="url(#mdg)"/><path d="${line}" fill="none" stroke="${f.color}" stroke-width="2"/>${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${f.color}"/>`).join('')}</svg>`;
 let cmp='';if(f.picked.length){const hit=f.picked.includes(f.dom)||f.picked.includes(f.sec);cmp=`<p class="md-cmp"><b>Ты отметил:</b> ${f.picked.map(id=>by(id).n).join(', ')}. ${hit?'Это совпало с тем, что слышно в тексте.':'В тексте громче звучит «'+dom.n+'». Слова и ощущения не обязаны совпадать, поэтому дневник хранит и то и другое.'}</p>`}
 return`<section class="mood-deep" style="--mc:${f.color}"><div class="eyebrow">ГЛУБИНА НАСТРОЕНИЯ / НАСЫЩЕННОСТЬ ${f.intensity}%</div><h2>${f.name}</h2><p class="md-sub">${f.flat?'Спокойный день без ярких пиков.':dom.d[0].toUpperCase()+dom.d.slice(1)+(f.sec?'. С оттенком: '+by(f.sec).d:'')+'.'}</p>${f.contrast?'<p class="md-note">◈ Двойственное настроение: свет и грусть рядом. Так выглядят горько-сладкие дни.</p>':''}<div class="md-grid"><div><div class="md-cap">СПЕКТР ДНЯ</div>${rows}</div><div><div class="md-cap">ДУГА ДНЯ: СВЕТЛЕЕ ↑ / ТЕМНЕЕ ↓</div>${svg}<div class="md-parts"><span>Начало<b>${by(f.parts[0]).n}</b></span><span>Середина<b>${by(f.parts[1]).n}</b></span><span>Финал<b>${by(f.parts[2]).n}</b></span></div></div></div>${cmp}<p class="md-foot">Это художественная интерпретация слов, а не психологическая диагностика.</p></section>`}
window.addEventListener('afterglow:detail',e=>{const {memory:m,creative,director}=e.detail,host=$('#detailContent .film-after');if(!host)return;
 const f=m.feel||analyze(m.text,[],(creative&&creative.axes)||(director&&director.axes));host.insertAdjacentHTML('afterend',panel(f));
 window.dispatchEvent(new CustomEvent('afterglow:mood',{detail:{colors:[f.color,f.color2]}}))});
let picked=[];
const sync=()=>document.querySelectorAll('.fc').forEach(b=>b.classList.toggle('on',picked.includes(b.dataset.id)));
function live(){const t=($('#memoryText').value||'').trim(),el=$('#feelLive');if(!el)return;
 if(t.length<15&&!picked.length){el.textContent='Напиши пару предложений и отметь оттенки: здесь появится настроение дня.';return}
 const f=analyze(t,picked,D()?D().profileFor(t,'').axes:null);el.innerHTML='Сейчас слышно: <b>'+f.name+'</b>'+(f.contrast?' · двойственное настроение':'');
 window.dispatchEvent(new CustomEvent('afterglow:mood',{detail:{colors:[f.color,f.color2]}}))}
function pick(id){picked=picked.includes(id)?picked.filter(x=>x!==id):[...picked,id].slice(-3);sync();live()}
const row=$('.preset-row');if(row){const box=document.createElement('div');box.className='feel';
 box.innerHTML='<label class="field-label">КАК ТЫ САМ ЭТО ЧУВСТВОВАЛ <span style="opacity:.6">(до 3 оттенков)</span></label><div class="feel-chips">'+MOODS.map(m=>`<button type="button" class="fc" data-id="${m.id}" style="--c:${m.c}" title="${m.d}">${m.n}</button>`).join('')+'</div><div class="feel-live" id="feelLive"></div>';row.after(box);
 box.addEventListener('click',e=>{const b=e.target.closest('.fc');if(b)pick(b.dataset.id)});
 $('#memoryText').addEventListener('input',live);row.addEventListener('click',()=>setTimeout(live,60));
 $('#memoryForm').addEventListener('reset',()=>setTimeout(()=>{picked=[];sync();live()},0));live()}
window.AfterglowMood={MOODS,analyze,pick,picked:()=>[...picked]};
})();
