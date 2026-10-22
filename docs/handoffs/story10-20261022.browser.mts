import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '../../tools/node_modules/playwright/index.mjs';
import {serveBuilt} from '../../tools/game/serve-built.mjs';
import {unlockStudio} from '../../tools/game/studio-access.mjs';
import {newSave,addCharacter} from '../../src/domain/model.ts';
import {skillMechanic} from '../../src/content/descriptions.ts';
const p=JSON.parse(fs.readFileSync('.artifacts/story10/pack.json','utf8'));
const cs=p.characters.filter((c:any)=>c.id.startsWith('story10:'));
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[],results=[];
try{
 for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.goto(server.url+'#/art');await page.waitForSelector('.art-gallery');
 const s=newSave(p,Date.now(),'test');s.storySeen=p.quests.map((q:any)=>q.id);s.x=400;s.y=400;for(const c of cs)addCharacter(p,s,c.id);
 await page.evaluate(async ({p,s})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise<void>(ok=>r.onsuccess=()=>ok());const tx=r.result.transaction('records','readwrite'),st=tx.objectStore('records');st.put({schemaVersion:1,revision:0,pack:p,past:[],future:[]},'editor:project');st.put(p,'content:test');st.put(s,'save:test');st.put({marker:'must-remain-untouched'},'save:main');await new Promise<void>(ok=>tx.oncomplete=()=>ok());r.result.close()},{p,s});
 await page.goto(server.url+'#/studio');await unlockStudio(page);
 for(const c of cs){
  await page.locator(`[data-action="select"][data-id="${c.id}"]`).click();
  assert.equal(await page.locator('[data-field="skill"]').inputValue(),c.skill);
  for(const key of ['portrait','avatar','sprite'])assert.equal(await page.locator(`[data-field="${key}"]`).inputValue(),'');
  assert.equal(+await page.locator('[data-field="attack"]').inputValue(),c.attack);
 }
 await page.screenshot({path:`.artifacts/story10/studio-${width}.png`,fullPage:true});
 await page.locator('[data-action=laboratory]').click();await page.waitForSelector('.laboratory');
 const allies=page.locator('.lab-ally'),enemies=page.locator('.lab-enemy');
 for(let i=0;i<6;i++)await allies.nth(i).locator('[data-character]').selectOption('');
 for(let i=1;i<3;i++)await enemies.nth(i).locator('[data-enemy]').selectOption('');
 await enemies.nth(0).locator('[data-enemy]').selectOption(p.enemies[0].id);await enemies.nth(0).locator('[data-count]').fill('3');
 await page.locator('#lab-lock-health').check();
 for(const c of cs){
  await allies.nth(0).locator('[data-character]').selectOption(c.id);await page.locator('[data-lab=start]').click();
  const sk=p.skills.find((s:any)=>s.id===c.skill);assert((await page.locator('#lab-skill-info').textContent())!.includes(skillMechanic(sk)));
  await page.locator('[data-lab=cast]').first().click();
  await page.locator('[data-lab=pause]').click();await page.waitForTimeout(400);await page.locator('[data-lab=pause]').click();
  const debug=JSON.parse((await page.locator('#lab-debug').textContent())!);assert(debug.time>.2);assert.equal(debug.config.allies[0].character,c.id);
  assert((await page.locator('#lab-metrics').textContent())!.includes(c.name));
  if(c.id.endsWith('arcturus')||c.id.endsWith('izar'))await page.locator('.laboratory').screenshot({path:`.artifacts/story10/lab-${c.sourceRow}-${width}.png`});
 }
 await page.locator('[data-lab=close]').click();
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas');await page.locator('[data-action="panel"][data-id="roster"]').click();
 for(const c of cs){
 const owned=s.roster.find(o=>o.definition===c.id)!;await page.locator(`[data-action="character"][data-id="${owned.id}"]`).click();await page.waitForSelector('.character-detail');
 assert((await page.locator('.skill-detail').textContent())!.includes(skillMechanic(p.skills.find((s:any)=>s.id===c.skill))));
 if(c.id.endsWith('arcturus'))await page.screenshot({path:`.artifacts/story10/profile-${width}.png`,fullPage:true});
 await page.locator('[data-action="close"]').first().click();await page.locator('[data-action="panel"][data-id="roster"]').click();
 }
 const main=await page.evaluate(async()=>{const r=indexedDB.open('stella-maiden-m1',1);await new Promise<void>(ok=>r.onsuccess=()=>ok());return await new Promise(ok=>{const q=r.result.transaction('records').objectStore('records').get('save:main');q.onsuccess=()=>{ok(q.result);r.result.close()}})});
 assert.deepEqual(main,{marker:'must-remain-untouched'});results.push({width,studio:10,profiles:10,laboratoryCasts:10,mainUnchanged:true});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('.artifacts/story10/browser.json',JSON.stringify({status:'PASS',results},null,2));console.log(JSON.stringify({status:'PASS',results}));
}finally{await browser.close();await server.close()}
