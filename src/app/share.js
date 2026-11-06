/* ===================== app/share.js: one way out for a picture (PR 8) =====================
   Photo mode (app/photo.js) and the certificate and trophy cards (app/cards.js) both end in a PNG. shareCanvas() is the
   one path, copied from PEW's phoSave: the phone's share sheet when asked for and it can take files, else a download
   link. shareSlug() makes a file-name-safe piece of text; canShareFiles() says whether to show a Share button at all. */
const shareSlug=s=>String(s||"escapement").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"escapement";
const shareStamp=()=>new Date().toISOString().slice(0,16).replace(/[-:T]/g,"");
const canShareFiles=()=>{try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([new Blob(["x"])],"a.png",{type:"image/png"})]}));}catch(e){return false;}};
async function shareCanvas(c,fn,title,share){
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob){toast("Couldn't make the picture here.");return false;}
  if(share){const file=new File([blob],fn,{type:"image/png"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title});return true;}catch(e){if(e&&e.name==="AbortError")return false;}}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),8000);toast("Picture saved.");return true;}
