"""Check imported counts, native-confirmed references and representative joins."""
from pathlib import Path
import sqlite3,json
ROOT=Path(__file__).resolve().parents[1]
db=sqlite3.connect('file:'+str(ROOT/'generated/stella_research.sqlite')+'?mode=ro',uri=True)
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert db.execute('SELECT count(*),sum(row_count) FROM _catalog').fetchone()==(67,37723)
assert db.execute('SELECT active_skill_id,skill_key FROM characters_with_skill WHERE key=?',('Sun',)).fetchone()==(71,'DefPowerDot32')
assert db.execute('SELECT count(*) FROM skills_localized WHERE name_en IS NULL OR description_en IS NULL').fetchone()[0]==0
assert db.execute('SELECT character_key,count FROM stage_roster WHERE spawn_row=1').fetchall()==[('Enemy_Scout01',3)]
assert db.execute('SELECT count(*) FROM stage_details WHERE wave_key IS NULL').fetchone()[0]==0
assert db.execute('SELECT count(*) FROM wave_roster WHERE character_key IS NULL').fetchone()[0]==0
assert db.execute('SELECT count(*) FROM gacha_recipes WHERE character_key IS NULL').fetchone()[0]==0
assert db.execute('SELECT count(*) FROM event_commands').fetchone()[0]==7809
assert db.execute('SELECT entry_label,entry_row FROM event_spot_entries WHERE eventspot_row=2').fetchone()==(200,508)
assert db.execute('SELECT count(*) FROM event_spot_entries WHERE entry_label<>0 AND entry_row IS NULL').fetchone()[0]==0
print(json.dumps({'status':'pass','tables':67,'rows':37723,'sqlite_integrity':'ok','verified_joins':['CID→Skill→LocalStr','SpawnPoint→Wave→CID','Gacha→CID','EventSpot label→EventScript'],'scope':'Research data import; game is still uninitialized.'},ensure_ascii=False,indent=2))
