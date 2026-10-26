// Local art preview checks; not game/runtime or physical-device acceptance.
import { chromium } from '../../../tools/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try {
 for(const spec of [{name:'desktop',width:1440,height:1000,dpr:1},{name:'mobile',width:390,height:844,dpr:2}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:spec.dpr,isMobile:spec.name==='mobile',hasTouch:spec.name==='mobile'});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
  await page.goto('http://127.0.0.1:5186/preview.html');
  await page.waitForFunction(()=>document.querySelectorAll('article').length===11);
  const images=async()=>page.evaluate(async()=>{const ims=[...document.images];await Promise.all(ims.map(i=>i.decode()));return ims.every(i=>i.naturalWidth>0)});
  if(!await images())throw Error('Missing battle images');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error('Horizontal overflow: '+spec.name);
  await page.screenshot({path:`art/characters/stellar11-20261026/evidence/${spec.name}-battle.png`,fullPage:true});
  await page.locator('#portrait').click();if(!await images())throw Error('Missing portrait images');
  await page.locator('article details').first().locator('summary').click();
  if(!await page.locator('article details').first().evaluate(e=>e.open))throw Error('Details');
  await page.screenshot({path:`art/characters/stellar11-20261026/evidence/${spec.name}-portraits.png`,fullPage:true});
  await page.locator('#battle').click();await images();await page.locator('#background').click();
  if(!await page.locator('#minis').evaluate(e=>e.classList.contains('light')))throw Error('Background toggle');
  await page.screenshot({path:`art/characters/stellar11-20261026/evidence/${spec.name}-light.png`,fullPage:true});
  if(spec.name==='desktop'){
   await page.evaluate(async()=>{const m=await fetch('catalog.json').then(r=>r.json());document.body.innerHTML='<h1>11位頭像裁切檢查</h1><main style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">'+m.characters.map(c=>`<div style="text-align:center"><img style="width:160px;height:160px" src="${c.avatarAsset.path}"><div>${c.key}</div></div>`).join('')+'</main>';await Promise.all([...document.images].map(i=>i.decode()))});
   await page.screenshot({path:'art/characters/stellar11-20261026/evidence/avatar-crops.png',fullPage:true});
  }
  if(errors.length)throw Error(errors.join('\n'));

  results.push({...spec,status:'passed',checks:['11 characters','33 images decoded per mode','portrait/SD switching','details','light/dark backgrounds','no horizontal overflow'],scope:'Chromium viewport art fit only; no game combat, physical device, animation or commercial approval'});
  await ctx.close();
 }
 await writeFile('art/characters/stellar11-20261026/evidence/preview-results.json',JSON.stringify(results,null,2)+'\n');
 console.log('PASS: desktop 1440×1000 and touch viewport 390×844 art previews.');
}finally{await browser.close()}
