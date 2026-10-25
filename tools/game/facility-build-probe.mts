// Review probe: tracker build button performs one real facility-build transaction (not a release gate).
import {readFileSync} from 'node:fs';
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {assemble} from '../../src/content/loader.ts';
import {newSave} from '../../src/domain/model.ts';
const m=JSON.parse(readFileSync('content/manifest.json','utf8'));
const base=JSON.parse(readFileSync('content/core/pack.json','utf8'));
const ext=[...m.extensions.map((f:string)=>JSON.parse(readFileSync('content/'+f,'utf8'))),JSON.parse(readFileSync('content/examples/story-mechanics-demo.json','utf8'))];
const p=assemble(base,ext,m.regionPresentation,m.characterPresentation,m.regionRoutes);
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors:string[]=[];
const record=(page:any)=>page.evaluate(()=>new Promise(res=>{const r=indexedDB.open('stella-maiden-m1',1);r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').get('save:test');q.onsuccess=()=>res(q.result)}}));
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const s=newSave(p,Date.now(),'build');
 s.storySeen=p.quests.filter(q=>q.id!=='demo:quest.defense').map(q=>q.id);s.quests=p.quests.filter(q=>!q.repeat&&q.id!=='demo:quest.defense').map(q=>q.id);
 s.story.completed=p.quests.filter(q=>q.story&&q.id!=='demo:quest.defense').map(q=>q.id);
 s.wallet={'m1:crystal':100,'m1:gas':0,'m1:metal':100,'m1:ether':0};
 await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1500);
 await page.locator('.mainline-card button').click();
 for(let i=0;i<10;i++){const next=page.locator('[data-action="flow-skip"]:visible, [data-action="story-skip"]:visible');if(await next.count()){await next.first().click();break;}await page.waitForTimeout(300);}
 await page.locator('.mainline-card [data-action="facility-build"]').waitFor({timeout:10000});
 console.log('button:',await page.locator('.mainline-card [data-action="facility-build"]').innerText());
 await page.locator('.mainline-card [data-action="facility-build"]').click();
 await page.waitForTimeout(1500);
 const save:any=await record(page);
 console.log('facility:',JSON.stringify(save.facilities),'metal:',save.wallet['m1:metal'],'crystal:',save.wallet['m1:crystal']);
 console.log('card:',(await page.locator('.mainline-card').innerText()).replace(/\n/g,' | '));
 await page.reload();await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1000);
 const again:any=await record(page);console.log('after reload metal:',again.wallet['m1:metal']);
 await page.screenshot({path:'.artifacts/story-mechanics/build-m.png'});
 await context.close();
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
