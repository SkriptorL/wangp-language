/* WanGP Languages: presentation only. No generated data, settings or values are mutated. */
(() => {
 'use strict';
 const data = /*__WANGP_LANGUAGE_DATA__*/;
 if(window.wanGPLanguage) return;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const normal=s=>s.replace(/\s+/g,' ').trim();
 const codes=/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
 const storage='wangp.language.editor.v2';
 const oldStorage='wangp.language.v1';
 const sourceKeys=Object.keys(data.catalogs.en);
 const guideSources=new Set((data.guideIndices||[]).map(index=>sourceKeys[index]));
 let state={language:'es',enabled:true,languages:{},corrections:{}};
 let previousImport=null, storageError='';
 const parameters=s=>(s.match(/\{\d+\}/g)||[]).sort().join(',');
 function validEntries(entries){
  if(!entries || typeof entries!=='object' || Array.isArray(entries)) throw Error('Invalid translation entries');
  const pairs=Object.entries(entries);
  if(pairs.length>15000) throw Error('Too many translation entries');
  const clean=Object.create(null), keys=new Set();
  for(const [key,value] of pairs){
   if(!key.trim() || key.length>7000 || typeof value!=='string' || value.length>14000 || ['__proto__','constructor','prototype'].includes(key)) throw Error('Invalid translation entry');
   if(value && parameters(key)!==parameters(value)) throw Error('Placeholders do not match: '+key.slice(0,100));
   const normalized=normal(key);
   if(['__proto__','constructor','prototype'].includes(normalized))throw Error('Invalid translation entry');
   if(keys.has(normalized)) throw Error('Duplicate normalized source text');
   keys.add(normalized);clean[normalized]=value;
  }
  return clean;
 }
 function languages(){return {...data.languages,...state.languages};}
 try{
  const saved=JSON.parse(localStorage.getItem(storage)||'null');
  if(saved){
   const extras={};
   for(const [code,name] of Object.entries(saved.languages||{})){
    if(!codes.test(code)||typeof name!=='string'||!name.trim()||name.length>60) throw Error('Invalid language');
    extras[code]=name;
   }
   const corrections={};
   for(const [code,entries] of Object.entries(saved.corrections||{})){
    if(!own({...data.languages,...extras},code)||code==='en') throw Error('Invalid correction language');
    corrections[code]=validEntries(entries);
   }
   state={language:own({...data.languages,...extras},saved.language)?saved.language:'es',enabled:saved.enabled!==false,languages:extras,corrections};
  } else {const old=localStorage.getItem(oldStorage);if(own(data.languages,old)) state.language=old;}
 }catch(e){storageError='Saved preferences could not be read. Export your corrections regularly.';}
 let dictionaries={}, reverse=new Map(),patterns=[];
 const originals=new WeakMap(), roots=new Set(), frames=new WeakSet();
 const pending=new Set();let timer=null,observer;
 const frameOwners=new WeakMap(),styledRoots=new WeakSet(),documentLanguages=new WeakMap();
 const captionStyles='.wl-dropdown-host{position:relative}.wl-dropdown-caption{position:absolute;left:0;right:24px;top:50%;transform:translateY(-50%);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;font:inherit;color:var(--input-text-color,inherit)}.wl-dropdown-caption[hidden]{display:none}.wl-dropdown-translated{color:transparent!important}.wangp-model-selector-tool[data-wl-tooltip]::after{content:attr(data-wl-tooltip)!important}.progress-model[data-wl-model]>span{display:none}.progress-model[data-wl-model]::after{content:attr(data-wl-model)}';
 function addStyles(root){
  if(styledRoots.has(root))return;styledRoots.add(root);
  const doc=root.nodeType===9?root:root.ownerDocument;
  const style=doc.createElement('style');style.textContent=captionStyles+'.wangp-settings-file-actions.is-compact > button[data-wl-caption]::after,.wangp-lora-download-row > button[data-wl-caption]::after{content:attr(data-wl-caption)!important;white-space:normal}';
  (root.nodeType===9?root.head:root).append(style);
 }
 function liveRoot(root){
  const frame=frameOwners.get(root);
  return root.isConnected&&(!frame||(frame.isConnected&&frame.contentDocument===root.ownerDocument));
 }
 const dropdowns=new Map();
 const attributes=['title','aria-label','placeholder','data-tooltip','data-wangp-tooltip'];
 const cssTooltips={
  'wangp_model_tool_search':'Search models [Alt+S]',
  'wangp_model_tool_refresh':'Refresh model list [Alt+R]',
  'wangp_model_tool_unload':'Unload models and extensions [Alt+U]'
 };
 const excluded=["script","style","noscript","textarea","input","option","pre","code","svg","[contenteditable]:not([contenteditable='false'])","[translate='no']",".notranslate",".message",".chatbot:not(.md)",".chat__message",".chat__content-block",".chat__context-summary","[data-testid='bot']","[data-testid='user']",".gallery .label",".gallery .caption",".gallery-caption",".gallery-item",".progress-filename","[id*='metadata']","[id*='deepy_chat']",".shot-prompt",".shot-name",".shot-title",".conversation-message",".message-content",".prompt-cell",".generation-prompt > div:not(.generation-label)"].join(',');
 const uiText="font,button,label,summary,a,h1,h2,h3,h4,h5,p,li,td,th,dt,dd,[role='tab'],[role='menuitem'],[role='option'],[role='alert'],[role='tooltip'],[data-testid='block-info'],.label,.info,.description,.prose,.tooltip,.help,.status,.wangp-model-info-description,.progress-title";
 function effective(code){return {...data.catalogs[code],...state.corrections[code]};}
 function rebuild(){
  dictionaries={};reverse=new Map();patterns=[];
  for(const code of Object.keys(languages())){
   const map=new Map();
   for(const [source,value] of Object.entries(effective(code))){
    if(!value)continue;
    map.set(normal(source),value);
    const k=normal(value);
    if(!reverse.has(k))reverse.set(k,source);else if(reverse.get(k)!==source)reverse.set(k,null);
   }
   dictionaries[code]=map;
  }
  if(state.language!=='en')for(const [source,value] of dictionaries[state.language]||[]){
   if(!/\{\d+\}/.test(source))continue;
   const names=source.match(/\{\d+\}/g),parts=source.split(/\{\d+\}/);
   if(names.length<=10&&!parts.slice(1,-1).some(part=>!part)&&parts.join('').length>=8)patterns.push({parts,names,value});
  }
 }
 // Match literal separators in one forward pass. Imported templates never
 // become regular expressions with potentially unbounded backtracking.
 function matchTemplate(text,pattern){
  const {parts,names}=pattern,values={};
  if(!text.startsWith(parts[0])||!text.endsWith(parts[parts.length-1]))return null;
  let cursor=parts[0].length;
  for(let i=0;i<names.length;i++){
   const end=i===names.length-1?text.length-parts[i+1].length:text.indexOf(parts[i+1],cursor);
   if(end<=cursor)return null;
   const value=text.slice(cursor,end);
   if(own(values,names[i])&&values[names[i]]!==value)return null;
   values[names[i]]=value;cursor=end+parts[i+1].length;
  }
  return cursor===text.length?values:null;
 }
 const active=()=>state.enabled && state.language!=='en';
 function translate(text){
  if(!active())return text;
  const key=normal(text);let value=dictionaries[state.language]?.get(key);
  if(!value)for(const p of patterns){const values=matchTemplate(key,p);if(values){value=p.value.replace(/\{\d+\}/g,k=>values[k]??k);break;}}
  if(!value)return text;
  return text.match(/^\s*/)[0]+value+text.match(/\s*$/)[0];
 }
 function replace(target,key,current,write){
  let entries=originals.get(target);if(!entries){entries=new Map();originals.set(target,entries);}
  let entry=entries.get(key);
  const element=target.nodeType===3?target.parentElement:target;
  const slot=target.nodeType===3?'text:'+Array.prototype.indexOf.call(element.childNodes,target):key;
  let copied={};
  if(element?.hasAttribute('data-wl-originals'))try{copied=JSON.parse(element.getAttribute('data-wl-originals'));if(!copied||typeof copied!=='object'||Array.isArray(copied))copied={};}catch(_){/* Ignore invalid page metadata. */}
  if(!entry||current!==entry.rendered){
   const normalized=normal(current);
   const recovered=normalized.length>1&&!own(data.catalogs.en,normalized)?reverse.get(normalized):null;
   const record=copied[slot];
   const source=Array.isArray(record)&&record.length===2&&typeof record[0]==='string'&&record[1]===current?record[0]:recovered?current.match(/^\s*/)[0]+recovered+current.match(/\s*$/)[0]:current;
   entry={source,rendered:current};
  }
  const next=translate(entry.source);entry.rendered=next;entries.set(key,entry);
  if(current!==next){
   // Native toolbars clone nodes. Carry their originals with the clone, including
   // ambiguous translations such as "Save settings" and "Save Settings".
   copied[slot]=[entry.source,next];element?.setAttribute('data-wl-originals',JSON.stringify(copied));write(next);
  }
 }
 const eligible=e=>e && !e.closest(excluded);
 // A visual caption leaves Gradio's selected value and events untouched. Searching
 // reveals the original input, so typing, keyboard navigation and selection work normally.
 function dropdownCaption(input){
  if(input.getAttribute('role')!=='listbox'||!input.parentElement?.classList.contains('secondary-wrap'))return;
  let caption=dropdowns.get(input);
  if(!caption){
   caption=input.ownerDocument.createElement('span');caption.className='wl-dropdown-caption';
   caption.setAttribute('aria-hidden','true');caption.setAttribute('translate','no');caption.hidden=true;
   input.parentElement.classList.add('wl-dropdown-host');input.parentElement.append(caption);dropdowns.set(input,caption);
   for(const event of ['focus','blur','input','change'])input.addEventListener(event,()=>schedule(input));
  }
  const translated=active()?dictionaries[state.language]?.get(normal(input.value)):null;
  const show=!!translated&&translated!==input.value&&input.ownerDocument.activeElement!==input&&input.getAttribute('aria-expanded')!=='true';
  input.classList.toggle('wl-dropdown-translated',show);caption.hidden=!show;
  if(show)caption.textContent=translated;
 }
 function attachFrame(frame){
  if(frames.has(frame))return;frames.add(frame);
  const load=()=>{try{const doc=frame.contentDocument;if(doc?.body){frameOwners.set(doc.body,frame);roots.add(doc.body);addStyles(doc);schedule(doc.body);watch();}}catch(_){/* Cross-origin frames are never accessed. */}};
  frame.addEventListener('load',load);load();
 }
 function visit(node){
  if(node.nodeType===3){
   const p=node.parentElement;
   if(eligible(p)&&p.closest(uiText))replace(node,'text',node.nodeValue,v=>{node.nodeValue=v;});return;
  }
  if(node.nodeType!==1&&node.nodeType!==11)return;
  if(node.nodeType===1){
   if(node.tagName==='OPTION'&&['wl-filter','wl-scope'].includes(node.parentElement?.id)){
    replace(node,'text',node.textContent,v=>{node.textContent=v;});return;
   }
   if(node.tagName==='TEXTAREA'||node.tagName==='INPUT'){
    if(eligible(node.parentElement)&&!node.closest('[translate="no"]')){
     for(const attr of attributes)if(node.hasAttribute(attr))replace(node,attr,node.getAttribute(attr),v=>node.setAttribute(attr,v));
     if(node.tagName==='INPUT')dropdownCaption(node);
    }
    return;
   }
   if(!eligible(node))return;
   const captionSource=node.classList.contains('wangp-settings-default')?'Set Default':node.classList.contains('wangp-reset-settings')?'Reset':node.classList.contains('wangp-settings-export')?'Export':node.matches('.wangp-lora-download-row > button')?'Download':null;
   if(captionSource)node.setAttribute('data-wl-caption',translate(captionSource));
   if(own(cssTooltips,node.id))node.setAttribute('data-wl-tooltip',translate(cssTooltips[node.id]));
   if(node.classList.contains('progress-model')){
    const source=normal(node.textContent),target=translate(source);
    if(target!==source)node.setAttribute('data-wl-model',target);else node.removeAttribute('data-wl-model');
    if(node.hasAttribute('title'))replace(node,'title',node.getAttribute('title'),v=>node.setAttribute('title',v));
    return;
   }
   for(const attr of attributes)if(node.hasAttribute(attr))replace(node,attr,node.getAttribute(attr),v=>node.setAttribute(attr,v));
   if(node.tagName==='IFRAME')attachFrame(node);
   if(node.shadowRoot){roots.add(node.shadowRoot);const frame=frameOwners.get(node.ownerDocument.body);if(frame)frameOwners.set(node.shadowRoot,frame);addStyles(node.shadowRoot);visit(node.shadowRoot);}
  }
  for(const child of node.childNodes)visit(child);
 }
 function watch(){
  if(!observer)return;
  for(const root of roots){
   if(!liveRoot(root)){roots.delete(root);continue;}
   const doc=root.ownerDocument;
   if(!documentLanguages.has(doc))documentLanguages.set(doc,doc.documentElement.getAttribute('lang'));
   const language=active()?state.language:documentLanguages.get(doc);
   if(language===null)doc.documentElement.removeAttribute('lang');else doc.documentElement.setAttribute('lang',language);
   if(!active())continue;
   observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:[...attributes,'aria-expanded']});
  }
 }
 function flush(){
  timer=null;if(!observer)return;
  for(const r of observer.takeRecords())pending.add(r.target);
  observer.disconnect();
  try{
   const selected=new Set(pending);pending.clear();
   for(const node of selected){
    let covered=false;for(let p=node.parentNode;p;p=p.parentNode)if(selected.has(p)){covered=true;break;}
    if(node.isConnected&&!covered)visit(node);
   }
   for(const [input,caption] of dropdowns){if(!input.isConnected||!liveRoot(input.ownerDocument.body)){caption.remove();dropdowns.delete(input);}else dropdownCaption(input);}
  }
  finally{watch();}
 }
 function schedule(node){pending.add(node);if(timer===null)timer=setTimeout(flush,40);}
 function persist(){
  try{localStorage.setItem(storage,JSON.stringify(state));storageError='';}
  catch(_){storageError='Browser storage is full or unavailable. Export your corrections before closing this page.';}
 }
 function changed(){rebuild();persist();for(const root of roots)schedule(root);window.dispatchEvent(new CustomEvent('wangp-language-changed'));}
 function setLanguage(code){if(own(languages(),code)){state.language=code;changed();}}
 function setEnabled(enabled){state.enabled=!!enabled;changed();}
 function edit(code,source,value){
  if(code==='en'||!own(languages(),code))throw Error('Choose a translation language');
  const entry=validEntries({[normal(source)]:value});
  state.corrections[code]??={};Object.assign(state.corrections[code],entry);changed();
 }
 function resetEntry(code,source){if(state.corrections[code])delete state.corrections[code][source];changed();}
 function addLanguage(code,name){
  if(!codes.test(code)||!name.trim()||name.length>60||own(languages(),code))throw Error('Use a new valid language code and name');
  state.languages[code]=name.trim();state.corrections[code]={};changed();
 }
 function exportPack(code,full=false){
  if(code==='en'||!own(languages(),code))throw Error('Choose a translation language');
  return {format:'wangp-language-pack',formatVersion:1,pluginVersion:data.version,locale:code,name:languages()[code],translations:full?effective(code):{...state.corrections[code]}};
 }
 function validatePack(pack){
  if(pack?.format!=='wangp-language-pack'||pack.formatVersion!==1||!codes.test(pack.locale)||pack.locale==='en'||typeof pack.name!=='string'||!pack.name.trim()||pack.name.length>60)throw Error('Invalid language pack');
  return {...pack,translations:validEntries(pack.translations)};
 }
 function previewPack(pack){
  pack=validatePack(pack);let conflicts=0;
  for(const [k,v] of Object.entries(pack.translations))if(own(state.corrections[pack.locale]||{},k)&&state.corrections[pack.locale][k]!==v)conflicts++;
  return {locale:pack.locale,name:pack.name,entries:Object.keys(pack.translations).length,conflicts,version:pack.pluginVersion||'?'};
 }
 function importPack(pack,replaceConflicts=false){
  pack=validatePack(pack);
  previousImport={locale:pack.locale,newLanguage:!own(languages(),pack.locale),before:{...state.corrections[pack.locale]},applied:{}};
  if(!own(languages(),pack.locale))state.languages[pack.locale]=pack.name;
  state.corrections[pack.locale]??={};
  for(const [k,v] of Object.entries(pack.translations))if(replaceConflicts||!own(state.corrections[pack.locale],k)){
   state.corrections[pack.locale][k]=v;previousImport.applied[k]=v;
  }
  changed();
 }
 function undoImport(){
  if(!previousImport)throw Error('No import to undo');
  const {locale,before,applied,newLanguage}=previousImport,current=state.corrections[locale]||{};
  for(const [key,value] of Object.entries(applied))if(current[key]===value){
   if(own(before,key))current[key]=before[key];else delete current[key];
  }
  if(newLanguage&&!Object.keys(current).length){
   delete state.languages[locale];delete state.corrections[locale];
   if(state.language===locale)state.language='es';
  }
  previousImport=null;changed();
 }
 rebuild();
 window.wanGPLanguage=Object.freeze({setLanguage,setEnabled,getLanguage:()=>state.language,getEnabled:()=>state.enabled,languages,effective,translate,edit,resetEntry,addLanguage,exportPack,previewPack,importPack,undoImport,
  sourceEntries:()=>Array.from(new Set([...sourceKeys,...Object.values(state.corrections).flatMap(Object.keys)])),
  isGuide:source=>guideSources.has(source),corrections:code=>({...state.corrections[code]}),storageError:()=>storageError,version:data.version||'0.2.0'});
 function mount(){
  addStyles(document);
  observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList'){for(const n of r.addedNodes)schedule(n);if(r.removedNodes.length)schedule(r.target);}else schedule(r.target);}});
  roots.add(document.body);schedule(document.body);watch();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
