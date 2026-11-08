(() => {
'use strict';
const D=window.WARLAND_CATALOG;
if(!D){document.querySelector('#content').textContent='Falta generar los datos. Abre ABRIR-CATALOGO.cmd para actualizar y ver el atlas.';return;}
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const topics={combat:'Combate tipo Java',creepers:'Creepers',lobby:'Lobby',calendar:'Días y semanas',security:'Seguridad y terrenos'};
const sections=[['inicio','Inicio','⌂'],...Object.entries(topics).map(([id,name])=>[id,name,'◆']),['systems','Todos los sistemas','◈'],['mobs','Todas las criaturas','◉'],['items','Objetos y equipo','◇'],['blocks','Bloques','▧'],['recipes','Recetas','▦'],['biomes','Biomas','△'],['commands','Comandos','›_'],['animations','Animaciones','▷'],['sounds','Sonidos','♪'],['effects','Partículas y ambiente','✧'],['interface','Pantallas y HUD','▣'],['rules','Reglas y controladores','⌘'],['settings','Configuración','⚙'],['textures','Texturas','▨'],['modules','Módulos de lógica','⌗'],['packs','Paquetes y versiones','▤'],['files','Todos los archivos','≡'],['updates','Estado y actualizaciones','↻']];
let section='inicio',limit=36, filtered=[],viewer=null,detailToken=0;
async function loadModel(desc){if(!window.WARLAND_MODEL_BANK?.[desc.key])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=desc.asset;s.onload=resolve;s.onerror=()=>reject(Error('No se pudo cargar el modelo'));document.head.append(s);});return window.WARLAND_MODEL_BANK[desc.key];}
const categoryName=cat=>sections.find(x=>x[0]===cat)?.[1]??cat;
const href=path=>'../'+path.split('/').map(encodeURIComponent).join('/');
const fileLink=path=>`<a class="source-link" href="${esc(href(path))}" target="_blank" rel="noopener">Abrir archivo original ↗</a>`;
const formatBytes=n=>n>1024*1024?(n/1024/1024).toFixed(1)+' MB':n>1024?Math.ceil(n/1024)+' KB':n+' B';
const humanDate=iso=>iso?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeZone:'America/Bogota'}).format(new Date(iso)):'Base compartida';
$('#nav').innerHTML=sections.map(([id,name,icon])=>`${id==='commands'?'<div class="nav-label">RECURSOS Y HERRAMIENTAS</div>':''}<button data-section="${id}"><span class="symbol">${icon}</span>${name}<span class="badge">${topics[id]?D.entries.filter(e=>e.topics?.includes(id)).length:D.counts[id]??(id==='files'?D.files.length:id==='packs'?D.packs.length:'')}</span></button>`).join('');
const topicDescriptions={combat:'Recarga, críticos, barrido y escudos',creepers:'Térmico y seis variantes con modelo 3D',lobby:'La Cuna, protección, luz y regalos',calendar:'Siete etapas del lobby, misiones y pendientes',security:'Cofres, explosiones, permisos y auditoría'};
$('#shortcuts').innerHTML=Object.entries(topics).map(([id,name])=>`<button data-section="${id}"><strong>${esc(name)}</strong><span>${esc(topicDescriptions[id])}</span><b aria-hidden="true">→</b></button>`).join('');
$('#pack').innerHTML+=[...new Set(D.files.map(f=>f.pack))].sort().map(p=>`<option value="${esc(p)}">${esc(p.replace('WARLAND_',''))}</option>`).join('');
$('#edition').textContent='Base instalada · '+humanDate(D.snapshot);
$('#coverage').textContent=`${D.coverage.indexed} de ${D.coverage.total} archivos incluidos`;
$('#world-link').href=`https://github.com/${D.toolchain.repository}/releases/tag/${D.world.tag}`;
$('#metrics').innerHTML=[['mobs',D.entries.filter(e=>e.category==='mobs'&&!e.auxiliary).length,'CRIATURAS Y PERSONAJES'],['items',D.entries.filter(e=>e.category==='items'&&!e.variants).length,'OBJETOS PRINCIPALES'],['biomes',D.counts.biomes,'HÁBITATS'],['files',D.files.length,'ARCHIVOS INVENTARIADOS']].map(([id,n,l])=>`<button data-section="${id}"><strong>${n}</strong><span>${l}</span></button>`).join('');
function searchable(e){return norm([e.name,e.id,e.summary,e.pack,e.path,e.status,...(e.keywords??[]),...(e.sources??[]),...(e.sections??[]).flatMap(s=>[s.title,...s.items])].join(' '));}
function select(id){section=sections.some(x=>x[0]===id)?id:'inicio';limit=36;$('#search').value='';$('#pack').value='';$('#variants').checked=false;location.hash=section;document.body.classList.remove('menu-open');render();window.scrollTo({top:0});}
function card(e,i){const img=e.image&&D.images[e.image];return `<button class="card ${esc(e.category)}" data-entry="${i}"><span class="meta">${esc(e.category==='timeline'?'Cronología del lobby':categoryName(e.category))}</span>${img?`<img src="${img}" alt="" loading="lazy">`:e.category==='mobs'?'<span class="entity-icon" aria-hidden="true"></span>':''}<h3>${esc(e.name)}</h3><p>${esc(e.summary||e.id)}</p>${e.status?`<span class="state-label">${esc(e.status)}</span>`:''}<div class="card-end"><span>${e.model?'Modelo 3D + clips':e.sections?'Leer cómo funciona':e.variants?'Variante interna':'Ver ficha'}</span><span>↗</span></div></button>`;}
function row(e,i){return `<button class="list-row" data-entry="${i}"><span>${esc(e.name)}<small>${esc(e.path)}</small></span><span class="file-size">${e.bytes!==undefined?formatBytes(e.bytes):esc(e.category==='packs'?e.version:e.pack?.replace('WARLAND_',''))}</span></button>`;}
function render(){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 $('#crumb').textContent=categoryName(section);$('#intro').hidden=section!=='inicio';$('#metrics').hidden=section!=='inicio';$('#shortcuts').hidden=section!=='inicio';
 const q=norm($('#search').value.trim()),pack=$('#pack').value,variants=$('#variants').checked;
 $('#section-title').textContent=q?'Resultados de búsqueda':section==='inicio'?'Empieza por aquí':categoryName(section);
 $('#section-kicker').textContent=q?'EN TODO EL CATÁLOGO':section==='inicio'?'EXPLORAR':'CONTENIDO DE LA BASE COMPARTIDA';
 $('.toolbar').hidden=section==='updates';
 if(section==='updates'){
  $('#hint').textContent='El catálogo se reconstruye desde los paquetes en cada captura, comprobación y publicación.';$('#result-count').textContent='';$('#content').className='compact-list';
  $('#content').innerHTML=`<div class="card"><h3>Una misma referencia para todo el equipo</h3><p>La página se genera desde los archivos de los paquetes compartidos. Las incorporaciones aparecen en su categoría y en el inventario completo; no dependen de una lista escrita a mano.</p><div class="facts"><div class="fact">Archivos<b>${D.files.length}</b></div><div class="fact">Paquetes<b>${D.packs.length}</b></div><div class="fact">Cobertura<b>100 %</b></div></div></div><div class="card"><h3>Última copia del mundo</h3><p>${esc(D.world.label)}. ${esc(D.world.note)}</p><code>${esc(D.world.tag)}</code><a class="source-link" href="https://github.com/${D.toolchain.repository}/releases/tag/${D.world.tag}" target="_blank" rel="noopener">Descargas del mundo ↗</a></div><div class="card"><h3>Qué está probado y qué queda por revisar</h3><p>El catálogo demuestra que el contenido está en los paquetes. Los clips del visor son una previsualización; efectos, IA, colisiones y estados Molang dependen del juego. La activación real de la temporada y los datos de jugadores se comprueban en la partida.</p>${fileLink('docs/ESTADO.md')}${fileLink('docs/DECISIONES.md')}</div><div class="card"><h3>Cómo se actualiza</h3><p>Instalación oficial autorizada → capturar paquetes → generar y comprobar catálogo → publicar revisión. GitHub Pages lo despliega automáticamente desde main. En el PC, ABRIR-CATALOGO.cmd trae los cambios publicados y reconstruye la página.</p><code>${esc(D.fingerprint.slice(0,20))}</code></div>`;
  $('#more').hidden=true;return;
 }
 let pool=section==='files'?D.files.map(f=>({...f,name:f.path.split('/').at(-1),id:f.path,category:'files'})):section==='packs'?D.packs.map(f=>({...f,id:f.uuid,category:'packs',pack:f.folder})):D.entries;
 if(section==='inicio'&&!q)pool=D.entries.filter(e=>['mobs','systems'].includes(e.category)&&!e.auxiliary).sort((a,b)=>(a.category==='systems'?0:1)-(b.category==='systems'?0:1));
 else if(topics[section]&&!q)pool=pool.filter(e=>e.topics?.includes(section)).sort((a,b)=>(a.category==='systems'?0:1)-(b.category==='systems'?0:1));
 else if(!['files','packs'].includes(section)&&!q)pool=pool.filter(e=>e.category===section);
 filtered=pool.filter(e=>(variants||(!e.variants&&!e.auxiliary)||section==='files')&&(!pack||e.pack===pack||e.sources?.some(p=>p.includes('/'+pack+'/')))&&(!q||q.split(/\s+/).every(word=>searchable(e).includes(word))));
 const list=['files','packs','commands','modules','animations','settings','rules','effects'].includes(section)&&!q;
 $('#content').className=list?'compact-list':'grid';
 $('#result-count').textContent=filtered.length+' resultados';
 $('#hint').textContent=section==='calendar'?'Lobby: siete etapas manuales preparadas. Temporada: reloj independiente. Misiones diarias finales y etapas posteriores se distinguen de lo instalado.':topics[section]?'Abre una ficha para leer el funcionamiento, sus límites y los archivos instalados que lo sustentan.':section==='files'?'Cada archivo está incluido: lógica, recursos, variantes internas y archivos auxiliares.':!variants?'Se ocultan actores auxiliares y variantes repetidas; activa la casilla para verlas todas.':'Incluyendo variantes internas y actores auxiliares.';
 $('#content').innerHTML=filtered.length?filtered.slice(0,limit).map((e,i)=>list?row(e,i):card(e,i)).join(''):'<div class="empty">No hay coincidencias. Prueba otro nombre o quita el filtro de paquete.</div>';
 $('#more').hidden=filtered.length<=limit;$('#more').textContent=`Mostrar más (${Math.min(limit,filtered.length)} de ${filtered.length})`;
}
async function openDetail(e){
 const token=++detailToken;
 viewer?.dispose();viewer=null;
 $('#detail-category').textContent=categoryName(e.category).toUpperCase();
 const commands=e.commands??(e.command?[e.command]:[]);
 const main=`<div class="detail-title"><code>${esc(e.id)}</code><h2>${esc(e.name)}</h2><p>${esc(e.summary??'')}</p>${e.status?`<span class="state-label">${esc(e.status)}</span>`:''}</div>`;
 const explanation=(e.sections??[]).map(s=>`<section class="guide-section"><h3>${esc(s.title)}</h3><ul>${s.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`).join('');
 const facts=e.facts?`<div class="facts">${Object.entries(e.facts).filter(([,v])=>v!==undefined).map(([k,v])=>`<div class="fact">${esc(k)}<b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}</div>`:'';
 const links=e.sources?`<details><summary>${e.sources.length} archivos conectados con este sistema</summary><ul class="source-list">${e.sources.map(p=>`<li><a href="${esc(href(p))}" target="_blank" rel="noopener">${esc(p)}</a></li>`).join('')}</ul></details>`:'';
 const cmd=commands.length?'<p class="eyebrow">COMANDOS DE REFERENCIA</p>'+commands.map(c=>`<div class="command"><code>${esc(c)}</code><button data-copy="${esc(c)}">Copiar</button></div>`).join(''):'';
 const audio=e.audio?.map(p=>`<div><small>${esc(p.split('/').at(-1))}</small><audio controls preload="none" src="${esc(href(p))}"></audio></div>`).join('')??'';
 const recipe=e.category==='recipes'&&e.details.pattern?`<div class="recipe">${e.details.pattern.flatMap(r=>[...r]).map(c=>`<div>${esc(c===' '?'':e.details.key?.[c]?.item??c)}</div>`).join('')}</div><p>Resultado: ${esc(JSON.stringify(e.details.result))}</p>`:'';
 const image=e.image&&D.images[e.image]?`<img class="detail-image" src="${D.images[e.image]}" alt="Textura de ${esc(e.name)}">`:'';
 const technical=`${fileLink(e.path)}<details><summary>Datos exactos del archivo</summary><pre>${esc(JSON.stringify(e.details??e,null,2))}</pre></details>`;
 const info=`${explanation}${facts}${image}${cmd}${recipe}${audio}${links}${e.resident?`<button data-resident="${esc(e.resident)}">Ver criatura residente →</button>`:''}${e.category==='mobs'?'<p class="native-note">La vida y el daño mostrados son componentes base del JSON. Los scripts y fases pueden modificar el comportamiento durante la partida.</p>':''}${technical}`;
 $('#detail-body').innerHTML=main+(e.model?`<div class="detail-cols"><div><div class="preview" id="model"><div class="preview-caption">ARRASTRA PARA GIRAR · RUEDA PARA ACERCAR</div></div><div class="model-controls"><select id="clip" aria-label="Animación"><option value="">Pose del modelo</option>${D.models[e.model].clips.map(k=>`<option value="${esc(k)}">${esc(k.split('.').at(-1).replaceAll('_',' '))}</option>`).join('')}</select><button id="play-model">Pausar</button><button id="reset-model">Encuadrar</button></div><p class="model-note" id="model-note">Geometría, textura y pistas numéricas de los paquetes actuales. Estados de juego, capas emisivas y expresiones Molang deben comprobarse en Bedrock.</p></div><div>${info}</div></div>`:info);
 if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
 if(e.model){try{const model=await loadModel(D.models[e.model]);if(token!==detailToken||!$('#detail').open)return;viewer=window.createWarlandViewer($('#model'),model,D.images);$('#clip').onchange=()=>{const unsupported=viewer.setClip($('#clip').value);$('#model-note').textContent=unsupported?'Este clip contiene expresiones Molang. Aquí se reproducen sus pistas numéricas; la versión completa se comprueba en Bedrock.':'Vista previa de las pistas nativas. La IA, los impactos, el audio y los estados de juego se comprueban en Bedrock.';};$('#play-model').onclick=()=>{$('#play-model').textContent=viewer.toggle()?'Pausar':'Reproducir';};$('#reset-model').onclick=()=>viewer.frame();}catch(err){if(token===detailToken&&$('#model'))$('#model').textContent='No se pudo iniciar el visor 3D: '+err.message;}}
}
document.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.section)select(b.dataset.section);if(b.dataset.entry!==undefined)openDetail(filtered[Number(b.dataset.entry)]);if(b.dataset.resident){const e=D.entries.find(x=>x.id===b.dataset.resident&&x.category==='mobs');if(e)openDetail(e);}if(b.dataset.copy){try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copiado';}catch{b.textContent='Selecciona el texto';}}});
$('#close').onclick=()=>$('#detail').close();$('#detail').addEventListener('close',()=>{detailToken++;viewer?.dispose();viewer=null;$('#detail-body').querySelectorAll('audio').forEach(a=>a.pause());});
$('#menu').onclick=()=>document.body.classList.toggle('menu-open');$('#more').onclick=()=>{limit+=36;render();};$('#files-button').onclick=()=>select('files');
for(const id of ['search','pack','variants'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>{limit=36;render();});
addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#detail').open){e.preventDefault();$('#search').focus();}});
addEventListener('hashchange',()=>{if(location.hash.slice(1)!==section)select(location.hash.slice(1));});
window.catalogApp={data:D,select,openDetail,get filtered(){return filtered;},get section(){return section;}};
select(location.hash.slice(1)||'inicio');
})();
