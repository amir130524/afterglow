/* aura.js — живой фон, свет курсора, бегущая строка, появление блоков, спектр чувств на главной */
(()=>{
const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
const aura=document.createElement('div');aura.className='aura';aura.innerHTML='<i></i><i></i><i></i>';document.body.prepend(aura);
const tint=cs=>{if(cs&&cs[0])root.style.setProperty('--aura-a',cs[0]);if(cs&&cs[1])root.style.setProperty('--aura-b',cs[1])};
window.addEventListener('afterglow:mood',e=>tint(e.detail&&e.detail.colors));
if(fine&&!reduce){const g=document.createElement('div');g.className='cursor-glow';document.body.append(g);let x=innerWidth/2,y=innerHeight/2,tx=x,ty=y;
 addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY},{passive:true});(function f(){x+=(tx-x)*.12;y+=(ty-y)*.12;g.style.transform=`translate(${x-260}px,${y-260}px)`;requestAnimationFrame(f)})()}
const tk=document.querySelector('.ticker');if(tk)tk.innerHTML='<div class="ticker-track">'+tk.innerHTML.repeat(4)+'</div>';
const MM=window.AfterglowMood&&window.AfterglowMood.MOODS,ms=document.querySelector('.manifesto-strip');
if(MM&&ms){const s=document.createElement('section');s.className='orbs';
 s.innerHTML='<div class="section-head"><div><div class="eyebrow">002 / THE SPECTRUM</div><h2>Не «хорошо» и «плохо», <em>а оттенки.</em></h2></div></div><div class="orb-row">'+MM.map((m,i)=>`<button type="button" class="orb" style="--c:${m.c};--i:${i}" data-i="${i}"><i></i><b>${m.n}</b></button>`).join('')+'</div><p class="orb-desc" id="orbDesc">Наведи на цвет: так Afterglow читает чувство. Нажми, чтобы начать запись с этим оттенком.</p>';
 ms.before(s);const d=s.querySelector('#orbDesc'),on=b=>{const m=MM[+b.dataset.i];d.innerHTML='<b>'+m.n+'</b> — '+m.d;tint([m.c])};
 s.addEventListener('mouseover',e=>{const b=e.target.closest('.orb');if(b)on(b)});s.addEventListener('focusin',e=>{const b=e.target.closest('.orb');if(b)on(b)});
 s.addEventListener('click',e=>{const b=e.target.closest('.orb');if(!b)return;if(!window.AfterglowMood.picked().includes(MM[+b.dataset.i].id))window.AfterglowMood.pick(MM[+b.dataset.i].id);if(typeof go==='function')go('create')})}
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1}):null;
document.querySelectorAll('.section-head,.manifesto-strip,.about-grid article,.mood-card,.system-hero,.form-left,.form-right,.tip,.form-footer,.orbs').forEach((el,i)=>{el.classList.add('rv');el.style.setProperty('--d',(i%4)*70+'ms');io?io.observe(el):el.classList.add('in')});
const hv=document.querySelector('.hero-visual');if(hv&&fine&&!reduce){hv.addEventListener('pointermove',e=>{const r=hv.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;hv.style.transform=`perspective(900px) rotateY(${px*7}deg) rotateX(${-py*7}deg)`});hv.addEventListener('pointerleave',()=>hv.style.transform='')}
})();
