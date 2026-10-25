// Review captures: desktop operator column on the right (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const out=process.argv[2]??'.artifacts/desktop-squad';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors:string[]=[];
try{
 for(const [w,h] of [[1440,1000],[1280,720]]){
  const context=await browser.newContext({viewport:{width:w,height:h}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const save=newSave(p,Date.now(),'squad');save.storySeen=p.quests.map(q=>q.id);save.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
  p.characters.filter(c=>!save.roster.some(o=>o.definition===c.id)).slice(0,3).forEach((c,i)=>save.roster.push({id:'sq-'+i,definition:c.id,level:1,hp:400,resonance:0} as any));
  save.team=save.roster.slice(0,6).map(o=>o.id);
  await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save});
  await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(2500);
  await page.screenshot({path:`${out}/d${w}.png`});await context.close();
 }
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
