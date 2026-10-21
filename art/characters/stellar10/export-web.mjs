// Web encoding/framing only. Original PNGs are never rewritten.
// Run from repo root after sourcing scripts/env.sh.
import { chromium } from '../../../tools/node_modules/playwright/index.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('./', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', dir), 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
// Individually checked head crops in original 1024×1536 coordinates.
const crops = {sun:[350,0,340,340],jupiter:[340,0,340,340],saturn:[360,0,340,340],neptune:[340,0,340,340],pluto:[345,0,340,340],nemesis:[345,0,340,340],ganymede:[340,0,340,340],io:[340,0,340,340],titania:[340,0,340,340],ariel:[340,0,340,340]};
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page = await browser.newPage();
 for (const c of catalog.characters) {
  const key = c.id.split('.').at(-1);
  for (const kind of ['portrait','avatar','battle']) {
   const source = kind === 'battle' ? c.battleAsset : c;
   const bytes = await readFile(new URL(source.path,dir));
   if (hash(bytes) !== source.sha256) throw Error('Source hash changed: '+source.path);
   const result = await page.evaluate(async ({data,kind,crop})=>{
    const im = new Image(); im.src=data; await im.decode();
    const canvas = document.createElement('canvas');
    canvas.width = kind==='avatar'?256:kind==='battle'?1024:768;
    canvas.height = kind==='avatar'?256:kind==='battle'?1024:1152;
    const ctx=canvas.getContext('2d');
    let frame;
    if(kind==='avatar') {ctx.drawImage(im,...crop,0,0,256,256);frame={crop};}
    else {
     const scale = kind==='battle'?Math.min(860/im.width,860/im.height):768/im.width;
     const w=im.width*scale,h=im.height*scale,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
     ctx.drawImage(im,x,y,w,h);frame={x,y,scale};
    }
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1,minA=255,maxA=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
     const a=pixels[(y*canvas.width+x)*4+3];minA=Math.min(minA,a);maxA=Math.max(maxA,a);
     if(a>=192){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    }
    return {data:canvas.toDataURL('image/webp',0.92),width:canvas.width,height:canvas.height,frame,alphaRange:[minA,maxA],bounds:[minX,minY,maxX+1,maxY+1]};
   },{data:'data:image/png;base64,'+bytes.toString('base64'),kind,crop:crops[key]});
   const path=kind==='avatar'?`avatars/${key}.webp`:kind==='battle'?`web/${key}-battle.webp`:`web/${key}.webp`;
   const output=Buffer.from(result.data.split(',')[1],'base64');
   await writeFile(new URL(path,dir),output);
   const asset={assetId:kind==='battle'?source.assetId+'-web':`stellaart:asset.${key}-${kind}-web`,characterId:c.id,path,preview:path,sha256:hash(output),width:result.width,height:result.height,colorSpace:'sRGB',alpha:'straight',use:kind==='avatar'?'portrait-face-crop':kind==='battle'?'static-SD-battle-web':'full-body-portrait-web',sourceOriginalSha256:c.sha256,sourceOriginalVersion:c.assetVersion,sourceAssetSha256:source.sha256,sourcePath:source.path,source:{tool:'Chromium Canvas WebP 0.92',operations:kind==='avatar'?'individual face crop, scale, encode':'uniform scale, transparent framing, encode',frame:result.frame},pivot:kind==='avatar'?{x:0.5,y:0.5}:{x:(result.bounds[0]+result.bounds[2])/2/result.width,y:result.bounds[3]/result.height},safeArea:{bodyBounds:result.bounds,marginPx:[result.bounds[0],result.bounds[1],result.width-result.bounds[2],result.height-result.bounds[3]]},alphaRange:result.alphaRange,reviewStatus:'awaiting-user-review',animation:null};
   if(kind==='avatar') c.avatarAsset=asset;
   else if(kind==='battle') c.battleAsset.webAsset=asset;
   else c.webAsset=asset;
  }
 }
 await writeFile(new URL('catalog.json',dir),JSON.stringify(catalog,null,2)+'\n');
 console.log('Encoded 10 portraits, 10 avatars, 10 static SD WebP files. Original PNGs retained.');
} finally {await browser.close();}
