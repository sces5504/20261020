import fs from 'node:fs';
import assert from 'node:assert/strict';
import {assemble} from '../../src/content/loader.ts';
import {laboratory} from '../../src/domain/laboratory.ts';
import {newSave} from '../../src/domain/model.ts';
import {apply,settle,summonCandidates} from '../../src/domain/economy.ts';
import {checkSave} from '../../src/platform/storage.ts';
import {skillMechanic} from '../../src/content/descriptions.ts';
const load=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const m=load('content/manifest.json'),ext=load('content/extensions/late3.json'),e=load('docs/handoffs/late3-20261026.sources.json');
const merge=(extra:any[])=>assemble(load('content/'+m.base),[...m.extensions.map((f:string)=>load('content/'+f)),...extra],m.regionPresentation,m.characterPresentation,m.regionRoutes);
const base=merge([]),p=merge([ext]);assert.equal(base.characters.length,72);assert.equal(p.characters.length,75);assert.deepEqual(p.characters.slice(0,72),base.characters);checkSave(newSave(base,0),p);
assert.equal(p.characters.filter(c=>c.sourceRow===118).length,1);assert.equal(p.characters.find(c=>c.sourceRow===118)!.id,'story40:character.gienah');
assert(ext.definitions.characters.some((c:any)=>c.sourceRow===120));assert(!ext.definitions.characters.some((c:any)=>c.sourceRow===115));
const raw=load('research/stella-maiden/tables/CID.json').rows,skills=load('research/stella-maiden/tables/Skill.json').rows;
const targets=[...ext.definitions.characters,p.characters.find(c=>c.sourceRow===118)!],results=[];
for(const c of targets){
 const r=raw.find((v:any)=>v._row===c.sourceRow),sk=p.skills.find(v=>v.id===c.skill)!;
 assert.equal(sk.sourceSkill,r.f106);assert.equal(c.rarity,r.f02);assert.equal(c.critical,r.f18/100);assert.equal(c.evasion,r.f19/100);
 if(c.sourceRow!==118)for(const [stat,field] of [['hp','f17'],['attack','f15'],['defense','f16']])assert.equal(c[stat],Math.round(Math.trunc(r[field]/10)*e.scales[stat]));
 assert(summonCandidates(p,c.recipe).some(v=>v.character.id===c.id));let obtained=false;
 for(let seed=1;seed<100&&!obtained;seed++){
  let s=newSave(p,0);s.rng=Math.imul(seed,2654435761)>>>0;s.wallet=Object.fromEntries(p.resources.map(v=>[v.id,5000]));s=apply(p,s,{type:'summon',recipe:c.recipe,count:1},0,'summon');
  const now=p.rules.summonSeconds*1000+1;settle(p,s,now);assert.equal(s.jobs.filter(j=>j.kind==='summon').length,1);assert.equal(s.summoned,0,'wait for explicit reveal');
  for(let i=0;i<4;i++)assert.equal(s.wallet[p.resources[i].id],5000-c.recipe[i]);
  s=apply(p,s,{type:'summon-claim'},now,'claim');assert.equal(s.jobs.filter(j=>j.kind==='summon').length,0);const duplicate=apply(p,s,{type:'summon-claim'},now,'claim');assert.deepEqual(duplicate,s);
  obtained=s.roster.some(v=>v.definition===c.id);checkSave(s,p);
 }assert(obtained,c.id+' actual summon/reveal');
 for(const level of [1,10]){
  const b=laboratory(p,{allies:[{character:c.id,level:1,skillLevel:level},{character:'m1:mercury',level:1,skillLevel:1}],enemies:[{enemy:'m1:scout',level:1,count:2}],seed:77,lockHealth:true});
  const u=b.allies[0],friend=b.allies[1];u.cooldown=friend.cooldown=999;u.critical=0;friend.skillCooldown=10;friend.x=u.x+30;friend.y=u.y;
  const foes=b.units.filter(v=>v.side==='enemy');foes.forEach((v,i)=>{v.x=u.x+200+i*30;v.y=u.y;v.cooldown=999;v.speed=0;v.hp=v.maxHp=100000;v.evasion=v.critical=0;v.defense=1000});
  const source=skills.find((v:any)=>v._row===r.f106);assert.equal(b.skillFor(u)!.cooldown,(source.f06-(level-1)*source.f07)/1000);
  assert(b.cast(u.id));assert(!b.cast(u.id));
  if(c.sourceRow===120){assert(b.mechanics.stat(friend,'attack')>1);assert(b.mechanics.stat(friend,'defense')<1);}
  if(c.sourceRow===119){assert(b.mechanics.stat(u,'attack')>1);assert.equal(b.mechanics.stat(u,'penetration'),0);const armor=b.mechanics.hit(u,foes[0],100,'aim');foes[0].defense=0;const noArmor=b.mechanics.hit(u,foes[0],100,'aim');assert.equal(armor,noArmor,'actual armor bypass');}
  if(c.sourceRow===118)assert(friend.skillCooldown<10,'actual friendly cooldown reduction');
  if(c.sourceRow===123){for(let i=0;i<31;i++)b.step(1/60);assert.equal(b.bullets.filter(v=>v.side==='ally').length,8);assert(b.bullets.filter(v=>v.side==='ally').every(v=>v.pattern==='homing'));for(let i=0;i<90;i++)b.step(1/60);assert((b.mechanics.damageDealt[u.id]??0)>0,'homing missiles actually hit');}
 }
 results.push({id:c.id,cid:c.sourceRow,rarity:c.rarity,skill:sk.id,mechanic:skillMechanic(sk),status:c.sourceRow===118?'existing-preserved':'new'});
}
for(const c of base.characters)assert(summonCandidates(p,c.recipe).some(v=>v.character.id===c.id),c.id+' old preset');
fs.mkdirSync('.artifacts/late3',{recursive:true});fs.writeFileSync('.artifacts/late3/pack.json',JSON.stringify(p));fs.writeFileSync('.artifacts/late3/verification.json',JSON.stringify({base:72,merged:75,results},null,2));
console.log('PASS 3 new/1 existing; source/stars/stats; four actual reveals; Lv1/10 homing/armor bypass/ally buffs/cooldown; 72 old presets/save preserved');
