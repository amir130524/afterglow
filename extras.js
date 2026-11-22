/* Non-invasive demo helpers and truthful AI status display. */
(function(){
 const presets={
  warm:{text:'Вечером мы долго гуляли по осеннему парку. После дождя листья блестели в свете фонарей, и было холодно, но рядом с друзьями я чувствовал себя спокойно. Мы взяли какао и сидели у окна, слушая музыку. В какой-то момент я понял, что через несколько лет буду скучать по этим обычным вечерам. Хотелось, чтобы они длились дольше.',song:'Beach House — Space Song'},
  nocturne:{text:'Я вышел на пустую улицу далеко за полночь. После дождя неон отражался в мокром асфальте, и во всём городе как будто остался только звук шагов. Я долго стоял у остановки, наблюдая за светом в окнах. Было немного одиноко и грустно, но эта тишина почему-то дарила спокойствие.',song:'Ambient piano — slow, quiet'},
  construct:{text:'Дедлайн наступал утром. Мы всю ночь работали над проектом, исправляли ошибки, спорили и снова запускали тесты. От усталости всё путалось, времени не хватало, напряжение росло. В три часа ночи мы наконец нашли последнюю ошибку! Музыка в наушниках била быстрым ритмом, и мы успели сдать работу за минуту до конца.',song:'Electronic / techno — fast pulse'}
 };
 document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{
   const data=presets[btn.dataset.preset];if(!data)return;
   document.querySelector('#memoryText').value=data.text;
   document.querySelector('#songTitle').value=data.song;
   document.querySelector('#memoryText').focus();
   if(typeof toast==='function')toast('Пример заполнен. Добавь фото и ссылку на песню или аудиофайл.');
 }));
 const status=document.querySelector('#aiStatus');
 if(!status)return;
 if(location.protocol==='file:'){status.textContent='◈ Локальный арт-директор';status.title='При запуске двойным кликом AI сервер недоступен';return}
 fetch('/api/status',{signal:AbortSignal.timeout(2500)}).then(async r=>{
   if(!r.ok)throw Error('No server');
   const data=await r.json();status.textContent=data.ai?'✦ Gemini настроен — проверится при создании':'◈ Локальный арт-директор';
   status.title=data.ai?'Ключ настроен на сервере; AI подтверждается после создания воспоминания':'Ключ не настроен — действует локальный анализ';
 }).catch(()=>{status.textContent='◈ Локальный арт-директор';status.title='Сервер AI не найден, локальная генерация работает'});
})();
