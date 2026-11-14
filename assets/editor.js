(() => {
 'use strict';
 const api=window.wanGPLanguage;if(!api)return;
 function mount(){
  const panel=document.getElementById('wangp-language-panel');
  if(!panel||panel.dataset.bound)return !!panel;
  panel.dataset.bound='true';
  const $=id=>panel.querySelector('#wl-'+id);
  let page=0,selected='',pendingPack=null;
  const message=(text,error=false)=>{ $('status').textContent=api.translate(text);$('status').style.background=error?'#b91c1c18':'#2563eb12';};
  const safe=fn=>{try{fn();const warning=api.storageError();if(warning)message(warning,true);}catch(e){message(e.message,true);}};
  function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
  function populateLanguages(){
   for(const id of ['language','edit-language']){
    const old=$(id).value;$(id).replaceChildren();
    for(const [code,name] of Object.entries(api.languages()))if(id==='language'||code!=='en')$(id).append(option(code,name));
    $(id).value=id==='language'?api.getLanguage():(Object.keys(api.languages()).includes(old)?old:api.getLanguage()==='en'?'es':api.getLanguage());
   }
   $('enabled').checked=api.getEnabled();
  }
  function choose(){
   selected=$('entries').value;
   $('source').value=selected;
   $('translation').value=api.effective($('edit-language').value)[selected]||'';
   $('save').disabled=!selected;$('reset-entry').disabled=!selected;
  }
  function list(){
   const code=$('edit-language').value,translated=api.effective(code),edits=api.corrections(code),query=$('search').value.toLocaleLowerCase(),filter=$('filter').value;
   const scope=$('scope').value;
   const favorites=['Generate','Save','Cancel','Settings','Languages','Prompt','Seed'];
   const all=api.sourceEntries().filter(key=>(scope==='all'||api.isGuide(key)===(scope==='guide'))&&(filter!=='missing'||!translated[key])&&(filter!=='edited'||Object.prototype.hasOwnProperty.call(edits,key))&&(!query||(key+' '+(translated[key]||'')).toLocaleLowerCase().includes(query)));
   all.sort((a,b)=>{const x=favorites.indexOf(a),y=favorites.indexOf(b);return (x<0?99:x)-(y<0?99:y)||a.localeCompare(b);});
   page=Math.min(page,Math.max(0,Math.ceil(all.length/50)-1));
   const shown=all.slice(page*50,(page+1)*50);
   $('entries').replaceChildren(...shown.map(key=>option(key,(edits[key]!==undefined?'✎ ':!translated[key]?'○ ':'')+key)));
   $('count').textContent=all.length?`${page*50+1}–${page*50+shown.length} / ${all.length}`:'0';
   $('prev').disabled=page===0;$('next').disabled=(page+1)*50>=all.length;
   if(shown.includes(selected))$('entries').value=selected;
   else if(shown.length)$('entries').value=shown[0];
   choose();
  }
  function download(filename,payload){
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download=filename;panel.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('language').onchange=()=>api.setLanguage($('language').value);
  $('enabled').onchange=()=>api.setEnabled($('enabled').checked);
  $('edit-language').onchange=()=>{page=0;list();};$('search').oninput=()=>{page=0;list();};$('filter').onchange=()=>{page=0;list();};
  $('scope').onchange=()=>{page=0;list();};
  $('prev').onclick=()=>{page--;list();};$('next').onclick=()=>{page++;list();};$('entries').onchange=choose;
  $('save').onclick=()=>safe(()=>{api.edit($('edit-language').value,selected,$('translation').value);message('Correction saved in this browser.');list();});
  $('reset-entry').onclick=()=>safe(()=>{api.resetEntry($('edit-language').value,selected);message('Bundled translation restored.');list();});
  $('add-phrase').onclick=()=>safe(()=>{api.edit($('edit-language').value,$('new-source').value,$('new-translation').value);selected=$('new-source').value.trim();$('search').value=selected;$('scope').value='all';page=0;list();message('Phrase added to your corrections.');});
  $('add-language').onclick=()=>safe(()=>{const code=$('code').value.trim();api.addLanguage(code,$('name').value);populateLanguages();$('edit-language').value=code;page=0;list();message('Language created. Use the editor to add translations.');});
  $('export-changes').onclick=()=>safe(()=>download('wangp-'+$('edit-language').value+'-corrections.json',api.exportPack($('edit-language').value)));
  $('export-full').onclick=()=>safe(()=>download('wangp-'+$('edit-language').value+'-pack.json',api.exportPack($('edit-language').value,true)));
  $('export-json').onclick=()=>safe(()=>download($('edit-language').value+'.json',api.effective($('edit-language').value)));
  $('import-file').onchange=async()=>{
   pendingPack=null;$('import-apply').disabled=true;$('import-preview').textContent='';
   const file=$('import-file').files[0];if(!file)return;
   try{
    if(file.size>4*1024*1024)throw Error('Language pack exceeds 4 MB');
    const pack=JSON.parse(await file.text()),preview=api.previewPack(pack);
    const samples=Object.entries(pack.translations).slice(0,12).map(([source,value])=>source+'\n→ '+value).join('\n\n');
    pendingPack=pack;$('import-preview').textContent=preview.name+' ('+preview.locale+')\n'+api.translate('Translation entries')+': '+preview.entries+'\n'+api.translate('Conflicts')+': '+preview.conflicts+'\n\n'+samples;$('import-apply').disabled=false;
    message('Preview ready. Review conflicts before applying.');
   }catch(e){message(e.message,true);}
  };
  $('import-apply').onclick=()=>safe(()=>{if(!pendingPack)return;api.importPack(pendingPack,$('replace-conflicts').checked);populateLanguages();$('edit-language').value=pendingPack.locale;page=0;list();pendingPack=null;$('import-apply').disabled=true;message('Translations imported. You can undo the last import.');});
  $('undo-import').onclick=()=>safe(()=>{api.undoImport();populateLanguages();list();message('Last import undone.');});
  window.addEventListener('wangp-language-changed',()=>{populateLanguages();});
  populateLanguages();list();if(api.storageError())message(api.storageError(),true);
  return true;
 }
 if(!mount()){
  const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }
})();
