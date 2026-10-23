import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {assemble} from '../../src/content/loader.ts';
import {laboratory} from '../../src/domain/laboratory.ts';
import {newSave,addCharacter,stats} from '../../src/domain/model.ts';
import {apply,settle,summonCandidates} from '../../src/domain/economy.ts';
import {Combat} from '../../src/domain/combat.ts';
import {checkSave} from '../../src/platform/storage.ts';
import {skillMechanic} from '../../src/content/descriptions.ts';
const load=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const m=load('content/manifest.json'),ext=load('content/extensions/story10.json');
const base=assemble(load('content/'+m.base),m.extensions.map((f:string)=>load('content/'+f)),m.regionPresentation,m.characterPresentation);
const p=assemble(load('content/'+m.base),[...m.extensions.map((f:string)=>load('content/'+f)),ext],m.regionPresentation,m.characterPresentation);
assert.equal(p.characters.length,base.characters.length+ext.definitions.characters.length);
assert.deepEqual(p.characters.slice(0,16),base.characters);checkSave(newSave(base,0),p);
// Query the immutable research archive through a read-only SQLite connection.
const source=JSON.parse(execFileSync('python3',['-c',`import sqlite3,json
c=sqlite3.connect('file:research/stella-maiden/generated/stella_research.sqlite?mode=ro',uri=True);c.row_factory=sqlite3.Row
print(json.dumps([dict(r) for r in c.execute('select _row,f02,f15,f16,f17,f18,f19,f106 from CID where _row in (25,26,27,28,29,30,31,32,33,37)')]))`],{encoding:'utf8'}));
const median=(xs:number[])=>{const x=xs.sort((a,b)=>a-b);return (x[7]+x[8])/2};
const baselineRows=JSON.parse(execFileSync('python3',['-c',`import sqlite3,json
c=sqlite3.connect('file:research/stella-maiden/generated/stella_research.sqlite?mode=ro',uri=True);c.row_factory=sqlite3.Row
print(json.dumps([dict(r) for r in c.execute('select _row,f15,f16,f17 from CID where _row between 1 and 20')]))`],{encoding:'utf8'}));
const coefficients=Object.fromEntries([['hp','f17'],['attack','f15'],['defense','f16']].map(([stat,field])=>[stat,median(base.characters.map(c=>c[stat]/Math.trunc(baselineRows.find((r:any)=>r._row===c.sourceRow)[field]/10)))]));
const rows=[];
for(const c of ext.definitions.characters){
 const raw=source.find((r:any)=>r._row===c.sourceRow);assert(raw);assert.equal(c.rarity,raw.f02);assert.equal(c.critical,raw.f18/100);assert.equal(c.evasion,raw.f19/100);
 for(const [stat,field] of [['hp','f17'],['attack','f15'],['defense','f16']])assert.equal(c[stat],Math.round(Math.trunc(raw[field]/10)*coefficients[stat]));
 const sk=p.skills.find(s=>s.id===c.skill)!;assert.equal(sk.sourceSkill,raw.f106);assert.equal(sk.effect,'program');assert.equal(sk.fidelity,'description');assert.equal(sk.levels?.length,9);
 const rank=summonCandidates(p,c.recipe).findIndex(v=>v.character.id===c.id);assert(rank>=0,c.name+' reachable');
 let obtained=false;
 for(let seed=1;seed<=100&&!obtained;seed++){
  let s=newSave(p,0);s.rng=Math.imul(seed,2654435761)>>>0;s.wallet=Object.fromEntries(p.resources.map(r=>[r.id,5000]));
  s=apply(p,s,{type:'summon',recipe:c.recipe,count:1},0,'summon');
  for(let i=0;i<4;i++)assert.equal(s.wallet[p.resources[i].id],5000-c.recipe[i]);
  settle(p,s,p.rules.summonSeconds*1000+1);checkSave(s,p);obtained=s.roster.some(o=>o.definition===c.id);
 }assert(obtained,c.name+' actual summon');
 for(const level of [1,10]){
  const lab=laboratory(p,{allies:[{character:c.id,level:1,skillLevel:level}],enemies:[{enemy:p.enemies[0].id,level:1,count:2}],seed:77,lockHealth:true});
  const u=lab.allies[0];u.cooldown=999;u.aim=0;
  lab.units.filter(v=>v.side==='enemy').forEach((v,i)=>{v.x=u.x+180+i*40;v.y=u.y;v.cooldown=999;v.speed=0;v.hp=v.maxHp=100000;v.evasion=0;});
  assert(lab.cast(u.id));assert(!lab.cast(u.id));
  for(let i=0;i<30;i++)lab.step(1/60);
  if(sk.sourceSkill===85)assert.equal(lab.units.filter(v=>v.summonKind==='drone').length,4);
  if(sk.sourceSkill===58)assert(lab.mechanics.stat(u,'directional')<1);
  if([16,27,32,35].includes(sk.sourceSkill!))assert(lab.mechanics.stat(u,'attack')>1);
  if(sk.sourceSkill===9)assert(lab.mechanics.stat(u,'attackSpeed')>1);
  if(sk.sourceSkill===39)assert(lab.mechanics.stat(u,'critical',c.critical)>=.95);
  if([102,113].includes(sk.sourceSkill!))assert((lab.mechanics.damageDealt[u.id]??0)>0,c.name+' skill damage');
  assert(lab.units.every(v=>Number.isFinite(v.hp)&&Number.isFinite(v.attack)));
 }
 rows.push({name:c.name,skill:sk.id,sourceSkill:sk.sourceSkill,rank:rank+1,mechanic:skillMechanic(sk),cooldown:sk.cooldown});
}
// The existing sixteen remain reachable with their own presets after the pool grows.
for(const c of base.characters)assert(summonCandidates(p,c.recipe).some(v=>v.character.id===c.id),c.id+' old preset');
const fights=[];
for(const c of ext.definitions.characters)for(const planet of p.planets){
 const s=newSave(p,0);s.roster=[];s.team=[];
 const ids=c.role.startsWith('前鋒')?[c.id,'m1:mercury','m1:venus']:['m1:earth',c.id,'m1:venus'];
 for(const id of ids){const o=addCharacter(p,s,id)!;o.level=2;o.hp=stats(p,o).hp;s.team.push(o.id)}
 s.region=planet.region;s.x=planet.x-planet.engageRadius+30;s.y=planet.y;s.encounter={planet:planet.id,seed:77};
 const b=new Combat(p,s,planet.id);b.autoSkills=true;
 for(let tick=0;tick<12000&&!b.ended;tick++){
 const e=b.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,z)=>Math.hypot(a.x-b.center.x,a.y-b.center.y)-Math.hypot(z.x-b.center.x,z.y-b.center.y))[0];
 if(e)b.destination={x:e.x-240+Math.cos(tick/80)*90,y:e.y+Math.sin(tick/80)*130};b.step(1/60);
 }
 assert(b.victory,c.name+' '+planet.name);assert.equal(b.waveGroups.length,1);
 fights.push({character:c.id,planet:planet.id,seconds:+b.time.toFixed(1),alive:b.allies.filter(u=>u.hp>0).length});
}
fs.mkdirSync('.artifacts/story10',{recursive:true});fs.writeFileSync('.artifacts/story10/pack.json',JSON.stringify(p));
fs.writeFileSync('.artifacts/story10/verification.json',JSON.stringify({rows,fights},null,2));
console.log(`PASS ${rows.length} source-linked characters; actual summons; skill Lv1/Lv10; ${fights.length} single-wave victories; 16 old presets and saves preserved`);
