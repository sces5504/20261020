"""Additive chapters 3–5. Explicit adaptation briefs; never modify source tables or prior chapters."""
from pathlib import Path
import json,math,hashlib,struct,collections,copy,sys
ROOT=Path(__file__).resolve().parents[2]
read=lambda p:json.loads((ROOT/p).read_text())
def write(p,v):(ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def ref(kind,key):return f'chronicle3:{kind}.{key}'
def common(kind,key,name,description,source):return dict(id=ref(kind,key),name=name,description=description,status='active',provenance='inferred',sourceRef=source)
manifest=read('content/manifest.json');base=read('content/'+manifest['base']);defs=collections.defaultdict(list);versions={base['id']:base['version']};chars=base['characters'][:];world=None
for path in manifest['extensions']:
 if path=='extensions/chronicle-next-three.json':continue
 ext=read('content/'+path);versions[ext['id']]=ext['version'];chars+=ext['definitions'].get('characters',[])
 if ext['id']=='original:package.world':world=ext['definitions']
for b in manifest.get('characterPresentation',[]):
 for c in chars:
  if c['id']==b['character']:c.update({k:v for k,v in b.items() if k!='character'})
characters={c['sourceRow']:c for c in chars if c.get('sourceRow') is not None};enemies={e['id']:e for e in world['enemies']};planets=world['planets'];regions={r['id']:r for r in world['regions']}
es=read('research/stella-maiden/tables/EventScript.json')['rows'];qs=read('research/stella-maiden/tables/QuestS.json')['rows'];cid=read('research/stella-maiden/tables/CID.json')['rows'];waves={w['_row']:w for w in read('content/source/original-world/waves.json')};labels={}
for e in es:labels.setdefault(e['f01'],e['_row'])
media=[]
for name in ['aitsu','haitsu','morugo','leo-front','southern-ship','southern-haven','canis-stage','turret','blackhole-cannon','jammer','stage','samael']:
 master=f'art/story-next-three/masters/{name}.png';path=f'art/story-next-three/web/{name}.webp';runtime=f'assets/extensions/story-next-three/{name}.webp';sha=lambda p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest();width,height=struct.unpack('>II',(ROOT/master).read_bytes()[16:24]);asset=ref('asset',name)
 defs['assets'].append(dict(id=asset,name=name+' · 劇情素材',src=runtime,width=width,height=height,hash=sha(path),review='candidate'))
 media.append(dict(id=asset,path=path,runtime=runtime,sha256=sha(path),master=master,masterSha256=sha(master)))
for key in ['aitsu','haitsu','morugo']:defs['actors'].append(dict(id=ref('actor',key),name=key.title(),portrait=ref('asset',key),variants={}))
actors={i:c['id'] for i,c in characters.items()};actors.update({189:'chronicle:actor.kiraba',190:'chronicle:actor.mitsuba',191:ref('actor','aitsu'),192:ref('actor','haitsu'),193:ref('actor','morugo')})
names={i:c['name'] for i,c in characters.items()};names.update({0:'旁白',189:'Kiraba',190:'Mitsuba',191:'Aitsu',192:'Haitsu',193:'Morugo',259:'通訊員',304:'舞台工作人員',305:'中央系統'})
# Native world conversion retained for missing source CID180 and CID279. Enemy art is new design.
for i,key,title,sprite in [(180,'samael','高速母艦 Samael',ref('asset','samael')),(279,'acrux','十字架二 · 交戰',characters[44]['sprite'])]:
 c=cid[i];e=common('enemy',key,title,'劇情交戰專用；不是新增可收集角色。',f'CID[{i}]; same unit conversion as original-world compiler; art candidate adaptation')
 e.update(hp=max(1,c['f17']//10),attack=max(1,c['f15']//10),defense=c['f16']//10,growthReference=dict(attack=c['f15'],defense=c['f16'],hp=c['f17']),speed=max(1,c['f20']/10),range=max(160,c['f23']),interval=max(.3,c['f14']/1000),projectileSpeed=max(120,c['f22']),critical=min(.95,c['f18']/100),evasion=min(.95,c['f19']/100),orbitSpeed=0,strafeSpeed=0,pattern='fan',boss=True,phaseAt=0,phasePattern='fan',color='#bba0ec',sprite=sprite)
 if c['f106']:e['skill']=f"stella:skill.{c['f106']}"
 defs['enemies'].append(e);enemies[e['id']]=e
# A story guest is a battle actor, not a collection copy. Source demands Canis' melee attacks.
# Current collectible default weapon is ranged; this local battle definition supplies melee without changing her.
c=characters[56];e=common('enemy','canis-guest',c['name'],'章節近戰客席演員；不發放少女、不改收藏數值。','EventScript[5671..5672,5732]; CID[56]; approved story40 stats/skill/sprite, melee weapon adaptation')
e.update(hp=c['hp'],attack=c['attack'],defense=c['defense'],growthReference=dict(hp=c['hp']*10,attack=c['attack']*10,defense=c['defense']*10),speed=180,range=160,interval=c['interval'],projectileSpeed=520,critical=c['critical'],evasion=c['evasion'],orbitSpeed=0,strafeSpeed=0,pattern='melee',boss=False,phaseAt=0,phasePattern='melee',color=c['color'],sprite=c['sprite'],skill=c['skill']);defs['enemies'].append(e)
# Facility values are pacing adaptations, not recovered native construction costs or HP.
resources=[r['id'] for r in base['resources']]
facility_specs={
 'leo-turret':('獅子座防線砲台','turret',18000,45,80,dict(kind='turret',attack=150,range=800,interval=1.2,pattern='aim'),3592),
 'blackhole-cannon':('戰術黑洞砲','blackhole-cannon',18000,60,100,dict(kind='turret',attack=2400,range=2000,interval=3,pattern='piercing'),3935),
 'stage':('巡遊舞台','stage',24000,75,80,dict(kind='none'),5486),
 'stage-turret':('舞台防衛砲台','turret',20000,60,80,dict(kind='turret',attack=180,range=800,interval=1.2,pattern='homing'),5321),
 'beam-turret':('舞台能量砲','blackhole-cannon',22000,65,100,dict(kind='turret',attack=260,range=950,interval=1.5,pattern='laser'),5398),
 'scout-turret':('偵察退路砲台','turret',16000,50,0,dict(kind='turret',attack=150,range=800,interval=1.2,pattern='homing'),5585),
 'blocker':('廣域通訊阻斷裝置','jammer',22000,60,0,dict(kind='jammer',jams=['central-link'],seconds=600,cooldown=600,channel=0,reach=300,charges=1),4773),
 'nullifier':('護盾干擾裝置','jammer',22000,60,100,dict(kind='jammer',jams=['layered-energy'],seconds=45,cooldown=600,channel=0,reach=300,charges=1),5855)
}
for key,(name,art,hp,defense,cost,effect,row) in facility_specs.items():
 v=common('facility',key,name,'章節臨時設施；戰敗復原開戰前狀態，非永久生產建築。',f'EventScript[{row}]; HP/cost/effects/duration are this adaptation')
 v.update(sprite=ref('asset',art),color='#83cedf',size=110 if key=='stage' else 64,hp=hp,defense=defense,side='ally',targetable=True,scope='save',retry='restore',cost={r:cost for r in resources} if cost else {},effect=effect);defs['facilities'].append(v)
# (title, source wave or enemy CID, level floor, mode, seconds, source event rows)
briefs={
 'leo-ambush':('蟲洞伏擊',156,21,'eliminate',0,[3050,3055]),
 'leo-escape':('逃離高速追擊','enemy:174',21,'survive',16,[3063,3070]),
 'sentry-search':('哨兵搜索',157,23,'eliminate',0,[3124,3130]),
 'abandoned-base':('失守的通訊基地',158,25,'eliminate',0,[3166,3179]),
 'hunter-rescue':('獵人的援手',157,25,'eliminate',0,[3180,3195]),
 'sentry-trail':('殘留波長',158,27,'eliminate',0,[3233,3240]),
 'regulus-rescue':('軒轅十四救援',160,27,'protect',0,[3251,3266]),
 'receiver-base':('最後的接收器',160,28,'eliminate',0,[3314,3325]),
 'aitsu-first':('不認真的敵人','enemy:191',40,'survive',18,[3352,3369]),
 'arkas':('基地的包圍網','enemy:174',40,'survive',18,[3414,3431]),
 'arkas-help':('猞猁的援手',156,28,'eliminate',0,[3433,3441]),
 'aitsu-gather':('等待的人','enemy:191',50,'survive',15,[3486,3518]),
 'aitsu-release':('斷線的理由','enemy:191',50,'eliminate',0,[3524,3555]),
 'defense-material-a':('防線材料：裝甲',156,29,'eliminate',0,[3598,3602]),
 'defense-material-b':('防線材料：儲能',157,29,'eliminate',0,[3607,3611]),
 'defense-material-c':('防線材料：控制器',158,29,'eliminate',0,[3617,3622]),
 'leo-defense':('獅子座防衛線',138,30,'defend',40,[3655,3711]),
 'jupiter-stop':('保護木星',382,30,'defend',30,[3765,3825]),
 'samael':('高速母艦 Samael','custom:samael',23,'survive',20,[3842,3911]),
 'samael-final':('戰術黑洞齊射','custom:samael',23,'eliminate',0,[3935,3979]),
 'energy-a':('儲能裝置：核心',186,32,'eliminate',0,[4104,4108]),
 'energy-b':('儲能裝置：容器',187,32,'eliminate',0,[4117,4123]),
 'southern-wormhole':('蟲洞守軍',187,33,'eliminate',0,[4171,4190]),
 'drift-patrol':('漂流的退路',218,34,'survive',20,[4273,4293]),
 'magellan-rescue':('麥哲倫的援手',190,35,'protect',0,[4330,4355]),
 'acamar-rescue':('命運與十字架','custom:acrux',38,'eliminate',0,[4438,4468]),
 'return-wormhole':('回到蟲洞',192,37,'eliminate',0,[4511,4517]),
 'reunited-defense':('合流防衛',193,37,'defend',24,[4518,4557]),
 'seal-material-a':('封鎖裝置：零件',186,38,'eliminate',0,[4594,4604]),
 'seal-material-b':('封鎖裝置：模組',187,38,'eliminate',0,[4605,4617]),
 'haitsu':('沉默的人形艦','enemy:192',40,'eliminate',0,[4623,4652]),
 'magellan-conflict':('不能退讓的職責','magellan',40,'eliminate',0,[4719,4735]),
 'hijack-material-a':('阻斷裝置：發射器',188,40,'eliminate',0,[4787,4796]),
 'hijack-material-b':('阻斷裝置：放大器',189,40,'eliminate',0,[4797,4806]),
 'hijack-material-c':('阻斷裝置：控制器',190,40,'eliminate',0,[4807,4814]),
 'mothership-hijack':('母艦奪取','enemy:178',40,'survive',35,[4857,4890]),
 'traitor-fleet':('叛徒與艦隊',191,42,'protect',0,[4963,5008]),
 'kiraba-last':('自爆倒數','kiraba',42,'survive',30,[5019,5047]),
 'scouting-fleet':('舞台附近的艦隊',679,50,'eliminate',0,[5232,5241]),
 'stage-material-a':('特效材料：發光體',220,50,'eliminate',0,[5265,5270]),
 'stage-material-b':('特效材料：控制器',225,50,'eliminate',0,[5271,5277]),
 'stage-defense':('舞台防衛',220,50,'defend',30,[5354,5361]),
 'beam-material-a':('能量砲：儲能器',225,51,'eliminate',0,[5404,5409]),
 'beam-material-b':('能量砲：導流器',227,51,'eliminate',0,[5411,5416]),
 'beam-material-c':('能量砲：制御器',228,51,'eliminate',0,[5418,5425]),
 'stage-defense-two':('強化防線',225,52,'defend',35,[5471,5480]),
 'tracker-material-a':('追蹤器：感應器',227,53,'eliminate',0,[5522,5527]),
 'tracker-material-b':('追蹤器：定位器',229,53,'eliminate',0,[5530,5537]),
 'morugo-scout':('多重護盾初見','enemy:193',55,'survive',18,[5621,5636]),
 'shield-sample-a':('護盾樣本一',222,54,'eliminate',0,[5678,5683]),
 'shield-sample-b':('護盾樣本二',224,54,'eliminate',0,[5684,5688]),
 'shield-sample-c':('護盾樣本三',226,54,'eliminate',0,[5689,5696]),
 'idol-defense':('偶像的防衛戰',222,55,'defend',35,[5757,5771]),
 'jammer-material-a':('干擾器：振盪核心',227,56,'eliminate',0,[5827,5832]),
 'jammer-material-b':('干擾器：同步模組',229,56,'eliminate',0,[5833,5838]),
 'morugo-final':('守住我們的舞台','enemy:193',60,'eliminate',0,[5845,5895])
}
sections={};n=0
for line in (ROOT/'content/story-next-three/dialogue.txt').read_text().splitlines():
 if not line or line.startswith('#'):continue
 if line.startswith('['):n=int(line[1:-1]);sections[n]=[]
 else:sections[n].append(line)
assert set(sections)==set(range(25,60))
chapter=lambda n:'leo' if n<=36 else 'southern' if n<=48 else 'canis'
placed=collections.defaultdict(list)
def place(region,anchor):
 r=regions[region];near=[v for v in planets if v['region']==region]
 for radius in (700,1100,1500,2100,2800,3600,4500,5400,6500):
  for k in range(48):
   angle=math.radians(k*7.5+35);x=round(anchor[0]+math.cos(angle)*radius);y=round(anchor[1]+math.sin(angle)*radius)
   if 500<x<r['width']-500 and 500<y<r['height']-500 and all(math.hypot(x-v['x'],y-v['y'])>=650 for v in near) and all(math.hypot(x-px,y-py)>=650 for px,py in placed[region]):
    placed[region].append((x,y));return x,y
 raise ValueError('no space '+region)
anchors={};meta={};survey={}
for n,lines in sections.items():
 region='original:region.'+chapter(n);r=regions[region]
 anchors.setdefault(region,(r['startX'],r['startY']))
 for line in lines:
  if line.startswith('@survey '):
   key=line.split()[1];x,y=place(region,anchors[region]);anchors[region]=(x,y);survey[key]=dict(region=region,x=x,y=y,radius=180)
  if not line.startswith('@battle '):continue
  key=line.split()[1];title,source,floor,mode,seconds,rows=briefs[key];x,y=place(region,anchors[region]);anchors[region]=(x,y)
  wave=waves[source] if isinstance(source,int) else None
  if wave:
   level=max(floor,wave['f02']);groups=[dict(enemy='original:enemy.'+str(g['cid_row']),count=g['count'],level=level) for g in wave['groups']]
  else:
   level=floor
   ids=['original:enemy.280','original:enemy.281','original:enemy.282'] if source=='magellan' else ['original:enemy.189','original:enemy.190'] if source=='kiraba' else [ref('enemy',source.split(':')[1]) if source.startswith('custom:') else 'original:enemy.'+source.split(':')[1]]
   groups=[dict(enemy=i,count=1,level=level) for i in ids]
  e=dict(mode=mode,actors=[],waves=[],timeline=[],cues=[],facilities=[],shields=[],triggers=[])
  if seconds:e['seconds']=seconds
  def actor(c,required=False):
   a=dict(id=ref('unit',key+'-'+str(c)),character=characters[c]['id'],x=x+80,y=y-100,side='ally',level=level,required=required,spawnAt=0);e['actors'].append(a);return a['id']
  def facility(f,dx=-120,dy=0,fail=False):
   i=ref('placement',key+'-'+f);e['facilities'].append(dict(id=i,facility=ref('facility',f),x=x+dx,y=y+dy,onDestroyed='fail' if fail else 'disable'));return i
  def guest():
   # Source-required melee perspective; follows battle-local movement, never a free collectible.
   a=dict(id=ref('unit',key+'-canis'),enemy=ref('enemy','canis-guest'),x=x+100,y=y,side='ally',level=level,required=True,spawnAt=0);e['actors'].append(a)
   for i in range(20):
    angle=i*math.pi/2;e['timeline'].append(dict(actor=a['id'],at=i*6,action='move',x=x+math.cos(angle)*140,y=y+math.sin(angle)*140))
  def shield(ids,tag='layered-energy',name='多重能量護盾'):
   e['shields'].append(dict(id=ref('shield',key),name=name,tags=[tag],enemies=ids,units=[],blocks=['normal','piercing','splash','homing','laser'],multiplier=0,layers=0,startsActive=True))
  if key=='regulus-rescue':actor(34,True)
  if key=='magellan-rescue':actor(47,True)
  if key=='leo-defense':
   facility('leo-turret',0,-180,True)
   for at,w in [(10,158),(22,163)]:e['waves'].append(dict(at=at,enemies=[dict(enemy='original:enemy.'+str(g['cid_row']),count=g['count'],level=max(level,waves[w]['f02'])) for g in waves[w]['groups']]))
  if key=='jupiter-stop':actor(6,True);facility('leo-turret',-180,-100)
  if key=='samael-final':facility('blackhole-cannon',0,-120,True)
  if key=='mothership-hijack':
   actor(192,True) if 192 in characters else e['actors'].append(dict(id=ref('unit','hijack-haitsu'),enemy='original:enemy.192',x=x-150,y=y-100,side='ally',level=level,required=True,spawnAt=0))
   fid=facility('blocker',0,-200,True);shield(['original:enemy.178'],'central-link','母艦通訊屏障');e['triggers'].append(dict(at=28,then=[dict(op='activateFacility',facility=fid)]))
  if key=='traitor-fleet':e['actors'].append(dict(id=ref('unit','protect-haitsu'),enemy='original:enemy.192',x=x,y=y-180,side='ally',level=level,required=True,spawnAt=0))
  if key in ['stage-defense','stage-defense-two','idol-defense','morugo-final']:
   facility('stage',0,-280,True);facility('stage-turret',-180,-100)
   if key!='stage-defense':facility('beam-turret',180,-100)
  if key in ['morugo-scout','shield-sample-a','shield-sample-b','shield-sample-c','idol-defense','morugo-final']:
   guest();shield([g['enemy'] for g in groups][:1])
  if key=='morugo-scout':facility('scout-turret',0,-180)
  if key=='morugo-final':
   fid=facility('nullifier',0,-180,True);e['triggers'].append(dict(at=0,then=[dict(op='activateFacility',facility=fid)]))
  cue=(37,'保持距離，別在追擊中停下！') if key=='leo-escape' else (38,'守住防線！各部隊保持聯繫！') if key=='leo-defense' else (28,'木星，請繼續集中。我會維持歌聲。') if key=='jupiter-stop' else (192,'就快能切斷訊號了！再撐一下！') if key=='mothership-hijack' else (53,'飛彈被抵消了！讓 Canis 近身牽制，別戀戰！') if key=='morugo-scout' else (53,'突破窗口已啟動！集中火力，留意剩餘時間！') if key=='morugo-final' else None
  if cue:e['cues']=[dict(at=2,steps=[dict(kind='say',speaker=names[cue[0]],actor=actors.get(cue[0]),text=cue[1])])]
  v=common('encounter',key,title,'依主線導航實際抵達後出擊。失敗可整補重試；故事參戰不等於永久取得角色。',f'EventScript[{rows[0]}..{rows[1]}]; '+(f'Wave[{source}]' if wave else str(source))+'; field/level floor/timing/facility/shield adaptation')
  v.update(region=region,x=x,y=y,radius=58,color='#83cedf',sprite='original:asset.node-event',kind='event',requires=[],requiresActive=[],hiddenUntilUnlocked=True,initiallyCleared=False,encounterPolicy='manual',enemies=groups,reward={},activationCost={},production={},dropCharacters=[],leashRadius=1400,leashWarningRadius=1200,storyEncounter=e);defs['planets'].append(v)
  meta[key]=dict(questSRow=n,sourceRows=rows,sourceWave=source if wave else None,sourceSpecial=source if not wave else None,level=level,mode=mode,seconds=seconds,location=dict(region=region,x=x,y=y),classification='source roster / explicit pacing and gameplay adaptation')
# Unopposed surveys use existing navigable event fields with an explicit 3-second scan.
# initiallyCleared means no guards, not a completed story receipt; resumeIf uses saved clears only.
for key,loc in survey.items():
 v=common('encounter','scan-'+key,{'wormhole':'蟲洞質量調查','aegir':'漂流星靈調查','residue-a':'殘留能量一','residue-b':'殘留能量二','residue-c':'殘留能量三','enemy-base':'敵基地偵察'}[key],'抵達調查點後開始，維持掃描三秒；無敵方守軍。','Source CheckNearDist / residual-energy survey; navigable unopposed scan timing adaptation')
 v.update(region=loc['region'],x=loc['x'],y=loc['y'],radius=58,color='#83cedf',sprite='original:asset.node-event',kind='event',requires=[],requiresActive=[],hiddenUntilUnlocked=True,initiallyCleared=True,encounterPolicy='manual',enemies=[],reward={},activationCost={},production={},dropCharacters=[],leashRadius=1400,leashWarningRadius=1200,storyEncounter=dict(mode='survive',seconds=3,actors=[],waves=[],timeline=[],cues=[]))
 defs['planets'].append(v)
titles=['異常蟲洞','哨兵的職責','迷途與獵人','能量的氣味','最後的短訊','猞猁的援手','真正的自由','防線材料','獅子座防衛線','一拳的距離','高速母艦 Samael','尚未兌現的假期','黑色天使','失落的訊號','漂流','麥哲倫的支援','命運與十字架','在蟲洞重逢','沉默的人形艦','不能退讓的職責','百分之十的機會','母艦奪取','叛徒','自由之後','出道前的陰影','暫停的舞台特效','經紀人的防線','更強的能量砲','不放棄的舞台','先看清敵人','多重護盾','取回護盾樣本','偶像的力量','守住我們的舞台','再次登台']
evidence=[]
for n,lines in sections.items():
 ch=chapter(n);region='original:region.'+ch;bg=ref('asset','leo-front' if ch=='leo' else 'southern-ship' if ch=='southern' else 'canis-stage');steps=[];dialogue=[];refs=[]
 if n in [25,37,49]:steps.append(dict(kind='await',condition=dict(fact='region',target=region)))
 for line in lines:
  if line.startswith('@battle '):
   key=line.split()[1];m=meta[key];v=next(v for v in defs['planets'] if v['id']==ref('encounter',key));description='守住必要設施與同伴' if m['mode'] in ['protect','defend'] else '撐過追擊，維持退路' if m['mode']=='survive' else '擊退敵人，完成目標'
   if key.startswith('shield-sample'):description='特殊護盾抵消遠程攻擊；掩護近戰的 Canis，取得樣本'
   if key=='morugo-final':description='干擾窗口45秒，集中火力；到期後護盾恢復，掩護 Canis 近戰'
   steps.extend([dict(kind='say',speaker='航行目標',text=f"{v['name']}：{description}。依導航飛抵戰場，再按出擊。"),dict(kind='encounter',planet=v['id'],resumeIf=dict(fact='cleared',target=v['id']))])
  elif line.startswith('@survey '):
   key=line.split()[1];loc=survey[key];steps.extend([dict(kind='say',speaker='航行目標',text='依導航前往調查點，抵達後按出擊，維持三秒完成掃描。'),dict(kind='encounter',planet=ref('encounter','scan-'+key),resumeIf=dict(fact='cleared',target=ref('encounter','scan-'+key))),dict(kind='event',event=ref('event','survey-'+key))])
  elif line.startswith(('@build ','@repair ','@grant ')):
   op,key=line[1:].split();fid=ref('facility',key)
   if op=='build':steps.extend([dict(kind='say',speaker='設施整備',text=facility_specs[key][0]+'：請返回航行，從主線追蹤卡建造。費用由正式建造交易扣除。'),dict(kind='await',condition=dict(fact='facility',target=fid))])
   else:steps.append(dict(kind='facility',facility=fid,op='repair' if op=='repair' else 'grant'))
  elif line=='@flash':steps.extend([dict(kind='fade',opacity=.85,seconds=.25),dict(kind='fade',opacity=0,seconds=.45)])
  elif line in ['@bridge','@space','@front','@haven','@ship','@concert']:
   asset={'@bridge':'m1art:bridge-v1','@space':'original:asset.background-'+ch,'@front':ref('asset','leo-front') if ch=='leo' else ref('asset','southern-haven'),'@haven':ref('asset','southern-haven'),'@ship':ref('asset','southern-ship'),'@concert':ref('asset','canis-stage')}[line];steps.append(dict(kind='background',asset=asset))
  elif line.startswith('@'):raise ValueError(line)
  else:
   row,c,text=line.split('|',2);row,c=int(row),int(c);assert es[row]['f43'];assert c in names,(row,c)
   say=dict(kind='say',speaker=names[c],text=text)
   if c in actors:say['actor']=actors[c]
   refs.append(dict(step=len(steps),eventScriptRow=row,cid=c,classification='localized-adaptation',speakerOperands=[es[row]['f34'],es[row]['f35'],es[row]['f36']],speakerBasis='operands + English/Japanese prose and exchange context; compressed or expanded connective phrasing is adaptation'))
   steps.append(say);dialogue.append(dict(speaker=names[c],text=text))
 # Retire chapter facilities through receipt-protected initialization, never player-field writes.
 if n in [36,48,59]:
  retire=['leo-turret','blackhole-cannon'] if n==36 else ['blocker'] if n==48 else ['stage','stage-turret','beam-turret','scout-turret','nullifier']
  for f in retire:steps.append(dict(kind='facility',facility=ref('facility',f),op='remove'))
 reward=200 if n<=36 else 250 if n<=48 else 300
 if n in [36,48,59]:reward+=100
 story=dict(chapter=ref('chapter',ch),autoStart=False,chapterRequires=[],requires=dict(fact='completed',target='chronicle:quest.24' if n==25 else ref('quest',str(n-1))),steps=steps)
 if n in [25,37,49]:story['chapterRequires']=['chronicle:chapter.virgo' if n==25 else ref('chapter',chapter(n-1))]
 q=common('quest',str(n),f'{3 if n<=36 else 4 if n<=48 else 5}-{n-24 if n<=36 else n-36 if n<=48 else n-48:02} · {titles[n-25]}','依主線導航推進；戰敗可整補重試，完成與領獎分開。',f"QuestS[{n}] {qs[n]['f00']}; EventScript label {qs[n]['f02']} first row {labels[qs[n]['f02']]}; zh-TW localized adaptation")
 q.update(background=bg,condition='intro',repeat='once',target='',count=1,reward={r:reward for r in resources},character='',dialogue=dialogue,story=story);defs['quests'].append(q);evidence.append(dict(quest=q['id'],questSRow=n,entryLabel=qs[n]['f02'],firstRow=labels[qs[n]['f02']],lines=refs,rewardPerResource=reward))
pack=dict(schemaVersion=1,id=ref('package','next-three'),version='0.1.0',requires=[dict(id=i,version=versions[i]) for i in ['m1:core','original:package.world','chronicle:package.first-three','story40:package.chapter-three-seven','stellaart:package.stellar40']],definitions=dict(defs))
write('content/extensions/chronicle-next-three.json',pack);write('art/story-next-three/media.json',media);write('content/story-next-three/sources.json',dict(baseline='69fb108ee9ca91dcd7a105f60e7462ee446d4a73',scope='QuestS25–59; static-source zh-TW adaptation, not native runtime certification',quests=evidence,encounters=meta,surveys=survey,facilityBudget={k:dict(costPerResource=v[4],sourceRow=v[-1]) for k,v in facility_specs.items()}))
print('Built',len(defs['quests']),'quests,',len(defs['planets']),'encounters,',sum(len(q['dialogue'])for q in defs['quests']),'frames; total reward per resource',sum(q['reward']['m1:crystal']for q in defs['quests']))
