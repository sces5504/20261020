import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '../../tools/node_modules/playwright/index.mjs';
import {serveBuilt} from '../../tools/game/serve-built.mjs';
import {unlockStudio} from '../../tools/game/studio-access.mjs';
import {newSave,addCharacter} from '../../src/domain/model.ts';
import {skillMechanic} from '../../src/content/descriptions.ts';
const p=JSON.parse(fs.readFileSync('.artifacts/story40/pack.json','utf8'));
const cs=p.characters.filter((c:any)=>c.id.startsWith('story40:'));
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const resume=process.argv.includes("--resume");
const errors:string[]=[],results=[];
try{
 for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.goto(server.url+'#/art');await page.waitForSelector('.art-gallery');
 const s=newSave(p,Date.now(),'test');s.storySeen=p.quests.map((q:any)=>q.id);s.story.completed=p.quests.filter((q:any)=>q.story).map((q:any)=>q.id);s.x=400;s.y=400;for(const c of cs)addCharacter(p,s,c.id);
 await page.evaluate(async ({p,s})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise<void>(ok=>r.onsuccess=()=>ok());const tx=r.result.transaction('records','readwrite'),st=tx.objectStore('records');st.put({schemaVersion:1,revision:0,pack:p,past:[],future:[]},'editor:project');st.put(p,'content:test');st.put(s,'save:test');st.put({marker:'must-remain-untouched'},'save:main');await new Promise<void>(ok=>tx.oncomplete=()=>ok());r.result.close()},{p,s});
 let casts=resume&&width===1440?40:0;
 if(!(resume&&width===1440)){
 await page.goto(server.url+'#/studio');await unlockStudio(page);
 // All forty inspector entries; numeric values, original skill and absent artwork.
 for(const c of cs){
  const select=page.locator(`[data-action="select"][data-id="${c.id}"]`);await select.scrollIntoViewIfNeeded();await select.click();
  assert.equal(await page.locator('[data-field="skill"]').inputValue(),c.skill);
  for(const key of ['portrait','avatar','sprite'])assert.equal(await page.locator(`[data-field="${key}"]`).inputValue(),'');
  assert.equal(+await page.locator('[data-field="rarity"]').inputValue(),c.rarity);
 }
 await page.screenshot({path:`.artifacts/story40/studio-${width}.png`,fullPage:true});
 await page.locator('[data-action=laboratory]').click();await page.waitForSelector('.laboratory');
 const allies=page.locator('.lab-ally'),enemies=page.locator('.lab-enemy');
 for(let i=1;i<3;i++)await enemies.nth(i).locator('[data-enemy]').selectOption('');
 await enemies.nth(0).locator('[data-enemy]').selectOption('m1:scout');await enemies.nth(0).locator('[data-count]').fill('3');await page.locator('#lab-lock-health').check();
 // Desktop: seven batches cover forty actual casts. Mobile: first and last six.
 const batches=width===1440?Array.from({length:7},(_,i)=>cs.slice(i*6,i*6+6)):[cs.slice(0,6),cs.slice(-6)];

 for(const [batchIndex,batch] of batches.entries()){
  for(let i=0;i<6;i++)await allies.nth(i).locator('[data-character]').selectOption(batch[i]?.id??'');
  await page.locator('[data-lab=start]').click();
  const info=(await page.locator('#lab-skill-info').textContent())!;
  for(const c of batch)assert(info.includes(skillMechanic(p.skills.find((v:any)=>v.id===c.skill))),c.id+' actual mechanic copy');
  for(const b of await page.locator('[data-lab=cast]').all())await b.click();
  await page.locator('[data-lab=pause]').click();await page.waitForTimeout(350);await page.locator('[data-lab=pause]').click();
  const debug=JSON.parse((await page.locator('#lab-debug').textContent())!);assert(debug.time>.15);assert.equal(debug.config.allies.length,batch.length);
  assert.deepEqual(debug.config.allies.map((v:any)=>v.character),batch.map((v:any)=>v.id));casts+=batch.length;
  if(batchIndex===0||batchIndex===batches.length-1)await page.locator('.laboratory').screenshot({path:`.artifacts/story40/lab-${batchIndex}-${width}.png`});
 }
 await page.locator('[data-lab=close]').click();
 fs.writeFileSync(`.artifacts/story40/browser-stage-${width}.json`,JSON.stringify({width,studio:40,laboratoryCasts:casts,pageErrors:errors}));
 }
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas');await page.locator('[data-action="panel"][data-id="roster"]').click();
 const representatives=[cs[0],cs[8],cs[15],cs[27],cs[33],cs[39]];
 for(const c of representatives){
  const owned=s.roster.find(o=>o.definition===c.id)!;const card=page.locator(`[data-action="character"][data-id="${owned.id}"]`).first();await card.scrollIntoViewIfNeeded();await card.click();await page.waitForSelector('.character-detail');
  assert((await page.locator('.skill-detail').textContent())!.includes(skillMechanic(p.skills.find((v:any)=>v.id===c.skill))));
  if(c===cs[0])await page.screenshot({path:`.artifacts/story40/profile-${width}.png`,fullPage:true});
  await page.locator('#overlay [data-action="panel"][data-id="roster"]').click();
 }
 const main=await page.evaluate(async()=>{const r=indexedDB.open('stella-maiden-m1',1);await new Promise<void>(ok=>r.onsuccess=()=>ok());return await new Promise(ok=>{const q=r.result.transaction('records').objectStore('records').get('save:main');q.onsuccess=()=>{ok(q.result);r.result.close()}})});
 assert.deepEqual(main,{marker:'must-remain-untouched'});results.push({width,studio:40,profiles:6,laboratoryCasts:casts,studioLabReused:resume&&width===1440,mainUnchanged:true});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('.artifacts/story40/browser.json',JSON.stringify({status:'PASS',results},null,2));console.log(JSON.stringify({status:'PASS',results}));
}finally{await browser.close();await server.close()}
