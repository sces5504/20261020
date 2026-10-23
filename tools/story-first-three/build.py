"""Build only the additive chronicle pack from reviewed text and explicit encounter briefs."""
import json,hashlib,collections,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
read=lambda p:json.loads((ROOT/p).read_text())
write=lambda p,v:(ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
base=read('content/core/pack.json');manifest=read('content/manifest.json');definitions=collections.defaultdict(list)
characters=base['characters'][:];assets=base['assets'][:];planets=base['planets'][:];versions={base['id']:base['version']}
for path in manifest['extensions']:
 if path=='extensions/chronicle-first-three.json':continue
 ext=read('content/'+path);versions[ext['id']]=ext['version'];d=ext['definitions'];characters+=d.get('characters',[]);assets+=d.get('assets',[]);planets+=d.get('planets',[])

for binding in manifest.get('characterPresentation',[]):
 for c in characters:
  if c['id']==binding['character']:c.update({k:v for k,v in binding.items() if k!='character'})
chars={c['sourceRow']:c for c in characters};byplanet={v['id']:v for v in planets}
sha=lambda p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
media=[]
for name in ['kiraba','mitsuba','prologue','blackhole']:
 master=f'art/story-first-three/masters/{name}.png';path=f'art/story-first-three/web/{name}.webp';runtime=f'assets/extensions/story-first-three/{name}.webp';asset=f'chronicle:asset.{name}'
 width,height=struct.unpack('>II',(ROOT/master).read_bytes()[16:24])
 definitions['assets'].append(dict(id=asset,name={'kiraba':'Kiraba · 對話立繪','mitsuba':'Mitsuba · 對話立繪','prologue':'序章 · 地球防衛戰','blackhole':'處女座 · 人造黑洞'}[name],src=runtime,width=width,height=height,hash=sha(path),review='candidate'))
 media.append(dict(id=asset,path=path,runtime=runtime,sha256=sha(path),master=master,masterSha256=sha(master)))
for cid,key in [(189,'kiraba'),(190,'mitsuba')]:definitions['actors'].append(dict(id=f'chronicle:actor.{key}',name=key.title(),portrait=f'chronicle:asset.{key}',variants={}))
for cid,key in [(11,'nemesis'),(33,'izar')]:
 c=chars[cid]
 definitions['enemies'].append(dict(id=f'chronicle:enemy.{key}',name=c['name'],description='同一星靈的劇情交戰定義；戰後制伏或撤離，不加入新召喚角色。',status='active',provenance='inferred',sourceRef=f'CID[{cid}]; existing character stats/skill/presentation reused, enemy-side encounter adaptation',hp=c['hp']*4,growthReference=dict(attack=c['attack']*10,defense=c['defense']*10,hp=c['hp']*40),attack=c['attack'],defense=c['defense'],speed=c['speed'],range=c['range'],interval=c['interval'],projectileSpeed=520,critical=c.get('critical',0),evasion=c.get('evasion',0),orbitSpeed=0,strafeSpeed=0,pattern='aim',boss=True,phaseAt=0,phasePattern='aim',color=c['color'],sprite=c['sprite'],skill=c['skill']))
actor_ids={k:c['id'] for k,c in chars.items()};actor_ids.update({189:'chronicle:actor.kiraba',190:'chronicle:actor.mitsuba'})
names={k:c['name'] for k,c in chars.items()};names.update({0:'旁白',226:'指揮官',189:'Kiraba',190:'Mitsuba'})
# key: title, source template, mode, duration, supporting CID(s), source rows, scene note
briefs={
 'venus':('金星求救','original:planet.5','eliminate',None,[4],(880,909),'消滅追擊金星的敵群'),
 'receiver-a':('回收通訊零件','original:spawn.1','eliminate',None,[],(970,981),'清除據點並回收接收器外殼'),
 'receiver-b':('回收接收模組','original:spawn.2','eliminate',None,[],(981,1004),'清除據點並回收能量接收模組'),
 'mars':('火星救援','original:planet.6','eliminate',None,[5],(1030,1061),'擊退火星本體附近的敵軍'),
 'jupiter-seal':('守住碳結晶','original:wave.52','defend',24,[6],(1133,1198),'在木星甦醒前保護封印結晶附近的防線'),
 'sun-traces':('太陽的殘響','original:spawn.3','eliminate',None,[6],(1228,1245),'清除太陽附近巡邏隊，調查殘留能量'),
 'nemesis-first':('黑色星靈','original:spawn.4','survive',24,[5],(1264,1294),'抵擋復仇女神星，等敵方撤退命令抵達'),
 'saturn':('土星的屏障','original:planet.8','protect',None,[7],(1338,1357),'保護土星並清除敵軍'),
 'uranus':('笑聲中的求救','original:planet.9','protect',None,[8],(1436,1451),'保護天王星並打開撤退通道'),
 'warp-parts':('躍遷門零件','original:spawn.7','eliminate',None,[],(1518,1551),'清除敵據點，回收躍遷門零件'),
 'neptune':('海王星歸航','original:wave.53','escort',90,[9,8],(1573,1597),'保護海王星，抵達安全區'),
 'pluto-parts':('過載裝置零件','original:spawn.9','eliminate',None,[],(1687,1716),'取得能量裝置需要的零件'),
 'pluto':('虛無邊緣','original:planet.11','defend',24,[6],(1676,1730),'保護木星，撐到過載裝置啟動'),
 'nemesis-parts':('最後一次躍遷','original:spawn.10','eliminate',None,[],(1762,1793),'取回殘片，完成一次性躍遷門'),
 'nemesis-duel':('復仇的約定','original:planet.12','eliminate',None,[6],(1809,1842),'支援木星，制伏復仇女神星'),
 'kiraba':('太陽系決戰','original:spawn.15','eliminate',None,[6,7,8,9],(1956,2002),'擊敗Kiraba；支援星靈僅在本次戰場參戰'),
 'gliese':('格利澤護送','original:wave.55','escort',90,[25],(2092,2124),'護送格利澤脫離追擊'),
 'vello':('前進基地求援','original:spawn.21','eliminate',None,[31],(2159,2202),'支援維洛，打開聯絡總部的通道'),
 'gliee':('姊妹重逢','original:planet.13','protect',None,[6,26],(2239,2264),'保護格利澤581e，擊退包圍的敵軍'),
 'izar-standoff':('總部的闖入者','original:spawn.22','eliminate',None,[31],(2319,2345),'制伏闖入者伊扎爾，結束衝突'),
 'linda':('琳達與黑洞','original:planet.21','eliminate',None,[32],(2432,2448),'援救琳達，取得黑洞研究情報'),
 'tactical-a':('投射裝置外殼','original:spawn.24','eliminate',None,[30],(2547,2556),'取回投射裝置的外殼'),
 'tactical-b':('能量控制模組','original:spawn.25','eliminate',None,[30],(2556,2562),'取回能量控制模組'),
 'tactical-c':('穩定裝置','original:spawn.26','eliminate',None,[30],(2568,2577),'取回穩定裝置'),
 'valencia':('瓦倫西亞的伏擊','original:spawn.27','protect',None,[30],(2582,2590),'保護瓦倫西亞，清除伏兵'),
 'seginus':('避難所防線','original:planet.14','protect',None,[27,6],(2610,2631),'保護招搖，守住平民避難所'),
 'spica':('角宿一的求救','original:planet.15','eliminate',None,[33],(2667,2689),'擊退追兵，援救角宿一'),
 'spica-return':('護送歌聲','original:wave.56','escort',90,[28,33],(2704,2733),'保護角宿一，送她抵達避難所'),
 'blackhole-delivery':('護送投射裝置','original:wave.57','escort',90,[30,29],(2773,2801),'護送攜帶裝置的瓦倫西亞抵達發射位置'),
 'mitsuba':('逆流之歌','original:spawn.34','eliminate',None,[6,29,33,28],(2844,2907),'在角宿一與木星支援下，擊敗Mitsuba'),
 'collapse':('守護者','original:spawn.33','defend',24,[6],(2913,2949),'掩護木星穩定人造黑洞，維持撤離通道'),
}
for suffix,original in [('solar','original:region.solar'),('virgo','original:region.virgo')]:
 template=next(r for r in read('content/extensions/original-world.json')['definitions']['regions'] if r['id']==original)
 definitions['regions'].append({**template,'id':f'chronicle:region.{suffix}','name':('太陽系' if suffix=='solar' else '處女座')+' · 戰役航跡','description':'從章節進入救援與決戰；可沿回程航路返回星圖整補。','provenance':'inferred','sourceRef':'Isolated story staging region; original world positions/routes unchanged','category':'event','campaignStart':False,'routes':[dict(to=original,label='返回'+('太陽系' if suffix=='solar' else '處女座'),requires=[])],'patrols':[],'startX':1200,'startY':1200})
mission_meta={}
for order,(key,(title,source,mode,seconds,support,rows,note)) in enumerate(briefs.items()):
 template=byplanet[source];region='chronicle:region.virgo' if order>=16 else 'chronicle:region.solar';x,y=1600+(order%4)*1900,1600+(order//4)*1000
 v={**template,'id':f'chronicle:encounter.{key}','name':title,'description':note+'。劇情參戰不等於角色入手；失敗可整補後重試。','status':'active','provenance':'inferred','sourceRef':f'EventScript[{rows[0]}..{rows[1]}]; source roster {source}; pacing/coordinates/levels adapted','region':region,'x':x,'y':y,'radius':58,'sprite':'original:asset.node-event','kind':'event','requires':[],'requiresActive':[],'hiddenUntilUnlocked':True,'initiallyCleared':False,'encounterPolicy':'manual','objective':'eliminate','timeLimitSeconds':0,'reward':{},'activationCost':{},'production':{},'dropCharacters':[],'waves':[],'leashRadius':1400,'leashWarningRadius':1200}
 level=(1 if order<3 else 3 if order<9 else 5 if order<16 else 10 if order<21 else 13 if order<29 else 18)
 # Source CID roster/counts preserved; chronology uses separately declared chapter levels.
 v['enemies']=[dict(enemy=e['enemy'],count=e['count'],level=level) for e in template['enemies']]
 if key in ['nemesis-first','nemesis-duel','izar-standoff']:v['enemies']=[dict(enemy='chronicle:enemy.izar' if key=='izar-standoff' else 'chronicle:enemy.nemesis',count=1,level=level+2)]
 story=dict(mode=mode,actors=[],waves=[],timeline=[],cues=[])
 if seconds:story['seconds']=seconds
 for i,c in enumerate(support):
  a=dict(id=f'chronicle:unit.{key}-{c}',character=chars[c]['id'],x=x+120+i*55,y=y-90+i*60,side='ally',level=level+3,required=mode in ['escort','protect','defend'] and i==0,spawnAt=0)
  if mode=='escort' and i==0:
   a['x']=x-700;a['y']=y-400;a['destination']=dict(x=x+1100,y=y-120,radius=35)
   for at,dx,dy in [(0,-700,400),(5,300,400),(11,1100,-120)]:story['timeline'].append(dict(actor=a['id'],at=at,action='move',x=x+dx,y=y+dy))
  if key=='jupiter-seal':a['spawnAt']=seconds-6;a['required']=False
  story['actors'].append(a)
 if mode in ['defend','survive']:
  story['waves']=[dict(at=at,enemies=[dict(enemy='original:enemy.148',count=3,level=level)]) for at in [6,12,18]]
 if key=='mitsuba':story['waves']=[dict(at=at,enemies=[dict(enemy='original:enemy.148',count=3,level=level)]) for at in [8,16]]
 # Battles have explicit at-time radio cues, presentation only.
 cue={
 'venus':(903,2,'金星，保持距離！我們來替妳開路！'),
 'jupiter-seal':(1170,4,'又有敵人靠近！守住結晶，別讓防線散開！'),
 'neptune':(1576,4,'安全區就在前面。保護海王星，別追得太遠！'),
 'pluto':(1683,6,'快一點。我不能一直壓住這股力量。'),
 'kiraba':(1974,6,'目標就在前方。別被她的艦隊打散。'),
 'gliese':(2098,25,'前面就是安全區了紐……再撐一下！'),
 'blackhole-delivery':(2784,29,'守住裝置！抵達發射位置前，不准散開！'),
 'mitsuba':(2897,6,'逆流開始了。就是現在，集中攻擊。'),
 'collapse':(2928,6,'我來穩住它。妳們守住撤離通道。'),
 }.get(key)
 if cue:
  row,c,text=cue;story['cues']=[dict(at=3,steps=[dict(kind='say',speaker=names[c],actor=actor_ids[c],text=text)])]
 v['storyEncounter']=story;definitions['planets'].append(v)
 mission_meta[key]=dict(source=source,sourceRows=list(rows),level=level,mode=mode,seconds=seconds,reward={},notes=note)
qs=read('research/stella-maiden/tables/QuestS.json')['rows'];es=read('research/stella-maiden/tables/EventScript.json')['rows'];physical={r['_row']:r for r in es};labels={}
for r in es:labels.setdefault(r['f01'],r['_row'])
chapters={1:'序章 · 指揮官',**{i:'太陽系' for i in range(2,14)},**{i:'處女座' for i in range(14,25)}}
titles=['指揮官','救援金星','改良接收器','救援火星','救援木星','太陽的蹤跡','救援土星','救援天王星','海王星歸航','冥王星探索','復仇女神星','Kiraba','太陽系後日談','格利澤護送','救援維洛','姊妹重逢','大角星探索','琳達與黑洞','伊扎爾','戰術黑洞設計','招搖的避難所','角宿一的歌','Mitsuba','處女座後日談']
sections={};current=0
for line in (ROOT/'content/story-first-three/dialogue.txt').read_text().splitlines():
 if not line or line.startswith('#'):continue
 if line.startswith('['):current=int(line[1:-1]);sections[current]=[]
 else:sections[current].append(line)
assert set(sections)==set(range(1,25))
evidence=[];text_count=0
for n,lines in sections.items():
 chapter='prologue' if n==1 else 'solar' if n<=13 else 'virgo';bg='chronicle:asset.prologue' if n==1 else 'm1art:bridge-v1';steps=[];dialogue=[];refs=[]
 if n==2:steps.append(dict(kind='await',condition=dict(fact='region',target='original:region.solar')))
 if n==14:steps.append(dict(kind='await',condition=dict(fact='region',target='original:region.virgo')))
 for line in lines:
  if line.startswith('@battle '):
   key=line.split()[1];source=mission_meta[key]['source'];v=byplanet[source]
   steps.append(dict(kind='say',speaker='航行目標',text=mission_meta[key]['notes']+'。完成後接續劇情；可先返回航行整補。'))
   # Same-ID victory is certain evidence; selected world clears can bridge an old save for the same source encounter.
   resume=dict(fact='cleared',target=f'chronicle:encounter.{key}')
   if source.startswith('original:planet.') or source in ['original:spawn.15','original:spawn.34']:
    resume=dict(any=[resume,dict(fact='cleared',target=source)])
   steps.append(dict(kind='encounter',planet=f'chronicle:encounter.{key}',resumeIf=resume))
  elif line=='@flash':steps.extend([dict(kind='fade',opacity=0.85,seconds=0.25),dict(kind='fade',opacity=0,seconds=0.45)])
  elif line in ['@bridge','@space','@blackhole']:
   asset={'@bridge':'m1art:bridge-v1','@space':'original:asset.background-virgo' if n>=14 else 'original:asset.background-solar','@blackhole':'chronicle:asset.blackhole'}[line];steps.append(dict(kind='background',asset=asset))
  elif line=='@all-solar':
   steps.append(dict(kind='say',speaker='航行目標',text='前往處女座前，請清除太陽系星圖上的SE1至SE15敵方據點。已清除的據點會直接採計。可返回航行完成，之後接續本章。'))
   steps.append(dict(kind='await',condition=dict(all=[dict(fact='cleared',target=f'original:spawn.{i}') for i in range(1,16)])))
  elif line=='@init':steps.append(dict(kind='event',event='chronicle:event.master-awakened'))
  elif line.startswith('@'):raise ValueError(line)
  else:
   row,c,text=line.split('|',2);row=int(row);c=int(c);assert row in physical
   say=dict(kind='say',speaker=names[c],text=text)
   if c in actor_ids:say['actor']=actor_ids[c]
   steps.append(say);dialogue.append(dict(speaker=names[c],text=text));text_count+=len(text)
   refs.append(dict(step=len(steps)-1,eventScriptRow=row,cid=c,classification='localized-adaptation',speakerBasis='f34/f35 + f36 selection checked against dialogue response and surrounding context; explicit prose adaptation where narrator/commands condensed',sourceHasText=bool(physical[row]['f43'])))
 reward=150 if n==1 else 100 if n<13 else 150 if n<24 else 200
 story=dict(chapter=f'chronicle:chapter.{chapter}',autoStart=False,chapterRequires=[],steps=steps)
 if n>1:story['requires']=dict(fact='completed',target=f'chronicle:quest.{n-1:02}')
 if n==2:story['chapterRequires']=['chronicle:chapter.prologue']
 if n==14:story['chapterRequires']=['chronicle:chapter.solar']
 desc=('觀看地球防衛戰與指揮官的甦醒。' if n==1 else '前往太陽系，救援金星。' if n==2 else '經太陽系星門前往處女座，開始救援。' if n==14 else '依章節目標接續行動；可返回航行整補後重試。')
 q=dict(id=f'chronicle:quest.{n:02}',name=f'{"序章" if n==1 else "1-"+str(n-1).zfill(2) if n<14 else "2-"+str(n-13).zfill(2)} · {titles[n-1]}',description=desc,status='active',provenance='inferred',sourceRef=f"QuestS[{n}] {qs[n]['f00']}; EventScript label {qs[n]['f02']} first row {labels[qs[n]['f02']]}; zh-TW adaptation",background=bg,condition='intro',repeat='once',target='',count=1,reward={r['id']:reward for r in base['resources']},character='',dialogue=dialogue,story=story)
 definitions['quests'].append(q);evidence.append(dict(quest=q['id'],questSRow=n,entryLabel=qs[n]['f02'],firstRow=labels[qs[n]['f02']],lines=refs,rewardPerResource=reward))
pack=dict(schemaVersion=1,id='chronicle:package.first-three',version='0.1.0',requires=[dict(id=i,version=versions[i]) for i in ['m1:core','original:package.world','solar10:package.first-ten','story10:package.virgo-vanguard']],definitions=dict(definitions))
# Resolve actual author namespace instead of guessing the prologue package name.
pack['requires']=[dict(id=i,version=v) for i,v in versions.items() if i in ['m1:core','original:package.world','solar10:package.first-ten','story10:package.virgo-vanguard'] or i.startswith('prologue6:')]
write('content/extensions/chronicle-first-three.json',pack)
write('content/story-first-three/sources.json',dict(baseline='9da3fdd135be55134f4ee800a6541eb4b9c80293',scope='First 24 QuestS nodes. Translated and abridged Chinese adaptation; original source facts separated from gameplay and timing adaptation. Not original runtime certification.',quests=evidence,encounters=mission_meta))
write('art/story-first-three/media.json',media)
print('Built',len(definitions['quests']),'quests,',len(definitions['planets']),'encounters,',sum(len(q['dialogue']) for q in definitions['quests']),'dialogue frames,',text_count,'characters; rewards',sum(q['reward']['m1:crystal'] for q in definitions['quests']),'per resource')
