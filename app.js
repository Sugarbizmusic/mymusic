// MyMusic Alpha 1.5 — folder accordion, multi-format playback, remembered Drive authorization.
const CONFIG = {
  CLIENT_ID: "249160747385-th1vq4sp43pjk40vle5jrnojd965morb.apps.googleusercontent.com",
  ROOT_FOLDER_ID: "1cdOpz-ziw1JcrtHaQupqnDMRZzviUiCJ"
};
const SUPPORTED = new Set(["mp3","wav","m4a","aac","flac","mp4"]);
const MIME_BY_EXT = {mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",mp4:"audio/mp4"};
const $ = id => document.getElementById(id), audio = $("audio");
let tokenClient=null, accessToken=null, tracks=[], queue=[], currentIndex=-1, currentObjectUrl=null, currentArtUrl=null, activeFilter="all", currentFolderPath=[];

function setStatus(s){$("status").textContent=s}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function extOf(name){return String(name).split(".").pop().toLowerCase()}
function formatTime(n){if(!Number.isFinite(n))return "0:00";return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`}
let silentAuthAttempt=false;
function showConnectScreen(message="Connect Google Drive to load your music"){
  $("welcome").hidden=false;$("library").hidden=true;
  $("connectBtn").textContent="Connect Google Drive";
  setStatus(message);
}
function initAuth(){
  if(!window.google?.accounts?.oauth2){setTimeout(initAuth,250);return}
  tokenClient=google.accounts.oauth2.initTokenClient({client_id:CONFIG.CLIENT_ID,scope:"https://www.googleapis.com/auth/drive.readonly",callback:async r=>{
    if(r.error){
      accessToken=null;
      if(silentAuthAttempt){
        silentAuthAttempt=false;
        showConnectScreen("Please reconnect Google Drive to continue");
      }else{
        setStatus("Google sign-in failed");
        alert("Google sign-in failed: "+r.error);
      }
      return;
    }
    silentAuthAttempt=false;
    accessToken=r.access_token;
    try{localStorage.setItem("mymusic_drive_authorized","yes")}catch{}
    $("welcome").hidden=true;$("library").hidden=false;$("connectBtn").textContent="Connected";
    await scanLibrary();
  }});
  // GIS access tokens are short-lived. Never save the token itself; ask Google
  // silently for a fresh one whenever the player opens. Existing consent/session
  // normally allows this without another sign-in prompt.
  try{
    if(localStorage.getItem("mymusic_drive_authorized")==="yes"){
      silentAuthAttempt=true;
      tokenClient.requestAccessToken({prompt:""});
    }else{
      showConnectScreen();
    }
  }catch{
    showConnectScreen();
  }
}
function connectDrive(){
  if(!tokenClient){alert("Google sign-in is still loading. Try again shortly.");return}
  silentAuthAttempt=false;
  // User-initiated fallback when silent authorization is unavailable.
  tokenClient.requestAccessToken({prompt:"consent"});
}
$("connectBtn").onclick=connectDrive;$("welcomeConnectBtn").onclick=connectDrive;$("refreshBtn").onclick=scanLibrary;

async function driveList(parentId){
  let pageToken=null,all=[];
  do{
    const p=new URLSearchParams({q:`'${parentId}' in parents and trashed=false`,pageSize:"1000",orderBy:"name",fields:"nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,shortcutDetails)"});
    if(pageToken)p.set("pageToken",pageToken);
    const res=await fetch(`https://www.googleapis.com/drive/v3/files?${p}`,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(!res.ok)throw new Error(`Drive API ${res.status}: ${await res.text()}`);
    const data=await res.json();all.push(...(data.files||[]));pageToken=data.nextPageToken;
  }while(pageToken);
  return all;
}
async function walkFolder(folderId,path=[],visited=new Set()){
  if(visited.has(folderId))return [];visited.add(folderId);
  const children=await driveList(folderId),found=[];
  for(const f of children){
    if(f.mimeType==="application/vnd.google-apps.folder"){
      found.push(...await walkFolder(f.id,[...path,f.name],visited));
    }else if(f.mimeType==="application/vnd.google-apps.shortcut" && f.shortcutDetails?.targetMimeType==="application/vnd.google-apps.folder"){
      found.push(...await walkFolder(f.shortcutDetails.targetId,[...path,f.name],visited));
    }else if(SUPPORTED.has(extOf(f.name))){
      found.push({...f,path,parentId:folderId,extension:extOf(f.name)});
    }
  }
  return found;
}
function trackInfo(t){
  const p=t.path||[],artist=p[0]||"Unknown Artist",release=p.length>1?p[p.length-1]:"Unsorted";
  return {artist,release,title:t.name.replace(/\.[^.]+$/,"").replace(/^\d+[\s._-]+/,""),subtitle:`${artist} · ${release}`};
}
function formatCounts(){
  const counts={};for(const t of tracks)counts[t.extension]=(counts[t.extension]||0)+1;
  const labels=["mp3","wav","m4a","aac","flac","mp4"].filter(x=>counts[x]).map(x=>`${x.toUpperCase()}: ${counts[x]}`);
  $("counts").textContent=`${tracks.length} audio files found${labels.length?" · "+labels.join(" · "):""}`;
}
function isInCurrentFolder(t){
  const p=Array.isArray(t.path)?t.path:[];
  return p.length>=currentFolderPath.length && currentFolderPath.every((part,i)=>p[i]===part);
}
function renderFolderBrowser(){
  const prefix=currentFolderPath.length;
  const folders=[...new Set(tracks.map(t=>(Array.isArray(t.path)?t.path:[])[prefix]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const accordion=$("folderAccordion");
  $("folderSummary").textContent=folders.length?`${folders.length} folder${folders.length===1?"":"s"} here`:"No folders found";
  $("breadcrumbs").innerHTML=[
    `<button type="button" data-depth="0">MyMusic</button>`,
    ...currentFolderPath.map((part,i)=>`<span class="crumb-sep">›</span><button type="button" data-depth="${i+1}">${esc(part)}</button>`)
  ].join("");
  $("breadcrumbs").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    currentFolderPath=currentFolderPath.slice(0,Number(b.dataset.depth));renderTracks();accordion.open=true;
  });
  $("folderList").innerHTML=folders.length?folders.map(name=>{
    const folderTracks=tracks.filter(t=>isInCurrentFolder(t)&&(t.path||[])[prefix]===name);
    return `<button type="button" class="folder-row" data-folder="${esc(name)}"><span class="folder-icon">📁</span><span class="folder-label">${esc(name)}</span><span class="folder-count">${folderTracks.length} ${folderTracks.length===1?"track":"tracks"} ›</span></button>`;
  }).join(""):`<div class="folder-empty">No subfolders at this level.</div>`;
  $("folderList").querySelectorAll(".folder-row").forEach(el=>el.onclick=()=>{
    currentFolderPath.push(el.dataset.folder);renderTracks();accordion.open=true;
  });
  $("allSongsBtn").onclick=()=>{
    currentFolderPath=[];activeFilter="all";
    document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));
    $("searchInput").value="";renderTracks();accordion.open=false;
  };
}
function renderTracks(){
  const term=$("searchInput").value.trim().toLowerCase();
  renderFolderBrowser();
  const visible=tracks.filter(t=>isInCurrentFolder(t)&&(t.path||[]).length===currentFolderPath.length)
    .filter(t=>(activeFilter==="all"||t.extension===activeFilter||(activeFilter==="m4a"&&t.extension==="aac")))
    .filter(t=>{const i=trackInfo(t);return `${i.title} ${i.artist} ${i.release} ${(t.path||[]).join(" ")}`.toLowerCase().includes(term)});
  $("trackList").innerHTML=visible.map(t=>{const i=trackInfo(t),idx=queue.findIndex(q=>q.id===t.id);return `<div class="track ${idx===currentIndex?"current":""}" data-id="${esc(t.id)}"><div class="thumb">♫</div><div class="track-info"><div class="track-name">${esc(i.title)}</div><div class="track-meta">${esc(i.subtitle)}</div></div><span class="format">${t.extension.toUpperCase()}</span><span>▶</span></div>`}).join("");
  $("trackList").querySelectorAll(".track").forEach(el=>el.onclick=()=>playTrackById(el.dataset.id));
  $("emptyState").hidden=visible.length>0||$("folderList").querySelectorAll(".folder-row").length>0;
  $("emptyState").textContent="No tracks in this folder. Open a subfolder or choose All songs.";
}async function scanLibrary(){
  if(!accessToken)return;setStatus("Scanning Drive…");$("trackList").innerHTML="";
  try{tracks=await walkFolder(CONFIG.ROOT_FOLDER_ID);tracks.sort((a,b)=>a.path.join("/").localeCompare(b.path.join("/"))||a.name.localeCompare(b.name));queue=[...tracks];formatCounts();renderTracks();setStatus("Library scan complete");}
  catch(e){console.error(e);setStatus("Could not scan folder");alert("Couldn't scan MyMusic. Check Drive API access.\\n\\n"+e.message)}
}
$("searchInput").oninput=renderTracks;
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;renderTracks()});

