// MyMusic Alpha 1.9.8 — sans-serif display typography, responsive contained cover art, Linear Dodge (Add) vinyl overlay & updated app icon.
const CONFIG={CLIENT_ID:"249160747385-th1vq4sp43pjk40vle5jrnojd965morb.apps.googleusercontent.com",ROOT_FOLDER_ID:"1cdOpz-ziw1JcrtHaQupqnDMRZzviUiCJ"};
const SUPPORTED=new Set(["mp3","wav","m4a","aac","flac","mp4"]);
const $=id=>document.getElementById(id);
let audio=$("audio"),standbyAudio=document.createElement("audio");
standbyAudio.preload="metadata";
let tokenClient=null,accessToken=null,tracks=[],queue=[],currentIndex=-1,currentObjectUrl=null,standbyObjectUrl=null,currentArtUrl=null,currentFolderId=CONFIG.ROOT_FOLDER_ID,currentFolderPath=[],folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}],scanBusy=false,authPending=false,allSongsMode=false,tokenExpiresAt=0,pendingActions=[],pendingResumeTrackId=null;
let audioCtx=null,deckNodes=new WeakMap(),gainCache=new Map(),levelEnabled=false,crossfadeEnabled=false,crossfadeActive=false,crossfadeTimer=null,prefetchedNextId=null,prefetchedBlob=null;
const LEVEL_KEY="mymusic_level_v1",XFADE_KEY="mymusic_xfade_v1",TARGET_RMS=0.14,XFADE_SEC=4;
const extOf=n=>String(n).split(".").pop().toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatTime=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`:"0:00";
function setStatus(s){$("status").textContent=s}
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

// ---- Loudness leveling (Web Audio RMS analyzer + per-deck GainNode + safety limiter) & Crossfade ----
function ensureAudioGraph(el){
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return null;
  if(!audioCtx)audioCtx=new Ctx();
  if(audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});
  if(!deckNodes.has(el)){
    const src=audioCtx.createMediaElementSource(el);
    const levelGain=audioCtx.createGain();
    const xfadeGain=audioCtx.createGain();
    const comp=audioCtx.createDynamicsCompressor();
    comp.threshold.value=-1.5;comp.knee.value=6;comp.ratio.value=12;comp.attack.value=0.003;comp.release.value=0.15;
    src.connect(levelGain);levelGain.connect(xfadeGain);xfadeGain.connect(comp);comp.connect(audioCtx.destination);
    deckNodes.set(el,{levelGain,xfadeGain,trackGain:1});
  }
  return deckNodes.get(el);
}
async function measureTrackGain(id,blob){
  if(gainCache.has(id))return gainCache.get(id);
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return 1;
  try{
    if(!audioCtx)audioCtx=new Ctx();
    const buf=await blob.arrayBuffer();
    const decoded=await audioCtx.decodeAudioData(buf.slice(0));
    const ch=decoded.getChannelData(0);
    let sumSq=0,count=0;
    const step=Math.max(1,Math.floor(ch.length/120000));
    for(let i=0;i<ch.length;i+=step){const v=ch[i];if(Math.abs(v)>0.005){sumSq+=v*v;count++}}
    const rms=count?Math.sqrt(sumSq/count):TARGET_RMS;
    const gain=rms>0.001?Math.min(3.0,Math.max(0.35,TARGET_RMS/rms)):1;
    gainCache.set(id,gain);
    return gain;
  }catch(e){console.warn("Loudness analysis skipped",e);gainCache.set(id,1);return 1}
}
function applyLevelGain(el,trackId){
  const nodes=ensureAudioGraph(el);
  if(!nodes)return;
  const g=levelEnabled?(gainCache.get(trackId)||1):1;
  nodes.trackGain=g;
  nodes.levelGain.gain.setTargetAtTime(g,audioCtx.currentTime,0.03);
}
function initAudioToggles(){
  try{levelEnabled=localStorage.getItem(LEVEL_KEY)==="yes"}catch{}
  try{crossfadeEnabled=localStorage.getItem(XFADE_KEY)==="yes"}catch{}
  updateToggleButtons();
}
function updateToggleButtons(){
  if($("levelToggleBtn")){$("levelToggleBtn").setAttribute("aria-pressed",String(levelEnabled));$("levelToggleBtn").classList.toggle("active",levelEnabled);$("levelToggleBtn").textContent=levelEnabled?"Level: On":"Level: Off"}
  if($("crossfadeToggleBtn")){$("crossfadeToggleBtn").setAttribute("aria-pressed",String(crossfadeEnabled));$("crossfadeToggleBtn").classList.toggle("active",crossfadeEnabled);$("crossfadeToggleBtn").textContent=crossfadeEnabled?"Crossfade: On":"Crossfade: Off"}
}
function toggleLeveling(){
  levelEnabled=!levelEnabled;
  try{localStorage.setItem(LEVEL_KEY,levelEnabled?"yes":"no")}catch{}
  updateToggleButtons();
  const cur=queue[currentIndex];
  if(cur)applyLevelGain(audio,cur.id);
}
function toggleCrossfade(){
  crossfadeEnabled=!crossfadeEnabled;
  try{localStorage.setItem(XFADE_KEY,crossfadeEnabled?"yes":"no")}catch{}
  updateToggleButtons();
  if(crossfadeEnabled)prefetchNextTrack();
}
function cancelCrossfade(){
  if(crossfadeTimer){clearInterval(crossfadeTimer);crossfadeTimer=null}
  crossfadeActive=false;
  try{standbyAudio.pause();standbyAudio.removeAttribute("src")}catch{}
  const nodes=deckNodes.get(audio);
  if(nodes&&audioCtx)nodes.xfadeGain.gain.setValueAtTime(1,audioCtx.currentTime);
}
async function prefetchNextTrack(){
  if(!crossfadeEnabled||queue.length<2||currentIndex<0||!tokenValid())return;
  const nextTrack=queue[(currentIndex+1)%queue.length];
  if(!nextTrack||prefetchedNextId===nextTrack.id)return;
  try{
    prefetchedNextId=nextTrack.id;
    const blob=await downloadFile(nextTrack.id);
    if(prefetchedNextId===nextTrack.id){prefetchedBlob=blob;measureTrackGain(nextTrack.id,blob)}
  }catch{prefetchedNextId=null;prefetchedBlob=null}
}
async function startCrossfadeToNext(){
  if(crossfadeActive||!crossfadeEnabled||queue.length<2)return;
  const nextIdx=(currentIndex+1)%queue.length;
  const nextTrack=queue[nextIdx];
  if(!nextTrack)return;
  crossfadeActive=true;
  try{
    let blob=prefetchedNextId===nextTrack.id&&prefetchedBlob?prefetchedBlob:null;
    if(!blob){
      if(!tokenValid()){crossfadeActive=false;return}
      blob=await downloadFile(nextTrack.id);
    }
    prefetchedNextId=null;prefetchedBlob=null;
    await measureTrackGain(nextTrack.id,blob);
    if(standbyObjectUrl)URL.revokeObjectURL(standbyObjectUrl);
    standbyObjectUrl=URL.createObjectURL(blob);
    standbyAudio.src=standbyObjectUrl;
    standbyAudio.volume=audio.volume;
    const outNodes=ensureAudioGraph(audio);
    const inNodes=ensureAudioGraph(standbyAudio);
    if(inNodes&&audioCtx){
      inNodes.levelGain.gain.setValueAtTime(levelEnabled?(gainCache.get(nextTrack.id)||1):1,audioCtx.currentTime);
      inNodes.xfadeGain.gain.setValueAtTime(0.001,audioCtx.currentTime);
    }
    await standbyAudio.play();
    const durationMs=XFADE_SEC*1000,started=performance.now();
    crossfadeTimer=setInterval(()=>{
      const p=Math.min(1,(performance.now()-started)/durationMs);
      const fadeOut=Math.cos(p*Math.PI*0.5),fadeIn=Math.sin(p*Math.PI*0.5);
      if(outNodes&&inNodes&&audioCtx){
        outNodes.xfadeGain.gain.setValueAtTime(Math.max(0.0001,fadeOut),audioCtx.currentTime);
        inNodes.xfadeGain.gain.setValueAtTime(Math.max(0.0001,fadeIn),audioCtx.currentTime);
      }else{
        audio.volume=Math.max(0,Number($("volume").value)*fadeOut);
        standbyAudio.volume=Math.max(0,Number($("volume").value)*fadeIn);
      }
      if(p>=1){
        clearInterval(crossfadeTimer);crossfadeTimer=null;
        audio.pause();
        if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl=standbyObjectUrl;standbyObjectUrl=null;
        const oldMain=audio;audio=standbyAudio;standbyAudio=oldMain;
        bindAudioEvents(audio);
        if(outNodes&&audioCtx)outNodes.xfadeGain.gain.setValueAtTime(1,audioCtx.currentTime);
        if(inNodes&&audioCtx)inNodes.xfadeGain.gain.setValueAtTime(1,audioCtx.currentTime);
        audio.volume=Number($("volume").value);
        currentIndex=nextIdx;
        const i=trackInfo(nextTrack);
        $("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();
        loadArtwork(nextTrack).catch(()=>{});
        renderTracks();
        updateMediaSession(nextTrack,i);
        crossfadeActive=false;
        prefetchNextTrack();
      }
    },60);
  }catch(e){console.warn("Crossfade fallback to normal end",e);crossfadeActive=false}
}

async function driveList(parentId){let pageToken=null,all=[];do{const p=new URLSearchParams({q:`'${parentId}' in parents and trashed=false`,pageSize:"1000",orderBy:"name",fields:"nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,shortcutDetails)"});if(pageToken)p.set("pageToken",pageToken);const res=await fetch(`https://www.googleapis.com/drive/v3/files?${p}`,{headers:{Authorization:`Bearer ${accessToken}`}});if(res.status===401){authExpired();throw new Error("Drive authorization expired ("+res.status+"). Please reconnect.")}if(!res.ok)throw new Error(`Drive API ${res.status}: ${await res.text()}`);const data=await res.json();all.push(...(data.files||[]));pageToken=data.nextPageToken}while(pageToken);return all}
function trackInfo(t){const p=t.path||[],artist=p[0]||"Unknown Artist",release=p.length>1?p[p.length-1]:"Unsorted";return{artist,release,title:t.name.replace(/\.[^.]+$/,"" ).replace(/^\d+[\s._-]+/,""),subtitle:`${artist} · ${release}`}}
async function walkFolder(id,path=[],seen=new Set()){if(seen.has(id))return[];seen.add(id);const items=await driveList(id),out=[];for(const f of items){if(f.mimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.id,[...path,f.name],seen));else if(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.shortcutDetails.targetId,[...path,f.name],seen));else if(SUPPORTED.has(extOf(f.name)))out.push({...f,path,parentId:id,extension:extOf(f.name)})}return out}
function formatCounts(){$("counts").textContent=`${tracks.length} audio files found`}
function renderBreadcrumbs(){$("breadcrumbs").innerHTML=folderStack.map((f,i)=>`${i?'<span class="crumb-sep">›</span>':''}<button type="button" data-depth="${i}">${esc(f.name)}</button>`).join("");$("breadcrumbs").querySelectorAll("button").forEach(b=>b.onclick=()=>navigateTo(Number(b.dataset.depth)))}
function openFolderModal(){$("folderModal").hidden=false;$("folderToggle").setAttribute("aria-expanded","true");document.body.classList.add("folder-modal-open");renderFolderContents()}
function closeFolderModal(){$("folderModal").hidden=true;$("folderToggle").setAttribute("aria-expanded","false");document.body.classList.remove("folder-modal-open")}
function togglePlayerExpand(force){const next=typeof force==="boolean"?force:!document.body.classList.contains("player-expanded");document.body.classList.toggle("player-expanded",next);if($("expandBtn")){$("expandBtn").setAttribute("aria-expanded",String(next));$("expandBtn").textContent=next?"⤡":"⤢";$("expandBtn").title=next?"Collapse player":"Expand player";$("expandBtn").setAttribute("aria-label",next?"Collapse player":"Expand player")}}
async function navigateTo(depth){allSongsMode=false;folderStack=folderStack.slice(0,depth+1);currentFolderId=folderStack.at(-1).id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
async function enterFolder(f){allSongsMode=false;folderStack.push({id:f.id,name:f.name});currentFolderId=f.id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
function renderFolderContents(){renderBreadcrumbs();$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';return withToken(_renderFolderContents).catch(e=>{$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)} · tap Reconnect Drive</div>`})}
async function _renderFolderContents(){$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';try{const items=await driveList(currentFolderId);const dirs=items.filter(f=>f.mimeType==="application/vnd.google-apps.folder"||(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")).sort((a,b)=>a.name.localeCompare(b.name));const local=items.filter(f=>SUPPORTED.has(extOf(f.name))).map(f=>({...f,path:currentFolderPath,parentId:currentFolderId,extension:extOf(f.name)})).sort((a,b)=>a.name.localeCompare(b.name));const rows=dirs.map(f=>`<button type="button" class="folder-row" data-id="${esc(f.mimeType==="application/vnd.google-apps.shortcut"?f.shortcutDetails.targetId:f.id)}" data-name="${esc(f.name)}"><span class="folder-icon">📁</span><span class="folder-label">${esc(f.name)}</span><span class="folder-count">Open ›</span></button>`).join("");$("folderList").innerHTML=(rows||'')+(local.length?`<div class="folder-section-label">TRACKS IN THIS FOLDER</div>`+local.map(t=>`<button type="button" class="folder-track" data-id="${esc(t.id)}"><span>♫</span><span>${esc(trackInfo(t).title)}</span><span>▶</span></button>`).join(""):'')||'<div class="folder-empty">This folder is empty.</div>';$("folderList").querySelectorAll(".folder-row").forEach(b=>b.onclick=()=>enterFolder({id:b.dataset.id,name:b.dataset.name}));$("folderList").querySelectorAll(".folder-track").forEach(b=>b.onclick=()=>{setQueueForFolder(local);playTrackById(b.dataset.id);closeFolderModal()});if($("folderSummary"))$("folderSummary").textContent=`${dirs.length} folders · ${local.length} tracks`}catch(e){console.error(e);$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)}</div>`}}
$("folderClose").onclick=closeFolderModal;$("folderModal").addEventListener("click",e=>{if(e.target.closest("[data-close-folder]"))closeFolderModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("folderModal").hidden)closeFolderModal();else if(document.body.classList.contains("player-expanded"))togglePlayerExpand(false)}});
function setQueueForFolder(list){queue=[...list].sort((a,b)=>a.name.localeCompare(b.name));currentIndex=-1;prefetchedNextId=null;prefetchedBlob=null}
function renderTracks(){const term=$("searchInput").value.trim().toLowerCase();const visible=(allSongsMode?tracks:tracks.filter(t=>(t.parentId===currentFolderId))).filter(t=>{const i=trackInfo(t);return`${i.title} ${i.artist} ${i.release}`.toLowerCase().includes(term)});$("trackList").innerHTML=visible.map(t=>`<button type="button" class="track ${queue[currentIndex]?.id===t.id?"current":""}" data-id="${esc(t.id)}"><span class="thumb">♫</span><span class="track-info"><span class="track-name">${esc(trackInfo(t).title)}</span><span class="track-meta">${esc(t.name)}</span></span><span>▶</span></button>`).join("");$("trackList").querySelectorAll(".track").forEach(b=>b.onclick=()=>{setQueueForFolder(visible);playTrackById(b.dataset.id)});$("emptyState").hidden=visible.length>0;$("emptyState").textContent="No tracks in this folder. Browse into a folder containing music, or choose All songs."}
async function scanLibrary(){if(!accessToken||scanBusy)return;scanBusy=true;setStatus("Scanning Drive…");$("refreshBtn").disabled=true;try{tracks=await walkFolder(CONFIG.ROOT_FOLDER_ID);tracks.sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));queue=[...tracks];currentIndex=-1;folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];currentFolderId=CONFIG.ROOT_FOLDER_ID;currentFolderPath=[];allSongsMode=false;saveLibrary();formatCounts();renderTracks();setStatus(`Library scan complete · ${tracks.length} tracks`);if(!$("folderModal").hidden)renderFolderContents()}catch(e){console.error(e);setStatus("Drive connection needs attention");if(tokenValid())alert("Couldn't scan MyMusic.\n\n"+e.message)}finally{scanBusy=false;$("refreshBtn").disabled=false}}
function showAllSongs(){
  currentFolderId=CONFIG.ROOT_FOLDER_ID;
  folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];
  currentFolderPath=[];
  allSongsMode=true;
  queue=[...tracks].sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));
  currentIndex=-1;
  prefetchedNextId=null;prefetchedBlob=null;
  renderTracks();
  closeFolderModal();
  setStatus(`Showing all ${tracks.length} songs`);
}
$("searchInput").addEventListener("input",renderTracks);

