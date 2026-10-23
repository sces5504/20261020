// Only encode this story pack's new originals; no crop or image editing.
import { chromium } from '../node_modules/playwright/index.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 for(const name of ['kiraba','mitsuba','prologue','blackhole']){
  const png=await readFile(`art/story-first-three/masters/${name}.png`);
  const data=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);return canvas.toDataURL('image/webp',0.92)},'data:image/png;base64,'+png.toString('base64'));
  const out=Buffer.from(data.split(',')[1],'base64');await writeFile(`art/story-first-three/web/${name}.webp`,out);console.log(name,out.length);
 }
}finally{await browser.close()}
