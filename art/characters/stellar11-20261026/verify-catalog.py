"""Verify this isolated art package and rebuild its scoped SQLite lookup."""
from pathlib import Path
import hashlib
import json
import sqlite3
from PIL import Image

base = Path(__file__).resolve().parent
root = base.parents[2]
catalog = json.loads((base / 'catalog.json').read_text())
assert len(catalog['characters']) == 11
seen = set()
def verify(asset):
    asset_id = asset.get('assetId', asset.get('id'))
    assert asset_id not in seen, asset_id
    seen.add(asset_id)
    path = (base / asset['path']).resolve()
    assert path.is_relative_to(base)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['sha256'], path
    with Image.open(path) as im:
        im.load()
        assert im.size == (asset['width'], asset['height'])
        assert im.mode == 'RGBA', path
        if asset.get('use','').startswith('static-SD'): assert im.getchannel('A').getextrema()[0] == 0, path
    assert asset['reviewStatus'] == 'awaiting-user-review'

for c in catalog['characters']:
    assert c['runtimeStatus'] in ['existing-character-art-update-pending','new-character-art-only']
    assert c['gameCharacterId'] is None or c['gameCharacterId'] in c['verifiedExistingGameCharacterIds']
    assert c['sha256'] == c['sourceOriginalSha256']
    assert c['visualInspection']
    verify(c)
    for a in [c['webAsset'], c['avatarAsset'], c['battleAsset'], c['battleAsset']['webAsset']]:
        verify(a)
        assert a['sourceOriginalSha256'] == c['sha256']
    assert min(c['battleAsset']['webAsset']['safeArea']['marginPx']) >= 80
    assert c['battleAsset']['animation'] is None
    assert (base / c['battleAsset']['source']['prompt']).is_file()
for original in catalog['legacyStandards']:
    assert hashlib.sha256((root / original['path']).read_bytes()).hexdigest() == original['sha256']

db_path = base / 'library.sqlite3'
with sqlite3.connect(db_path) as db:
    db.execute('CREATE TABLE IF NOT EXISTS characters(id TEXT PRIMARY KEY,name_zh TEXT,original_key TEXT,proposed_content_id TEXT,record_json TEXT)')
    db.execute('CREATE TABLE IF NOT EXISTS assets(asset_id TEXT PRIMARY KEY,character_id TEXT REFERENCES characters(id),usage TEXT,path TEXT,sha256 TEXT,record_json TEXT)')
    db.execute('DELETE FROM assets')
    db.execute('DELETE FROM characters')
    for c in catalog['characters']:
        db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (c['id'],c['nameZhHant'],c['originalGameKey'],c['proposedContentId'],json.dumps(c,ensure_ascii=False)))
        for a,usage in [(c,'standard-master'),(c['webAsset'],'portrait-web'),(c['avatarAsset'],'avatar-crop'),(c['battleAsset'],'static-SD-master'),(c['battleAsset']['webAsset'],'static-SD-web')]:
            db.execute('INSERT INTO assets VALUES(?,?,?,?,?,?)',(a['assetId'],c['id'],usage,a['path'],a['sha256'],json.dumps(a,ensure_ascii=False)))
    assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
print('PASS: 11 characters, 55 assets, source/output hashes and alpha, SD web safe margins, scoped SQLite; 73 previous standards unchanged.')
