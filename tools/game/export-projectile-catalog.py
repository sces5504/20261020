"""Infer reusable projectile recipes from recovered Attack/Bullet archetype names.
Names and row links are evidence; motion parameters are intentional reconstruction.
"""
import sqlite3,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
c=sqlite3.connect('file:'+str(root/'research/stella-maiden/generated/stella_research.sqlite')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
out=[]
for table in ['Attack','Bullet']:
 for r in c.execute(f'SELECT _row,f00 FROM {table} ORDER BY _row'):
  row,key=r
  if not row:continue
  a=dict(kind='projectile',pattern='aim',count=1,power=1,duration=5)
  if 'MeleeSplash' in key:a.update(pattern='meleeSplash',splash=100)
  elif 'MeleeFront' in key:a.update(pattern='meleeFan',spread=1.05)
  elif 'MeleeSpear' in key:a.update(pattern='meleeSpear',width=40)
  elif 'Melee' in key:a.update(pattern='melee')
  elif 'BombRange' in key or key=='Meteor':a.update(kind='bomb',target='enemies',radius=180,duration=1,count=5 if 'Seq' in key else 1,cadence=.25)
  elif 'Laser' in key:a.update(kind='beam',target='enemies',radius=900,width=35,duration=1,interval=.2,track='Target' in key)
  elif 'CircleRot' in key:a.update(pattern='spiral',count=14,rotation=-1 if 'Inv' in key else 1)
  elif 'Circle' in key:a.update(pattern='ring',count=14,salvos=3 if 'Burst' in key else 1,spawnRadius=350 if 'Inv' in key else 0,inward='Inv' in key)
  elif 'Guide' in key:a.update(pattern='homing')
  elif 'Rand' in key:a.update(pattern='shotgun',count=8,randomSpread=True,spread=1.2)
  elif 'Fan' in key:a.update(pattern='fan',count=5,salvos=3 if 'Burst' in key else 1,rotation=-.8 if 'Left' in key else .8 if 'Right' in key else 0)
  elif 'Triple' in key:a.update(pattern='fan',count=3)
  elif 'Burst' in key:a.update(pattern='burst',count=3)
  elif not any(v in key for v in ['Normal','Splash','Pierce','Straight']):raise ValueError((table,key))
  if 'Pierce' in key:a.update(pierce=8)
  if 'Splash' in key and not 'Melee' in key:a.update(splash=100)
  out.append(dict(id=f'{table.lower()}-{row}',table=table,row=row,key=key,action=a,evidence='Source archetype name; parameters reconstructed, not native runtime measurements.'))
(root/'content/source/stella-projectiles.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Projectile archetypes:',len(out),'(reconstructed recipes, original rows preserved).')
