import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {published as p} from '../../src/content/index.ts';
import {newSave,stats} from '../../src/domain/model.ts';
import {apply} from '../../src/domain/economy.ts';
import {conditionMet} from '../../src/domain/story.ts';
import {Combat} from '../../src/domain/combat.ts';
let now=0,seq=0,s=newSave(p,now,'chronicle-budget');s.region='original:region.solar';
const tx=(c:any)=>s=apply(p,s,c,now,`budget-${++seq}`);
const battles:any[]=[],chapters:any[]=[];let heals=0,levels=0;
for(const q of p.quests.filter(q=>q.id.startsWith('chronicle:quest.'))){
 tx({type:'story-start',id:q.id});let guard=0;
 while(s.story.session){
  assert.ok(guard++<70);const step=q.story!.steps[s.story.session.cursor];
  if(step.kind==='await'&&!conditionMet(s,step.condition)){
   if('fact'in step.condition&&step.condition.fact==='region')s.region=step.condition.target;
   else if('all'in step.condition)s.cleared.push(...step.condition.all.map((v:any)=>v.target).filter((id:string)=>!s.cleared.includes(id)));
   // Prior world campaign supplied as a fixture with NO income; base world is separately verified.
  }else if(step.kind==='encounter'){
   // Spend only initial wallet and earned chapter rewards. No passive income or simulated free healing.
   for(let pass=0;pass<30;pass++){
    const target=s.roster.filter(o=>s.team.includes(o.id)).sort((a,b)=>a.level-b.level)[0];
    if(!target||!p.resources.every(r=>s.wallet[r.id]>=(p.rules.levelCost[r.id]??0)*target.level+90))break;
    tx({type:'level',owned:target.id});levels++;
   }
   for(const o of [...s.roster])if(s.team.includes(o.id)&&o.hp<stats(p,o).hp){tx({type:'heal',owned:o.id});heals++;}
   const end=Math.max(now,...s.jobs.map(j=>j.ends));now=end;tx({type:'checkpoint',x:s.x,y:s.y});
   tx({type:'story-battle'});const v=p.planets.find(v=>v.id===step.planet)!;const c=new Combat(p,s,v.id);c.autoSkills=true;
   for(let tick=0;tick<60*240&&!c.ended;tick++){
    const e=c.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-c.center.x,a.y-c.center.y)-Math.hypot(b.x-c.center.x,b.y-c.center.y))[0];
    if(e){const x=e.x-v.x-230+Math.cos(tick/80)*60,y=e.y-v.y+Math.sin(tick/80)*100,scale=Math.min(1,(v.leashWarningRadius-120)/Math.hypot(x,y));c.destination={x:v.x+x*scale,y:v.y+y*scale}}
    c.step(1/60);
   }
   battles.push({id:v.id,levels:s.roster.map(o=>o.level),victory:c.victory,seconds:+c.time.toFixed(2),wallet:{...s.wallet}});console.log(JSON.stringify(battles.at(-1)));
   writeFileSync('docs/verification/chronicle-economy.json',JSON.stringify({scope:'Conservative route: initial wallet + authored chapter rewards only. No passive/daily/old tutorial/world income. Existing world-clear gate and region arrivals supplied as explicit fixtures, not claimed new account playthrough. Actual paid leveling and timed healing; auto skills and scripted movement.',battles,chapters,heals,levels,passed:false},null,2)+'\n');
   assert.ok(c.victory,'budget route '+v.id);tx({type:'result',planet:v.id,victory:c.victory,hp:c.result(),receipt:`budget-result-${seq}`});
  }else tx({type:'story-next',skip:true});
 }
 tx({type:'quest',id:q.id});chapters.push({id:q.id,levels:s.roster.map(o=>o.level),wallet:{...s.wallet}});
}
writeFileSync('docs/verification/chronicle-economy.json',JSON.stringify({scope:'Initial wallet + chapter rewards only; no passive/daily/tutorial/world income. World clears/region arrivals explicitly fixture supplied. Actual paid leveling and timed healing; auto skills and scripted movement. This is not a measured new-account playthrough.',battles,chapters,heals,levels,passed:true},null,2)+'\n');console.log('PASS paid growth/healing route,',battles.length,'battles');
