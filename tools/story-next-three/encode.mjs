// Format conversion only; no cropping, recoloring, or edits to character masters.
import { chromium } from '../node_modules/playwright/index.mjs';
import { readFile, writeFile, readdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {const page=await browser.newPage();for(const file of await readdir('art/story-next-three/masters')){
 if(!file.endsWith('.png'))continue;
 const png=await readFile('art/story-next-three/masters/'+file);
 const data=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;c.getContext('2d').drawImage(i,0,0);return c.toDataURL('image/webp',.92)},'data:image/png;base64,'+png.toString('base64'));
 await writeFile('art/story-next-three/web/'+file.replace('.png','.webp'),Buffer.from(data.split(',')[1],'base64'));
}}finally{await browser.close()}
