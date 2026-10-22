"""Reproducible description-based data translation. Never modifies research archive.
Raw game units/tick timing do not prove native engine equivalence; see generated evidence.
"""
import sqlite3,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
db=sqlite3.connect('file:'+str(root/'research/stella-maiden/generated/stella_research.sqlite')+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
rows=[dict(r) for r in db.execute('SELECT * FROM skills_localized ORDER BY _row')]
characters={r['_row']:dict(r) for r in db.execute('SELECT * FROM CID')}
selected={'sun':(1,71,'抗蝕屏障'),'jupiter':(6,81,'重力集中'),'saturn':(7,60,'能量屏障'),'neptune':(9,26,'戰鬥準備'),'pluto':(10,124,'滅絕之光'),'nemesis':(11,119,'大滅絕盲射'),'ganymede':(16,82,'星靈分身'),'io':(17,98,'心智混亂'),'titania':(19,89,'攻擊封鎖'),'ariel':(20,95,'震撼射擊')}
def actions(r,L):
 k=L-1
 v=lambda n:(r[f'f{n:02d}']+k*r.get(f'f{n+1:02d}',0))
 time=max(.05,v(12)/1000);life=max(.05,v(52)/1000);rad=v(56) or 800
 def m(stat,value,duration=time,immune=[]):return dict(stat=stat,value=value,duration=duration,immune=immune)
 def status(target,mods):return dict(kind='status',target=target,radius=rad,modifiers=mods)
 row=r['_row']
 if row==71:return [status('allies',[m('defense',v(33)/100,immune=['corrosion','blaze'])])]
 if row==81:return [status('self',[m('damageTaken',1-v(43)/100,life)]),dict(kind='zone',target='enemies',radius=v(49),duration=life,interval=.2,power=v(31)*r['f51']/10000,pull=r['f30'],follow=True)]
 if row==60:return [status('self',[m('directional',1-v(43)/100)])]
 if row==26:return [status('self',[m('attack',v(31)/100),m('attackSpeed',v(45)/100)])]
 if row==124:return [dict(kind='beam',target='enemies',radius=1200,width=rad,duration=time,power=v(31)/100,interval=.2,follow=True,delay=r['f75']/1000)]
 if row==119:return [dict(kind='projectile',pattern='homing',count=r['f17'],power=v(31)/100,duration=6,speed=520,cadence=.08,cancelOnTargetDeath=True)]
 if row==82:return [dict(kind='summon',summon='clone',power=v(54)/100,duration=life,delay=r['f75']/1000)]
 if row==98:return [status('enemies',[m('moveSpeed',v(47)/100,life),m('attackSpeed',v(45)/100,life)])]
 if row==89:return [status('enemies',[m('attack',v(31)/100,life),m('critical',v(35)/100,life)])]
 if row==95:return [dict(kind='projectile',pattern='burst',count=3,interval=.2,power=v(31)/100,duration=5,modifiers=[m('stun',1,v(39)/1000)])]
 t=r['f02'];duration=time if r['f12'] else life
 ratio=lambda field,default=100:max(0,v(field)/100) if r[f'f{field:02d}'] else default/100
 def mod(stat,field,**kw):return dict(m(stat,ratio(field),duration),**kw)
 def buff(target,mods):return [status(target,mods)]
 def shot(**kw):return dict(kind='projectile',target='target',power=ratio(31),duration=6,count=max(1,r['f17']),delay=r['f75']/1000,**kw)
 attack={1:[('attackSpeed',45)],2:[('attackSpeed',45)],3:[('attackSpeed',45),('critical',35)],4:[('attackSpeed',45),('critical',35)],5:[('attack',31)],6:[('attack',31)],7:[('attack',31),('attackSpeed',45)],8:[('attack',31),('critical',35)],9:[('attack',31),('critical',35)],11:[('defense',33)],12:[('attack',31),('defense',33)],13:[('evasion',37)],14:[('defense',33)],15:[('evasion',37)],59:[('attack',31),('defense',33)],60:[],62:[('attack',31),('attackSpeed',45)]}
 if t in attack:
  target='allies' if t in (2,4,6,9,11,12,13,60) else 'self'
  return buff(target,[mod(stat,f) for stat,f in attack[t]]+([m('damageTaken',max(0,1-v(43)/100),duration)] if t==60 else []))
 if t==10:return buff('self',[dict(m('critical',1,duration),mode='set')])
 if t==16:return buff('self',[m('directional',max(0,1-v(43)/100),duration)])
 if t in (17,18,19):return buff('self',[dict(m({17:'offset',18:'deflect',19:'reflect'}[t],ratio(54),duration),interceptRadius=rad)])
 if t in (20,21,63,69,75):return buff('allies',[mod('defense',33,immune={20:['stun'],21:['corrosion','blaze'],63:['laser'],69:['melee'],75:['taunt']}[t])])
 if t==22:return buff('self',[m('invisible',1,duration),mod('critical',35)])
 if t==23:return buff('self',[m('invincible',1,duration)])
 if t==24:return buff('self',[mod('defense',33),mod('evasion',37),mod('scale',54)])
 if t==25:return buff('self',[mod('defense',33)])+buff('enemies',[m('taunt',1,duration)])
 if t in (26,27):return [dict(kind='zone',target='enemies',radius=v(49),duration=life,interval=.2,power=v(31)*r['f51']/10000,pull=r['f30'] or 200,follow=True)]+(buff('self',[m('damageTaken',max(0,1-v(43)/100),life)]) if t==27 else [])
 if t in (28,29,30):return [dict(kind='summon',summon={28:'clone',29:'drone',30:'turret'}[t],power=ratio(54) if t==28 else .5,count=max(1,r['f79']),duration=life,delay=r['f75']/1000)]
 if t==31:return buff('enemies',[mod('attack',31),mod('critical',35)])
 if t==32:return buff('enemies',[mod('defense',33),mod('evasion',37)])
 if t==33:return [dict(shot(pattern='burst',interval=.2,modifiers=[m('stun',1,max(.05,v(39)/1000))]),count=3)]
 if t in (34,55):return [shot(pattern='piercing' if t==55 else 'aim',pierce=8 if t==55 else 0,modifiers=[dict(m('corrosion',max(.01,ratio(28,10)),max(.05,v(41)/1000)),tick=.5)])]
 if t==35:return buff('enemies',[mod('attackSpeed',45),mod('moveSpeed',47)])
 if t in (36,37,38,39):
  modifiers=[]
  if r['f39']:modifiers.append(m('stun',1,v(39)/1000))
  if r['f41']:modifiers.append(dict(m('corrosion' if t==38 or 'Stellar' in r['f00'] else 'blaze',max(.01,ratio(28,10)),v(41)/1000),tick=.5))
  return [dict(kind='zone',target='enemies',radius=rad,duration=duration,power=ratio(28) if r['f28'] else ratio(31),interval=.25,follow=t in (37,39),origin='owner' if t in (37,39) else 'target',modifiers=modifiers)]
 if t==40:return [dict(kind='zone',target='enemies',radius=rad,duration=.1,power=ratio(31),interval=.2,modifiers=[m('stun',1,max(.05,v(39)/1000))])]
 if t in (41,42,43):return [dict(kind='dash',target='target',radius=450,width=60,power=ratio(31),modifiers=([m('stun',1,max(.05,v(39)/1000))] if t==41 else [m('corrosion',ratio(28,10),max(.05,v(41)/1000))] if t==43 else []))]+buff('self',[m('damageTaken',max(0,1-v(43)/100),.3)])
 if t in (44,57):return [dict(shot(pattern='splash',splash=v(49) or 300,splashPower=ratio(51),knockback=60 if t==44 else 0),count=max(1,r['f17'],2 if '2 bullets' in r['description_en'] else 1))]
 if t==46:return [shot(pattern='homing',targeting='single',cancelOnTargetDeath=True,cadence=.08)]
 if t in (47,48):return [shot(pattern='burst' if t==47 else 'shotgun',cadence=.08 if t==47 else 0,spread=.2)]
 if t in (49,50):return [dict(kind='beam',target='enemies',radius=1200,width=rad if t==49 else 24,duration=duration,power=ratio(31),interval=.2,follow=True,track=t==50,delay=r['f75']/1000)]
 if t==51:return [shot(pattern='aim',splitCount=8,splitAfter=.5 if 'hits' not in r['description_en'] else 0,splitPower=.5)]
 if t==52:return [shot(pattern='aim',pull=250)]
 if t in (53,54):return [dict(shot(pattern='burst' if 'SniperShot' in r['f00'] else 'piercing',pierce=8,modifiers=[m('blaze',ratio(28,10),max(.5,v(41)/1000))] if t==54 else []),count=3 if 'SniperShot' in r['f00'] else 1)]
 if t==58:return [shot(pattern='homing',chain=7)]
 if t==61:return buff('self',[dict(m('attackPattern',ratio(31),duration),pattern='shotgun')])
 if t==64:return [dict(kind='cooldown',target='allies',radius=4000,power=ratio(54))]
 if t==65:return buff('self',[mod('attack',31),m('penetration',0,duration)])
 if t==66:return buff('allies',[mod('defense',33),m('redirect',1,duration)])
 if t==67:return [dict(shot(pattern='homing'),count=8)]
 if t==68:return buff('self',[mod('defense',33),dict(mod('scale',54),nullify=['piercing','splash'])])+buff('enemies',[m('taunt',1,duration)])
 if t in (70,71,72):return [dict(kind='summon',summon='decoy',power=1,duration=life,modifiers=[dict(m('decoy',1,life),categories={70:['melee'],71:['normal','piercing','splash'],72:['homing','laser']}[t])])]
 if t==73:return buff('allies',[m('charge',ratio(31),duration)])+[dict(kind='detonate',target='enemies',radius=rad,delay=duration,power=0)]
 if t==74:return [dict(kind='timeStop',duration=duration)]
 if t==76:return [dict(kind='bomb',target='enemies',radius=v(49) or 600,duration=life,power=v(31)*r['f51']/10000,count=5,interval=.2)]
 raise ValueError(('untranslated effect family',t,row))
packfile=root/'content/extensions/solar10.json';pack=json.loads(packfile.read_text());pack['version']='0.2.0';skills=[];evidence=[]
for ch in pack['definitions']['characters']:
 key=ch['id'].split('.')[-1];cid,sid,title=selected[key];r=rows[sid];skillid='solar10:skill.'+key
 ch['skill']=skillid;ch['critical']=characters[cid]['f18']/100;ch['evasion']=characters[cid]['f19']/100
 if key=='nemesis':ch['name']='復仇女神星'
 descriptions={
 'sun':'範圍內友軍防禦提高至160%，持續4秒，並抵抗侵蝕與灼燒。',
 'jupiter':'建立持續2秒的黑洞，牽引範圍1000內敵人、每次造成自身攻擊10%的範圍傷害；自身所受傷害降低30%。',
 'saturn':'建立持續4秒的前方能量屏障；前方來襲傷害降低40%。',
 'neptune':'自身攻擊提高至130%、攻速提高至125%，持續3秒。',
 'pluto':'引導寬300的雷射，持續2秒，每次造成自身攻擊18%的傷害。',
 'nemesis':'發射20枚追蹤彈，每枚造成自身攻擊65%的傷害。',
 'ganymede':'召喚具有自身150%能力的分身，持續5秒。分身可移動、攻擊與受擊，不可遞迴召喚。',
 'io':'範圍800內敵人移速降低至70%、攻速降低至80%，持續3秒。',
 'titania':'範圍800內敵人攻擊與暴擊率降低至80%，持續3秒。',
 'ariel':'連射3發，每發造成自身攻擊130%的傷害，並使命中敵人暈眩3秒。'}
 ch['description']=descriptions[key]+' 原作描述移植；原生時序與距離尺度仍待實機對照。';ch['role']=title
 skill=dict(id=skillid,name=title,description=descriptions[key],status='active',provenance='research',effect='program',power=1,duration=max(.05,r['f12']/1000,r['f52']/1000),cooldown=r['f06']/1000,color=ch['color'],sourceSkill=sid,fidelity='description',actions=actions(r,1),levels=[dict(cooldown=(r['f06']-(L-1)*r['f07'])/1000,actions=actions(r,L)) for L in range(2,11)])
 skills.append(skill)
 evidence.append(dict(character=ch['id'],cid=cid,skill=sid,key=r['f00'],type=r['f02'],description=r['description_en'],raw={k:v for k,v in r.items() if k.startswith('f') and v not in (0,'',0.0)},confirmed=['CID.f106 → Skill._row','Skill.f02 effect selector','UI parameter formulas where mapped'],inferred=['World distance units used directly','Target selection, turn rate, tick interval and burst cadence are local reconstruction','Skill level 1 used by existing gameplay; studio can test levels 1–10; original skill cap not established']))
pack['definitions']['skills']=skills
packfile.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
out=root/'content/source';out.mkdir(exist_ok=True)
(out/'stellar10-skill-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
# Every source row remains visible, including unsupported families. Nothing silently aliases M1.
(out/'stella-skill-inventory.json').write_text(json.dumps([dict(row=r['_row'],key=r['f00'],type=r['f02'],name=r['name_en'],description=r['description_en'],enabled=r['_row']>0,validation='description-based; native timing and targeting unverified') for r in rows],ensure_ascii=False,indent=2)+'\n')
print('Translated ten skills, levels 1–10; indexed',len(rows),'source rows; no original runtime executed.')

library=[]
for r in rows[1:]:
 library.append(dict(id=f"stella:skill.{r['_row']}",name=r['name_en'].replace('\\n',' '),description=f"原作技能 {r['f00']}。依來源表與公開描述實作。",status='active',provenance='research',effect='program',power=1,duration=max(.05,r['f12']/1000,r['f52']/1000),cooldown=max(.1,r['f06']/1000),color='#a2dce8',sourceSkill=r['_row'],fidelity='description',actions=actions(r,1),levels=[dict(cooldown=max(.1,(r['f06']-(L-1)*r['f07'])/1000),actions=actions(r,L)) for L in range(2,11)]))
(root/'content/extensions/stella-skills.json').write_text(json.dumps(dict(schemaVersion=1,id='stella:package.skills',version='0.1.0',requires=[dict(id='m1:core',version='0.5.0')],definitions=dict(skills=library)),ensure_ascii=False,indent=2)+'\n')
print('Full source skill library:',len(library),'definitions;',len(set(r['f02'] for r in rows[1:])),'effect families.')
