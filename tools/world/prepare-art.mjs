// Delivery transform only: fixed atlas extraction/encoding of imagegen masters.
// Never touches existing character or world masters.
import { chromium } from '../node_modules/playwright/index.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root='art/world/original-world';
const hash=b=>createHash('sha256').update(b).digest('hex');
const enemy=JSON.parse(await readFile(`${root}/enemy-plan.json`,'utf8'));
const planets=JSON.parse(await readFile(`${root}/planet-plan.json`,'utf8'));
const keys=['solar','virgo','leo','southern','canis','northern','cygnus','gemini','taurus','scorpio','sagittarius','cancer','aries','pisces'];
const jobs=[...enemy.map(v=>({...v,name:v.model,key:'enemy-'+Math.min(...v.cidRows),grid:3,master:`${root}/masters/enemy-atlas-0${v.atlas}.png`,size:512})),...planets.map(v=>({...v,name:v.key,key:'planet-'+v.pidRow,grid:4,master:`${root}/masters/planet-atlas-0${v.atlas}.png`,size:384})),...keys.map(key=>({assetId:'original:asset.background-'+key,key:'background-'+key,name:key,grid:1,cell:0,master:`${root}/masters/background-${key}.png`,size:0})),...['stronghold','camp','event','gate'].map(key=>({assetId:'original:asset.node-'+key,key:'node-'+key,name:key,grid:1,cell:0,master:`${root}/masters/node-${key}.png`,size:512}))];
await mkdir(`${root}/web`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const entries=[],assets=[];
try{
 const page=await browser.newPage();
 for(const job of jobs){
  const bytes=await readFile(job.master);
  const result=await page.evaluate(async({data,grid,cell,size})=>{
   const im=new Image();im.src=data;await im.decode();
   const sx=Math.round((cell%grid)*im.width/grid),sy=Math.round(Math.floor(cell/grid)*im.height/grid);
   const sw=Math.round(((cell%grid)+1)*im.width/grid)-sx,sh=Math.round((Math.floor(cell/grid)+1)*im.height/grid)-sy;
   const c=document.createElement('canvas');c.width=size||im.width;c.height=size||im.height;
   const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
   // A 4% transparent delivery gutter isolates neighbouring atlas cells at runtime.
   const pad=size?Math.round(size*.04):0;
   ctx.drawImage(im,sx,sy,sw,sh,pad,pad,c.width-pad*2,c.height-pad*2);
   const rgba=ctx.getImageData(0,0,c.width,c.height).data;
   let opaque=0,transparent=0;for(let i=3;i<rgba.length;i+=4){if(rgba[i]>16)opaque++;if(rgba[i]===0)transparent++;}
   return {data:c.toDataURL('image/webp',.9),width:c.width,height:c.height,opaque,transparent,crop:[sx,sy,sw,sh]};
  },{data:'data:image/png;base64,'+bytes.toString('base64'),grid:job.grid,cell:job.cell,size:job.size});
  if(result.opaque<100)throw Error('Empty artwork '+job.key);
  if(job.size&&result.transparent<100)throw Error('Missing transparency '+job.key);
  const output=Buffer.from(result.data.split(',')[1],'base64');const path=`${root}/web/${job.key}.webp`,runtime=`assets/extensions/original-world/${job.key}.webp`;
  await writeFile(path,output);
  entries.push({id:job.assetId,path,runtime,sha256:hash(output),master:job.master,masterSha256:hash(bytes),type:job.size?'sprite':'background',width:result.width,height:result.height,colorSpace:'sRGB',alpha:!!job.size,pivot:[.5,.5],atlas:{grid:job.grid,cell:job.cell,crop:result.crop},version:'1',bundle:'original:package.world',source:'imagegen; prompt next to master; fixed source identity, original redraw, no OBB pixels',review:'candidate',preview:path});
  assets.push({id:job.assetId,name:job.name,src:runtime,width:result.width,height:result.height,hash:hash(output),review:'candidate'});
 }
 await writeFile(`${root}/media.json`,JSON.stringify(entries,null,2)+'\n');
 await writeFile(`${root}/assets.json`,JSON.stringify(assets,null,2)+'\n');
 const existing=JSON.parse(await readFile('art/catalog/extension-assets.json','utf8')).filter(v=>!v.id.startsWith('original:'));
 await writeFile('art/catalog/extension-assets.json',JSON.stringify([...existing,...entries],null,2)+'\n');
 console.log(`${entries.length} fixed assets encoded, ${entries.reduce((n,e)=>n+e.width*e.height*4,0)} RGBA bytes (all at once)`);
}finally{await browser.close();}
