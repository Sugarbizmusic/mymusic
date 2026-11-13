// MyMusic Alpha 1.9.12 — home track list removed; Browse / All songs / Recent open one song-picker window; larger home player; centered circle icons.
const CONFIG={CLIENT_ID:"249160747385-th1vq4sp43pjk40vle5jrnojd965morb.apps.googleusercontent.com",ROOT_FOLDER_ID:"1cdOpz-ziw1JcrtHaQupqnDMRZzviUiCJ"};
const SUPPORTED=new Set(["mp3","wav","m4a","aac","flac","mp4"]);
const $=id=>document.getElementById(id);
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
function setPlayIcon(state){const b=$("playBtn");if(!b)return;b.innerHTML=ICONS[state]||ICONS.play;b.dataset.state=state;b.setAttribute("aria-label",state==="pause"?"Pause":state==="loading"?"Loading":"Play")}
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
const leveledCache=new Map();
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
  if($("levelToggleBtn")){$("levelToggleBtn").setAttribute("aria-pressed",String(levelEnabled));$("levelToggleBtn").classList.toggle("active",levelEnabled);$("levelToggleBtn").textContent=levelEnabled?"Level: On":"Level: Off"}
}
function toggleLeveling(){
  levelEnabled=!levelEnabled;
  try{localStorage.setItem(LEVEL_KEY,levelEnabled?"yes":"no")}catch{}
  updateToggleButtons();
  leveledCache.clear();
  setStatus(levelEnabled?"Level on · applies from the next song":"Level off · applies from the next song");
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
function renderBreadcrumbs(){$("breadcrumbs").innerHTML=folderStack.map((f,i)=>`${i?'<span class="crumb-sep">›</span>':''}<button type="button" data-depth="${i}">${esc(f.name)}</button>`).join("");$("breadcrumbs").querySelectorAll("button").forEach(b=>b.onclick=()=>navigateTo(Number(b.dataset.depth)))}
const PICKER_TITLES={folders:"Browse folders",all:"All songs",recent:"Recent songs"};
function openPicker(mode="folders"){
  pickerMode=mode;
  $("folderModal").hidden=false;document.body.classList.add("folder-modal-open");
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
function markPickerCurrent(){const cur=queue[currentIndex]?.id;document.querySelectorAll("#folderList .folder-track").forEach(b=>b.classList.toggle("current",b.dataset.id===cur))}
function closeFolderModal(){$("folderModal").hidden=true;["folderToggle","allSongsBtn","recentBtn"].forEach(id=>{const b=$(id);if(b)b.setAttribute("aria-expanded","false")});document.body.classList.remove("folder-modal-open")}
function togglePlayerExpand(force){const next=typeof force==="boolean"?force:!document.body.classList.contains("player-expanded");document.body.classList.toggle("player-expanded",next);if($("expandBtn")){$("expandBtn").setAttribute("aria-expanded",String(next));$("expandBtn").innerHTML=next?ICONS.collapse:ICONS.expand;$("expandBtn").title=next?"Collapse player":"Expand player";$("expandBtn").setAttribute("aria-label",next?"Collapse player":"Expand player")}}
async function navigateTo(depth){allSongsMode=false;recentMode=false;folderStack=folderStack.slice(0,depth+1);currentFolderId=folderStack.at(-1).id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
async function enterFolder(f){allSongsMode=false;recentMode=false;folderStack.push({id:f.id,name:f.name});currentFolderId=f.id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
function renderFolderContents(){renderBreadcrumbs();$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';return withToken(_renderFolderContents).catch(e=>{$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)} · tap Reconnect Drive</div>`})}
async function _renderFolderContents(){$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';try{const items=await driveList(currentFolderId);const dirs=items.filter(f=>f.mimeType==="application/vnd.google-apps.folder"||(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")).sort((a,b)=>a.name.localeCompare(b.name));const local=items.filter(f=>SUPPORTED.has(extOf(f.name))).map(f=>({...f,path:currentFolderPath,parentId:currentFolderId,extension:extOf(f.name)})).sort((a,b)=>a.name.localeCompare(b.name));const rows=dirs.map(f=>`<button type="button" class="folder-row" data-id="${esc(f.mimeType==="application/vnd.google-apps.shortcut"?f.shortcutDetails.targetId:f.id)}" data-name="${esc(f.name)}"><span class="folder-icon">📁</span><span class="folder-label">${esc(f.name)}</span><span class="folder-count">Open ›</span></button>`).join("");$("folderList").innerHTML=(rows||'')+(local.length?`<div class="folder-section-label">TRACKS IN THIS FOLDER</div>`+local.map(t=>`<button type="button" class="folder-track${queue[currentIndex]?.id===t.id?" current":""}" data-id="${esc(t.id)}"><span>♫</span><span>${esc(trackInfo(t).title)}</span><span>▶</span></button>`).join(""):'')||'<div class="folder-empty">This folder is empty.</div>';$("folderList").querySelectorAll(".folder-row").forEach(b=>b.onclick=()=>enterFolder({id:b.dataset.id,name:b.dataset.name}));$("folderList").querySelectorAll(".folder-track").forEach(b=>b.onclick=()=>{setQueueForFolder(local);playTrackById(b.dataset.id);closeFolderModal()});if($("folderSummary"))$("folderSummary").textContent=`${dirs.length} folders · ${local.length} tracks`}catch(e){console.error(e);$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)}</div>`}}
$("folderClose").onclick=closeFolderModal;$("folderModal").addEventListener("click",e=>{if(e.target.closest("[data-close-folder]"))closeFolderModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("folderModal").hidden)closeFolderModal();else if(document.body.classList.contains("player-expanded"))togglePlayerExpand(false)}});
function setQueueForFolder(list){queue=[...list].sort((a,b)=>a.name.localeCompare(b.name));currentIndex=-1;prefetchedNextId=null;prefetchedBlob=null}
function renderTracks(){updatePeek();markPickerCurrent()}
async function scanLibrary(){if(!accessToken||scanBusy)return;scanBusy=true;setStatus("Scanning Drive…");$("refreshBtn").disabled=true;try{tracks=await walkFolder(CONFIG.ROOT_FOLDER_ID);tracks.sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));queue=[...tracks];currentIndex=-1;folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];currentFolderId=CONFIG.ROOT_FOLDER_ID;currentFolderPath=[];allSongsMode=false;recentMode=false;saveLibrary();formatCounts();renderTracks();setStatus(`Library scan complete · ${tracks.length} tracks`);if(!$("folderModal").hidden){if(pickerMode==="folders")renderFolderContents();else renderPickerList()}}catch(e){console.error(e);setStatus("Drive connection needs attention");if(tokenValid())alert("Couldn't scan MyMusic.\n\n"+e.message)}finally{scanBusy=false;$("refreshBtn").disabled=false}}
function showAllSongs(){openPicker("all")}
$("pickerSearch").addEventListener("input",()=>{if(pickerMode!=="folders")renderPickerList()});

document.addEventListener("click",event=>{
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
});

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
async function _playTrackById(id,opts={}){const idx=queue.findIndex(t=>t.id===id);if(idx<0)return;currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();setPlayIcon("loading");setStatus("Loading track…");try{const blobPromise=prefetchedNextId===t.id&&prefetchedBlob?Promise.resolve(prefetchedBlob):downloadFile(t.id);prefetchedNextId=null;prefetchedBlob=null;let [blob]=await Promise.all([blobPromise,loadArtwork(t).catch(err=>{console.warn("Artwork unavailable",err)})]);blob=await levelBlob(t.id,blob);if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;audio.load();await audio.play();hideResumePrompt();if(!opts.noHistory)pushHistory(t.id);setStatus("Playing");renderTracks();updateMediaSession(t,i)}catch(e){console.error(e);setPlayIcon("play");if(!tokenValid()){setStatus("Drive sign-in expired · tap to continue");showResumePrompt(id)}else{setStatus("Playback unavailable");alert(`This track couldn't be loaded.\n\n${e.message}`)}}}
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
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(console.warn));try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch{}
setPlayIcon("play");initAudioToggles();initAuth();
