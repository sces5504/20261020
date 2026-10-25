"""Record a generated PNG without modifying either image; called per character."""
from pathlib import Path
import sys,json,hashlib,shutil
from PIL import Image
b=Path(__file__).resolve().parent
key,source=sys.argv[1:3]
version=sys.argv[3] if len(sys.argv)>3 else 'v1'
source=Path(source).resolve()
assert source.is_relative_to(Path('/workspace/generated_images'))
m=json.loads((b/'catalog.json').read_text())
c=next(c for c in m['characters'] if c['key']==key)
target=b/f'battle/{key}-{version}-candidate.png'
assert not target.exists(),target
shutil.copy2(source,target)
with Image.open(target) as im:
 im.load();assert im.mode=='RGBA'
 bounds=im.getchannel('A').point(lambda x:255 if x>=192 else 0).getbbox()
 width,height=im.size
prompt=f'prompts/{key}-battle-{version}.txt'
c['visualInspection']=(b/prompt).read_text().split('Character locks: ',1)[1].strip()
c['battleAsset']={'assetId':f'stellaart:asset.{key}-battle-20261025-{version}','characterId':c['id'],'path':str(target.relative_to(b)),'preview':f'web/{key}-battle.webp','version':version+'-candidate','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceOriginalSha256':c['sha256'],'sourceOriginalVersion':c['assetVersion'],'width':width,'height':height,'colorSpace':'sRGB','alpha':'straight','pivot':{'x':(bounds[0]+bounds[2])/2/width,'y':bounds[3]/height,'note':'視覺輪廓底部，含裝備／座具時須場景校準，非碰撞判定'},'safeArea':{'bodyBounds':bounds,'marginPx':[bounds[0],bounds[1],width-bounds[2],height-bounds[3]],'note':'保留生成主檔；網頁輸出另加透明安全留白'},'source':{'tool':'image_gen.imagegen','modelVersion':'not-exposed','reference':c['path'],'prompt':prompt,'toolOutputFileName':source.name,'retouch':'none'},'use':'static-SD-battle-candidate','bundle':'stellar40-20261025','atlas':None,'animation':None,'reviewStatus':'awaiting-user-review','webAsset':None}
(b/'catalog.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
done=[c['key'] for c in m['characters'] if c['battleAsset']]
(b/'progress.json').write_text(json.dumps({'completedCount':len(done),'targetCount':40,'completedKeys':done,'remainingKeys':[c['key'] for c in m['characters'] if not c['battleAsset']]},ensure_ascii=False,indent=2)+'\n')
print(f'Recorded {key}: {len(done)}/40 SD candidates')
