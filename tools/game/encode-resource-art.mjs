import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();const src='data:image/png;base64,'+(await readFile('art/resources/four-resources-v1.png')).toString('base64');const data=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,512,512);return canvas.toDataURL('image/webp',.86).split(',')[1]},src);await writeFile('art/resources/four-resources-v1.webp',Buffer.from(data,'base64'));}finally{await browser.close();}
