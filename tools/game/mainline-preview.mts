// Review captures for the main-thread tracker and skill research (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
const out=process.argv[2]??'.artifacts/mainline';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
async function seed(page:any,s:any){await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});}
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const tag=mobile?'mobile':'desktop';
  let save=newSave(p,Date.now(),'mainline');save.storySeen=p.quests.filter(q=>!q.story).map(q=>q.id);
  await seed(page,save);await page.waitForSelector('.mainline-card');await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${tag}-start.png`});
  save=apply(p,save,{type:'story-start',id:'chronicle:quest.01'},Date.now(),'m1');save=apply(p,save,{type:'story-next',skip:true},Date.now(),'m2');save.acquisitionQueue=[];
  await seed(page,save);await page.waitForFunction(()=>document.querySelector('.mainline-card')?.textContent?.includes('1/24'));await page.waitForTimeout(600);
  await page.screenshot({path:`${out}/${tag}-await.png`});console.log(tag,await page.locator('.mainline-card').innerText());
  // Arrival is what resumes the waiting node, as original EventSpot triggers do.
  const rec:any=await page.evaluate(()=>new Promise(res=>{const r=indexedDB.open('stella-maiden-m1',1);r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').get('save:test');q.onsuccess=()=>res(q.result)}}));
  rec.region='original:region.solar';const solar=p.regions.find(r=>r.id==='original:region.solar')!;rec.x=solar.startX;rec.y=solar.startY;
  await seed(page,rec);await page.waitForSelector('.story-scene',{timeout:20000});await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${tag}-arrival.png`});
  await page.locator('[data-action="flow-close"]').click();await page.waitForTimeout(500);
  await page.locator('[data-action="panel"][data-id="roster"]').first().click().catch(()=>{});
  await page.waitForTimeout(500);
  const card=page.locator('#overlay [data-action="character"]').first();await card.click();await page.waitForTimeout(700);
  await page.locator('.skill-research').scrollIntoViewIfNeeded().catch(()=>{});
  await page.screenshot({path:`${out}/${tag}-skill.png`});
  await context.close();
 }
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
