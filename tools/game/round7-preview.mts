// Review captures for round-7 feedback (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const out='.artifacts/round7';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors:string[]=[];
async function seed(page:any,s:any){await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1500);}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const s=newSave(p,Date.now(),'r7');s.storySeen=p.quests.map(q=>q.id);s.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
 ['story40:character.sirius','story40:character.gienah','story40:character.polaris'].forEach((id,i)=>s.roster.push({id:'r7-'+i,definition:id,level:5,hp:1,resonance:0} as any));
 s.team=s.roster.slice(0,6).map(o=>o.id);
 s.jobs.push({id:'heal-r7',kind:'heal',owner:'r7-0',definition:'',ends:Date.now()+95000,payload:'',production:{},cost:{}} as any);
 s.wallet=Object.fromEntries(p.resources.map(r=>[r.id,3000]));
 await seed(page,s);
 await page.screenshot({path:`${out}/strip.png`});
 await page.locator('[data-action="panel"][data-id="summon"]').first().click();await page.waitForTimeout(800);
 await page.screenshot({path:`${out}/summon.png`});
 console.log('topbar visible during modal:',await page.locator('.topbar').isVisible());
 await context.close();
 // battle cut-in
 const c2=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const pg=await c2.newPage();pg.on('pageerror',e=>errors.push(e.message));
 const b=newSave(p,Date.now(),'r7b');b.storySeen=p.quests.map(q=>q.id);b.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
 const v=p.planets.find(x=>x.id==='m1:haven')!;b.x=v.x-150;b.y=v.y;b.encounter={planet:v.id,seed:3,cues:[]} as any;
 await seed(pg,b);
 await pg.locator('.squad-card').first().click();await pg.waitForTimeout(250);
 await pg.screenshot({path:`${out}/cutin.png`});
 await c2.close();
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
