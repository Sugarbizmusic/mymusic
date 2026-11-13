// MyMusic Alpha 1.9.21 — pop-out fixes: reliable sizing while the window opens, and the player always returns to the page when the pop-out closes.
const CONFIG={CLIENT_ID:"249160747385-th1vq4sp43pjk40vle5jrnojd965morb.apps.googleusercontent.com",ROOT_FOLDER_ID:"1cdOpz-ziw1JcrtHaQupqnDMRZzviUiCJ"};
const SUPPORTED=new Set(["mp3","wav","m4a","aac","flac","mp4"]);
let pipWin=null,pipPlayer=null,pipModalHome=null,pipDesignH=768;
const $=id=>document.getElementById(id)||(pipWin&&!pipWin.closed?pipWin.document.getElementById(id):null);
let audio=$("audio");
let tokenClient=null,accessToken=null,tracks=[],queue=[],currentIndex=-1,currentObjectUrl=null,standbyObjectUrl=null,currentArtUrl=null,currentFolderId=CONFIG.ROOT_FOLDER_ID,currentFolderPath=[],folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}],scanBusy=false,authPending=false,allSongsMode=false,recentMode=false,pickerMode="folders",tokenExpiresAt=0,pendingActions=[],pendingResumeTrackId=null;
let gainCache=new Map(),levelEnabled=false,prefetchedNextId=null,prefetchedBlob=null;
const LEVEL_KEY="mymusic_level_v1",TARGET_RMS=0.14;
const extOf=n=>String(n).split(".").pop().toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatTime=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`:"0:00";
function setStatus(s){$("status").textContent=s}
const ICONS={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8.5 5.3v13.4a1 1 0 0 0 1.5.86l10.4-6.7a1 1 0 0 0 0-1.72L10 4.44a1 1 0 0 0-1.5.86z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  loading:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>',
  expand:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
  collapse:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/></svg>'
};
function fitTitle(){
  const el=$("trackTitle");if(!el)return;el.style.fontSize="";
  if(!el.ownerDocument.body.classList.contains("player-expanded"))return;
  const max=parseFloat(getComputedStyle(el).fontSize)||34,min=15;let size=max;
  el.style.fontSize=size+"px";
  while(size>min&&el.scrollWidth>el.clientWidth+1){size-=1;el.style.fontSize=size+"px"}
}
addEventListener("resize",()=>requestAnimationFrame(fitTitle));
function setPlayIcon(state){const b=$("playBtn");if(!b)return;b.innerHTML=ICONS[state]||ICONS.play;b.dataset.state=state;b.classList.toggle("lit",state!=="play");b.setAttribute("aria-label",state==="pause"?"Pause":state==="loading"?"Loading":"Play")}
// ---- Listening history (Recent songs + Last played) ----
const HISTORY_KEY="mymusic_history_v1",HISTORY_MAX=30;
let playHistory=[];
try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");if(Array.isArray(h))playHistory=h.filter(x=>typeof x==="string").slice(0,HISTORY_MAX)}catch{}
function saveHistory(){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(playHistory))}catch{}}
function pushHistory(id){playHistory=[id,...playHistory.filter(x=>x!==id)].slice(0,HISTORY_MAX);saveHistory()}
function findTrack(id){return queue.find(t=>t.id===id)||tracks.find(t=>t.id===id)||null}
function lastPlayedTrack(){const cur=queue[currentIndex]?.id;for(const id of playHistory){if(id!==cur){const t=findTrack(id);if(t)return t}}return null}
function upNextTrack(){if(currentIndex<0||queue.length<2)return null;return queue[(currentIndex+1)%queue.length]}
function updatePeek(){
  const box=$("queuePeek");if(!box)return;
  const prev=lastPlayedTrack(),next=upNextTrack();
  box.hidden=!prev&&!next;
  $("peekPrev").hidden=!prev;$("peekNext").hidden=!next;
  if(prev)$("peekPrevTitle").textContent=trackInfo(prev).title;
  if(next)$("peekNextTitle").textContent=trackInfo(next).title;
}
function goBackToLastPlayed(){
  const t=lastPlayedTrack();if(!t)return;
  const cur=queue[currentIndex]?.id;
  if(cur){playHistory=playHistory.filter(x=>x!==cur);saveHistory()}
  if(!queue.some(q=>q.id===t.id))queue.splice(Math.max(0,currentIndex),0,t);
  playTrackById(t.id,false,{noHistory:true});
}
function setListModeButtons(){const r=$("recentBtn");if(r){r.classList.toggle("active",recentMode);r.setAttribute("aria-pressed",String(recentMode))}const a=$("allSongsBtn");if(a)a.classList.toggle("active",allSongsMode&&!recentMode)}
function showRecentSongs(){openPicker("recent")}
function showResumePrompt(trackId){pendingResumeTrackId=trackId;if($("resumePrompt"))$("resumePrompt").hidden=false}
function hideResumePrompt(){pendingResumeTrackId=null;if($("resumePrompt"))$("resumePrompt").hidden=true}
function showConnectScreen(message="Connect Google Drive to load your music"){const hasLib=tracks.length>0;$("welcome").hidden=hasLib;$("library").hidden=!hasLib;let a=false;try{a=localStorage.getItem("mymusic_drive_authorized")==="yes"}catch{}$("connectBtn").textContent=a?"Reconnect Drive":"Connect Drive";setStatus(message)}
// ---- Auth: token persisted until expiry, library cached, one-tap reconnect ----
const TOKEN_KEY="mymusic_token_v1",LIB_KEY="mymusic_library_v1",AUTH_KEY="mymusic_drive_authorized";
function tokenValid(){return !!accessToken&&Date.now()<tokenExpiresAt-60000}
function saveToken(){try{localStorage.setItem(TOKEN_KEY,JSON.stringify({t:accessToken,e:tokenExpiresAt}))}catch{}}
function loadToken(){try{const o=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");if(o&&o.t&&Date.now()<o.e-60000){accessToken=o.t;tokenExpiresAt=o.e;return true}}catch{}return false}
function authExpired(msg){accessToken=null;tokenExpiresAt=0;try{localStorage.removeItem(TOKEN_KEY)}catch{}showConnectScreen(msg||"Drive sign-in expired · tap a track or Reconnect")}
function saveLibrary(){try{localStorage.setItem(LIB_KEY,JSON.stringify({savedAt:Date.now(),tracks}))}catch(e){console.warn("Library cache not saved",e)}}
function loadLibrary(){try{const o=JSON.parse(localStorage.getItem(LIB_KEY)||"null");if(o&&Array.isArray(o.tracks)&&o.tracks.length){tracks=o.tracks;queue=[...tracks];return true}}catch{}return false}
function showConnected(){$("welcome").hidden=true;$("library").hidden=false;$("connectBtn").textContent="Connected";hideResumePrompt()}
function requestToken(forceConsent){if(!tokenClient){alert("Google sign-in is still loading. Try again shortly.");return}if(authPending)return;authPending=true;tokenClient.requestAccessToken({prompt:forceConsent?"consent":""})}
function withToken(fn){
  if(tokenValid()){
    if(tokenExpiresAt-Date.now()<10*60000&&navigator.userActivation?.isActive)requestToken(false);
    return Promise.resolve().then(fn);
  }
  return new Promise((resolve,reject)=>{pendingActions.push({fn,resolve,reject});requestToken(false)});
}
function flushPending(err){const list=pendingActions;pendingActions=[];for(const a of list){if(err)a.reject(err);else Promise.resolve().then(a.fn).then(a.resolve,a.reject)}}
function initAuth(){if(!window.google?.accounts?.oauth2){setTimeout(initAuth,250);return}
tokenClient=google.accounts.oauth2.initTokenClient({client_id:CONFIG.CLIENT_ID,scope:"https://www.googleapis.com/auth/drive.readonly",
callback:async r=>{authPending=false;if(r.error){authExpired("Drive connection needs attention. Please reconnect.");flushPending(new Error("Drive authorization failed"));return}
accessToken=r.access_token;tokenExpiresAt=Date.now()+(Number(r.expires_in)||3600)*1000;saveToken();try{localStorage.setItem(AUTH_KEY,"yes")}catch{}
showConnected();setStatus(tracks.length?`Connected · ${tracks.length} tracks`:"Connected");flushPending();if(!tracks.length)await scanLibrary()},
error_callback:e=>{authPending=false;console.warn("Google sign-in",e);flushPending(new Error("Sign-in window was closed or blocked"));if(!tokenValid())showConnectScreen(tracks.length?"Tap a track or Reconnect to resume":undefined)}});
const hadLib=loadLibrary();if(hadLib){formatCounts();renderTracks()}
if(loadToken()){showConnected();setStatus(hadLib?`Connected · ${tracks.length} tracks`:"Connected");if(!hadLib)scanLibrary();return}
let authorized=false;try{authorized=localStorage.getItem(AUTH_KEY)==="yes"}catch{}
if(authorized&&hadLib)showConnectScreen("Tap a track or Reconnect to resume");else if(authorized)showConnectScreen("Tap Reconnect Drive to continue");else showConnectScreen()}
function connectDrive(){if(tokenValid()){showConnected();return}let authorized=false;try{authorized=localStorage.getItem(AUTH_KEY)==="yes"}catch{}requestToken(!authorized)}
$("connectBtn").onclick=connectDrive;$("welcomeConnectBtn").onclick=connectDrive;$("refreshBtn").onclick=()=>withToken(scanLibrary).catch(e=>setStatus(e.message));
if($("resumePrompt"))$("resumePrompt").onclick=()=>{const id=pendingResumeTrackId||(queue[currentIndex]?.id)||(queue[0]?.id);if(id)playTrackById(id);else connectDrive()};

// ---- Loudness leveling (rendered offline, played through the plain <audio> element) ----
const leveledCache=new Map(),envCache=new Map();
function encodeWav(buf){
  const ch=buf.numberOfChannels,len=buf.length,rate=buf.sampleRate,bytes=len*ch*2,ab=new ArrayBuffer(44+bytes),v=new DataView(ab);
  const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  w(0,"RIFF");v.setUint32(4,36+bytes,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);
  v.setUint32(24,rate,true);v.setUint32(28,rate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,bytes,true);
  const data=[];for(let c=0;c<ch;c++)data.push(buf.getChannelData(c));
  let o=44;for(let i=0;i<len;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}
  return new Blob([ab],{type:"audio/wav"});
}
// Level: measure loudness, then render a gain-adjusted + limited copy offline so it plays
// through the plain <audio> element (keeps playing with the screen off on iPhone).
async function levelBlob(id,blob){
  if(!levelEnabled)return blob;
  if(leveledCache.has(id))return leveledCache.get(id);
  const OCtx=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!OCtx)return blob;
  try{
    const decoded=await new OCtx(1,1,44100).decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration>900)return blob;
    const chd=decoded.getChannelData(0);let sumSq=0,count=0;const step=Math.max(1,Math.floor(chd.length/120000));
    for(let i=0;i<chd.length;i+=step){const x=chd[i];if(Math.abs(x)>0.005){sumSq+=x*x;count++}}
    const rms=count?Math.sqrt(sumSq/count):TARGET_RMS;
    const gain=rms>0.001?Math.min(3.0,Math.max(0.35,TARGET_RMS/rms)):1;
    gainCache.set(id,gain);
    try{const hop=0.05,win=Math.floor(decoded.sampleRate*hop),n=Math.ceil(chd.length/win),env=new Float32Array(n);
      for(let k=0;k<n;k++){let ss=0,c=0;for(let q=k*win,e=Math.min(chd.length,q+win);q<e;q+=4){ss+=chd[q]*chd[q];c++}env[k]=Math.sqrt(ss/Math.max(1,c))*Math.min(gain,2)}
      envCache.set(id,{hop,data:env});while(envCache.size>3)envCache.delete(envCache.keys().next().value)}catch{}
    let out=blob;
    if(Math.abs(gain-1)>=0.08){
      const off=new OCtx(decoded.numberOfChannels,decoded.length,decoded.sampleRate);
      const src=off.createBufferSource();src.buffer=decoded;
      const g=off.createGain();g.gain.value=gain;
      const comp=off.createDynamicsCompressor();comp.threshold.value=-1.5;comp.knee.value=6;comp.ratio.value=12;comp.attack.value=0.003;comp.release.value=0.15;
      src.connect(g);g.connect(comp);comp.connect(off.destination);src.start();
      out=encodeWav(await off.startRendering());
    }
    leveledCache.set(id,out);
    while(leveledCache.size>2)leveledCache.delete(leveledCache.keys().next().value);
    return out;
  }catch(e){console.warn("Level skipped",e);return blob}
}
// A media element that has been routed through Web Audio can't be un-routed; swap in a fresh one.
function initAudioToggles(){
  try{levelEnabled=localStorage.getItem(LEVEL_KEY)==="yes"}catch{}
  try{localStorage.removeItem("mymusic_xfade_v1")}catch{}
  updateToggleButtons();
}
function updateToggleButtons(){
  const lb=$("levelToggleBtn");if(lb){lb.setAttribute("aria-pressed",String(levelEnabled));lb.classList.toggle("lit",levelEnabled);lb.classList.toggle("latched",levelEnabled);lb.title=levelEnabled?"Level: on (matches loudness)":"Level: off"}
}
function toggleLeveling(){
  levelEnabled=!levelEnabled;
  try{localStorage.setItem(LEVEL_KEY,levelEnabled?"yes":"no")}catch{}
  updateToggleButtons();
  leveledCache.clear();
  reapplyLevel();
}
// Re-process the song that's playing so Level is heard right away (same audio element: screen-off safe).
let currentRaw=null,levelJob=0;
async function reapplyLevel(){
  const job=++levelJob,raw=currentRaw,cur=queue[currentIndex];
  if(!raw||!cur||raw.id!==cur.id||!audio.src){setStatus(levelEnabled?"Level on":"Level off");return}
  setStatus(levelEnabled?"Level on · adjusting this song…":"Level off · restoring this song…");
  const blob=levelEnabled?await levelBlob(raw.id,raw.blob):raw.blob;
  if(job!==levelJob||queue[currentIndex]?.id!==raw.id)return;
  const t=audio.currentTime,wasPlaying=!audio.paused,old=currentObjectUrl;
  currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;
  audio.addEventListener("loadedmetadata",()=>{try{audio.currentTime=t}catch{}if(wasPlaying)audio.play().catch(()=>{})},{once:true});
  audio.load();if(old)setTimeout(()=>URL.revokeObjectURL(old),2000);
  const g=gainCache.get(raw.id);
  setStatus(levelEnabled?(g&&Math.abs(g-1)>=.08?`Level on · ${g>1?"+":""}${(20*Math.log10(g)).toFixed(1)} dB on this song`:"Level on · this song is already at the target level"):"Level off");
}
async function prefetchNextTrack(){
  if(queue.length<2||currentIndex<0||!tokenValid())return;
  const nextTrack=queue[(currentIndex+1)%queue.length];
  if(!nextTrack||prefetchedNextId===nextTrack.id)return;
  try{
    prefetchedNextId=nextTrack.id;
    const blob=await downloadFile(nextTrack.id);
    if(prefetchedNextId===nextTrack.id){prefetchedBlob=blob;levelBlob(nextTrack.id,blob).catch(()=>{})}
  }catch{prefetchedNextId=null;prefetchedBlob=null}
}

async function driveList(parentId){let pageToken=null,all=[];do{const p=new URLSearchParams({q:`'${parentId}' in parents and trashed=false`,pageSize:"1000",orderBy:"name",fields:"nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,shortcutDetails)"});if(pageToken)p.set("pageToken",pageToken);const res=await fetch(`https://www.googleapis.com/drive/v3/files?${p}`,{headers:{Authorization:`Bearer ${accessToken}`}});if(res.status===401){authExpired();throw new Error("Drive authorization expired ("+res.status+"). Please reconnect.")}if(!res.ok)throw new Error(`Drive API ${res.status}: ${await res.text()}`);const data=await res.json();all.push(...(data.files||[]));pageToken=data.nextPageToken}while(pageToken);return all}
function trackInfo(t){const p=t.path||[],artist=p[0]||"Unknown Artist",release=p.length>1?p[p.length-1]:"Unsorted";return{artist,release,title:t.name.replace(/\.[^.]+$/,"" ).replace(/^\d+[\s._-]+/,""),subtitle:`${artist} · ${release}`}}
async function walkFolder(id,path=[],seen=new Set()){if(seen.has(id))return[];seen.add(id);const items=await driveList(id),out=[];for(const f of items){if(f.mimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.id,[...path,f.name],seen));else if(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.shortcutDetails.targetId,[...path,f.name],seen));else if(SUPPORTED.has(extOf(f.name)))out.push({...f,path,parentId:id,extension:extOf(f.name)})}return out}
function formatCounts(){$("counts").textContent=tracks.length?`${tracks.length} audio files found`:"No supported audio files found. Add MP3, WAV, M4A, AAC, FLAC or MP4 files inside MyMusic, then Refresh."}
function renderBreadcrumbs(){const atRoot=folderStack.length<2;$("breadcrumbs").innerHTML=`<button type="button" class="crumb-back" aria-label="Back to the previous folder"${atRoot?" disabled":""}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>`+folderStack.map((f,i)=>`${i?'<span class="crumb-sep">›</span>':''}<button type="button" data-depth="${i}">${esc(f.name)}</button>`).join("");$("breadcrumbs").querySelectorAll("button[data-depth]").forEach(b=>b.onclick=()=>navigateTo(Number(b.dataset.depth)));const back=$("breadcrumbs").querySelector(".crumb-back");if(back&&!atRoot)back.onclick=()=>navigateTo(folderStack.length-2)}
const PICKER_TITLES={folders:"Browse folders",all:"All songs",recent:"Recent songs"};
function openPicker(mode="folders"){
  pickerMode=mode;
  $("folderModal").hidden=false;$("folderModal").ownerDocument.body.classList.add("folder-modal-open");
  $("folderModalTitle").textContent=PICKER_TITLES[mode]||"Browse folders";
  $("breadcrumbs").hidden=mode!=="folders";
  $("pickerSearch").hidden=mode==="folders";$("pickerSearch").value="";
  ["folderToggle","allSongsBtn","recentBtn"].forEach((id,k)=>{const b=$(id);if(b)b.setAttribute("aria-expanded",String(["folders","all","recent"][k]===mode))});
  if(mode==="folders")renderFolderContents();else renderPickerList();
}
function openFolderModal(){openPicker("folders")}
function pickerSongs(){
  if(pickerMode==="recent")return playHistory.map(findTrack).filter(Boolean);
  return [...tracks].sort((a,b)=>(a.path||[]).join("/").localeCompare((b.path||[]).join("/"))||a.name.localeCompare(b.name));
}
function renderPickerList(){
  const term=$("pickerSearch").value.trim().toLowerCase();
  const list=pickerSongs().filter(t=>{const i=trackInfo(t);return`${i.title} ${i.artist} ${i.release}`.toLowerCase().includes(term)});
  const cur=queue[currentIndex]?.id;
  $("folderList").innerHTML=list.length?list.map(t=>{const i=trackInfo(t);return`<button type="button" class="folder-track${t.id===cur?" current":""}" data-id="${esc(t.id)}"><span>♫</span><span class="ft-text"><span class="ft-title">${esc(i.title)}</span><span class="ft-meta">${esc(i.subtitle)}</span></span><span>▶</span></button>`}).join(""):`<div class="folder-empty">${pickerMode==="recent"&&!term?"No recent songs yet. Play something and it will show up here.":"No matching songs."}</div>`;
  $("folderList").querySelectorAll(".folder-track").forEach(b=>b.onclick=()=>{allSongsMode=pickerMode==="all";recentMode=pickerMode==="recent";queue=[...list];currentIndex=-1;prefetchedNextId=null;prefetchedBlob=null;playTrackById(b.dataset.id);closeFolderModal()});
}
function markPickerCurrent(){const cur=queue[currentIndex]?.id;($("folderList")?$("folderList").querySelectorAll(".folder-track"):[]).forEach(b=>b.classList.toggle("current",b.dataset.id===cur))}
function closeFolderModal(){$("folderModal").hidden=true;["folderToggle","allSongsBtn","recentBtn"].forEach(id=>{const b=$(id);if(b)b.setAttribute("aria-expanded","false")});$("folderModal").ownerDocument.body.classList.remove("folder-modal-open")}
function togglePlayerExpand(force){const next=typeof force==="boolean"?force:!document.body.classList.contains("player-expanded");document.body.classList.toggle("player-expanded",next);requestAnimationFrame(fitTitle);if($("expandBtn")){$("expandBtn").setAttribute("aria-expanded",String(next));$("expandBtn").innerHTML=next?ICONS.collapse:ICONS.expand;$("expandBtn").title=next?"Collapse player":"Expand player";$("expandBtn").setAttribute("aria-label",next?"Collapse player":"Expand player")}}
async function navigateTo(depth){allSongsMode=false;recentMode=false;folderStack=folderStack.slice(0,depth+1);currentFolderId=folderStack.at(-1).id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
async function enterFolder(f){allSongsMode=false;recentMode=false;folderStack.push({id:f.id,name:f.name});currentFolderId=f.id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
function renderFolderContents(){renderBreadcrumbs();$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';return withToken(_renderFolderContents).catch(e=>{$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)} · tap Reconnect Drive</div>`})}
async function _renderFolderContents(){$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';try{const items=await driveList(currentFolderId);const dirs=items.filter(f=>f.mimeType==="application/vnd.google-apps.folder"||(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")).sort((a,b)=>a.name.localeCompare(b.name));const local=items.filter(f=>SUPPORTED.has(extOf(f.name))).map(f=>({...f,path:currentFolderPath,parentId:currentFolderId,extension:extOf(f.name)})).sort((a,b)=>a.name.localeCompare(b.name));const rows=dirs.map(f=>`<button type="button" class="folder-row" data-id="${esc(f.mimeType==="application/vnd.google-apps.shortcut"?f.shortcutDetails.targetId:f.id)}" data-name="${esc(f.name)}"><span class="folder-icon">📁</span><span class="folder-label">${esc(f.name)}</span><span class="folder-count">Open ›</span></button>`).join("");$("folderList").innerHTML=(rows||'')+(local.length?`<div class="folder-section-label">TRACKS IN THIS FOLDER</div>`+local.map(t=>`<button type="button" class="folder-track${queue[currentIndex]?.id===t.id?" current":""}" data-id="${esc(t.id)}"><span>♫</span><span>${esc(trackInfo(t).title)}</span><span>▶</span></button>`).join(""):'')||'<div class="folder-empty">This folder is empty.</div>';$("folderList").querySelectorAll(".folder-row").forEach(b=>b.onclick=()=>enterFolder({id:b.dataset.id,name:b.dataset.name}));$("folderList").querySelectorAll(".folder-track").forEach(b=>b.onclick=()=>{setQueueForFolder(local);playTrackById(b.dataset.id);closeFolderModal()});if($("folderSummary"))$("folderSummary").textContent=`${dirs.length} folders · ${local.length} tracks`}catch(e){console.error(e);$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)}</div>`}}
$("folderClose").onclick=closeFolderModal;$("folderModal").addEventListener("click",e=>{if(e.target.closest("[data-close-folder]"))closeFolderModal()});function onKey(e){if(e.key==="Escape"){if(!$("folderModal").hidden)closeFolderModal();else if(!pipWin&&document.body.classList.contains("player-expanded"))togglePlayerExpand(false)}}document.addEventListener("keydown",onKey);
function setQueueForFolder(list){queue=[...list].sort((a,b)=>a.name.localeCompare(b.name));currentIndex=-1;prefetchedNextId=null;prefetchedBlob=null}
function renderTracks(){updatePeek();markPickerCurrent()}
async function scanLibrary(){if(!accessToken||scanBusy)return;scanBusy=true;setStatus("Scanning Drive…");$("refreshBtn").disabled=true;try{tracks=await walkFolder(CONFIG.ROOT_FOLDER_ID);tracks.sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));queue=[...tracks];currentIndex=-1;folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];currentFolderId=CONFIG.ROOT_FOLDER_ID;currentFolderPath=[];allSongsMode=false;recentMode=false;saveLibrary();formatCounts();renderTracks();setStatus(`Library scan complete · ${tracks.length} tracks`);if(!$("folderModal").hidden){if(pickerMode==="folders")renderFolderContents();else renderPickerList()}}catch(e){console.error(e);setStatus("Drive connection needs attention");if(tokenValid())alert("Couldn't scan MyMusic.\n\n"+e.message)}finally{scanBusy=false;$("refreshBtn").disabled=false}}
function showAllSongs(){openPicker("all")}
$("pickerSearch").addEventListener("input",()=>{if(pickerMode!=="folders")renderPickerList()});

function onDocClick(event){
  const pop=event.target.closest("#popoutBtn");
  if(pop){event.preventDefault();openPopout();return}
  const ret=event.target.closest("#pipReturnBtn");
  if(ret){event.preventDefault();closePopout();return}
  const browse=event.target.closest("#folderToggle, #expandedBrowseBtn");
  if(browse){
    event.preventDefault();
    openPicker("folders");
    return;
  }
  const rec=event.target.closest("#recentBtn");
  if(rec){event.preventDefault();showRecentSongs();return}
  const pp=event.target.closest("#peekPrev");
  if(pp){event.preventDefault();goBackToLastPlayed();return}
  const pn=event.target.closest("#peekNext");
  if(pn){event.preventDefault();playNext(false);return}
  const all=event.target.closest("#allSongsBtn");
  if(all){
    event.preventDefault();
    showAllSongs();
    return;
  }
  const exp=event.target.closest("#expandBtn");
  if(exp){
    event.preventDefault();
    togglePlayerExpand();
    return;
  }
  const lvl=event.target.closest("#levelToggleBtn");
  if(lvl){
    event.preventDefault();
    toggleLeveling();
    return;
  }
}
document.addEventListener("click",onDocClick);
// ---- Pop-out player (Document Picture-in-Picture) ----
const PIP_OK="documentPictureInPicture" in window;
if(PIP_OK&&$("popoutBtn"))$("popoutBtn").hidden=false;
async function openPopout(){
  if(!PIP_OK)return;
  if(pipWin&&!pipWin.closed){pipWin.focus();return}
  const player=$("player");if(!player)return;
  const wasExpanded=document.body.classList.contains("player-expanded");
  let w;
  const PIP_W=390,PIP_H=768;let size=null;
  try{const v=JSON.parse(localStorage.getItem("mymusic_pip_size")||"null");if(v&&v.w>=200&&v.h>=400)size=v}catch{}
  if(!size){const h=Math.max(480,Math.round((screen.availHeight||900)*0.9));size={w:Math.round(h*PIP_W/pipDesignH),h}}
  try{w=await documentPictureInPicture.requestWindow({width:size.w,height:size.h})}catch(e){console.warn("Pop-out refused",e);setStatus("Couldn't open the pop-out window");return}
  pipWin=w;pipPlayer=player;const d=w.document;
  // styles + fonts
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(n=>{const c=n.cloneNode(true);if(c.tagName==="LINK")c.href=n.href;d.head.appendChild(c)});
  const meta=d.createElement("meta");meta.name="viewport";meta.content="width=device-width,initial-scale=1";d.head.appendChild(meta);
  d.title="MyMusic";
  d.body.className="player-expanded in-pip";
  // shared SVG defs (soft ink filter for the button icons)
  const defs=document.querySelector("#ink")?.closest("svg");if(defs)d.body.appendChild(defs.cloneNode(true));
  // absolute image URLs before moving into the new document
  player.querySelectorAll("img").forEach(i=>{if(i.getAttribute("src")&&!/^(blob:|data:)/.test(i.getAttribute("src")))i.src=i.src});
  if(wasExpanded)togglePlayerExpand(false);
  $("pipPlaceholder").hidden=false;
  d.body.appendChild(player);
  const modal=document.getElementById("folderModal");if(modal){closeFolderModal();pipModalHome={el:modal,parent:modal.parentNode,next:modal.nextSibling};d.body.appendChild(modal)}
  d.addEventListener("keydown",onKey);
  fitPipLayout(w);[60,200,500,1000].forEach(t=>setTimeout(()=>fitPipLayout(w),t));
  let saveT=0;w.addEventListener("resize",()=>{fitPipLayout(w);clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem("mymusic_pip_size",JSON.stringify({w:w.innerWidth,h:w.innerHeight}))}catch{}},400)});
  d.addEventListener("click",onDocClick);
  w.addEventListener("resize",()=>w.requestAnimationFrame(fitTitle));
  pipRestored=false;
  w.addEventListener("pagehide",()=>restorePlayer(wasExpanded),{once:true});
  clearInterval(pipWatch);pipWatch=setInterval(()=>{if(!pipWin||pipWin.closed)restorePlayer(wasExpanded)},700);
  restartVu();
  w.requestAnimationFrame(fitTitle);
}
// Scale the fixed 390×768 phone layout to fit the pop-out window; extra space becomes background.
function fitPipLayout(w,tries=0){
  if(!w||w.closed)return;
  if(!(w.innerWidth>50&&w.innerHeight>50)){if(tries<40)setTimeout(()=>fitPipLayout(w,tries+1),50);return}
  const root=w.document.documentElement,p=w.document.getElementById("player");
  root.style.zoom="1";
  let H=768;if(p){p.style.height="auto";H=Math.max(600,Math.ceil(p.scrollHeight)+1);p.style.height=H+"px";pipDesignH=H}
  const z=Math.max(.4,Math.min(w.innerWidth/390,w.innerHeight/H));
  root.style.zoom=String(z);
  w.requestAnimationFrame(fitTitle);
}
let pipRestored=true,pipWatch=0;
function restorePlayer(reExpand){
  if(pipRestored)return;pipRestored=true;clearInterval(pipWatch);
  const player=pipPlayer,ph=document.getElementById("pipPlaceholder");
  pipWin=null;pipPlayer=null;
  try{if(player&&!document.getElementById("player")){if(ph&&ph.parentNode)ph.after(player);else document.body.appendChild(player)}}catch(e){console.error("Restore player",e);try{document.body.appendChild(player)}catch{}}
  try{if(player)player.style.height=""}catch{}
  if(ph)ph.hidden=true;
  try{if(pipModalHome){const m=pipModalHome.el;m.hidden=true;const par=pipModalHome.parent||document.body,nx=pipModalHome.next;if(nx&&nx.parentNode===par)par.insertBefore(m,nx);else par.appendChild(m)}}catch(e){console.error("Restore picker",e);try{document.body.appendChild(pipModalHome.el)}catch{}}
  pipModalHome=null;document.body.classList.remove("folder-modal-open");
  try{restartVu()}catch{}
  if(reExpand&&document.getElementById("player"))togglePlayerExpand(true);
  requestAnimationFrame(fitTitle);
}
function closePopout(){const w=pipWin;if(!w)return;restorePlayer(false);try{w.close()}catch{}}

