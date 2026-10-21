# 邊境信標驗證重現

此文件內的兩段程式是本代表包的驗證夾具，不參與runtime，也不修改manifest。抽出到忽略的 `.artifacts/frontier-beacon/` 執行，以既有正式建置啟動隔離 `#/test`；生成檔、測試存檔與截圖不提交。

準備：`source scripts/env.sh`；安裝lockfile依賴（`npm ci --ignore-scripts`）、既有Playwright／Chromium。先跑 `npm run content:check && npm run typecheck && npm test && npm run build`。標準content:check檢查正式三顆星球；下面assemble驗本擴充後四顆，不以正式包的成功冒充擴充包驗證。

抽出兩段程式：

```python
from pathlib import Path
text = Path('docs/design/frontier-beacon-validation.md').read_text()
out = Path('.artifacts/frontier-beacon')
out.mkdir(parents=True, exist_ok=True)
for name, block in zip(['validate.ts', 'browser.ts'], text.split('```typescript\n')[1:]):
    (out / name).write_text(block.split('```', 1)[0])
```

執行：

```bash
source scripts/env.sh
node --import tsx .artifacts/frontier-beacon/validate.ts
node --import tsx .artifacts/frontier-beacon/browser.ts
```

瀏覽器需允許localhost監聽；沙箱EPERM不能算測試成功，需用環境允許的網路權限重跑。逐一執行可避免同時跑多個Chromium造成截圖超時。

## 領域與難度驗證

未寫入正式存檔；包括全星圖前置圖、守軍實際位置、前置拒絕、單波／普攻命中、首勝與角色不重領、資源不足、每秒產能、越界重置、保存及回程。未統一戰力公式，不在此捏造分數。

```typescript
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { assemble } from '../../src/content/loader';
import { newSave, stats } from '../../src/domain/model';
import { apply, settle, production } from '../../src/domain/economy';
import { Combat } from '../../src/domain/combat';
import { guardianPositions } from '../../src/domain/navigation';
import { checkSave } from '../../src/platform/storage';
const base=JSON.parse(readFileSync('content/core/pack.json','utf8'));
const ext=JSON.parse(readFileSync('content/extensions/frontier-beacon.json','utf8'));
const p=assemble(base,[ext]), v=p.planets.at(-1)!;
const t=1792584000000;
writeFileSync('.artifacts/frontier-beacon/assembled.json',JSON.stringify(p));
// Whole map: executable dependency graph, geometry and existing two-way travel.
const seen=new Set<string>(), visiting=new Set<string>();
function visit(id:string) {assert.ok(!visiting.has(id));if(seen.has(id))return;visiting.add(id);const planet=p.planets.find(x=>x.id===id)!;assert.ok(planet);planet.requires.forEach(visit);visiting.delete(id);seen.add(id);}
p.planets.forEach(x=>{visit(x.id);const r=p.regions.find(r=>r.id===x.region)!;assert.ok(x.x>x.guardRadius&&x.y>x.guardRadius&&r.width-x.x>x.guardRadius&&r.height-x.y>x.guardRadius);});
let s=newSave(p,t);s=apply(p,s,{type:'travel',region:v.region},t,'out');
assert.equal(s.x,600);assert.equal(s.y,1000);
assert.throws(()=>apply(p,s,{type:'begin',planet:v.id},t,'locked'));
s.cleared=p.planets.slice(0,-1).map(x=>x.id);
assert.equal(checkSave(JSON.parse(JSON.stringify(s)),p).region,v.region);
const back=apply(p,s,{type:'travel',region:'m1:helios'},t,'back');assert.equal(back.region,'m1:helios');
assert.deepEqual(back.wallet,s.wallet);
const results=[];
for(const level of [1,3]) for(const seed of [1,7,42]) for(const auto of [true,false]) {
 let a=structuredClone(s);a.roster.forEach(o=>{o.level=level;o.hp=stats(p,o).hp;});
 a.x=v.x-v.engageRadius+30;a.y=v.y;
 a=apply(p,a,{type:'begin',planet:v.id},t,'begin');a.encounter!.seed=seed;
 const c=new Combat(p,a,v.id);c.autoSkills=auto;
 assert.equal(c.waveGroups.length,1);
 assert.deepEqual(c.units.filter(u=>u.side==='enemy').map(u=>({x:u.x,y:u.y})),guardianPositions(v).map(u=>({x:u.x,y:u.y})));
 for(let tick=0;tick<18000&&!c.ended;tick++) {
  const e=c.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-c.center.x,a.y-c.center.y)-Math.hypot(b.x-c.center.x,b.y-c.center.y))[0];
  if(e)c.destination={x:e.x-240+Math.cos(tick/80)*90,y:e.y+Math.sin(tick/80)*130};
  c.step(1/60);
 }
 assert.ok(c.victory,`level ${level} seed ${seed} auto ${auto}`);
 assert.ok(c.time>25&&c.time<180);
 const row={level,seed,auto,seconds:+c.time.toFixed(1),hits:c.hitsReceived,hp:c.allies.map(u=>Math.round(u.hp))};results.push(row);console.log(row);
 const before={...a.wallet}, count=a.roster.length;
 a=apply(p,a,{type:'result',planet:v.id,victory:c.victory,hp:c.result(),receipt:'win'},t,'result');
 for(const [r,n]of Object.entries(v.reward))assert.equal(a.wallet[r],before[r]+n);
 assert.equal(a.roster.length,count+1);assert.equal(a.roster.at(-1)!.definition,'m1:uranus');
 const once=structuredClone(a);
 a=apply(p,a,{type:'result',planet:v.id,victory:true,hp:c.result(),receipt:'win'},t,'result');assert.deepEqual(a,once);
 a=apply(p,a,{type:'begin',planet:v.id},t,'retry');
 a=apply(p,a,{type:'result',planet:v.id,victory:true,hp:c.result(),receipt:'win2'},t,'result2');assert.deepEqual(a.wallet,once.wallet);assert.equal(a.roster.length,once.roster.length);
 const poor=structuredClone(a);poor.wallet=Object.fromEntries(p.resources.map(r=>[r.id,0]));
 assert.throws(()=>apply(p,poor,{type:'activate',planet:v.id},t,'poor'),/資源不足/);assert.ok(!poor.colonies[v.id]);
 a=apply(p,a,{type:'activate',planet:v.id},t,'activate');assert.deepEqual(production(p,a),v.production);
 const wallet={...a.wallet};settle(p,a,t+60000);for(const[r,n]of Object.entries(v.production))assert.ok(Math.abs(a.wallet[r]-wallet[r]-n*60)<1e-6);
 assert.equal(a.voyageSeconds,0);assert.equal(a.encounter,null);
 const returnSave=apply(p,a,{type:'travel',region:'m1:helios'},t+60000,'return');assert.ok(returnSave.colonies[v.id].active);
 assert.equal(checkSave(JSON.parse(JSON.stringify(returnSave)),p).region,'m1:helios');
}
// Leash must reset all guardians without granting a liberation.
s.x=v.x+v.leashRadius+10;s.y=v.y;s.encounter={planet:v.id,seed:42};
const reset=new Combat(p,s,v.id);for(let i=0;i<181;i++)reset.step(1/60);assert.ok(reset.reset);assert.ok(!s.cleared.includes(v.id));
writeFileSync('.artifacts/frontier-beacon/results.json',JSON.stringify(results,null,2));
console.log('PASS extension graph, unlock, single wave, basic attacks, receipts, drop, insufficient funds, production, reset, save and return');
```

## 桌機與手機隔離試玩

保留敵人原值；截圖含畫外威脅與邊界警告。兩種viewport檢查轉彎、返回、重新載入及正式檔隔離。這是Chromium viewport，不是真機，也不是完整發布流程。

```typescript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '../../tools/node_modules/playwright/index.mjs';
import { serveBuilt } from '../../tools/game/serve-built.mjs';
import { newSave, stats } from '../../src/domain/model';
const p=JSON.parse(readFileSync(process.env.BEACON_ART_PREVIEW ? '.artifacts/frontier-beacon/art-preview.json' : '.artifacts/frontier-beacon/assembled.json','utf8'));
const v=p.planets.at(-1), server=await serveBuilt();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
async function record(page:any,key='save:test') {return page.evaluate(key=>new Promise(resolve=>{const r=indexedDB.open('stella-maiden-m1',1);r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').get(key);q.onsuccess=()=>{resolve(q.result);r.result.close();};};}),key);}
async function install(page:any,s:any) {
 await page.goto(server.url+'#/art');await page.waitForSelector('.art-gallery');
 await page.evaluate(async ({p,s})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(resolve=>r.onsuccess=resolve);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(p,'content:test');tx.objectStore('records').put(s,'save:test');await new Promise(resolve=>tx.oncomplete=resolve);r.result.close();},{p,s});
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas');
}
try {
 for (const mobile of [false,true]) {
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const s=newSave(p,Date.now(),'test');s.region=v.region;s.x=v.x-330;s.y=v.y;s.rng=42;s.storySeen=p.quests.map(q=>q.id);s.cleared=p.planets.slice(0,-1).map(x=>x.id);s.roster.forEach(o=>{o.level=3;o.hp=stats(p,o).hp;});
 await install(page,s);await page.waitForSelector('.in-battle');await page.waitForTimeout(1200);
 await page.screenshot({path:`.artifacts/frontier-beacon/${process.env.BEACON_ART_PREVIEW?'art-':''}${mobile?'mobile':'desktop'}-battle.png`});
 assert.ok(!(await record(page,'save:main')));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Turns exercise the real directional fleet and ordinary auto-attacks, no stat changes.
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
 await page.keyboard.down('s');await page.waitForTimeout(600);await page.keyboard.up('s');
 const warning=structuredClone(s);warning.x=v.x+660;warning.y=v.y;warning.heading=Math.PI;warning.encounter={planet:v.id,seed:42};
 await install(page,warning);await page.waitForSelector('.leash-warning');
 assert.ok((await page.locator('.leash-warning').innerText()).includes('邊界'));
 await page.screenshot({path:`.artifacts/frontier-beacon/${process.env.BEACON_ART_PREVIEW?'art-':''}${mobile?'mobile':'desktop'}-warning.png`});
 // Entry is safe; reload keeps current region; existing exit remains usable.
 const entry=structuredClone(s);entry.x=600;entry.y=1000;entry.encounter=null;
 await install(page,entry);await page.reload();await page.waitForSelector('canvas');assert.equal((await record(page)).region,v.region);
 await page.locator('[data-action="panel"][data-id="regions"]').first().click();
 await page.locator('[data-action="travel"]').click();await page.locator('[data-answer="yes"]').click();
 await page.waitForTimeout(1000);assert.equal((await record(page)).region,'m1:helios');
 assert.equal(await record(page,'save:main'),undefined);await ctx.close();
 console.log(`PASS frontier ${mobile?'mobile 390x844 DPR2':'desktop 1440x1000'} battle, turns, warning, entry/reload/return, save isolation`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await server.close();}
```
