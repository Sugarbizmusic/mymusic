// MyMusic Alpha 1.9.2 — refreshed service-worker assets and reliable app updates.
const CONFIG={CLIENT_ID:"249160747385-th1vq4sp43pjk40vle5jrnojd965morb.apps.googleusercontent.com",ROOT_FOLDER_ID:"1cdOpz-ziw1JcrtHaQupqnDMRZzviUiCJ"};
const SUPPORTED=new Set(["mp3","wav","m4a","aac","flac","mp4"]);
const $=id=>document.getElementById(id),audio=$("audio");
let tokenClient=null,accessToken=null,tracks=[],queue=[],currentIndex=-1,currentObjectUrl=null,currentArtUrl=null,currentFolderId=CONFIG.ROOT_FOLDER_ID,currentFolderPath=[],folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}],scanBusy=false,authPending=false,allSongsMode=false;
const extOf=n=>String(n).split(".").pop().toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatTime=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`:"0:00";
function setStatus(s){$("status").textContent=s}
function showConnectScreen(message="Connect Google Drive to load your music"){$("welcome").hidden=false;$("library").hidden=true;$("connectBtn").textContent="Reconnect Drive";setStatus(message)}
function initAuth(){if(!window.google?.accounts?.oauth2){setTimeout(initAuth,250);return}tokenClient=google.accounts.oauth2.initTokenClient({client_id:CONFIG.CLIENT_ID,scope:"https://www.googleapis.com/auth/drive.readonly",callback:async r=>{authPending=false;if(r.error){accessToken=null;showConnectScreen("Drive connection expired. Please reconnect.");return}accessToken=r.access_token;try{localStorage.setItem("mymusic_drive_authorized","yes")}catch{}$("welcome").hidden=true;$("library").hidden=false;$("connectBtn").textContent="Connected";await scanLibrary()}});try{if(localStorage.getItem("mymusic_drive_authorized")==="yes"){authPending=true;tokenClient.requestAccessToken({prompt:""})}else showConnectScreen()}catch{showConnectScreen()}}
function connectDrive(){if(!tokenClient){alert("Google sign-in is still loading. Try again shortly.");return}authPending=true;tokenClient.requestAccessToken({prompt:"consent"})}
$("connectBtn").onclick=connectDrive;$("welcomeConnectBtn").onclick=connectDrive;$("refreshBtn").onclick=scanLibrary;
async function driveList(parentId){let pageToken=null,all=[];do{const p=new URLSearchParams({q:`'${parentId}' in parents and trashed=false`,pageSize:"1000",orderBy:"name",fields:"nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,shortcutDetails)"});if(pageToken)p.set("pageToken",pageToken);const res=await fetch(`https://www.googleapis.com/drive/v3/files?${p}`,{headers:{Authorization:`Bearer ${accessToken}`}});if(res.status===401||res.status===403){accessToken=null;showConnectScreen("Drive access expired or was revoked. Reconnect to continue.");throw new Error("Drive authorization expired ("+res.status+"). Please reconnect.")}if(!res.ok)throw new Error(`Drive API ${res.status}: ${await res.text()}`);const data=await res.json();all.push(...(data.files||[]));pageToken=data.nextPageToken}while(pageToken);return all}
function trackInfo(t){const p=t.path||[],artist=p[0]||"Unknown Artist",release=p.length>1?p[p.length-1]:"Unsorted";return{artist,release,title:t.name.replace(/\.[^.]+$/,"" ).replace(/^\d+[\s._-]+/,""),subtitle:`${artist} · ${release}`}}
async function walkFolder(id,path=[],seen=new Set()){if(seen.has(id))return[];seen.add(id);const items=await driveList(id),out=[];for(const f of items){if(f.mimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.id,[...path,f.name],seen));else if(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")out.push(...await walkFolder(f.shortcutDetails.targetId,[...path,f.name],seen));else if(SUPPORTED.has(extOf(f.name)))out.push({...f,path,parentId:id,extension:extOf(f.name)})}return out}
function formatCounts(){$("counts").textContent=`${tracks.length} audio files found`}
function renderBreadcrumbs(){$("breadcrumbs").innerHTML=folderStack.map((f,i)=>`${i?'<span class="crumb-sep">›</span>':''}<button type="button" data-depth="${i}">${esc(f.name)}</button>`).join("");$("breadcrumbs").querySelectorAll("button").forEach(b=>b.onclick=()=>navigateTo(Number(b.dataset.depth)))}
function openFolderModal(){$("folderModal").hidden=false;$("folderToggle").setAttribute("aria-expanded","true");document.body.classList.add("folder-modal-open");renderFolderContents()}
function closeFolderModal(){$("folderModal").hidden=true;$("folderToggle").setAttribute("aria-expanded","false");document.body.classList.remove("folder-modal-open")}
async function navigateTo(depth){allSongsMode=false;folderStack=folderStack.slice(0,depth+1);currentFolderId=folderStack.at(-1).id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
async function enterFolder(f){allSongsMode=false;folderStack.push({id:f.id,name:f.name});currentFolderId=f.id;currentFolderPath=folderStack.slice(1).map(x=>x.name);await renderFolderContents();renderTracks()}
async function renderFolderContents(){renderBreadcrumbs();$("folderList").innerHTML='<div class="folder-empty">Loading folder…</div>';try{const items=await driveList(currentFolderId);const dirs=items.filter(f=>f.mimeType==="application/vnd.google-apps.folder"||(f.mimeType==="application/vnd.google-apps.shortcut"&&f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder")).sort((a,b)=>a.name.localeCompare(b.name));const local=items.filter(f=>SUPPORTED.has(extOf(f.name))).map(f=>({...f,path:currentFolderPath,parentId:currentFolderId,extension:extOf(f.name)})).sort((a,b)=>a.name.localeCompare(b.name));const rows=dirs.map(f=>`<button type="button" class="folder-row" data-id="${esc(f.mimeType==="application/vnd.google-apps.shortcut"?f.shortcutDetails.targetId:f.id)}" data-name="${esc(f.name)}"><span class="folder-icon">📁</span><span class="folder-label">${esc(f.name)}</span><span class="folder-count">Open ›</span></button>`).join("");$("folderList").innerHTML=(rows||'')+(local.length?`<div class="folder-section-label">TRACKS IN THIS FOLDER</div>`+local.map(t=>`<button type="button" class="folder-track" data-id="${esc(t.id)}"><span>♫</span><span>${esc(trackInfo(t).title)}</span><span>▶</span></button>`).join(""):'')||'<div class="folder-empty">This folder is empty.</div>';$("folderList").querySelectorAll(".folder-row").forEach(b=>b.onclick=()=>enterFolder({id:b.dataset.id,name:b.dataset.name}));$("folderList").querySelectorAll(".folder-track").forEach(b=>b.onclick=()=>{setQueueForFolder(local);playTrackById(b.dataset.id);closeFolderModal()});if($("folderSummary"))$("folderSummary").textContent=`${dirs.length} folders · ${local.length} tracks`}catch(e){console.error(e);$("folderList").innerHTML=`<div class="folder-empty">${esc(e.message)}</div>`}}
$("folderClose").onclick=closeFolderModal;$("folderModal").addEventListener("click",e=>{if(e.target.closest("[data-close-folder]"))closeFolderModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("folderModal").hidden)closeFolderModal()});
function setQueueForFolder(list){queue=[...list].sort((a,b)=>a.name.localeCompare(b.name));currentIndex=-1}
function renderTracks(){const term=$("searchInput").value.trim().toLowerCase();const visible=(allSongsMode?tracks:tracks.filter(t=>(t.parentId===currentFolderId))).filter(t=>{const i=trackInfo(t);return`${i.title} ${i.artist} ${i.release}`.toLowerCase().includes(term)});$("trackList").innerHTML=visible.map(t=>`<button type="button" class="track ${queue[currentIndex]?.id===t.id?"current":""}" data-id="${esc(t.id)}"><span class="thumb">♫</span><span class="track-info"><span class="track-name">${esc(trackInfo(t).title)}</span><span class="track-meta">${esc(t.name)}</span></span><span>▶</span></button>`).join("");$("trackList").querySelectorAll(".track").forEach(b=>b.onclick=()=>{setQueueForFolder(visible);playTrackById(b.dataset.id)});$("emptyState").hidden=visible.length>0;$("emptyState").textContent="No tracks in this folder. Browse into a folder containing music, or choose All songs."}
async function scanLibrary(){if(!accessToken||scanBusy)return;scanBusy=true;setStatus("Scanning Drive…");$("refreshBtn").disabled=true;try{tracks=await walkFolder(CONFIG.ROOT_FOLDER_ID);tracks.sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));queue=[...tracks];currentIndex=-1;folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];currentFolderId=CONFIG.ROOT_FOLDER_ID;currentFolderPath=[];allSongsMode=false;formatCounts();renderTracks();setStatus(`Library scan complete · ${tracks.length} tracks`);if(!$ ("folderModal").hidden)renderFolderContents()}catch(e){console.error(e);setStatus("Drive connection needs attention");if(accessToken)alert("Couldn't scan MyMusic.\n\n"+e.message)}finally{scanBusy=false;$("refreshBtn").disabled=false}}
function showAllSongs(){
  currentFolderId=CONFIG.ROOT_FOLDER_ID;
  folderStack=[{id:CONFIG.ROOT_FOLDER_ID,name:"MyMusic"}];
  currentFolderPath=[];
  allSongsMode=true;
  queue=[...tracks].sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));
  currentIndex=-1;
  renderTracks();
  closeFolderModal();
  setStatus(`Showing all ${tracks.length} songs`);
}
$("searchInput").addEventListener("input",renderTracks);

// Delegated navigation handlers: these survive changes to button markup and avoid
// relying on element-specific onclick properties.
document.addEventListener("click",event=>{
  const browse=event.target.closest("#folderToggle");
  if(browse){
    event.preventDefault();
    openFolderModal();
    return;
  }
  const all=event.target.closest("#allSongsBtn");
  if(all){
    event.preventDefault();
    showAllSongs();
  }
});

// Expose a small diagnostic/control surface for browser testing.
window.MyMusicApp=Object.freeze({
  openFolderModal,
  closeFolderModal,
  showAllSongs,
  getNavigationState:()=>({
    browseButton:!!$("folderToggle"),
    allSongsButton:!!$("allSongsBtn"),
    modalHidden:$("folderModal")?.hidden,
    trackCount:tracks.length,
    allSongsMode,
    currentFolderId
  })
});
async function downloadFile(id){const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});if(r.status===401||r.status===403){accessToken=null;showConnectScreen("Drive access expired. Reconnect to continue.");throw new Error("Drive authorization expired. Please reconnect.")}if(!r.ok)throw new Error(`Couldn't download file (${r.status})`);return r.blob()}
async function loadArtwork(track){if(currentArtUrl){URL.revokeObjectURL(currentArtUrl);currentArtUrl=null}$("artwork").hidden=true;$("artPlaceholder").hidden=false;const files=await driveList(track.parentId);const art=files.find(f=>/\.(jpe?g|png|webp)$/i.test(f.name));if(art){const blob=await downloadFile(art.id);currentArtUrl=URL.createObjectURL(blob);$("artwork").src=currentArtUrl;$("artwork").hidden=false;$("artPlaceholder").hidden=true}}
async function playTrackById(id){const idx=queue.findIndex(t=>t.id===id);if(idx<0)return;currentIndex=idx;const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=i.subtitle;$("queueLabel").textContent=i.artist.toUpperCase();$("playBtn").textContent="…";setStatus("Loading track…");try{const [blob]=await Promise.all([downloadFile(t.id),loadArtwork(t).catch(err=>{console.warn("Artwork unavailable",err)})]);if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;audio.load();await audio.play();setStatus("Playing");renderTracks();updateMediaSession(t,i)}catch(e){console.error(e);$("playBtn").textContent="▶";setStatus("Playback unavailable");alert(`This track couldn't be loaded.\n\n${e.message}`)}}
function updateMediaSession(t,i){if(!("mediaSession"in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:i.title,artist:i.artist,album:i.release,artwork:currentArtUrl?[{src:currentArtUrl,sizes:"512x512"}]:[]});const h={play:()=>audio.play(),pause:()=>audio.pause(),previoustrack:playPrevious,nexttrack:playNext,seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-15),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15)};for(const[a,fn]of Object.entries(h)){try{navigator.mediaSession.setActionHandler(a,fn)}catch{}}}
function playNext(){if(queue.length)playTrackById(queue[(currentIndex+1)%queue.length].id)}function playPrevious(){if(!queue.length)return;if(audio.currentTime>3){audio.currentTime=0;return}playTrackById(queue[(currentIndex-1+queue.length)%queue.length].id)}
$("playBtn").onclick=()=>{if(!audio.src){if(queue.length)playTrackById(queue[0].id)}else if(audio.paused)audio.play();else audio.pause()};$("nextBtn").onclick=playNext;$("backBtn").onclick=playPrevious;$("rewindBtn").onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-15);$("forwardBtn").onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);audio.onplay=()=>{$("playBtn").textContent="Ⅱ";if(navigator.mediaSession)navigator.mediaSession.playbackState="playing"};audio.onpause=()=>{$("playBtn").textContent="▶";if(navigator.mediaSession)navigator.mediaSession.playbackState="paused"};audio.onended=playNext;audio.ontimeupdate=()=>{if(!audio.duration)return;$("seek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("elapsed").textContent=formatTime(audio.currentTime);$("duration").textContent=formatTime(audio.duration)};$("seek").oninput=()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/1000*audio.duration};$("volume").oninput=()=>audio.volume=Number($("volume").value);audio.volume=.85;
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(console.warn));initAuth();
