import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from '../game/serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave,stats} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
const server=await serveBuilt(), browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results:any[]=[],errors:string[]=[];await mkdir('.artifacts/chronicle',{recursive:true});
async function record(page:any,key='save:test'){return page.evaluate(key=>new Promise(resolve=>{const r=indexedDB.open('stella-maiden-m1',1);r.onsuccess=()=>{const tx=r.result.transaction('records'),q=tx.objectStore('records').get(key);q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>r.result.close()}}),key)}
async function seed(page:any,s:any){await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');tx.objectStore('records').put({marker:'untouched-main'},'save:main');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});}
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.url);await page.waitForSelector('canvas',{timeout:60000});
  let save=newSave(p,Date.now(),'chronicle-browser');save.storySeen=p.quests.filter(q=>!q.story).map(q=>q.id);
  save=apply(p,save,{type:'story-start',id:'chronicle:quest.01'},Date.now(),'browser-prologue');
  await seed(page,save);await page.getByText('太陽系外，一道巨大的蟲洞撕開星海。迪梅克母艦正朝地球推進。',{exact:true}).waitFor();
  await page.screenshot({path:`.artifacts/chronicle/${mobile?'mobile':'desktop'}-prologue.png`});
  await page.locator('[data-action="flow-skip"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="flow-next"]'));
  let persisted:any=await record(page);assert.equal(persisted.story.counters['event:chronicle:event.master-awakened'],1);assert.equal(persisted.roster.length,save.roster.length);
  await page.reload();await page.waitForSelector('canvas',{timeout:60000});persisted=await record(page);assert.equal(persisted.story.counters['event:chronicle:event.master-awakened'],1);
  // Start the real first rescue with the declared level3 starter team, not a test-only encounter.
  save=persisted;save.region='original:region.solar';save.roster.forEach(o=>{o.level=3;o.hp=stats(p,o).hp});
  save=apply(p,save,{type:'story-start',id:'chronicle:quest.02'},Date.now(),'browser-venus');await seed(page,save);
  await page.getByText('天津四大人說，指揮官應該在地球……可通訊始終沒有回應。',{exact:true}).waitFor();
  const geometry=await page.locator('.story-box').evaluate(el=>{const text=el.querySelector('.story-line'),controls=el.querySelector('.story-controls');return {box:el.getBoundingClientRect().toJSON(),text:text.getBoundingClientRect().toJSON(),controls:controls.getBoundingClientRect().toJSON(),scroll:document.documentElement.scrollWidth,width:innerWidth}});
  assert.ok(geometry.text.bottom<=geometry.controls.top+1,'dialogue does not overlap controls');assert.ok(geometry.scroll<=geometry.width+1,'no horizontal scroll');
  await page.screenshot({path:`.artifacts/chronicle/${mobile?'mobile':'desktop'}-venus.png`});
  await page.locator('[data-action="flow-skip"]').click();await page.getByRole('button',{name:'開始劇情遭遇',exact:true}).waitFor();
  const before=await record(page);await page.reload();await page.getByRole('button',{name:'開始劇情遭遇',exact:true}).waitFor();assert.equal((await record(page)).story.session.cursor,before.story.session.cursor);
  await page.getByRole('button',{name:'開始劇情遭遇',exact:true}).click();
  // Combat's real radio cue must be acknowledged, not disabled.
  await page.getByText('金星，保持距離！我們來替妳開路！',{exact:true}).waitFor();await page.locator('[data-action="flow-skip"]').click();
  await page.getByText('金星！我們來幫妳！',{exact:true}).waitFor({timeout:60000});
  await page.locator('[data-action="flow-skip"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="flow-next"]'));
  persisted=await record(page);assert.ok(persisted.story.completed.includes('chronicle:quest.02'));assert.ok(!persisted.quests.includes('chronicle:quest.02'));
  if(await page.locator('#overlay .modal-backdrop').count()){console.log('Post-story panel:',(await page.locator('#overlay').innerText()).slice(0,250));const close=page.locator('#overlay [data-action="close"]');if(await close.count())await close.first().click();}
  // The next main node now chains in like the original; return to the voyage before opening the journal.
  await page.locator('.story-scene').waitFor();assert.equal((await record(page)).story.session?.quest,'chronicle:quest.03');await page.locator('[data-action="flow-close"]').click();await page.locator('.story-scene').waitFor({state:'detached'});
  await page.locator('.deck-nav [data-action="panel"][data-id="quests"]').click();
  const claim=page.locator('[data-action="quest"][data-id="chronicle:quest.02"]');await claim.scrollIntoViewIfNeeded();await claim.click();await page.waitForTimeout(250);
  persisted=await record(page);assert.ok(persisted.quests.includes('chronicle:quest.02'));const wallet=persisted.wallet;
  const replay=page.locator('[data-action="flow-replay"][data-id="chronicle:quest.02"]');await replay.scrollIntoViewIfNeeded();await replay.click();if(await page.getByText('等待條件達成；可返回航行，完成後接續。',{exact:true}).isVisible())await page.locator('[data-action="flow-next"]').click();await page.getByText('天津四大人說，指揮官應該在地球……可通訊始終沒有回應。',{exact:true}).waitFor();await page.locator('[data-action="flow-skip"]').click();await page.waitForTimeout(250);
  persisted=await record(page);assert.deepEqual(persisted.wallet,wallet);assert.deepEqual(await record(page,'save:main'),{marker:'untouched-main'});
  // Presentation previews use real authored lines and actor references, with explicit preview cursors.
  for(const [node,cid,name] of [['03','chronicle:actor.kiraba','kiraba'],['14','chronicle:actor.mitsuba','mitsuba'],['23','chronicle:actor.mitsuba','blackhole']] as const){
   const q=p.quests.find(q=>q.id==='chronicle:quest.'+node)!;const s=newSave(p,Date.now(),'preview-'+name);s.storySeen=p.quests.filter(q=>!q.story||q.id==='chronicle:quest.01').map(q=>q.id);s.story.completed=p.quests.filter(v=>v.story&&v.id<q.id).map(v=>v.id);
   let started=apply(p,s,{type:'story-start',id:q.id},Date.now(),'preview-'+name);
   started.story.session!.cursor=q.story!.steps.findIndex(step=>step.kind==='say'&&step.actor===cid);
   await seed(page,started);await page.locator(`.story-actor img[alt="${name==='kiraba'?'Kiraba':'Mitsuba'}"]`).waitFor();await page.locator('.story-actor img').evaluate(async img=>{await (img as HTMLImageElement).decode()});await page.screenshot({path:`.artifacts/chronicle/${mobile?'mobile':'desktop'}-${name}.png`});
  }
  const media=[];for(const a of p.assets.filter(a=>a.id.startsWith('chronicle:'))){const response=await page.request.get(server.url+a.src);assert.equal(response.status(),200);const body=await response.body();assert.equal(createHash('sha256').update(body).digest('hex'),a.hash);const size=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return [i.naturalWidth,i.naturalHeight]},server.url+a.src);assert.deepEqual(size,[a.width,a.height]);media.push(a.id)}
  results.push({mobile,viewport:mobile?'390x844 DPR2':'1440x1000',checks:['real-prologue','skip-initializes-once','reload-no-duplicate','real-venus-rescue-and-radio-cue','chapter-complete-before-claim','claim','read-only-replay','formal-save-isolated','dialogue-layout','two-NPC-portraits','blackhole-background','four-media-http-sha-decode'],media});await context.close();console.log('PASS',mobile?'mobile':'desktop');
 }
 assert.deepEqual(errors,[]);await writeFile('docs/verification/chronicle-browser.json',JSON.stringify({results,errors,physicalDevice:false},null,2)+'\n');
}finally{await browser.close();await server.close()}
