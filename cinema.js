/* Afterglow v9 — shared timeline and canvas compositor.
   The identical renderFrame() is used for the interactive preview and WebM export.
   No network or third-party library required. */
(function (global) {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const styles={
    analogue:{dark:'#241912',light:'#e2bc88',ink:'#fff4e3'},
    nocturne:{dark:'#111c2c',light:'#a6cad8',ink:'#eef6fb'},
    construct:{dark:'#121e26',light:'#f3a079',ink:'#fff0df'}
  };
  // Chapters always follow the ORIGINAL text, without repetition or reordering.
  // Sentence boundaries take priority; long sentences may be split at word boundaries.
  const sentenceParts=text=>String(text||'').trim()
    .split(/(?<=[.!?…])\s+|\n+/u).map(s=>s.trim()).filter(Boolean);
  function chapters(text,n){
    const sentences=sentenceParts(text);
    if(!sentences.length)return Array.from({length:n},()=> '');
    // If there are fewer sentences than photos, split the longest sentence
    // until each scene can show a distinct, consecutive fragment.
    const pieces=[...sentences];
    while(pieces.length<n){
      let best=-1,bestWords=1;
      for(let i=0;i<pieces.length;i++){
        const len=pieces[i].split(/\s+/u).length;
        if(len>bestWords){best=i;bestWords=len;}
      }
      if(best<0)break;
      const words=pieces[best].split(/\s+/u),mid=Math.ceil(words.length/2);
      pieces.splice(best,1,words.slice(0,mid).join(' '),words.slice(mid).join(' '));
    }
    // If the story is shorter than the number of photos, do NOT duplicate text.
    // Remaining chapters intentionally have no caption.
    const groups=Array.from({length:n},()=>[]);
    for(let i=0;i<pieces.length;i++){
      const target=pieces.length<n ? i : Math.min(n-1,Math.floor(i*n/pieces.length));
      groups[target].push(pieces[i]);
    }
    return groups.map(g=>g.join(' '));
  }
  // Every word from the source story must appear once, in chronological order.
  // Long stories use MORE scenes rather than clipping captions after 240 characters.
  // Captions are short enough for 16:9, square and portrait formats.
  const PAGE_CHARS=95;
  function paginate(text,limit=PAGE_CHARS){
    const sentences=sentenceParts(text),pages=[];
    let current='';
    const flush=()=>{if(current){pages.push(current);current='';}};
    const append=part=>{
      if(!part)return;
      if(current.length+part.length+1>limit)flush();
      current=current?current+' '+part:part;
    };
    for(const sentence of sentences){
      if(sentence.length<=limit){append(sentence);continue;}
      // Split a long sentence on word boundaries without dropping any words.
      for(const word of sentence.split(/\s+/u).filter(Boolean)){
        if(word.length>limit){
          flush();
          // Abnormally long URLs/words: split by Unicode code point, never delete.
          const codepoints=Array.from(word);
          for(let j=0;j<codepoints.length;j+=limit){
            const part=codepoints.slice(j,j+limit).join('');
            if(part.length>=limit)pages.push(part);
            else append(part);
          }
        }else append(word);
      }
    }
    flush();
    return pages;
  }
  const captionKey=value=>String(value??'').normalize('NFKC').toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/gu,' ').trim();
  function isBookendDuplicate(value,story,title){
    const key=captionKey(value);
    if(!key)return false;
    const body=captionKey(story);
    return (key.length>=4&&body.includes(key))||key===captionKey(title);
  }
  function makePlan(memory){
    const editor=memory.editor||{};
    const creative=memory.creative||global.AfterglowDirector.profileFor(memory.text,memory.songTitle||'');
    const theme=['analogue','nocturne','construct'].includes(editor.theme)?editor.theme:creative.theme||'analogue';
    const director=global.AfterglowDirector.direct({...creative,theme},memory.photoColors||[],memory.audioProfile||null,memory.songTitle||'');
    const count=clamp(memory.photos?.length||1,1,12),parts=chapters(memory.text,count);
    const photos=Array.from({length:count},(_,i)=>i);
    const chosenOrder=Array.isArray(editor.order)&&editor.order.length===count&&new Set(editor.order).size===count&&editor.order.every(n=>Number.isInteger(n)&&n>=0&&n<count)?editor.order:photos;
    const moments=[];
    parts.forEach((part,i)=>{
      const pages=paginate(part);
      // No blank filler frame: photos without text do not create scenes.
      for(const page of pages){
        const emotion=global.AfterglowArc.readFeeling(page);
        moments.push({kind:'moment',text:page,photo:chosenOrder[i],feeling:{...emotion,tag:`ГЛАВА ${String(moments.length+1).padStart(2,'0')}`},layout:emotion.layout});
      }
    });
    // Old saved editors had one caption per photo and clipped them to 240 chars.
    // Ignore those obsolete chapter overrides so old memories regain their FULL text.
    // New editors preserve explicit caption changes only when their scene count matches.
    const currentEdits=editor.captionVersion===2 && Array.isArray(editor.text) && editor.text.length===moments.length+2;
    if(currentEdits)moments.forEach((s,i)=>{s.text=String(editor.text[i+1]??s.text);});
    const fallback=global.AfterglowArc.readFeeling(memory.text||memory.title||'');
    const first={...(moments[0]?.feeling||fallback),tag:'ПРОЛОГ'},last={...(moments.at(-1)?.feeling||fallback),tag:'ЭПИЛОГ'};
    let introText=String(editor.text?.[0]??memory.title??'').trim();
    if(isBookendDuplicate(introText,memory.text,''))introText='';
    let outroText=String(editor.text?.[moments.length+1]??'').trim();
    if(isBookendDuplicate(outroText,memory.text,memory.title)||captionKey(outroText)===captionKey(introText))outroText='';
    // Only render bookends if they actually contain a caption.
    const scenes=[
      ...(introText?[{kind:'intro',text:introText,photo:chosenOrder[0],feeling:first,layout:'intro'}]:[]),
      ...moments,
      ...(outroText?[{kind:'outro',text:outroText,photo:chosenOrder.at(-1),feeling:last,layout:'outro'}]:[])
    ];
    if(!scenes.length)scenes.push({kind:'intro',text:memory.title||'Воспоминание',photo:chosenOrder[0],feeling:first,layout:'intro'});
    // Photo selection is independent from the caption order and survives re-editing.
    if(editor.photo?.length===scenes.length)scenes.forEach((scene,i)=>{
      if(Number.isInteger(editor.photo[i])&&editor.photo[i]>=0&&editor.photo[i]<count)scene.photo=editor.photo[i];
    });
    const manual=Number.isFinite(Number(editor.duration))&&Number(editor.duration)>0;
    const base=manual?clamp(Number(editor.duration),1800,8500):clamp(3900-(director.pulse||.4)*760+(theme==='nocturne'?700:theme==='construct'?-300:0),2700,6200);
    const envelope=memory.audioProfile?.envelope||[];
    scenes.forEach((s,i)=>{
      const a=envelope.length?envelope[Math.floor((i/scenes.length)*envelope.length)]||.45:.45;
      const activity=clamp((a-.4)*.30,-.11,.15);
      const emotional=s.feeling.tempo||1;
      const wordsCount=String(s.text||'').trim().split(/\s+/u).filter(Boolean).length;
      const readingTime=s.kind==='moment'?1300+wordsCount*390:1900+wordsCount*290;
      s.duration=Math.round(clamp(Math.max(base*emotional*(1-activity)*(s.kind==='intro'?.90:s.kind==='outro'?.94:1),readingTime),1800,11000));
      s.index=i;
    });
    // Light music-aware edit points: favour nearby loudness rises, not BPM detection.
    const seconds=Number(memory.audioProfile?.duration)||0;
    if(!manual && seconds>1 && envelope.length>=24){
      let elapsedS=0;
      for(let i=0;i<scenes.length-1;i++){
        const s=scenes[i],expected=elapsedS+s.duration/1000;
        let winner=null;
        for(let dt=-.20;dt<=.20;dt+=.05){
          const x=((expected+dt)%seconds+seconds)%seconds;
          const bin=Math.min(envelope.length-1,Math.floor(x/seconds*envelope.length));
          const rise=(envelope[bin]||0)-(envelope[Math.max(0,bin-1)]||0);
          if(rise>.09 && (!winner||rise>winner.rise))winner={dt,rise};
        }
        if(winner)s.duration=Math.round(clamp(s.duration+winner.dt*1000,1800,8500));
        elapsedS+=s.duration/1000;
      }
    }
    let elapsed=0;for(const s of scenes){s.start=elapsed;elapsed+=s.duration;s.end=elapsed;}
    return {scenes,theme,director,duration:elapsed,baseDuration:base,manualDuration:manual,format:['16:9','9:16','1:1'].includes(editor.format)?editor.format:'16:9',order:[...chosenOrder]};
  }
  function dimensions(format,quality='hd'){
    const factor=quality==='compact'?.75:1;
    if(format==='9:16')return [Math.round(720*factor),Math.round(1280*factor)];
    if(format==='1:1')return [Math.round(960*factor),Math.round(960*factor)];
    return [Math.round(1280*factor),Math.round(720*factor)];
  }
  async function loadImages(memory){
    const result=[];
    try{
      for(const blob of memory.photos)result.push(await createImageBitmap(blob));
      return result;
    }catch(err){result.forEach(x=>x.close());throw err;}
  }
  function cover(ctx,img,x,y,w,h,t=0,offset=0,scale=1.0){
    if(!img)return;
    const z=Math.max(w/img.width,h/img.height)*scale*(1.025+.070*t),ww=img.width*z,hh=img.height*z;
    const movex=(offset?1:-1)*Math.min(Math.max(ww-w,0)*.32,25+Math.abs(offset)*50)*(t-.5);
    const movey=Math.min(Math.max(hh-h,0)*.36,34)*(t-.5)*(offset>0?-1:1);
    ctx.drawImage(img,x+(w-ww)/2+movex,y+(h-hh)/2+movey,ww,hh);
  }
  function block(ctx,img,x,y,w,h,t,shift){
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();cover(ctx,img,x,y,w,h,t,shift,1.08);ctx.restore();
  }
  // Word-wrap WITHOUT ellipsis. Text must never disappear silently.
  function words(ctx,content,maxWidth){
    const tokens=String(content||'').replace(/\s+/gu,' ').trim().split(' ').filter(Boolean);
    const rows=[];let line='';
    const flush=()=>{if(line){rows.push(line);line='';}};
    for(const token of tokens){
      const proposed=line?line+' '+token:token;
      if(ctx.measureText(proposed).width<=maxWidth){line=proposed;continue;}
      flush();
      if(ctx.measureText(token).width<=maxWidth){line=token;continue;}
      // Extremely long unbroken words/links get wrapped by characters.
      for(const char of Array.from(token)){
        if(line && ctx.measureText(line+char).width>maxWidth)flush();
        line+=char;
      }
    }
    flush();return rows;
  }
  const ease=v=>v*v*(3-2*v);
  function drawFrame(ctx,images,plan,memory,index,progress=0){
    const scene=plan.scenes[clamp(index,0,plan.scenes.length-1)];
    if(!scene)return;
    const W=ctx.canvas.width,H=ctx.canvas.height,portrait=H>W*1.15,square=Math.abs(H-W)<5,t=clamp(progress,0,1),style=styles[plan.theme]||styles.analogue;
    const feeling=scene.feeling,main=images[scene.photo]||images[0];
    const other=images[(scene.photo+1)%images.length]||main,third=images[(scene.photo+2)%images.length]||main;
    const sw=W/1280,sh=H/720,side=portrait?W*.09:W*.075;
    ctx.save();ctx.clearRect(0,0,W,H);ctx.fillStyle=style.dark;ctx.fillRect(0,0,W,H);
    // Background and design respond to both the photo and the story fragment.
    cover(ctx,main,0,0,W,H,t,index%2?1:-1,1.02);
    const layout=scene.layout;
    if(images.length>1&&scene.kind==='moment'){
      if(['grid','contact'].includes(layout)){
        const gap=W*.012,rw=portrait?W*.31:W*.36;
        const left=W-rw-gap;ctx.fillStyle=style.dark;ctx.fillRect(left-gap,0,rw+gap,H);
        block(ctx,other,left,H*.07,rw,H*.45-gap,t,1);
        block(ctx,third,left,H*.52,rw,H*.41-gap,t,-1);
      }else if(['diptych','cutout'].includes(layout)){
        const rw=portrait?W*.36:W*.32;
        block(ctx,other,W-rw-W*.04,H*.09,rw,H*.65,t,1);
        ctx.strokeStyle=feeling.accent;ctx.lineWidth=Math.max(2,W*.003);ctx.strokeRect(W-rw-W*.04,H*.09,rw,H*.65);
      }
    }
    const grad=ctx.createLinearGradient(0,0,portrait?W*.94:W*.81,0);
    grad.addColorStop(0,plan.theme==='nocturne'?'rgba(5,14,25,.91)':plan.theme==='construct'?'rgba(9,15,22,.90)':'rgba(27,18,14,.87)');
    grad.addColorStop(.59,plan.theme==='nocturne'?'rgba(9,18,29,.72)':'rgba(15,17,17,.69)');
    grad.addColorStop(1,'rgba(10,12,13,.10)');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    const bottom=ctx.createLinearGradient(0,H*.53,0,H);bottom.addColorStop(0,'rgba(12,12,12,0)');bottom.addColorStop(1,'rgba(9,12,12,.86)');ctx.fillStyle=bottom;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*.86,H*.22,0,W*.86,H*.22,W*.82);
    glow.addColorStop(0,feeling.glow||'rgba(220,180,120,.20)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    if(plan.theme==='construct'){
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=Math.max(1,sw);
      for(let xx=W*.53;xx<W;xx+=W*.09){ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx,H);ctx.stroke();}
      ctx.fillStyle=feeling.accent;ctx.fillRect(W*.73,H*.19,W*.15,H*.016);
    }else if(plan.theme==='nocturne'){
      ctx.strokeStyle='rgba(200,233,233,.24)';ctx.lineWidth=Math.max(2,sw*2);
      ctx.beginPath();ctx.arc(W*.83,H*.29,W*.20,0,2*Math.PI);ctx.stroke();
    }else{
      ctx.strokeStyle='rgba(245,214,170,.34)';ctx.lineWidth=Math.max(1,sw*1.6);
      ctx.beginPath();ctx.arc(W*.85,H*.36,W*.22,0,2*Math.PI);ctx.stroke();
    }
    // Film burn is subtle and constrained to an accent near the cut.
    if(t>.88){ctx.globalAlpha=(t-.88)*2.0;ctx.fillStyle=feeling.accent;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
    const fontBase=Math.min(W*.06,H*.093),fontMoment=Math.min(W*.047,H*.074);
    ctx.fillStyle=style.ink;ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(0,0,0,.50)';ctx.shadowBlur=16*sw;
    ctx.font=`600 ${Math.max(12,W*.014)}px Arial`;ctx.fillText('✳ afterglow.',side,portrait?H*.052:H*.080);
    ctx.textAlign='right';ctx.fillStyle='rgba(250,246,233,.80)';ctx.font=`${Math.max(11,W*.011)}px Arial`;
    const date=String(memory.date||'');ctx.fillText(`${date}  /  FRAME ${String(index+1).padStart(2,'0')}`,W-side,portrait?H*.052:H*.080);ctx.textAlign='left';
    ctx.shadowBlur=0;ctx.fillStyle=feeling.accent||style.light;ctx.font=`700 ${Math.max(10,W*.012)}px Arial`;
    const pre=portrait?H*.355:H*.29;ctx.fillText(`${feeling.tag}   /   ${feeling.label.toUpperCase()}`,side,pre);
    const string=String(scene.text||''),isChapter=scene.kind==='moment',family=plan.theme==='construct'?'Arial':'Georgia';
    const maxWidth=portrait?W*.83:W*.72,maxRows=portrait?7:4;
    let size=isChapter?fontMoment:fontBase;
    // Page generation ensures short captions; fit-font provides extra safety for
    // different aspect ratios and edits, without hiding the end of a sentence.
    let lines=[];
    const minSize=Math.max(12,Math.min(W*.024,H*.033));
    while(size>=minSize){
      ctx.font=`${plan.theme==='construct'?'700':'400'} ${size}px ${family}`;
      lines=words(ctx,string,maxWidth);
      if(lines.length<=maxRows)break;
      size-=2;
    }
    // For unusually long manually edited captions, keep ALL lines instead
    // of the old four-line ellipsis. The editor warns on overlong captions.
    size=Math.max(minSize,size);
    ctx.font=`${plan.theme==='construct'?'700':'400'} ${size}px ${family}`;
    lines=words(ctx,string,maxWidth);
    const lineHeight=size*(plan.theme==='construct'?1.08:1.19);
    let y=portrait?H*.44:H*.44;
    if(!portrait)y=Math.min(H*.69-(Math.min(lines.length,maxRows)-1)*lineHeight,H*.45);
    ctx.fillStyle=style.ink;ctx.shadowColor='rgba(0,0,0,.76)';ctx.shadowBlur=19*sw;
    for(const row of lines){ctx.fillText(row,side,y);y+=lineHeight;}ctx.shadowBlur=0;
    ctx.fillStyle='rgba(247,243,228,.75)';ctx.font=`${Math.max(10,W*.011)}px Arial`;
    ctx.fillText('THE ART OF REMEMBERING  /  YOUR DAY IN MOTION',side,H*(portrait?.91:.89));
    const barX=side,barY=H*(portrait?.944:.945),barWidth=(W-side*2),gap=Math.max(2,W*.004);
    const sizeBar=(barWidth-gap*(plan.scenes.length-1))/plan.scenes.length;
    plan.scenes.forEach((s,i)=>{ctx.fillStyle=i===index?feeling.accent:i<index?'rgba(245,244,231,.69)':'rgba(246,241,230,.25)';ctx.fillRect(barX+i*(sizeBar+gap),barY,sizeBar*(i===index?Math.max(.035,t):1),Math.max(2,H*.0035));});
    if(t<.075){ctx.fillStyle=`rgba(4,7,8,${(1-ease(t/.075))*.58})`;ctx.fillRect(0,0,W,H);}
    ctx.restore();
  }
  function locate(plan,ms){
    const clamped=clamp(ms,0,Math.max(0,plan.duration-1));
    const i=Math.max(0,plan.scenes.findIndex(s=>clamped<s.end));
    const s=plan.scenes[i];return {index:i,progress:clamp((clamped-s.start)/s.duration,0,1)};
  }
  global.AfterglowCinema={makePlan,drawFrame,dimensions,loadImages,locate,styles};
})(window);
