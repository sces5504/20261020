import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pack as p} from './load.mts';
import {newSave,stats} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
import {Combat} from '../../src/domain/combat.ts';
import {storyAvailable,conditionMet} from '../../src/domain/story.ts';
import {fingerprint} from '../../src/content/fingerprint.ts';
const prefix='chronicle3:',nodes=p.quests.filter(q=>q.id.startsWith(prefix)),battles=p.planets.filter(q=>q.id.startsWith(prefix));
const input=await fingerprint({characters:p.characters,enemies:p.enemies,skills:p.skills,rules:p.rules,research:p.research,facilities:p.facilities,planets:battles} as any);
const args=process.argv.slice(2),path='docs/verification/chronicle-next-battles.json';
mkdirSync('docs/verification',{recursive:true});
let receipt:any={battleInputFingerprint:input,scope:'Only the new story encounters; original world battles not rerun. Scripted player movement, autoskills, declared levels. No health locks or altered combat.',battles:[]};
if(args.includes('--resume')){receipt=JSON.parse(readFileSync(path,'utf8'));if(receipt.battleInputFingerprint!==input){const priorIds=new Set(receipt.battles.map((r:any)=>r.id));const prior=await fingerprint({characters:p.characters,enemies:p.enemies,skills:p.skills,rules:p.rules,research:p.research,facilities:p.facilities,planets:battles.filter(v=>priorIds.has(v.id))} as any);assert.equal(receipt.battleInputFingerprint,prior,'cannot reuse changed combat data');receipt.reusedUnchangedBattles=receipt.battles.length;receipt.battleInputFingerprint=input;}}
const wanted=args.filter(a=>!a.startsWith('--'));const sample=args.includes('--sample');
for(const v of battles.filter(v=>(!sample||['leo-ambush','leo-escape'].some(k=>v.id.endsWith('.'+k)))&&(!wanted.length||wanted.some(k=>v.id.endsWith('.'+k))))){
 if(receipt.battles.some((r:any)=>r.id===v.id&&r.victory)&&args.includes('--resume'))continue;
 let s=newSave(p,0,'next-battle');const level=Math.max(1,...v.enemies.map(e=>e.level??1));
 s.region=v.region;s.x=v.x;s.y=v.y;s.encounter={planet:v.id,seed:42};
 for(const o of s.roster){o.level=level+2;o.hp=stats(p,o).hp;}
 // Facilities are explicit already-built fixture state; their actual transactions are verified below.
 s.facilities={};for(const f of p.facilities.filter(f=>f.id.startsWith(prefix)))s.facilities[f.id]={hp:f.hp,destroyed:false,activations:0};
 const c=new Combat(p,s,v.id);c.autoSkills=true;let shieldSeen=false,jamSeen=false,restored=false;
 for(let t=0;t<60*240&&!c.ended;t++){
  const shields=[...(c.story?.shields.values()??[])];if(shields.some(s=>s.status==='up')){if(jamSeen)restored=true;shieldSeen=true;}if(shields.some(s=>s.status==='suspended'))jamSeen=true;
  const enemy=c.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-c.center.x,a.y-c.center.y)-Math.hypot(b.x-c.center.x,b.y-c.center.y))[0];
  if(enemy){let dx=enemy.x-230+Math.cos(t/80)*50-v.x,dy=enemy.y+Math.sin(t/80)*80-v.y;
   if(v.storyEncounter?.mode==='survive'){dx=Math.cos(t/160)*700;dy=Math.sin(t/160)*700;}
   const scale=Math.min(1,1000/Math.hypot(dx,dy));c.destination={x:v.x+dx*scale,y:v.y+dy*scale};}
  c.step(1/60);
 }
 const r={id:v.id,team:'initial three starters; no resonance/research; full health',teamLevel:level+2,seed:42,victory:c.victory,reset:c.reset,seconds:+c.time.toFixed(2),survivors:c.allies.filter(u=>u.hp>0).length,hp:c.result(),facilityResult:c.facilityResults(),shieldSeen,jamSeen,restored,remaining:c.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>({name:u.name,hp:Math.round(u.hp)}))};
 receipt.battles=receipt.battles.filter((old:any)=>old.id!==r.id);receipt.battles.push(r);writeFileSync(path,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...r,hp:undefined,facilityResult:undefined,remaining:r.remaining.slice(0,3)}));
}
if(args.includes('--battles')||sample||wanted.length){assert.ok(receipt.battles.every((r:any)=>r.victory),'some new encounters failed; see receipt');process.exit(0)}
assert.equal(nodes.length,35);assert.equal(battles.length,62);assert.equal(receipt.battles.length,62);assert.ok(receipt.battles.every((r:any)=>r.victory));
let s=newSave(p,0,'next-sequence'),seq=0;const command=(cmd:any)=>s=apply(p,s,cmd,0,'next-'+(++seq));
s.story.completed=p.quests.filter(q=>q.id.startsWith('chronicle:')).map(q=>q.id);s.storySeen=[...s.story.completed];
let cost=0,claims=0,positions=0,builds=0;
for(const q of nodes){
 assert.ok(storyAvailable(p,s,q.id),q.id+' unlock');command({type:'story-start',id:q.id});let guard=0;
 while(s.story.session){
  assert.ok(guard++<200,q.id+' no deadlock');const cursor=s.story.session.cursor,step=q.story!.steps[cursor];
  if(step.kind==='await'){
   if(!conditionMet(s,step.condition)){command({type:'story-next',skip:true});assert.equal(s.story.session?.cursor,cursor,'skip never bypasses await');}
   const f:any=step.condition;
   if(f.fact==='region')s.region=f.target;
   else if(f.fact==='position'){s.region=f.target;s.x=f.x;s.y=f.y;positions++;}
   else if(f.fact==='facility'&&!conditionMet(s,step.condition)){
    const facility=p.facilities.find(v=>v.id===f.target)!;
    // Finite starting-budget fixture: previous chapter/world economy is not simulated here.
    for(const [id,value]of Object.entries(facility.cost)){assert.ok(s.wallet[id]>=value,'budget reachable');cost+=value;}
    const before={...s.wallet};const nonce='next-build-'+seq;const original=s;
    s=apply(p,s,{type:'facility-build',facility:f.target},0,nonce);const built=JSON.stringify(s);
    const again=apply(p,s,{type:'facility-build',facility:f.target},0,nonce);assert.equal(JSON.stringify(again),built,'duplicate build receipt no debit');
    assert.throws(()=>apply(p,s,{type:'facility-build',facility:f.target},0,nonce+'-new'),/已|建/);builds++;
    for(const id of Object.keys(facility.cost))assert.equal(before[id]-s.wallet[id],facility.cost[id]);
   }
   command({type:'story-next',skip:true});
  }else if(step.kind==='encounter'){
   command({type:'story-next',skip:true});assert.equal(s.story.session?.cursor,cursor,'skip never bypasses battle');
   const v=p.planets.find(v=>v.id===step.planet)!;s.region=v.region;s.x=v.x;s.y=v.y;
   command({type:'story-battle'});const proof=receipt.battles.find((r:any)=>r.id===v.id)!;
   const result:any={type:'result',planet:v.id,victory:true,hp:proof.hp,facilities:proof.facilityResult.facilities,activated:proof.facilityResult.activated,receipt:'next-result-'+seq};
   command(result);const after=JSON.stringify(s.story);s=apply(p,s,result,0,'next-'+seq);assert.equal(JSON.stringify(s.story),after);
   // Refill by explicit per-encounter test fixture, never a production grant.
   s.roster.forEach(o=>o.hp=stats(p,o).hp);
  }else command({type:'story-next',skip:true});
  s=JSON.parse(JSON.stringify(s));
 }
 assert.ok(s.story.completed.includes(q.id));assert.ok(!s.quests.includes(q.id));const count=s.roster.length;command({type:'quest',id:q.id});assert.equal(s.roster.length,count);assert.throws(()=>command({type:'quest',id:q.id}),/已領取/);claims++;
}
// Own facility configurations: forced destruction boundary (not a claimed played loss).
{
 const v=p.planets.find(v=>v.id==='chronicle3:encounter.stage-defense')!;
 let loss=newSave(p,0,'facility-boundary');loss.region=v.region;loss.x=v.x;loss.y=v.y;loss.encounter={planet:v.id,seed:77};loss.facilities={};
 for(const f of p.facilities.filter(f=>f.id.startsWith(prefix)))loss.facilities[f.id]={hp:f.hp,destroyed:false};
 const c=new Combat(p,loss,v.id);const stage=c.units.find(u=>u.def==='chronicle3:facility.stage')!;stage.hp=0;c.step(1/60);
 assert.ok(c.ended&&!c.victory,'necessary stage destruction fails');
 const retried=apply(p,loss,{type:'result',planet:v.id,victory:false,hp:c.result(),...c.facilityResults(),receipt:'forced-stage-loss'},0,'boundary-loss');
 assert.equal(retried.facilities['chronicle3:facility.stage'].hp,loss.facilities['chronicle3:facility.stage'].hp,'restore retry retains pre-battle HP');
 retried.region=v.region;retried.x=v.x;retried.y=v.y;retried.encounter={planet:v.id,seed:78};const retry=new Combat(p,retried,v.id);
 assert.ok(retry.units.some(u=>u.def==='chronicle3:facility.stage'&&u.hp===loss.facilities['chronicle3:facility.stage'].hp));
}
assert.ok(receipt.battles.find((r:any)=>r.id==='chronicle3:encounter.morugo-final').jamSeen,'final jammer actually activates');
assert.ok(receipt.battles.find((r:any)=>r.id==='chronicle3:encounter.morugo-final').restored,'shield actually restores after window');
for(const key of Object.keys(JSON.parse(readFileSync('content/story-next-three/sources.json','utf8')).surveys))assert.equal(s.story.counters['event:chronicle3:event.survey-'+key],1,'scan initialization once');
const says=nodes.flatMap(q=>q.story!.steps.filter(s=>s.kind==='say').map(s=>s.text));assert.ok(says.every(t=>!/<\/?[a-z]|javascript:/i.test(t)));
assert.ok(nodes.flatMap(q=>q.dialogue).every(s=>s.text.length<=85),'mobile frame budget');
for(const a of p.assets.filter(a=>a.id.startsWith(prefix))){assert.equal((await import('node:crypto')).createHash('sha256').update(readFileSync('art/story-next-three/web/'+a.id.split('.').at(-1)+'.webp')).digest('hex'),a.hash);}
for(const f of p.facilities.filter(f=>f.id.startsWith(prefix)))assert.equal(s.facilities?.[f.id],undefined,'chapter facilities retired');
writeFileSync('docs/verification/chronicle-next-content.json',JSON.stringify({baseline:'69fb108',nodes:nodes.length,encounters:receipt.battles.length,claims,positions,builds,totalConstructionCost:cost,totalRewardPerResource:9000,frames:nodes.flatMap(q=>q.dialogue).length,maxFrame:Math.max(...nodes.flatMap(q=>q.dialogue).map(s=>s.text.length)),oldWorldRerun:false,facilityDestroyedBoundary:'forced HP=0, verified fail and retry:restore; not claimed played loss',jammerWindow:'observed actual final battle activation and restoration',scope:'New content only. Region/world-history preconditions and battle-entry positions are explicit fixtures; JSON reload at each gate; actual battle result evidence above; not new-account full journey or physical-device certification.'},null,2)+'\n');
console.log('PASS 35-node flow, reload, skip gates, construction receipts, unique claims, media hashes');
