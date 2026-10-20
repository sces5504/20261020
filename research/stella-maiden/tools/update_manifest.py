"""Refresh file integrity metadata after an intentional, reviewed bundle update."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
files=[]
for path in sorted(ROOT.rglob('*')):
    relative=path.relative_to(ROOT)
    if not path.is_file() or path.name=='MANIFEST.json' or any(part in ['generated','__pycache__'] for part in relative.parts):continue
    if path.is_symlink():raise ValueError('Symlinks are not part of this portable bundle')
    data=path.read_bytes();files.append({'path':str(relative),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
manifest={'format':'stella-maiden-ai-handoff-v1','game_version':'4.3.2','source_apk_sha256':'213a1630a5e893f4e5c1e17fc292a04aabfe5c865534c997cb90131624837905','scope':'Research data, original serialized values, decoded scene trees and bounded static mechanics; no APK, binary media, installed toolchains or game execution.','files':files}
(ROOT/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Manifest:',len(files),'files,',sum(f['bytes'] for f in files),'bytes')
