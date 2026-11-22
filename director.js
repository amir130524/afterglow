/* Afterglow Visual Director — original, deterministic art system with optional AI.
   All analyses describe the artistic treatment, not the user's mental health. */
(function(global){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
  const lex={
    warmth:[/тепл|уют|какао|кофе|чай|обним|друж|друз|близк|семь|солн|любим|смех|смеял|вместе|cozy|warm|friend|love|cocoa|family/g,
      /холод|ледян|замерз|пусто|ссор|страх|cold|alone/g],
    nostalgia:[/вспомин|скуча|ностальг|когда-то|прошл|детств|раньше|не забы|памят|через год|останет|дольше|навсегда|прощ|nostalg|remember|miss|last time/g, /впервые|впереди|завтра|новый|начал/g],
    energy:[/танц|бежа|бегал|праздник|вечерин|концерт|кричал|прыгал|успел|побед|срочн|дедлайн|сдача|скорост|драйв|метал|fast|dance|concert|deadline|party|excited/g, /тихо|медлен|расслаб|не спеша|спокой|тишин|лежал|slow|quiet/g],
    tension:[/тревог|нерв|волнов|экзамен|олимпиад|дедлайн|сдач|напряж|стресс|бессон|страшн|сложн|не успев|ошиб|deadline|exam|stress|panic|pressure/g, /беззабот|расслаб|отдохн|спокой|умиротвор|отпуск/g],
    melancholy:[/груст|печал|слёз|слез|плак|разлук|прощ|одиноко|тоск|скучал|пусто|тише|меланхол|дождь|серый|sad|lonely|goodbye|melancholy|rain/g,/счастли|восторг|радост|весёл|весел|побед|celebrat|happy/g],
    calm:[/тихо|спокой|тишин|не спеша|бесед|разговаривал|наблюдал|смотрел|дожд|вечер|море|природ|сидел|окно|умиротвор|quiet|calm|rain|ambient|piano/g,/паник|шум|суматох|хаос|гонк|кричал/g]
  };
  const profileFor=(text,song='')=>{
    const all=(text+' '+song).toLowerCase();const out={};
    Object.entries(lex).forEach(([name,[pos,neg]])=>{
      const p=(all.match(pos)||[]).length,n=(all.match(neg)||[]).length;
      out[name]=clamp(.32 + Math.min(5,p)*.135-Math.min(4,n)*.09);
    });
    const hints={
      night:/ноч|темнот|полноч|ночью|неон|midnight|night/.test(all),
      rain:/дожд|мокр|капл|луж|rain|storm/.test(all),
      autumn:/осен|листь|жёлт|желт|autumn|fall/.test(all),
      summer:/лето|летн|пляж|солнц|море|summer|beach/.test(all),
      city:/город|улиц|фонар|переход|метро|машин|city|street/.test(all),
      work:/учеб|задач|алгоритм|олимпиад|экзамен|проект|работ|дедлайн|exam|code|project/.test(all)
    };
    // Context beats one-token sentiment: bittersweet days may remain warm and nostalgic.
    const contrast=out.warmth>.47&&out.melancholy>.40;
    const theme=(out.tension>.48 || (out.energy>.66&&out.calm<.50))?'construct':
                (out.melancholy>.55 && out.warmth<.51 || hints.night&&out.warmth<.42)?'nocturne':'analogue';
    const label=contrast?'Тёплая меланхолия':theme==='construct'?'Напряжённый ритм':theme==='nocturne'?'Тихий нуар':'Светлая ностальгия';
    const reasons=[];
    if(hints.rain)reasons.push('В тексте есть дождь и отражения');
    if(hints.night)reasons.push('Упоминается ночной свет');
    if(hints.work)reasons.push('Есть мотив работы или преодоления');
    if(out.warmth>.53)reasons.push('Люди и детали создают ощущение тепла');
    if(out.nostalgia>.45)reasons.push('Текст обращён к памяти и времени');
    if(out.tension>.50)reasons.push('В истории чувствуется напряжение');
    if(out.calm>.55)reasons.push('События рассказаны спокойным ритмом');
    if(!reasons.length)reasons.push('Композиция следует ритму истории');
    return {theme,label,axes:out,hints,reason:reasons.slice(0,3).join(' · '),source:'local'};
  };
  function phraseBeats(text){
    let parts=(text.match(/[^.!?\n]+[.!?]?/g)||[text]).map(v=>v.trim()).filter(v=>v.length>8);
    if(parts.length<3){
      const words=text.trim().split(/\s+/),portion=Math.ceil(words.length/3);
      parts=[words.slice(0,portion).join(' '),words.slice(portion,portion*2).join(' '),words.slice(portion*2).join(' ')].filter(Boolean);
    }
    const inner=parts.slice(1,-1);
    const pivot=inner.map((v,i)=>({i:i+1,score:(/вдруг|в момент|понял|осознал|запом|почув|именно|впервые|последн|скуча|рад|страх|тогда|тих|дольше|счастлив|не забуд/i.test(v)?5:0)+Math.min(3,v.length/60)})).sort((a,b)=>b.score-a.score)[0]?.i??Math.min(1,parts.length-1);
    const chosen=[parts[0],parts[pivot]||parts[0],parts[parts.length-1]];
    return chosen.map(t=>t.length>165?t.slice(0,162)+'…':t);
  }
  function normalizedAI(raw,local,text){
    if(!raw || typeof raw!=='object')return local;
    const known=['analogue','nocturne','construct'];
    const a={...local.axes};for(const k of Object.keys(a))if(raw.axes && typeof raw.axes[k]==='number')a[k]=clamp(raw.axes[k]);
    const theme=known.includes(raw.theme)?raw.theme:local.theme;
    const words=String(raw.title||'').trim().split(/\s+/);
    const title=words.length>=3&&words.length<=7?words.join(' ').slice(0,75):null;
    const moments=Array.isArray(raw.moments)?raw.moments.filter(x=>typeof x==='string'&&x.length>10).slice(0,3).map(x=>x.slice(0,180)):[];
    return {...local,theme,axes:a,label:String(raw.label||local.label).slice(0,65),reason:String(raw.reason||local.reason).slice(0,280),title,moments:moments.length===3?moments:phraseBeats(text),source:'gemini'};
  }
  async function analyze({text,songTitle='',photoColors=[],audioProfile=null}){
    const local=profileFor(text,songTitle);local.moments=phraseBeats(text);
    // file:// and static hosting both work offline; server-enabled AI is optional.
    if(location.protocol==='file:')return local;
    try{
      const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),14500);
      let resp;try{resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,body:JSON.stringify({text,songTitle,photoColors,audioProfile})})}finally{clearTimeout(timeout)}
      if(!resp.ok)return local;
      return normalizedAI(await resp.json(),local,text);
    }catch{return local;}
  }
  async function analyzeAudio(file){
    if(!file)return null;
    let ctx;
    try{
      ctx=new (global.AudioContext||global.webkitAudioContext)();
      const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
      const samples=decoded.getChannelData(0),hop=Math.max(256,Math.round(decoded.sampleRate*.065));
      const env=[];for(let i=0;i<samples.length;i+=hop){let v=0,n=0;for(let j=i;j<Math.min(i+hop,samples.length);j+=8){v+=samples[j]*samples[j];n++}env.push(Math.sqrt(v/Math.max(1,n)))}
      const mean=env.reduce((a,b)=>a+b,0)/env.length;
      const sorted=[...env].sort((a,b)=>a-b);
      const dynamic=clamp((sorted[Math.floor(sorted.length*.90)]-sorted[Math.floor(sorted.length*.10)])*5);
      let onsets=0,last=0;
      for(let i=1;i<env.length;i++){
        const rise=env[i]-env[i-1];
        if(rise>Math.max(.018,mean*.30)&&i-last>2){onsets++;last=i;}
      }
      const seconds=samples.length/decoded.sampleRate;
      const points=80,step=Math.max(1,Math.floor(env.length/points));
      const envelope=Array.from({length:points},(_,k)=>{const slice=env.slice(k*step,(k+1)*step);return Number(clamp((slice.reduce((a,b)=>a+b,0)/Math.max(1,slice.length))/(mean||.01)*.48).toFixed(3))});
      return {energy:clamp(mean*3.2),pulse:clamp((onsets/Math.max(1,seconds)) / 2.4),dynamics:dynamic,onsetsPerSecond:Number((onsets/Math.max(1,seconds)).toFixed(2)),duration:Number(seconds.toFixed(2)),envelope};
    }catch{return null;}finally{if(ctx)try{await ctx.close()}catch{}}
  }
  const styles={
    analogue:{name:'ANALOGUE / 01',desc:'Плёночный свет • импрессионистские оттенки • медленный монтаж',color:['#d6ad7c','#655846'],influence:'аналоговая фотография и работа импрессионистов со светом'},
    nocturne:{name:'NOCTURNE / 02',desc:'Глубокие тени • отрицательное пространство • тишина',color:['#7b9cad','#232c43'],influence:'минималистичное кино и ночная фотография'},
    construct:{name:'CONSTRUCT / 03',desc:'Геометрия • плакатная типографика • рваный ритм',color:['#ef6b46','#1c2837'],influence:'конструктивистский плакат и абстрактная композиция'}
  };
  function direct(profile,photoRGB=[],audioProfile=null,songTitle=''){
    const type=profile.theme||'analogue';const style=styles[type]||styles.analogue;
    const axes=profile.axes||{};
    const audio=audioProfile||null;
    const song=songTitle.toLowerCase();
    let pulse=audio?.pulse??(/techno|metal|dance|drum|рок|электрон|speed/.test(song)?.84:/ambient|piano|lofi|slow|акуст|jazz/.test(song)?.22:.44);
    const energy=.48*(axes.energy||.3)+.52*pulse;
    let duration=type==='construct'?4300:type==='nocturne'?7900:6900;
    duration=Math.round(Math.max(3500,Math.min(9800,duration*(1.17-energy*.55))));
    const rgb=photoRGB[0]||[180,170,150];
    const base=style.color[0].replace('#','');const arr=[0,2,4].map(i=>parseInt(base.slice(i,i+2),16));
    const hex='#'+arr.map((n,i)=>Math.round(n*.55+rgb[i]*.45).toString(16).padStart(2,'0')).join('');
    const tint2=style.color[1];
    const layouts=type==='construct'?['manifest','grid','cutout','grid','outro']:
                  type==='nocturne'?['letter','solitude','letter','diptych','outro']:
                                      ['letter','diptych','contact','letter','outro'];
    const reasons=[profile.reason];
    if(photoRGB.length)reasons.push('Цвет выделен из '+photoRGB.length+' фото');
    reasons.push(audio?'Движение: измеренная пульсация и динамика аудиофайла':'Движение: жанровая подсказка / эмоциональный тон текста');
    return {type,style,axes,pulse,energy,duration,colors:[hex,tint2],layouts,reasons,source:profile.source};
  }
  global.AfterglowDirector={profileFor,phraseBeats,analyze,analyzeAudio,direct,styles};
})(window);
