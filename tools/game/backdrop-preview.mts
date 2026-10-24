// Review captures: each sector backdrop at the first-sector texel density (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const out=process.argv[2]??'.artifacts/backdrop';
const regions=(process.argv[3]??'m1:helios,original:region.solar,original:region.virgo').split(',');
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
async function seed(page:any,s:any){await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});}
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const id of regions){
   const save=newSave(p,Date.now(),'backdrop');save.storySeen=p.quests.map(q=>q.id);save.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
   const r=p.regions.find(r=>r.id===id)!;save.region=id;save.x=r.startX;save.y=r.startY;
   await seed(page,save);await page.waitForTimeout(2500);
   await page.locator('#space').screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${id.replace(/[:.]/g,'_')}.png`});
  }
  await context.close();
 }
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
