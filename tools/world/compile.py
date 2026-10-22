"""Deterministic additive world pack. Raw inventory stays distinct from adaptation."""
from pathlib import Path
import json,re,math
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'content/source/original-world'
def read(n):return json.loads((SRC/(n+'.json')).read_text())
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
waves={w['_row']:w for w in read('waves')}; galaxies=read('galaxies'); planets=read('planets'); spawns=read('spawns')
visuals={cid:v['assetId'] for v in read('visual-identities') for cid in v['cidRows']}
keys=['solar','virgo','leo','southern','canis','northern','cygnus','gemini','taurus','scorpio','sagittarius','cancer','aries','pisces']
names=['太陽系','處女座','獅子座','南天','大犬座','北天','天鵝座','雙子座','金牛座','天蠍座','人馬座','巨蟹座','牡羊座','雙魚座']
wallet=['m1:crystal','m1:gas','m1:metal','m1:ether']
def money(values):return {k:round(v,6) for k,v in zip(wallet,values) if v}
def region(g,hard=False):return 'original:region.'+keys[g-1]+('-hard' if hard else '')
def common(id,name,description,source):return dict(id=id,name=name,description=description,status='active',provenance='research',sourceRef=source)
enemies=[];skills=[]
for e in read('enemies'):
 key=e['f00']; boss=not key.startswith('Enemy_') or any(v in key for v in ['Battleship','Mothership'])
 pattern='aim'
 for fragment,pat in [('Bomber','splash'),('Torpedo','homing'),('Cruiser','fan'),('BarrageDefender','ring'),('LaserDefender','laser'),('Incinerator','laser'),('Fighter02','burst'),('MothershipQ','fan')]:
  if fragment in key:pattern=pat
 for fragment,pat in [('Breacher','melee'),('Ramer','meleeSplash'),('Grinder','meleeFan'),('MeleeDefender','meleeSpear')]:
  if fragment in key:pattern=pat
 if key in ['Kiraba','Mitsuba']:pattern='fan'
 ref=dict(attack=e['f15'],defense=e['f16'],hp=e['f17'])
 v=common('original:enemy.'+str(e['_row']),key.replace('Enemy_',''), '原作 CID 成長與技能引用；移動單位與普通彈幕依來源武器類型適配。',f"CID[{e['_row']}], f15/16/17 native growth; f14/20/22/23 unit conversion inferred")
 v.update(hp=max(1,e['f17']//10),attack=max(1,e['f15']//10),defense=e['f16']//10,growthReference=ref,speed=max(1,e['f20']/10),range=max(160,e['f23']),interval=max(.3,e['f14']/1000),projectileSpeed=max(120,e['f22']),critical=min(.95,e['f18']/100),evasion=min(.95,e['f19']/100),orbitSpeed=.35 if boss else .45,strafeSpeed=6 if boss else 14,pattern=pattern,boss=boss,phaseAt=0,phasePattern=pattern,color='#ff957c',sprite=visuals[e['_row']])
 if e['f106']:v['skill']='stella:skill.'+str(e['f106'])
 if key in ['Kiraba','Mitsuba']:
  original=json.loads((ROOT/'content/extensions/stella-skills.json').read_text())['definitions']['skills']
  native=next(s for s in original if s['id']==v['skill'])
  import copy
  skill=copy.deepcopy(native);skill.update(id='original:skill.'+key.lower(),name=key+' · 突擊增幅',provenance='inferred',sourceRef=f"CID[{e['_row']}].f106 → Skill[{e['f106']}]; Solar/Virgo public encounter notes dash + fan; dash timing/distance adapted")
  dash=dict(kind='dash',target='target',radius=350,travelTime=.6,delay=.6,power=.5)
  skill['actions'].append(dash)
  for level in skill.get('levels',[]):level['actions'].append(copy.deepcopy(dash))
  skills.append(skill);v['skill']=skill['id']
 enemies.append(v)
nodes=[];regions=[];coverage={};excluded=[]
def groups(w):return [dict(enemy='original:enemy.'+str(v['cid_row']),count=v['count'],level=max(1,min(150,w['f02']))) for v in w['groups']]
def node(id,name,r,x,y,w=None,kind='stronghold',requires=None,**extra):
 v=common(id,name,('單波自動接敵；首次清除發放四資源，重演不再領取。' if w else '可停靠整補；沿用既有四資源與整補工作。'),f"Wave[{w['_row']}] {w['f00']}" if w else 'source empty spawn; camp service adaptation')
 v.update(region=r,x=x,y=y,radius=58,color='#e9ae75',sprite='original:asset.node-'+('camp' if kind=='camp' else 'gate' if kind=='gate' else 'event' if kind=='event' else 'stronghold'),kind=kind,requires=requires or [],enemies=groups(w) if w else [],initiallyCleared=not bool(w),reward=money([max(12,round(18+max(1,w['f02'])*2))]*4) if w else {},activationCost={},production={},dropCharacters=[],engageRadius=300,guardRadius=160,leashRadius=1400,leashWarningRadius=1200)
 v.update(extra)
 if kind!='planet':v['color']='#79d7d3' if kind=='camp' else '#ee8e7e'
 nodes.append(v)
 if w:coverage.setdefault(str(w['_row']),[]).append(id)
 return v
def make_region(id,name,g,width=10000,height=10000):
 v=common(id,name,'原作座標按 10 世界單位／來源單位換算，Y 軸反向；星域航路選單躍遷。',f"Galaxy[{g}]")
 v.update(width=width,height=height,startX=5600,startY=5600,background='original:asset.background-'+keys[g-1],sprite='original:asset.planet-'+str(next((p['_row'] for p in planets if p['f15']==g),1)),discoveryRadius=650,routes=[],patrols=[]);regions.append(v);return v
forts={}
for g in range(1,15):
 for hard in ([False,True] if g<=7 else [False]):
  r=make_region(region(g,hard),names[g-1]+(' · 高難' if hard else ''),g)
  if g==1 and not hard:r.update(startX=5970,startY=5530,campaignStart=True)
  if g==14:r['description']='來源有 Galaxy 雙魚座定義，未收錄星球或遭遇；此處為可返回的空星域，不臆造關卡。'
  forts[(g,hard)]=[]
  for s in spawns:
   if s['f04']!=g or bool(s['f02'])!=hard:continue
   w=waves.get(s['f10']);w=w if w and w['groups'] else None
   n=node('original:spawn.'+str(s['_row']),s['f00']+(' · 臨時基地' if not w else ''),r['id'],5000+s['f11']*10,5000-s['f12']*10,w,'stronghold' if w else 'camp')
   n['sourceRef']=f"SpawnPoint[{s['_row']}], f10→Wave._row; "+n['sourceRef']
   if w:forts[(g,hard)].append(n['id'])
# Solar activation chain is public-source corroborated; other planets have no invented serial order.
solar_order=['Earth','Moon','Mercury','Mars','Venus','Pluto','Uranus','Neptune','Saturn','Jupiter','Nemesis','Sun']
solar_ids={p['f00']:'original:planet.'+str(p['_row']) for p in planets if p['f15']==1}
for p in planets:
 w=waves.get(p['f05']);w=w if w and w['groups'] else None
 prev=solar_order.index(p['f00']) if p['f15']==1 else 0
 active=[solar_ids[solar_order[prev-1]]] if prev else []
 n=node('original:planet.'+str(p['_row']),p['f00'],region(p['f15']),5000+p['f12']*10,5000-p['f13']*10,w,'planet',requiresActive=active,hiddenUntilUnlocked=bool(active))
 n.update(sprite='original:asset.planet-'+str(p['_row']),radius=90,color='#83cedf',activationCost=money([p[f'f{i:02d}'] for i in range(17,21)]),production=money([p[f'f{i:02d}']/600 for i in range(28,32)]),sourceRef=f"PID[{p['_row']}]; f05 guard inferred, f17..20 costs / f28..31 output weights corroborated; production /600 adaptation",description='清除守軍後啟動生產。啟動費依原作四資源，產量保留來源比例；太陽系依原作啟動順序開放。')
 # Only existing registered playable characters are eligible; source PID.f14 is NOT guessed as CID.
 drop={'Sun':'solar10:character.sun','Jupiter':'solar10:character.jupiter','Saturn':'solar10:character.saturn','Neptune':'solar10:character.neptune','Pluto':'solar10:character.pluto','Nemesis':'solar10:character.nemesis','Ganymede':'solar10:character.ganymede','Io':'solar10:character.io','Titania':'solar10:character.titania'}
 if p['f00'] in drop:n['dropCharacters']=[drop[p['f00']]];n['description']+=' 首勝角色為本作收集流程適配。'
by_id={r['id']:r for r in regions}
# Native directed gates; always supply explicit safe return, with no completion lock on travel to an earlier tier.
for gate in read('gates'):
 a,b=gate['f02'],gate['f03'];r=by_id[region(a)]
 if not any(x['to']==region(b) for x in r['routes']):r['routes'].append(dict(to=region(b),label='前往'+names[b-1],requires=forts[(a,False)] if b>a else []))
for r in list(regions):
 for route in list(r['routes']):
  target=by_id[route['to']]
  if not any(v['to']==r['id'] for v in target['routes']):target['routes'].append(dict(to=r['id'],label='返回'+r['name'],requires=[]))
for g in range(1,8):
 by_id[region(g)]['routes'].append(dict(to=region(g,True),label=names[g-1]+'高難',requires=forts[(g,False)]))
 by_id[region(g,True)]['routes'].append(dict(to=region(g),label='返回'+names[g-1],requires=[]))
# Pisces has no native gate: explicit archive-review detour and return, marked adaptation.
by_id[region(13)]['routes'].append(dict(to=region(14),label='雙魚座 · 資料空域',requires=forts[(13,False)]))
by_id[region(14)]['routes'].append(dict(to=region(13),label='返回牡羊座',requires=[]))
by_id[region(1)]['routes'].insert(0,dict(to='m1:frontier-test',label='返回邊境信標',requires=[]))
# All non-debug, non-cancelled remaining combat waves get explicit replay entries.
# Event VM/quest rewards are not invented: these are source rosters with reconstructed access/layout.
remaining=[]
for w in waves.values():
 if not w['groups'] or str(w['_row']) in coverage:continue
 if re.match(r'^(Defense|Test|Dummy|Tutor)',w['f00']) or w['f00'].isdigit():excluded.append(dict(waveRow=w['_row'],key=w['f00'],reason='cancelled system or debug fixture'));continue
 remaining.append(w)
families={}
for w in remaining:
 key=re.sub(r'(_\d.*)$','',w['f00'])
 families.setdefault(key,[]).append(w)
hub=make_region('original:region.archive','事件航跡',1,width=3000,height=2200);hub.update(startX=1500,startY=1100,description='主線、活動、星門與戰艦遭遇入口。保留來源敵群與等級；事件觸發及地圖排列為重建，不代稱完整原作事件腳本。')
by_id[region(1)]['routes'].append(dict(to=hub['id'],label='主線／活動／每日 Boss',requires=[]));hub['routes'].append(dict(to=region(1),label='返回太陽系',requires=[]))
for index,(family,ws) in enumerate(families.items()):
 rid='original:region.replay-'+str(index+1);r=make_region(rid,family+' · 遭遇航跡',min(14,max(1,1+(max(w['f02'] for w in ws)-1)//10)),width=max(3000,1600*min(5,len(ws))+800),height=max(2200,1600*math.ceil(len(ws)/5)+800));r.update(startX=400,startY=400)
 r['description']='來源敵群與等級；串接次序與矩陣座標為本作重建，可回入口。';r['routes']=[dict(to=hub['id'],label='返回事件入口',requires=[])]
 hub['routes'].append(dict(to=rid,label=family,requires=[]))
 prev=[]
 for j,w in enumerate(ws):
  kind='gate' if 'Gate' in w['f00'] else 'event';n=node('original:wave.'+str(w['_row']),w['f00'],rid,1000+(j%5)*1600,1000+(j//5)*1600,w,kind,requires=prev,encounterPolicy='manual');prev=[n['id']]
daily=make_region('original:region.daily','每日母艦',1,width=6000,height=5000);daily.update(startX=3000,startY=4500,description='原作七日排程與四種母艦；每種母艦獨立限時傷害挑戰，180 秒與每日一次結算為本作流程適配。')
daily['routes']=[dict(to=hub['id'],label='返回事件入口',requires=[])];hub['routes'].append(dict(to=daily['id'],label='每日 Boss',requires=[]))
for day in read('daily-boss'):
 for j in range(1,5):
  cid=day[f'f{j:02d}'];w=dict(_row=-day['_row']*10-j,f00=day['f00']+'-'+str(j),f02=day['f09'],groups=[dict(cid_row=cid,count=1)])
  n=node('original:daily.'+str(day['f10'])+'-'+str(j),day['f00']+' · 母艦 '+str(j),daily['id'],1200+(j-1)*1200,2100,w,'dailyBoss',encounterPolicy='manual',objective='damage',timeLimitSeconds=180,schedule=dict(weekdays=[day['f10']],utcOffsetMinutes=540,resetHour=0),sprite=visuals[cid],reward=money([1200]*4),sourceRef=f"Boss[{day['_row']}] f01..04 templates, f09 level inferred, f10 weekday; Global BossLimitSec=180; independent four challenges / reward budget adapted")
assets=json.loads((ROOT/'art/world/original-world/assets.json').read_text()) if (ROOT/'art/world/original-world/assets.json').exists() else []
pack=dict(schemaVersion=1,id='original:package.world',version='0.1.0',requires=[dict(id='m1:core',version='0.7.0'),dict(id='stella:package.skills',version='0.1.0'),dict(id='solar10:package.first-ten',version='0.2.0')],definitions=dict(enemies=enemies,skills=skills,regions=regions,planets=nodes,assets=assets))
write(ROOT/'content/extensions/original-world.json',pack)
write(SRC/'coverage.json',dict(runtimeWaves=coverage,excludedWaves=excluded,counts=dict(enemies=len(enemies),regions=len(regions),nodes=len(nodes),planetCount=len(planets),remainingReplayWaves=len(remaining)),adaptation=dict(coordinateScale=10,planetProductionDivisor=600,firstWinPerResource='18 + 2*level (minimum 12)',dailyRewardPerResource=1200,sourceGateReturnPolicy='explicit safe return to lower tier',sourceEventVM='not recovered; combat replay entry/layout reconstructed')))
print(pack['id'],len(enemies),'enemies',len(regions),'regions',len(nodes),'nodes',len(coverage),'wave mappings',len(excluded),'excluded')
