import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assemble} from '../../src/content/loader.ts';
import {laboratory} from '../../src/domain/laboratory.ts';
import {newSave,addCharacter,stats} from '../../src/domain/model.ts';
import {apply,settle,summonCandidates} from '../../src/domain/economy.ts';
import {Combat} from '../../src/domain/combat.ts';
import {checkSave} from '../../src/platform/storage.ts';
import {skillMechanic} from '../../src/content/descriptions.ts';
const load=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const m=load('content/manifest.json'),ext=load('content/extensions/prologue6.json'),evidence=load('docs/handoffs/prologue6-20261023.sources.json');
const base=assemble(load('content/'+m.base),m.extensions.map((f:string)=>load('content/'+f)),m.regionPresentation,m.characterPresentation);
const p=assemble(load('content/'+m.base),[...m.extensions.map((f:string)=>load('content/'+f)),ext],m.regionPresentation,m.characterPresentation);
assert.equal(p.characters.length,32);assert.deepEqual(p.characters.slice(0,26),base.characters);checkSave(newSave(base,0),p);
const raw=load('research/stella-maiden/tables/CID.json');
const rawRows=Array.isArray(raw)?raw:raw.rows;
const sourceSkill=load('research/stella-maiden/tables/Skill.json');
const skillRows=Array.isArray(sourceSkill)?sourceSkill:sourceSkill.rows;
const rows=[];
for(const c of ext.definitions.characters){
 const r=rawRows.find((v:any)=>v._row===c.sourceRow);assert(r);const sk=p.skills.find(v=>v.id===c.skill)!;
 assert.equal(sk.sourceSkill,r.f106);assert.equal(c.rarity,r.f02);assert.equal(c.critical,r.f18/100);assert.equal(c.evasion,r.f19/100);assert.equal(sk.effect,'program');
 for(const [stat,field] of [['hp','f17'],['attack','f15'],['defense','f16']])assert.equal(c[stat],Math.round(Math.trunc(r[field]/10)*evidence.scales[stat]));
 let obtained=false;const pool=summonCandidates(p,c.recipe);assert(pool.some(v=>v.character.id===c.id));
 for(let seed=1;seed<100&&!obtained;seed++){
  let s=newSave(p,0);s.rng=Math.imul(seed,2654435761)>>>0;s.wallet=Object.fromEntries(p.resources.map(v=>[v.id,5000]));
  s=apply(p,s,{type:'summon',recipe:c.recipe,count:1},0,'summon');
  for(let i=0;i<4;i++)assert.equal(s.wallet[p.resources[i].id],5000-c.recipe[i]);
  settle(p,s,p.rules.summonSeconds*1000+1);obtained=s.roster.some(v=>v.definition===c.id);checkSave(s,p);
 }assert(obtained,c.id+' actual summon');
 for(const level of [1,10]){
  const lab=laboratory(p,{allies:[{character:c.id,level:1,skillLevel:level}],enemies:[{enemy:'m1:scout',level:1,count:2}],seed:77,lockHealth:true});
  const u=lab.allies[0];u.cooldown=999;u.aim=0;
  const foes=lab.units.filter(v=>v.side==='enemy');foes.forEach((v,i)=>{v.x=u.x+150+i*40;v.y=u.y;v.cooldown=999;v.speed=0;v.hp=v.maxHp=100000;v.evasion=0;v.defense=0;});
  const skill=lab.skillFor(u)!;const sr=skillRows.find((v:any)=>v._row===r.f106);assert.equal(skill.cooldown,(sr.f06-(level-1)*sr.f07)/1000);
  assert(lab.cast(u.id));assert(!lab.cast(u.id));
  if(r.f106===61)assert.equal(lab.mechanics.stat(u,'offset'),(sr.f54+(level-1)*sr.f55)/100);
  if(r.f106===75){assert(lab.mechanics.has(u,'invincible'));assert.equal(lab.mechanics.hit(foes[0],u,100,'aim'),0);}
  if(r.f106===184){assert.equal(lab.mechanics.stat(u,'damageTaken'),0);assert.equal(lab.mechanics.hit(foes[0],u,100,'aim'),0);}
  if(r.f106===6){
   const multiplier=(sr.f82+(level-1)*sr.f83)/100;
   assert.equal(lab.mechanics.stat(u,'attackSpeed'),(sr.f45+(level-1)*sr.f46)/100);assert.equal(lab.mechanics.stat(u,'projectileSpeed'),multiplier);
   lab.mechanics.fire(u,foes[0],'aim',1,undefined,520);const bullet=lab.bullets.at(-1)!;assert(Math.abs(Math.hypot(bullet.vx,bullet.vy)-520*multiplier)<1e-6);
  }
  for(let i=0;i<30;i++)lab.step(1/60);
  if([106,116].includes(r.f106))assert((lab.mechanics.damageDealt[u.id]??0)>0,c.id+' actual damage');
  if(r.f106===106)assert(foes.some(v=>lab.mechanics.has(v,'stun')));
  assert(lab.units.every(v=>Number.isFinite(v.hp)&&Number.isFinite(v.attack)));
 }
 rows.push({name:c.name,rarity:c.rarity,sourceSkill:r.f106,rank:pool.findIndex(v=>v.character.id===c.id)+1,mechanic:skillMechanic(sk)});
}
for(const c of base.characters)assert(summonCandidates(p,c.recipe).some(v=>v.character.id===c.id),c.id+' old recipe');
const fights=[];
for(const c of ext.definitions.characters){
 const s=newSave(p,0);s.roster=[];s.team=[];
 const ids=c.role.startsWith('前鋒')?[c.id,'m1:mercury','m1:venus']:['m1:earth',c.id,'m1:venus'];
 for(const id of ids){const o=addCharacter(p,s,id)!;o.level=2;o.hp=stats(p,o).hp;s.team.push(o.id)}
 const v=p.planets.find(v=>v.id==='m1:haven')!;s.region=v.region;s.x=v.x-v.engageRadius+30;s.y=v.y;s.encounter={planet:v.id,seed:77};
 const b=new Combat(p,s,v.id);b.autoSkills=true;
 for(let tick=0;tick<12000&&!b.ended;tick++){
 const e=b.units.filter(v=>v.side==='enemy'&&v.hp>0).sort((a,z)=>Math.hypot(a.x-b.center.x,a.y-b.center.y)-Math.hypot(z.x-b.center.x,z.y-b.center.y))[0];
 if(e)b.destination={x:e.x-240+Math.cos(tick/80)*90,y:e.y+Math.sin(tick/80)*130};b.step(1/60);
 }assert(b.victory,c.id+' haven');assert.equal(b.waveGroups.length,1);fights.push({character:c.id,seconds:+b.time.toFixed(1),alive:b.allies.filter(v=>v.hp>0).length});
}
fs.mkdirSync('.artifacts/prologue6',{recursive:true});fs.writeFileSync('.artifacts/prologue6/pack.json',JSON.stringify(p));fs.writeFileSync('.artifacts/prologue6/verification.json',JSON.stringify({rows,fights},null,2));
console.log('PASS 32-character assembly; six actual summons; skill Lv1/10; Overload actual bullet velocity; six Haven victories; 26 old recipes/save preserved');
