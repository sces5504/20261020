// Review captures: demo shield/jammer and facility encounters in test mode (not a release gate).
import {readFileSync} from 'node:fs';
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {assemble} from '../../src/content/loader.ts';
import {newSave} from '../../src/domain/model.ts';
const out=process.argv[2]??'.artifacts/story-mechanics';
const m=JSON.parse(readFileSync('content/manifest.json','utf8'));
const base=JSON.parse(readFileSync('content/core/pack.json','utf8'));
const ext=[...m.extensions.map((f:string)=>JSON.parse(readFileSync('content/'+f,'utf8'))),JSON.parse(readFileSync('content/examples/story-mechanics-demo.json','utf8'))];
const p=assemble(base,ext,m.regionPresentation,m.characterPresentation,m.regionRoutes);
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors:string[]=[];
try{
 for(const [planet,tag] of [['demo:planet.shield-trial','shield'],['demo:planet.defense-line','defense']])
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const s=newSave(p,Date.now(),'mech');s.storySeen=p.quests.filter(q=>!q.id.startsWith('demo:')).map(q=>q.id);s.quests=p.quests.filter(q=>!q.repeat&&!q.id.startsWith('demo:')).map(q=>q.id);
  for(const o of s.roster)o.level=20;
  s.facilities={'demo:facility.barricade':{hp:3000,destroyed:false}};
  const v=p.planets.find(x=>x.id===planet)!;s.region=v.region;s.x=v.x-140;s.y=v.y;s.encounter={planet,seed:7,cues:[]} as any;
  await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});
  await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:20000}).catch(async()=>{console.log('BODY',(await page.locator('body').innerText()).slice(0,800));throw Error('no canvas')});await page.waitForTimeout(4000);
  console.log(tag,mobile?'m':'d','status:',await page.locator('#story-status').innerText().catch(()=>''),'| wave:',await page.locator('#wave-clock').innerText().catch(()=>''));
  await page.screenshot({path:`${out}/${tag}-${mobile?'m':'d'}.png`});await context.close();
 }
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
