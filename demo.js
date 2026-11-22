/* Single-click demo. Clearly a sample; never silently saved to the archive. */
(function(){
  const example='Вечером мы возвращались домой под дождём. Город светился отражениями фонарей, и мы смеялись над самыми обычными шутками. Тогда казалось, что такие прогулки будут продолжаться всегда. Но на следующий день каждому нужно было уехать. Я до сих пор вспоминаю тот тёплый свет и понимаю, как много значил этот маленький вечер.';
  async function assetFile(){
    // Image() works for file://, where fetch() often does not.
    const img=new Image();img.src='assets/rainy-evening.jpg';await img.decode();
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    c.getContext('2d').drawImage(img,0,0);
    const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.87));
    if(!blob)throw Error('Не удалось прочитать пример фотографии');
    return new File([blob],'demo-rainy-evening.jpg',{type:'image/jpeg'});
  }
  document.querySelector('[data-v9-demo]')?.addEventListener('click',async()=>{
    go('create');document.querySelector('#memoryText').value=example;
    document.querySelector('#memoryDate').value='2026-09-21';
    document.querySelector('#songTitle').value='';
    document.querySelector('#songUrl').value='';
    try{setPhotos([await assetFile()],true);}
    catch(err){console.warn(err);toast('Пример текста заполнен. Добавь свою фотографию для создания фильма.');}
    document.querySelector('#memoryText').dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#memoryForm').scrollIntoView({behavior:'smooth',block:'start'});
    toast('Демо заполнено. Нажми «Создать воспоминание» — пример сохранится только после нажатия.');
  });
})();