async function downloadFile(id){const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});if(!r.ok)throw new Error(`Couldn't download file (${r.status})`);return r.blob()}
async function loadArtwork(track){
  if(currentArtUrl){URL.revokeObjectURL(currentArtUrl);currentArtUrl=null}
  $("artwork").hidden=true;$("artPlaceholder").hidden=false;
  const files=await driveList(track.parentId);
  const art=files.find(f=>/^(artwork|cover|folder)\.(jpe?g|png|webp)$/i.test(f.name))||files.find(f=>/\.(jpe?g|png|webp)$/i.test(f.name));
  if(art){const blob=await downloadFile(art.id);currentArtUrl=URL.createObjectURL(blob);$("artwork").src=currentArtUrl;$("artwork").hidden=false;$("artPlaceholder").hidden=true}
}
async function playTrackById(id){
  const idx=queue.findIndex(t=>t.id===id);if(idx<0)return;currentIndex=idx;
  const t=queue[idx],i=trackInfo(t);$("trackTitle").textContent=i.title;$("trackSubtitle").textContent=`${i.subtitle} · ${t.extension.toUpperCase()}`;$("queueLabel").textContent=i.artist.toUpperCase();$("playBtn").textContent="…";setStatus("Loading track…");
  try{
    if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
    const [blob]=await Promise.all([downloadFile(t.id),loadArtwork(t)]);
    currentObjectUrl=URL.createObjectURL(blob);audio.src=currentObjectUrl;audio.load();
    await audio.play();$("playBtn").textContent="Ⅱ";setStatus("Playing");renderTracks();updateMediaSession(t,i);
  }catch(e){console.error(e);$("playBtn").textContent="▶";setStatus("Playback unavailable");alert(`This file couldn't be played by this browser. The container or audio codec may not be supported.\\n\\n${e.message}`)}
}
function updateMediaSession(t,i){
  if(!("mediaSession"in navigator))return;
  const artwork=currentArtUrl?[{src:currentArtUrl,sizes:"512x512"}]:[];
  navigator.mediaSession.metadata=new MediaMetadata({title:i.title,artist:i.artist,album:i.release,artwork});
  const handlers={play:()=>audio.play(),pause:()=>audio.pause(),previoustrack:playPrevious,nexttrack:playNext,seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-15),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15),seekto:d=>{if(d.seekTime!=null)audio.currentTime=d.seekTime}};
  for(const [a,fn] of Object.entries(handlers)){try{navigator.mediaSession.setActionHandler(a,fn)}catch{}}
}
function playNext(){if(queue.length)playTrackById(queue[(currentIndex+1)%queue.length].id)}
function playPrevious(){if(!queue.length)return;if(audio.currentTime>3){audio.currentTime=0;return}playTrackById(queue[(currentIndex-1+queue.length)%queue.length].id)}
$("playBtn").onclick=()=>{if(!audio.src){if(queue.length)playTrackById(queue[0].id)}else if(audio.paused)audio.play();else audio.pause()};
$("nextBtn").onclick=playNext;$("backBtn").onclick=playPrevious;
$("rewindBtn").onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-15);
$("forwardBtn").onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);
audio.onplay=()=>{$("playBtn").textContent="Ⅱ";if(navigator.mediaSession)navigator.mediaSession.playbackState="playing"};
audio.onpause=()=>{$("playBtn").textContent="▶";if(navigator.mediaSession)navigator.mediaSession.playbackState="paused"};
audio.onended=playNext;
audio.ontimeupdate=()=>{if(!audio.duration)return;$("seek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("elapsed").textContent=formatTime(audio.currentTime);$("duration").textContent=formatTime(audio.duration)};
$("seek").oninput=()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/1000*audio.duration};
$("volume").oninput=()=>audio.volume=Number($("volume").value);audio.volume=.85;
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
initAuth();
