/* Afterglow 8 · Emotional Scene Director.
   Offline, deterministic and explainable. No emotions are inferred from faces;
   the colors are an artistic reading of the user's own words. */
(function(global){
 'use strict';
 const FEELINGS=[
  {id:'joy',label:'Радость',accent:'#f5ce79',glow:'rgba(233,163,69,.28)',tempo:.88,layout:'grid',words:/радост|весел|весёл|смея|улыб|счастлив|смех|праздн|happy|laugh|smil|joy|celebrat|wonderful|amazing/gi},
  {id:'tender',label:'Тепло',accent:'#f0ae91',glow:'rgba(222,126,106,.25)',tempo:1.06,layout:'diptych',words:/обним|люб|вместе|друз|друж|родн|близк|семь|семей|уют|мил|тепл|нежн|caring|love|friend|together|family|warm/gi},
  {id:'nostalgia',label:'Ностальгия',accent:'#dfbd94',glow:'rgba(201,151,100,.23)',tempo:1.17,layout:'contact',words:/вспомин|ностальг|памят|прошл|детств|последн|больше не|никогда не|раньше|не верн|прощ|remember|memory|used to|last time|goodbye|nostalg/gi},
  {id:'sadness',label:'Грусть',accent:'#a3accf',glow:'rgba(103,122,176,.25)',tempo:1.22,layout:'solitude',words:/груст|печал|плак|слез|слёз|тоск|одиноко|пуст|расстав|потер|боль|тяжел|sad|cried|tears|alone|lonely|lost|hurt|missed/gi},
  {id:'anxiety',label:'Напряжение',accent:'#ed917a',glow:'rgba(225,94,75,.22)',tempo:.83,layout:'cutout',words:/страх|тревог|страшн|паник|нерв|волнов|сроч|дедлайн|стресс|экзамен|не успе|ошиб|боял|напряж|afraid|scared|nervous|deadline|stress|worried|anxious/gi},
  {id:'calm',label:'Покой',accent:'#a5d3cc',glow:'rgba(112,186,173,.21)',tempo:1.2,layout:'letter',words:/тишин|тихо|спокой|не спеша|сидел|гулял|слушал|медленно|мирно|море|тихий|peace|quiet|calm|slow|serene|rest/gi},
  {id:'energy',label:'Драйв',accent:'#e5b873',glow:'rgba(232,153,66,.26)',tempo:.83,layout:'grid',words:/концерт|танц|беж|побед|энерг|адреналин|кричал|ура|быстро|динамич|успел|сцена|dance|concert|ran|won|energy|excited|wild/gi},
  {id:'hope',label:'Надежда',accent:'#cbe2a4',glow:'rgba(167,208,112,.23)',tempo:1.03,layout:'diptych',words:/надежд|впереди|понял|осознал|решил|получил|впервые|начал|новая|мечт|будущ|горд|вдохнов|hope|realized|future|dream|begin|inspired|proud/gi}
 ];
 const fallback=FEELINGS.find(x=>x.id==='calm');
 const safeText=(value,max=175)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max).trim();
 function fragments(text){
   let pieces=String(text||'').split(/(?<=[.!?…])\s+|\n+/u).map(s=>s.trim()).filter(Boolean);
   if(pieces.length<3){const words=String(text||'').trim().split(/\s+/).filter(Boolean);const group=Math.max(1,Math.ceil(words.length/3));pieces=[words.slice(0,group).join(' '),words.slice(group,group*2).join(' '),words.slice(group*2).join(' ')].filter(Boolean);}
   if(pieces.length<3)while(pieces.length<3)pieces.push(pieces[pieces.length-1]||'Этот день');
   const buckets=[[],[],[]];let k=0;const length=pieces.reduce((a,s)=>a+s.length,0),goal=length/3;
   for(let i=0;i<pieces.length;i++){
     buckets[k].push(pieces[i]);
     const consumed=buckets[k].join(' ').length;
     if(k<2&&consumed>=goal*.72&&pieces.length-i-1>=2-k)k++;
   }
   for(let i=0;i<3;i++)if(!buckets[i].length)buckets[i]=[pieces[Math.min(pieces.length-1,i)]];
   return buckets.map(b=>b.join(' '));
 }
 function readFeeling(text){
   const ranked=FEELINGS.map(f=>({f,score:(String(text||'').match(f.words)||[]).length})).sort((a,b)=>b.score-a.score);
   if(!ranked[0].score)return {...fallback,strength:0,secondary:null,reason:'В этом фрагменте нет явных эмоциональных маркеров — выбран спокойный ритм.'};
   const winner=ranked[0],second=ranked[1];
   const mixed=second&&second.score>0&&second.score>=winner.score*.7;
   return {...winner.f,strength:Math.min(1,winner.score/4),secondary:mixed?second.f.label:null,
    reason:mixed?`В тексте сочетаются «${winner.f.label.toLowerCase()}» и «${second.f.label.toLowerCase()}».`:`В этом фрагменте сильнее всего звучит «${winner.f.label.toLowerCase()}».`};
 }
 function story(text,aiMoments){
   const chapters=fragments(text),moments=(Array.isArray(aiMoments)&&aiMoments.length===3?aiMoments:chapters).map(x=>safeText(x)||'Момент, который остался');
   const flow=chapters.map(readFeeling);
   const states=[flow[0],...flow,flow[2]];
   const tags=['ПРОЛОГ','НАЧАЛО','ПЕРЕЛОМ','ПОСЛЕ','ЭПИЛОГ'];
   return {moments,scenes:states.map((feeling,i)=>({
      id:feeling.id,label:feeling.label,secondary:feeling.secondary,accent:feeling.accent,glow:feeling.glow,
      layout:feeling.layout,tempo:feeling.tempo*(i===0?.88:i===4?.90:1),strength:feeling.strength,reason:feeling.reason,tag:tags[i]
   }))};
 }
 global.AfterglowArc={story,readFeeling,feelings:FEELINGS};
})(window);
