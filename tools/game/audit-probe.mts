// Review probe: first-load weight and panel sanity on a phone viewport (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors:string[]=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 let bytes=0,count=0;const big:[number,string][]=[];
 page.on('response',async r=>{try{const b=(await r.body()).length;bytes+=b;count++;big.push([b,r.url().replace(server.url,'')])}catch{}});
 const t0=Date.now();await page.goto(server.url+'#/play');await page.waitForSelector('canvas',{timeout:90000});const tCanvas=Date.now()-t0;
 await page.waitForTimeout(4000);
 console.log('first load: canvas',tCanvas,'ms; requests',count,'; MiB',(bytes/2**20).toFixed(1));
 big.sort((a,b)=>b[0]-a[0]);console.log('largest',big.slice(0,6).map(([b,u])=>`${(b/2**20).toFixed(2)}MiB ${u}`).join(' | '));
 await page.screenshot({path:'.artifacts/audit/start.png'});console.log('overlay text:',(await page.locator('#overlay').innerText()).slice(0,200).replace(/\n/g,' | '));console.log('scene:',await page.locator('.story-scene').count());for(let i=0;i<4;i++){const s=page.locator('[data-action="story-skip"]:visible, [data-action="flow-skip"]:visible, [data-action="flow-close"]:visible');if(await s.count()){await s.first().click();await page.waitForTimeout(600);}}
 for(const id of ['summon','research','challenges','quests','planets','roster','formation','archive','regions']){
  const b=page.locator(`[data-action="panel"][data-id="${id}"], [data-action="journal-open"][data-id="${id}"]`).first();
  if(!(await b.count())){console.log(id,'no button');continue;}
  await b.click().catch(e=>console.log(id,'click fail',String(e).slice(0,80)));await page.waitForTimeout(500);
  const ov=await page.evaluate(()=>({w:document.documentElement.scrollWidth,iw:innerWidth,modal:!!document.querySelector('.modal')}));
  console.log(id,'modal',ov.modal,'overflow',ov.w>ov.iw);
  await page.screenshot({path:`.artifacts/audit/${id}.png`});
  const close=page.locator('.modal [data-action="close"]').first();if(await close.count())await close.click();await page.waitForTimeout(200);
 }
}finally{await browser.close();await server.close();}
console.log('errors',errors.length,errors.slice(0,5));
