import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from '../game/serve-built.mjs';
import {pack as p} from './load.mts';
import {newSave,stats} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
// Isolated candidate media copies. Root integration manifest and published assets stay unchanged.
const media=JSON.parse(readFileSync('art/story-next-three/media.json','utf8'));
for(const a of media){const path=resolve('dist',a.runtime);assert.ok(path.startsWith(resolve('dist/assets/extensions/story-next-three')+'/'));mkdirSync(dirname(path),{recursive:true});copyFileSync(a.path,path)}
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('.artifacts/next-three/browser',{recursive:true});const errors:string[]=[],results:any[]=[];
const nodes=p.quests.filter(q=>q.id.startsWith('chronicle3:'));
function fixture(n:number){const s=newSave(p,Date.now(),'next-browser-'+n);s.storySeen=p.quests.filter(q=>!q.story||q.id.startsWith('chronicle:')||q.id.startsWith('chronicle3:')&&Number(q.id.split('.').at(-1))<n).map(q=>q.id);s.story.completed=s.storySeen.filter(id=>p.quests.find(q=>q.id===id)?.story);s.region='original:region.'+(n<=36?'leo':n<=48?'southern':'canis');s.roster.forEach(o=>{o.level=n<=36?32:n<=48?42:62;o.hp=stats(p,o).hp});return apply(p,s,{type:'story-start',id:'chronicle3:quest.'+n},Date.now(),'fixture-'+n)}
async function read(page:any,key='save:test'){return page.evaluate(key=>new Promise(resolve=>{const r=indexedDB.open('stella-maiden-m1',1);r.onsuccess=()=>{const tx=r.result.transaction('records'),q=tx.objectStore('records').get(key);q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>r.result.close()}}),key)}
async function seed(page:any,s:any){await page.goto(server.url+'gallery.html');await page.evaluate(async({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');tx.objectStore('records').put({marker:'untouched-main'},'save:main');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save:s});await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});}
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 if(process.argv.includes('--replay-only')){
  const replaySave=fixture(33);replaySave.story.session=null;const facility=p.facilities.find(f=>f.id==='chronicle3:facility.leo-turret')!;
  replaySave.facilities={[facility.id]:{hp:facility.hp,destroyed:false}};await seed(page,replaySave);
  await page.locator('.deck-nav [data-action="panel"][data-id="quests"]').click();
  const replay=page.locator('[data-action="flow-replay"][data-id="chronicle3:quest.32"]');await replay.scrollIntoViewIfNeeded();await replay.click();
  await page.locator('.story-scene').waitFor();const before:any=await read(page);await page.locator('[data-action="flow-skip"]').click();await page.locator('.story-scene').waitFor({state:'detached'});const after:any=await read(page);
  assert.deepEqual(after.wallet,before.wallet);assert.deepEqual(after.facilities,before.facilities);assert.deepEqual(after.receipts,before.receipts);assert.deepEqual(await read(page,'save:main'),{marker:'untouched-main'});
  const path='docs/verification/chronicle-next-browser.json';const prior=JSON.parse(readFileSync(path,'utf8'));prior.results.find((r:any)=>r.mobile===mobile).checks.push('read-only-replay-of-facility-chapter-wallet-facilities-receipts-unchanged');writeFileSync(path,JSON.stringify(prior,null,2)+'\n');
  console.log('PASS read-only replay',mobile?'mobile':'desktop');await context.close();continue;
 }
 let s=fixture(25);await seed(page,s);await page.getByText('這裡是代理司令 Luyten。代號沃爾夫359，請回答。',{exact:true}).waitFor();
 async function layout(label:string){const g=await page.locator('.story-box').evaluate(el=>{const t=el.querySelector('.story-line')!,c=el.querySelector('.story-controls')!;return {text:t.getBoundingClientRect().toJSON(),controls:c.getBoundingClientRect().toJSON(),scroll:document.documentElement.scrollWidth,width:innerWidth}});assert.ok(g.text.bottom<=g.controls.top+1,label+' text/controls');assert.ok(g.scroll<=g.width+1,label+' no horizontal overflow');await page.screenshot({path:`.artifacts/next-three/browser/${mobile?'mobile':'desktop'}-${label}.png`});return g;}
 const opening=await layout('leo-opening');await page.locator('[data-action="flow-next"]').click();await page.getByText('唔……我才剛結束任務，不能換別人嗎？',{exact:true}).waitFor();
 await page.locator('[data-action="flow-skip"]').click();await page.locator('.story-scene').waitFor({state:'detached'});const gate:any=await read(page);assert.equal(nodes[0].story!.steps[gate.story.session.cursor].kind,'encounter');const cursor=gate.story.session.cursor;await page.reload();await page.waitForSelector('canvas');assert.equal((await read(page)).story.session.cursor,cursor,'survey gate persisted');
 // Real scan navigation in an explicit old-world-clear fixture, without invented new victories.
 const scan=p.planets.find(v=>v.id==='chronicle3:encounter.scan-wormhole')!;
 const scanSave:any=await read(page);scanSave.x=scan.x-950;scanSave.y=scan.y;
 scanSave.cleared.push(...p.planets.filter(v=>v.region===scan.region&&!v.id.startsWith('chronicle3:')).map(v=>v.id));
 await seed(page,scanSave);await page.locator('.mainline-card [data-action="navigate"]').click();
 await page.locator('.mainline-card button',{hasText:'出擊'}).waitFor({timeout:25000});
 await page.waitForTimeout(1300);const arrived:any=await read(page);assert.ok(Math.hypot(arrived.x-scan.x,arrived.y-scan.y)<650,'real scan approach');
 await page.locator('.mainline-card button',{hasText:'出擊'}).click();
 await page.getByText('這個質量……怎麼可能？',{exact:true}).waitFor();
 const scanned:any=await read(page);assert.ok(scanned.cleared.includes(scan.id));assert.equal(scanned.story.counters['event:chronicle3:event.survey-wormhole'],1);
 if(process.argv.includes('--survey-only')){
  const path='docs/verification/chronicle-next-browser.json';const prior=JSON.parse(readFileSync(path,'utf8'));const priorResult=prior.results.find((r:any)=>r.mobile===mobile);
  priorResult.checks=priorResult.checks.filter((v:string)=>v!=='survey-gate-skip-and-reload');priorResult.checks.push('navigable-unopposed-survey-gate-skip-reload-real-approach-and-3-second-scan');
  priorResult.scanRevision={realNavigation:true,scanSeconds:3,initializesOnce:true,previousOtherChecksReused:true};prior.errors.push(...errors);writeFileSync(path,JSON.stringify(prior,null,2)+'\n');
  console.log('PASS survey revision',mobile?'mobile':'desktop');await context.close();continue;
 }
 // Arrival fixture only: source travel precondition is verified; this does not claim full route playthrough.
 const q=nodes[0],battle=q.story!.steps.findIndex(x=>x.kind==='encounter');s=fixture(25);s.story.session!.cursor=battle;const v=p.planets.find(v=>v.id===(q.story!.steps[battle]as any).planet)!;s.region=v.region;s.x=v.x-450;s.y=v.y;for(const o of s.roster){o.level=23;o.hp=stats(p,o).hp}await seed(page,s);
 await page.locator('.mainline-card button',{hasText:'出擊'}).click();
 for(let i=0;i<150;i++){if(await page.getByText('司令部！這裡是沃爾夫！遭到伏擊，請求支援！',{exact:true}).isVisible().catch(()=>false))break;await page.waitForTimeout(500)}
 await page.getByText('司令部！這裡是沃爾夫！遭到伏擊，請求支援！',{exact:true}).waitFor();
 const won:any=await read(page);assert.ok(won.cleared.includes(v.id));assert.equal(won.story.session.quest,q.id);
 // Actual facility button: formal debit once, reload retained, no parallel player-field writes.
 s=fixture(32);const build=nodes.find(q=>q.id==='chronicle3:quest.32')!;s.story.session!.cursor=build.story!.steps.findIndex(x=>x.kind==='await'&&(x.condition as any).fact==='facility');await seed(page,s);
 const button=page.locator('[data-action="facility-build"]');await button.waitFor();const before:any=await read(page);await button.click();await page.waitForTimeout(300);const after:any=await read(page);assert.equal(before.wallet['m1:crystal']-after.wallet['m1:crystal'],80);assert.ok(after.facilities['chronicle3:facility.leo-turret']);await page.reload();await page.waitForSelector('canvas');assert.equal((await read(page)).wallet['m1:crystal'],after.wallet['m1:crystal']);
 // Source-backed portrait / background / long-frame previews have explicit cursors, not claimed full playthroughs.
 const previews:any[]=[];
 for(const [n,id,label]of [[31,'chronicle3:actor.aitsu','aitsu'],[44,'chronicle3:actor.haitsu','haitsu'],[49,'chronicle3:actor.morugo','morugo'],[41,'story40:character.musca','southern-haven'],[48,'story40:character.aegir','freedom'],[59,'story40:character.canis','stage-finale']]as const){
  const quest=nodes.find(q=>q.id==='chronicle3:quest.'+n)!;s=fixture(n);s.story.session!.cursor=quest.story!.steps.findIndex(x=>x.kind==='say'&&x.actor===id);assert.ok(s.story.session!.cursor>=0);await seed(page,s);await page.locator('.story-scene').waitFor();await page.locator('.story-actor img').first().evaluate(async img=>await(img as HTMLImageElement).decode());previews.push({label,geometry:await layout(label)});
 }
 const longs=nodes.flatMap(q=>q.story!.steps.map((s,index)=>({q,s,index}))).filter(o=>o.s.kind==='say'&&o.s.actor).sort((a,b)=>(b.s as any).text.length-(a.s as any).text.length);const longest=longs[0];s=fixture(Number(longest.q.id.split('.').at(-1)));s.story.session!.cursor=longest.index;await seed(page,s);await page.locator('.story-line').waitFor();await layout('longest-frame');
 for(const a of p.assets.filter(a=>a.id.startsWith('chronicle3:'))){const response=await page.request.get(server.url+a.src);assert.equal(response.status(),200,a.id);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),a.hash);const size=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return[i.naturalWidth,i.naturalHeight]},server.url+a.src);assert.deepEqual(size,[a.width,a.height]);}
 assert.deepEqual(await read(page,'save:main'),{marker:'untouched-main'});
 results.push({mobile,viewport:mobile?'390x844 DPR2 touch':'1440x1000',opening,previews,checks:['opening-two-speakers','navigable-unopposed-survey-gate-skip-reload-real-approach-and-3-second-scan','real-first-ambush-sortie-and-victory','actual-facility-build-button-debit-once-and-reload','three-enemy-portraits','scene-backgrounds','longest-frame-layout','all-12-media-http-sha-dimensions-decode','formal-save-isolation']});console.log('PASS',mobile?'mobile':'desktop');await context.close();
}assert.deepEqual(errors,[]);if(!process.argv.includes('--survey-only')&&!process.argv.includes('--replay-only'))writeFileSync('docs/verification/chronicle-next-browser.json',JSON.stringify({results,errors,physicalDevice:false,scope:'New-content isolated pack, arrival/preview fixtures explicitly declared; no live save writes, not a full new-account travel or physical-device certification.'},null,2)+'\n');}finally{await browser.close();await server.close()}
