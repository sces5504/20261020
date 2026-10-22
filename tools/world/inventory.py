"""Bounded SQLite import for the original-world content author; archive is read-only."""
from pathlib import Path
import sqlite3,json,hashlib,re
ROOT=Path(__file__).resolve().parents[2]
DB=ROOT/'research/stella-maiden/generated/stella_research.sqlite'
c=sqlite3.connect('file:'+str(DB)+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
OUT=ROOT/'content/source/original-world';OUT.mkdir(parents=True,exist_ok=True)
def rows(table,where='1'):
 return [{k:v for k,v in dict(r).items() if k=='_row' or not k.startswith('_')} for r in c.execute(f'SELECT * FROM {table} WHERE {where} ORDER BY _row')]
def save(name,obj):
 (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
wave=rows('Wave');roster={}
for r in c.execute('SELECT wave_row,slot,cid_row,character_key,count FROM wave_roster ORDER BY wave_row,slot'):
 r=dict(r);roster.setdefault(r.pop('wave_row'),[]).append(r)
used={r['cid_row'] for v in roster.values() for r in v}
for r in rows('Boss','_row>0'):
 used.update(r[f'f{i:02d}'] for i in range(1,5) if r[f'f{i:02d}']>0)
enemies=rows('CID','_row IN ('+','.join(map(str,sorted(used)))+')')
models={}
for e in enemies:
 model=e['f07'] or e['f00']
 models.setdefault(model,[]).append(e['_row'])
planets=rows('PID','_row>0');galaxies=rows('Galaxy','_row>0');gates=rows('GalaxyGate');spawns=rows('SpawnPoint','_row>0')
summary={'sourceApkSha256':'213a1630a5e893f4e5c1e17fc292a04aabfe5c865534c997cb90131624837905','coreBaseCommit':'5e6d471','sourceVersion':'4.3.2','rawCounts':{'galaxies':len(galaxies),'planets':len(planets),'spawnPoints':len(spawns),'nonemptyWaves':len(roster),'enemyDefinitions':len(enemies),'visualIdentities':len(models),'galaxyGates':len(gates)},'excludedRuntimeSystems':['cancelled defense/raid restoration','cancelled rewarded dodge training','debug/Test/Dummy only fixtures'],'confidence':{'waveGroups':'native-confirmed Wave row references and seven CID/count pairs','growth':'native-confirmed ATK/HP/DEF truncation, CID.f15/f16/f17','mapCoordinates':'native-confirmed SpawnPoint.f11/f12; PID.f12/f13 relationally inferred','galaxyRows':'source Galaxy.f01; zero-region spawn placeholders are not reassigned by guessed names','planetGuardWave':'PID.f05 matched to GalaxyN_M Wave keys; relational inference','planetResources':'PID.f28/f29/f30/f31 inferred four-wallet order, checked against public Solar/Virgo lists','movementAndShot':'CID movement/interval columns and Shot/Attack chain require declared inference; never labelled native-confirmed'}}
save('inventory.json',summary)
save('enemies.json',enemies)
save('planets.json',planets)
save('galaxies.json',galaxies)
save('gates.json',gates)
save('spawns.json',spawns)
save('waves.json',[dict(r,groups=roster.get(r['_row'],[])) for r in wave])
save('daily-boss.json',rows('Boss','_row>0'))
save('world-constants.json',rows('Global',"f00 IN ('BossLimitSec','BossChance','BossChance3','BossNeedQuasarEnergy','CubePartySlot4','CubePartySlot5','CubePartySlot6')"))
save('visual-identities.json',[{'model':key,'cidRows':ids,'assetId':'original:asset.enemy-'+str(min(ids)),'review':'planned'} for key,ids in models.items()])
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('Planet model keys:',len({p['f02'] for p in planets}))
