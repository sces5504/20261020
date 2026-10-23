import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { published as p } from '../../src/content/index.ts';
import {newSave,stats} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
import {Combat} from '../../src/domain/combat.ts';
import {fingerprint} from '../../src/content/fingerprint.ts';
import {storyAvailable,conditionMet} from '../../src/domain/story.ts';
const nodes=p.quests.filter(q=>q.id.startsWith('chronicle:quest.'));
assert.equal(nodes.length,24);
const battles=p.planets.filter(v=>v.id.startsWith('chronicle:encounter.'));
assert.equal(battles.length,31);
let s=newSave(p,0,'chronicle-sequence');let seq=0;
const command=(c:any)=>s=apply(p,s,c,0,`chronicle-test-${++seq}`);
const flowOnly=process.argv.includes('--flow');
const proof:any[]=flowOnly?JSON.parse(readFileSync('docs/verification/chronicle-battles.json','utf8')).battles:[];
if(flowOnly)assert.equal(JSON.parse(readFileSync('docs/verification/chronicle-battles.json','utf8')).battleInputFingerprint,await fingerprint({characters:p.characters,enemies:p.enemies,skills:p.skills,research:p.research,rules:p.rules,planets:battles} as any));
const wanted=process.argv.slice(2).filter(v=>!v.startsWith('--'));

for(const v of battles.filter(v=>!flowOnly&&(!wanted.length||wanted.includes(v.id.split('.').at(-1)!)))){
 const fresh=newSave(p,0);
 const level=Math.max(...v.enemies.map(e=>e.level??1));
 fresh.region=v.region;fresh.x=v.x;fresh.y=v.y;fresh.encounter={planet:v.id,seed:42};
 fresh.roster.forEach(o=>{o.level=Number(process.argv.find(a=>a.startsWith('--level='))?.split('=')[1]??level+2);o.hp=stats(p,o).hp});
 const c=new Combat(p,fresh,v.id);c.autoSkills=true;
 for(let t=0;t<60*240&&!c.ended;t++){
  const enemies=c.units.filter(u=>u.side==='enemy'&&u.hp>0);
  const enemy=enemies.sort((a,b)=>Math.hypot(a.x-c.center.x,a.y-c.center.y)-Math.hypot(b.x-c.center.x,b.y-c.center.y))[0];
  if(enemy){const x=enemy.x-230+Math.cos(t/80)*60-v.x,y=enemy.y+Math.sin(t/80)*100-v.y;const scale=Math.min(1,(v.leashWarningRadius-120)/Math.hypot(x,y));c.destination={x:v.x+x*scale,y:v.y+y*scale}}
  c.step(1/60);
 }
 const result={id:v.id,team:'initial three starters; no resonance/research; full health',teamLevel:fresh.roster[0].level,seed:42,mode:v.storyEncounter!.mode,victory:c.victory,reset:c.reset,seconds:+c.time.toFixed(2),survivors:c.allies.filter(u=>u.hp>0).length,hp:c.result()};proof.push(result);console.log(JSON.stringify(result));
}
if(!flowOnly&&!wanted.length)writeFileSync('docs/verification/chronicle-battles.json',JSON.stringify({fingerprint:await fingerprint(p),battleInputFingerprint:await fingerprint({characters:p.characters,enemies:p.enemies,skills:p.skills,research:p.research,rules:p.rules,planets:battles} as any),battles:proof},null,2)+'\n');
if(process.argv.includes('--battles')){assert.ok(proof.every(r=>r.victory));process.exit(0)}
if(wanted.length){writeFileSync('docs/verification/chronicle-battle-partial.json',JSON.stringify(proof,null,2)+'\n');assert.ok(proof.every(r=>r.victory));process.exit(0)}
for(const q of nodes){
 assert.ok(storyAvailable(p,s,q.id),'ordered unlock '+q.id);
 assert.ok(!nodes.find(other=>Number(other.id.split('.').at(-1))>Number(q.id.split('.').at(-1))&&storyAvailable(p,s,other.id)),'future chapter locked');
 command({type:'story-start',id:q.id});
 let guard=0;
 while(s.story.session){
  assert.ok(guard++<50);
  const cursor=s.story.session.cursor,step=q.story!.steps[cursor];
  if(step.kind==='await'){
   if(!conditionMet(s,step.condition)){command({type:'story-next',skip:true});assert.equal(s.story.session?.cursor,cursor,'skip does not bypass await');}else{command({type:'story-next',skip:true});continue;}
   // Explicit old-save fixtures: no claimed new victories, only existing-world evidence.
   if('fact'in step.condition&&step.condition.fact==='region')s.region=step.condition.target;
   else if('all'in step.condition)s.cleared.push(...step.condition.all.map((f:any)=>f.target).filter((id:string)=>!s.cleared.includes(id)));
  }else if(step.kind==='encounter'){
   command({type:'story-next',skip:true});assert.equal(s.story.session?.cursor,cursor,'skip does not bypass battle');
   command({type:'story-battle'});
   const v=p.planets.find(v=>v.id===step.planet)!;
   const level=Math.max(...v.enemies.map(g=>g.level??1))+2;
   s.roster.forEach(o=>{o.level=level;o.hp=stats(p,o).hp}); // full-health fixture; healing UI covered separately
   const prior=proof.find(r=>r.id===v.id);assert.ok(prior?.victory,'actual battle proof '+v.id);
   const result={type:'result',planet:v.id,victory:true,hp:prior.hp,receipt:'chronicle-result-'+seq};
   command(result);const after=JSON.stringify(s.story);s=apply(p,s,result as any,0,`chronicle-test-${seq}`);assert.equal(JSON.stringify(s.story),after,'same result no duplicate progression');
  }else command({type:'story-next',skip:true});
  // JSON persistence roundtrip at every gate; no invented migrations.
  s=JSON.parse(JSON.stringify(s));
 }
 assert.ok(s.story.completed.includes(q.id));assert.ok(s.storySeen.includes(q.id));assert.ok(!s.quests.includes(q.id));
 const roster=s.roster.length,wallet={...s.wallet};command({type:'quest',id:q.id});
 assert.equal(s.roster.length,roster,'story does not grant collection copies');
 for(const r of p.resources)assert.equal(s.wallet[r.id]-wallet[r.id],q.reward[r.id]);
 assert.throws(()=>command({type:'quest',id:q.id}),/已領取/);
 console.log('sequence',q.id,'PASS');
}
const narrative=nodes.flatMap(q=>q.story!.steps.filter(s=>s.kind==='say').map(s=>s.text));
assert.ok(narrative.every(t=>!/<\/?[a-z]|javascript:|<script/i.test(t)));
const report={scope:'New 24-node content only; seed42 battles at declared team levels, scripted orbital movement, auto skills. Gate fixtures explicitly model old world completion and region arrival; not a new account economy/time-to-complete certification.',nodes:24,battles:proof,allBattlesPassed:proof.every(r=>r.victory),orderedFlowCompleted:s.story.completed.filter(id=>id.startsWith('chronicle:')).length,claimed:s.quests.filter(id=>id.startsWith('chronicle:')).length,roster:s.roster.length,frames:narrative.length,maxFrame:Math.max(...narrative.map(t=>t.length)),totalRewardPerResource:3100};
writeFileSync('docs/verification/chronicle-content.json',JSON.stringify(report,null,2)+'\n');
assert.ok(proof.every(r=>r.victory));console.log('PASS full 24-node transactions / reload / skip gates / no duplicate claims');