window.MyMusicApp=Object.freeze({
  openFolderModal,
  openPicker,
  closeFolderModal,
  showAllSongs,
  showRecentSongs,
  togglePlayerExpand,
  toggleLeveling,
  getNavigationState:()=>({
    browseButton:!!$("folderToggle"),
    expandedBrowseButton:!!$("expandedBrowseBtn"),
    allSongsButton:!!$("allSongsBtn"),
    expandButton:!!$("expandBtn"),
    playerExpanded:document.body.classList.contains("player-expanded"),
    modalHidden:$("folderModal")?.hidden,
    levelEnabled,
    trackCount:tracks.length,
    allSongsMode,
    recentMode,
    historyCount:playHistory.length,
    currentFolderId
  })
});
async function downloadFile(id){const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});if(r.status===401){authExpired();throw new Error("Drive authorization expired. Please reconnect.")}if(!r.ok)throw new Error(`Couldn't download file (${r.status})`);return r.blob()}
async function loadArtwork(track){if(currentArtUrl){URL.revokeObjectURL(currentArtUrl);currentArtUrl=null}$("artwork").hidden=true;$("artPlaceholder").hidden=false;const files=await driveList(track.parentId);const art=files.find(f=>/\.(jpe?g|png|webp)$/i.test(f.name));if(art){const blob=await downloadFile(art.id);currentArtUrl=URL.createObjectURL(blob);$("artwork").src=currentArtUrl;$("artwork").hidden=false;$("artPlaceholder").hidden=true}}
function playTrackById(id,fromAutoplay=false,opts={}){
  if(fromAutoplay&&!tokenValid()){
    const idx=queue.findIndex(t=>t.id===id);
    if(idx>=0){currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();renderTracks()}
    setPlayIcon("play");
    setStatus("Drive sign-in expired · tap to continue");
    showResumePrompt(id);
    return Promise.resolve();
  }
  hideResumePrompt();
  return withToken(()=>_playTrackById(id,opts)).catch(e=>{console.warn(e);setPlayIcon("play");setStatus("Drive sign-in needed · tap to continue");showResumePrompt(id)});
}
async function _playTrackById(id,opts={}){const idx=queue.findIndex(t=>t.id===id);if(idx<0)return;currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();fitTitle();setPlayIcon("loading");setStatus("Loading track…");try{const blobPromise=prefetchedNextId===t.id&&prefetchedBlob?Promise.resolve(prefetchedBlob):downloadFile(t.id);prefetchedNextId=null;prefetchedBlob=null;let [blob]=await Promise.all([blobPromise,loadArtwork(t).catch(err=>{console.warn("Artwork unavailable",err)})]);currentRaw={id:t.id,blob};blob=await levelBlob(t.id,blob);if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;audio.load();await audio.play();hideResumePrompt();if(!opts.noHistory)pushHistory(t.id);setStatus("Playing");renderTracks();updateMediaSession(t,i)}catch(e){console.error(e);setPlayIcon("play");if(!tokenValid()){setStatus("Drive sign-in expired · tap to continue");showResumePrompt(id)}else{setStatus("Playback unavailable");alert(`This track couldn't be loaded.\n\n${e.message}`)}}}
function updateMediaSession(t,i){if(!("mediaSession"in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:i.title,artist:i.artist,album:i.release,artwork:currentArtUrl?[{src:currentArtUrl,sizes:"512x512"}]:[]});const h={play:()=>audio.play(),pause:()=>audio.pause(),previoustrack:playPrevious,nexttrack:()=>playNext(false),seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-15),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15)};for(const[a,fn]of Object.entries(h)){try{navigator.mediaSession.setActionHandler(a,fn)}catch{}}}
function playNext(fromAutoplay=false){if(queue.length)playTrackById(queue[(currentIndex+1)%queue.length].id,fromAutoplay)}function playPrevious(){if(!queue.length)return;if(audio.currentTime>3){audio.currentTime=0;return}playTrackById(queue[(currentIndex-1+queue.length)%queue.length].id,false)}
$("playBtn").onclick=()=>{if(pendingResumeTrackId){playTrackById(pendingResumeTrackId,false);return}if(!audio.src){if(queue.length)playTrackById(queue[0].id,false)}else if(audio.paused){audio.play()}else audio.pause()};$("nextBtn").onclick=()=>playNext(false);$("backBtn").onclick=playPrevious;$("rewindBtn").onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-15);$("forwardBtn").onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);
function bindAudioEvents(el){
  el.onplay=()=>{if(el!==audio)return;setPlayIcon("pause");if(navigator.mediaSession)navigator.mediaSession.playbackState="playing"};
  el.onpause=()=>{if(el!==audio)return;setPlayIcon("play");if(navigator.mediaSession)navigator.mediaSession.playbackState="paused"};
  el.onended=()=>{if(el!==audio)return;playNext(true)};
  el.ontimeupdate=()=>{
    if(el!==audio||!audio.duration)return;
    $("seek").value=String(Math.round(audio.currentTime/audio.duration*1000));
    $("elapsed").textContent=formatTime(audio.currentTime);
    $("duration").textContent=formatTime(audio.duration);
    const rem=audio.duration-audio.currentTime;
    if(rem<25&&!prefetchedNextId)prefetchNextTrack();
  };
}
bindAudioEvents(audio);
$("seek").oninput=()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/1000*audio.duration};$("volume").oninput=()=>{audio.volume=Number($("volume").value);};audio.volume=.85;
// ---- Vintage deck: push buttons, volume knob, VU meter ----
document.querySelectorAll(".hw-btn").forEach(b=>{
  const mode=b.dataset.hw;
  const flash=()=>{clearTimeout(b._t);b.classList.add("lit");b._t=setTimeout(()=>b.classList.remove("lit"),380)};
  b.addEventListener("pointerdown",e=>{if(e.button>0)return;b.classList.add("pressed");if(mode==="momentary"){clearTimeout(b._t);b.classList.add("lit")}});
  const release=()=>{if(!b.classList.contains("pressed"))return;b.classList.remove("pressed");if(mode==="momentary"){clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove("lit"),380)}};
  ["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,release));
  b.addEventListener("click",e=>{if(e.detail===0&&mode==="momentary")flash()});
});
const KNOB_MIN=-132,KNOB_MAX=132,KNOB_CX=177/347,KNOB_CY=176/347,VOL_KEY="mymusic_volume_v1";
const volumeWritable=(()=>{try{if(localStorage.getItem("mymusic_debug_fixedvol")==="yes")return false;const t=document.createElement("audio");t.volume=.5;return Math.abs(t.volume-.5)<.01}catch{return true}})();
let knobVal=.85;try{const v=parseFloat(localStorage.getItem(VOL_KEY));if(v>=0&&v<=1)knobVal=v}catch{}
if(!volumeWritable)knobVal=1; // iPhone: the page always plays at full; the side buttons set the level
function setVolume(v,save=true){
  knobVal=Math.max(0,Math.min(1,v));$("volume").value=knobVal;try{audio.volume=knobVal}catch{}
  const ln=$("knobLine");if(ln)ln.setAttribute("transform",`rotate(${(KNOB_MIN+(KNOB_MAX-KNOB_MIN)*knobVal).toFixed(1)} 177 176)`);
  const k=$("volKnob");if(k)k.setAttribute("aria-valuenow",String(Math.round(knobVal*100)));
  if(save)try{localStorage.setItem(VOL_KEY,String(knobVal))}catch{}
}
setVolume(knobVal,false);
function showKnobNote(){
  let n=$("knobNote");
  if(!n){n=document.createElement("div");n.id="knobNote";n.className="knob-note";n.setAttribute("role","status");
    n.innerHTML='<strong>Use the side buttons for volume</strong><span>iPhone doesn\'t let web apps change or read the volume.</span>';
    $("volKnob").parentElement.appendChild(n)}
  n.classList.add("show");clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove("show"),2600);
}
(()=>{const k=$("volKnob");if(!k)return;let last=null,lastY=0,sx=0,sy=0,dragging=false;const r0=()=>k.getBoundingClientRect().width*.16;
  if(!volumeWritable)k.setAttribute("aria-readonly","true");
  const polar=e=>{const r=k.getBoundingClientRect(),dx=e.clientX-(r.left+r.width*KNOB_CX),dy=e.clientY-(r.top+r.height*KNOB_CY);return{a:Math.atan2(dx,-dy)*180/Math.PI,d:Math.hypot(dx,dy)}};
  k.addEventListener("pointerdown",e=>{e.preventDefault();try{k.setPointerCapture(e.pointerId)}catch{}last=polar(e).a;lastY=sy=e.clientY;sx=e.clientX;dragging=false});
  k.addEventListener("pointermove",e=>{if(last===null)return;
    if(!dragging){if(Math.hypot(e.clientX-sx,e.clientY-sy)<6)return;dragging=true;if(!volumeWritable){showKnobNote();last=null;return}}
    const p=polar(e);let d;
    if(p.d>r0()){d=p.a-last;if(d>180)d-=360;if(d<-180)d+=360;d/=270}else d=(lastY-e.clientY)/160;
    last=p.a;lastY=e.clientY;setVolume(knobVal+d)});
  const end=()=>{last=null;dragging=false};k.addEventListener("pointerup",end);k.addEventListener("pointercancel",end);
  k.addEventListener("wheel",e=>{e.preventDefault();if(!volumeWritable){showKnobNote();return}setVolume(knobVal-e.deltaY/1200)},{passive:false});
  k.addEventListener("keydown",e=>{const m={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05}[e.key];if(m){e.preventDefault();if(!volumeWritable){showKnobNote();return}setVolume(knobVal+m)}});
})();
// VU needle: follows the song's real loudness when Level has analysed it, otherwise a convincing simulation.
const VU_TABLE=[[-40,-57],[-20,-48.3],[-10,-34.1],[-7,-24.6],[-5,-15.6],[-3,-3.6],[-2,3.1],[-1,11.2],[0,21.8],[1,31.1],[2,42],[3,51],[6,55]];
function vuAngle(db){if(db<=VU_TABLE[0][0])return VU_TABLE[0][1];for(let i=1;i<VU_TABLE.length;i++){const[a,x]=VU_TABLE[i-1],[b,y]=VU_TABLE[i];if(db<=b)return x+(y-x)*(db-a)/(b-a)}return VU_TABLE.at(-1)[1]}
let vuAng=-57,vuVel=0,vuPrev=0,vuWalk=-7,vuWalkTarget=-7,vuWalkAt=0,vuKick=0,vuKickAt=0;
function vuTargetDb(now){
  if(!audio.src||audio.paused)return -40;
  const env=envCache.get(queue[currentIndex]?.id);
  if(env&&env.data.length){const i=Math.min(env.data.length-1,Math.floor(audio.currentTime/env.hop));const r=env.data[i];return 20*Math.log10(Math.max(r,1e-5)/0.15)+1}
  if(now>vuWalkAt){vuWalkTarget=-9+Math.random()*7;vuWalkAt=now+250+Math.random()*700}
  vuWalk+=(vuWalkTarget-vuWalk)*0.06;
  if(now>vuKickAt){vuKick=2+Math.random()*3.5;vuKickAt=now+380+Math.random()*260}
  vuKick*=0.9;
  return vuWalk+vuKick+Math.sin(now/97)*0.8+(Math.random()-.5)*1.2;
}
let vuRaf=0,vuRafWin=null;
function scheduleVu(){const w=pipWin&&!pipWin.closed?pipWin:window;vuRafWin=w;vuRaf=w.requestAnimationFrame(vuFrame)}
function restartVu(){try{if(vuRafWin&&vuRaf)vuRafWin.cancelAnimationFrame(vuRaf)}catch{}vuPrev=0;vuWalkAt=0;vuKickAt=0;scheduleVu()}
function vuFrame(now){
  let dt=(now-(vuPrev||now))/1000;vuPrev=now;if(!(dt>=0))dt=0;if(dt>0.05)dt=0.05;
  const target=vuAngle(vuTargetDb(now)),k=90,c=15;
  vuVel+=((target-vuAng)*k-vuVel*c)*dt;vuAng+=vuVel*dt;
  const a=vuAng.toFixed(2);
  const n=$("vuNeedleLine"),sh=$("vuNeedleShadow");
  if(n)n.setAttribute("transform",`rotate(${a} 408 445)`);if(sh)sh.setAttribute("transform",`rotate(${a} 412 445)`);
  if(!isFinite(vuAng)||!isFinite(vuVel)){vuAng=-57;vuVel=0}
  scheduleVu();
}
scheduleVu();
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(console.warn));try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch{}
setPlayIcon("play");initAudioToggles();initAuth();
