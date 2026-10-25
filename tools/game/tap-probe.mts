// Review probe: which element receives a tap on the phone top-left controls (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();
 const save=newSave(p,Date.now(),'tap');
 await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save});
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(2000);
 const skip=page.locator('[data-action="story-skip"]:visible');if(await skip.count())await skip.first().click();
 await page.waitForTimeout(1000);
 for(const sel of ['.mainline-card button','#missions-toggle','[data-action="panel"][data-id="archive"], .settings-button, header button']){
  const el=page.locator(sel).first();if(!(await el.count())){console.log(sel,'missing');continue;}
  const b=await el.boundingBox();if(!b){console.log(sel,'no box');continue;}
  const hit=await page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e?e.outerHTML.slice(0,160):null},[b.x+b.width/2,b.y+b.height/2]);
  console.log(sel,JSON.stringify(b),'->',hit);
 }
 // count mainline rebuilds over 5s while flying
 await page.evaluate(()=>{(window as any).__m=0;new MutationObserver(()=>(window as any).__m++).observe(document.querySelector('#mainline')!,{childList:true,subtree:true});});
 await page.waitForTimeout(5000);console.log('mainline mutations/5s',await page.evaluate(()=>(window as any).__m));
}finally{await browser.close();await server.close();}