document.addEventListener("click",event=>{
  const browse=event.target.closest("#folderToggle, #expandedBrowseBtn");
  if(browse){
    event.preventDefault();
    openFolderModal();
    return;
  }
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
  const xf=event.target.closest("#crossfadeToggleBtn");
  if(xf){
    event.preventDefault();
    toggleCrossfade();
  }
});

window.MyMusicApp=Object.freeze({
  openFolderModal,
  closeFolderModal,
  showAllSongs,
  togglePlayerExpand,
  toggleLeveling,
  toggleCrossfade,
  getNavigationState:()=>({
    browseButton:!!$("folderToggle"),
    expandedBrowseButton:!!$("expandedBrowseBtn"),
    allSongsButton:!!$("allSongsBtn"),
    expandButton:!!$("expandBtn"),
    playerExpanded:document.body.classList.contains("player-expanded"),
    modalHidden:$("folderModal")?.hidden,
    levelEnabled,
    crossfadeEnabled,
    trackCount:tracks.length,
    allSongsMode,
    currentFolderId
  })
});
async function downloadFile(id){const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});if(r.status===401){authExpired();throw new Error("Drive authorization expired. Please reconnect.")}if(!r.ok)throw new Error(`Couldn't download file (${r.status})`);return r.blob()}
async function loadArtwork(track){if(currentArtUrl){URL.revokeObjectURL(currentArtUrl);currentArtUrl=null}$("artwork").hidden=true;$("artPlaceholder").hidden=false;const files=await driveList(track.parentId);const art=files.find(f=>/\.(jpe?g|png|webp)$/i.test(f.name));if(art){const blob=await downloadFile(art.id);currentArtUrl=URL.createObjectURL(blob);$("artwork").src=currentArtUrl;$("artwork").hidden=false;$("artPlaceholder").hidden=true}}
function playTrackById(id,fromAutoplay=false){
  if(fromAutoplay&&!tokenValid()){
    const idx=queue.findIndex(t=>t.id===id);
    if(idx>=0){currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();renderTracks()}
    $("playBtn").textContent="▶";
    setStatus("Drive sign-in expired · tap to continue");
    showResumePrompt(id);
    return Promise.resolve();
  }
  hideResumePrompt();
  return withToken(()=>_playTrackById(id)).catch(e=>{console.warn(e);$("playBtn").textContent="▶";setStatus("Drive sign-in needed · tap to continue");showResumePrompt(id)});
}
async function _playTrackById(id){const idx=queue.findIndex(t=>t.id===id);if(idx<0)return;cancelCrossfade();currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();$("playBtn").textContent="…";setStatus("Loading track…");try{const blobPromise=prefetchedNextId===t.id&&prefetchedBlob?Promise.resolve(prefetchedBlob):downloadFile(t.id);prefetchedNextId=null;prefetchedBlob=null;const [blob]=await Promise.all([blobPromise,loadArtwork(t).catch(err=>{console.warn("Artwork unavailable",err)})]);await measureTrackGain(t.id,blob);applyLevelGain(audio,t.id);if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;audio.load();await audio.play();hideResumePrompt();setStatus("Playing");renderTracks();updateMediaSession(t,i)}catch(e){console.error(e);$("playBtn").textContent="▶";if(!tokenValid()){setStatus("Drive sign-in expired · tap to continue");showResumePrompt(id)}else{setStatus("Playback unavailable");alert(`This track couldn't be loaded.\n\n${e.message}`)}}}
function updateMediaSession(t,i){if(!("mediaSession"in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:i.title,artist:i.artist,album:i.release,artwork:currentArtUrl?[{src:currentArtUrl,sizes:"512x512"}]:[]});const h={play:()=>audio.play(),pause:()=>audio.pause(),previoustrack:playPrevious,nexttrack:()=>playNext(false),seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-15),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15)};for(const[a,fn]of Object.entries(h)){try{navigator.mediaSession.setActionHandler(a,fn)}catch{}}}
function playNext(fromAutoplay=false){if(queue.length)playTrackById(queue[(currentIndex+1)%queue.length].id,fromAutoplay)}function playPrevious(){if(!queue.length)return;if(audio.currentTime>3){audio.currentTime=0;return}playTrackById(queue[(currentIndex-1+queue.length)%queue.length].id,false)}
$("playBtn").onclick=()=>{if(pendingResumeTrackId){playTrackById(pendingResumeTrackId,false);return}if(!audio.src){if(queue.length)playTrackById(queue[0].id,false)}else if(audio.paused){if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});audio.play()}else audio.pause()};$("nextBtn").onclick=()=>playNext(false);$("backBtn").onclick=playPrevious;$("rewindBtn").onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-15);$("forwardBtn").onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);
function bindAudioEvents(el){
  el.onplay=()=>{if(el!==audio)return;$("playBtn").textContent="Ⅱ";if(navigator.mediaSession)navigator.mediaSession.playbackState="playing"};
  el.onpause=()=>{if(el!==audio||crossfadeActive)return;$("playBtn").textContent="▶";if(navigator.mediaSession)navigator.mediaSession.playbackState="paused"};
  el.onended=()=>{if(el!==audio||crossfadeActive)return;playNext(true)};
  el.ontimeupdate=()=>{
    if(el!==audio||!audio.duration)return;
    $("seek").value=String(Math.round(audio.currentTime/audio.duration*1000));
    $("elapsed").textContent=formatTime(audio.currentTime);
    $("duration").textContent=formatTime(audio.duration);
    const rem=audio.duration-audio.currentTime;
    if(crossfadeEnabled&&rem<12&&rem>XFADE_SEC&&!prefetchedNextId)prefetchNextTrack();
    if(crossfadeEnabled&&!crossfadeActive&&audio.duration>XFADE_SEC*2.5&&rem<=XFADE_SEC&&rem>0.25)startCrossfadeToNext();
  };
}
bindAudioEvents(audio);
$("seek").oninput=()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/1000*audio.duration};$("volume").oninput=()=>{audio.volume=Number($("volume").value);if(!crossfadeActive)standbyAudio.volume=Number($("volume").value)};audio.volume=.85;standbyAudio.volume=.85;
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(console.warn));initAudioToggles();initAuth();
