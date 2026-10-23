"""Bounded static evidence for QuestS[1:24]; never imports source as gameplay."""
import sqlite3,json,collections,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
c=sqlite3.connect(root/'research/stella-maiden/generated/stella_research.sqlite');c.row_factory=sqlite3.Row
rows=lambda t: [dict(r) for r in c.execute(f'SELECT * FROM "{t}" ORDER BY _row')]
events=rows('EventScript');spots=rows('EventSpot');scripts=rows('Script');labels={}
for e in events: labels.setdefault(e['f01'],e['_row'])
def block(label):
 start=labels.get(label)
 if start is None:return []
 result=[]
 for e in events[start:]:
  result.append(e)
  if e['f02']==10:break
 return result
out=[]
for q in rows('QuestS')[1:25]:
 todo=[q['f02']];visited=set();blocks=[];refs=[];spotrefs=[]
 while todo:
  label=todo.pop(0)
  if label in visited:continue
  visited.add(label);b=block(label)
  if not b:continue
  blocks.append({'label':label,'firstRow':b[0]['_row'],'lastRow':b[-1]['_row'],'commands':[{'row':e['_row'],'opcode':e['f02'],'operands':{k:v for k,v in e.items() if k.startswith('f') and k not in ['f00','f01','f02','f42','f43','f44'] and v not in (0,0.0,'','[0.0, 0.0]','[0.0, 0.0, 0.0]','[1.0, 1.0, 1.0, 1.0]')}} for e in b]})
  for e in b:
   if e['f02'] in (66,67) and 0<e['f13']<len(spots):
    s=spots[e['f13']];spotrefs.append({'row':s['_row'],'key':s['f00'],'label':s['f04'],'firstRow':labels.get(s['f04']),'triggerMode':s['f11'],'spawnPointNumber':s['f12'],'operands':{k:v for k,v in s.items() if k.startswith('f')}});todo.append(s['f04'])
   if e['f02']==107:todo.append(int(e['f21']))
   if e['f02'] in (28,29,30,31,37,38):
    # Operand snapshot: scripts selected through runtime chapter/event state; no guessed speaker.
    refs.append({'eventRow':e['_row'],'opcode':e['f02'],'f03to20':{f'f{i:02}':e[f'f{i:02}'] for i in range(3,21)}})
 # QuestS f05 matches Script.f00 keys, not assumed physical row.
 sr=[{'row':s['_row'],'key':s['f00'],'group':s['f01'],'line':s['f02']} for s in scripts if s['f00']==q['f05']]
 ops=collections.Counter(e['opcode'] for b in blocks for e in b['commands'])
 out.append({'questRow':q['_row'],'key':q['f00'],'entryLabel':q['f02'],'entryFirstRow':labels.get(q['f02']),'completionLabel':q['f03'],'completionFirstRow':labels.get(q['f03']),'questOperands':{k:v for k,v in q.items() if k.startswith('f')},'scriptKeyMatches':sr,'referencedScriptCommands':refs,'eventSpots':spotrefs,'opcodeCounts':dict(sorted(ops.items())),'blocks':blocks})
path=root/'docs/verification/story-core-source.json';path.write_text(json.dumps({'scope':'Static trace, not original runtime certification. f34/f35 are portrait clues, never speaker identity. ChatScript operands require chapter/runtime context; retained without guessed identity.','nodes':out},ensure_ascii=False,indent=2)+'\n')
print('24 nodes traced to',path)
for n in out:print(n['key'],n['entryLabel'],n['entryFirstRow'],len(n['blocks']),','.join(map(str,n['opcodeCounts'])))
