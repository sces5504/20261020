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
const m=load('content/manifest.json'),ext=load('content/extensions/story40.json'),evidence=load('docs/handoffs/story40-20261025.sources.json');
const merge=(extra:any[])=>assemble(load('content/'+m.base),[...m.extensions.map((f:string)=>load('content/'+f)),...extra],m.regionPresentation,m.characterPresentation,m.regionRoutes);
const base=merge([]),p=merge([ext]);assert.equal(base.characters.length,32);assert.equal(p.characters.length,72);assert.deepEqual(p.characters.slice(0,32),base.characters);checkSave(newSave(base,0),p);
const raw=load('research/stella-maiden/tables/CID.json').rows,skills=load('research/stella-maiden/tables/Skill.json').rows,events=load('research/stella-maiden/tables/EventScript.json').rows;
assert.equal(evidence.characters.filter((v:any)=>v.placement==='first-source-appearance').length,38);
assert.deepEqual(evidence.characters.filter((v:any)=>v.placement!=='first-source-appearance').map((v:any)=>v.cid),[45,54]);
const encountersOnly=process.argv.includes("--encounters-only")||process.argv.includes("--polaris-only");
const rows=[];
if(!encountersOnly){
for(const c of ext.definitions.characters){
 const r=raw.find((v:any)=>v._row===c.sourceRow),record=evidence.characters.find((v:any)=>v.cid===c.sourceRow),sk=p.skills.find(v=>v.id===c.skill)!;
 assert(r);assert.equal(sk.sourceSkill,r.f106);assert.equal(sk.effect,'program');assert.equal(sk.levels?.length,9);assert.equal(c.rarity,r.f02);assert.equal(c.critical,r.f18/100);assert.equal(c.evasion,r.f19/100);
 for(const [stat,field] of [['hp','f17'],['attack','f15'],['defense','f16']])assert.equal(c[stat],Math.round(Math.trunc(r[field]/10)*evidence.scales[stat]));
 if(record.event){const e=events.find((v:any)=>v._row===record.event._row);assert((e.f02===47&&e.f09===c.sourceRow)||(e.f02===0&&[e.f34,e.f35].includes(c.sourceRow)));}
 else assert(p.planets.some(v=>v.id===record.planet),c.id+' regional companion');
 const pool=summonCandidates(p,c.recipe);assert(pool.some(v=>v.character.id===c.id),c.id+' reachable');
 let obtained=false;
 for(let seed=1;seed<100&&!obtained;seed++){
  let s=newSave(p,0);s.rng=Math.imul(seed,2654435761)>>>0;s.wallet=Object.fromEntries(p.resources.map(v=>[v.id,5000]));
  s=apply(p,s,{type:'summon',recipe:c.recipe,count:1},0,'summon');
  for(let i=0;i<4;i++)assert.equal(s.wallet[p.resources[i].id],5000-c.recipe[i]);
  settle(p,s,p.rules.summonSeconds*1000+1);obtained=s.roster.some(v=>v.definition===c.id);checkSave(s,p);
 }assert(obtained,c.id+' actual summon');
 for(const level of [1,10]){
  const lab=laboratory(p,{allies:[{character:c.id,level:1,skillLevel:level},{character:'m1:mercury',level:1,skillLevel:1}],enemies:[{enemy:'m1:scout',level:1,count:2}],seed:77,lockHealth:true});
  const u=lab.allies[0],friend=lab.allies[1];u.cooldown=friend.cooldown=999;u.aim=0;friend.x=u.x+30;friend.y=u.y;friend.skillCooldown=10;
  const foes=lab.units.filter(v=>v.side==='enemy');foes.forEach((v,i)=>{v.x=u.x+150+i*40;v.y=u.y;v.cooldown=999;v.speed=0;v.hp=v.maxHp=100000;v.evasion=v.critical=v.defense=0;});
  const source=skills.find((v:any)=>v._row===r.f106),actual=lab.skillFor(u)!;assert.equal(actual.cooldown,(source.f06-(level-1)*source.f07)/1000);
  assert(lab.cast(u.id));assert(!lab.cast(u.id));
  const status=actual.actions!.filter(a=>a.kind==='status');
  for(const a of status)for(const mod of a.modifiers){const target=a.target==='enemies'?foes[0]:a.target==='allies'?friend:u;assert(lab.mechanics.has(target,mod.stat),c.id+' '+mod.stat);}
  if(r.f106===193)assert(friend.skillCooldown<10,'Gienah actual cooldown reduction');
  if(r.f106===220){const hit=lab.mechanics.hit(foes[0],friend,100,'aim');assert(hit>0);assert((lab.mechanics.storedDamage.get(u.id)??0)>0);}
  const wait=r.f106===220?5.8:1.2;
  for(let i=0;i<Math.ceil(wait*60);i++)lab.step(1/60);
  const damaging=actual.actions!.some(a=>['projectile','zone','beam','detonate'].includes(a.kind)&&(a.power>0||a.kind==='detonate'||a.modifiers.some(v=>v.stat==='corrosion')));
  if(damaging)assert((lab.mechanics.damageDealt[u.id]??0)>0,c.id+' actual skill damage');
  if(actual.actions!.some(a=>a.kind==='summon'))assert(lab.units.some(v=>v.summonOwner===u.id),c.id+' actual summon unit');
  assert(lab.units.every(v=>Number.isFinite(v.hp)&&Number.isFinite(v.attack)));
 }
 rows.push({order:record.order,name:c.name,key:record.key,cid:c.sourceRow,rarity:c.rarity,skill:sk.id,rank:pool.findIndex(v=>v.character.id===c.id)+1,mechanic:skillMechanic(sk)});
}
for(const c of base.characters)assert(summonCandidates(p,c.recipe).some(v=>v.character.id===c.id),c.id+' old recipe');
fs.mkdirSync('.artifacts/story40',{recursive:true});fs.writeFileSync('.artifacts/story40/unit-verification.json',JSON.stringify({rows},null,2));
}
const polarisOnly=process.argv.includes("--polaris-only");
const fights=polarisOnly?load(".artifacts/story40/verification.json").fights.filter((v:any)=>!v.character.endsWith("polaris")):[];
// Three representative encounters only; no replay of unchanged world/campaign suites.
for(const id of (polarisOnly?['story40:character.polaris']:['story40:character.luyten','story40:character.polaris','story40:character.behemoth'])){
 const c=p.characters.find(v=>v.id===id)!,s=newSave(p,0);s.roster=[];s.team=[];
 const team=c.role.startsWith('前鋒')?[id,'m1:mercury','m1:venus']:['m1:earth',id,'m1:venus'];
 for(const definition of team){const o=addCharacter(p,s,definition)!;o.level=2;o.hp=stats(p,o).hp;s.team.push(o.id)}
 const v=p.planets.find(v=>v.id==='m1:haven')!;s.region=v.region;s.x=v.x-v.engageRadius+30;s.y=v.y;s.encounter={planet:v.id,seed:77};
 const b=new Combat(p,s,v.id);b.autoSkills=true;
 for(let tick=0;tick<12000&&!b.ended;tick++){
 const e=b.units.filter(v=>v.side==='enemy'&&v.hp>0).sort((a,z)=>Math.hypot(a.x-b.center.x,a.y-b.center.y)-Math.hypot(z.x-b.center.x,z.y-b.center.y))[0];
 if(id.endsWith('polaris'))b.destination={x:v.x-180,y:v.y};else if(e)b.destination={x:e.x-240+Math.cos(tick/80)*90,y:e.y+Math.sin(tick/80)*130};b.step(1/60);
 }assert(b.victory,id+' haven');assert.equal(b.waveGroups.length,1);fights.push({character:id,victory:b.victory,reset:b.reset,seconds:+b.time.toFixed(1),alive:b.allies.filter(v=>v.hp>0).length});
}
fs.mkdirSync('.artifacts/story40',{recursive:true});fs.writeFileSync('.artifacts/story40/pack.json',JSON.stringify(p));fs.writeFileSync('.artifacts/story40/verification.json',JSON.stringify({rows:encountersOnly?load('.artifacts/story40/unit-verification.json').rows:rows,fights},null,2));
console.log('PASS 72-character assembly; 38 direct/2 inferred; 40 actual acquisitions; skill Lv1/10; 32 old recipes/save preserved; 3 representative victories');
