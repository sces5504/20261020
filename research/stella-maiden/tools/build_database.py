"""Build a research SQLite database from losslessly decoded tables.

fNN columns preserve serialized order; semantic views never rename unknowns.
"""
from pathlib import Path
import sqlite3, json, re
ROOT=Path(__file__).resolve().parents[1]

def quote(s):return '"'+s.replace('"','""')+'"'
def value(v):return json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v

def main():
    dest=ROOT/'generated/stella_research.sqlite'
    dest.parent.mkdir(exist_ok=True)
    conn=sqlite3.connect(dest)
    for name, in conn.execute("SELECT name FROM sqlite_master WHERE type='view'").fetchall():conn.execute('DROP VIEW '+quote(name))
    for name, in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():conn.execute('DROP TABLE '+quote(name))
    conn.execute('CREATE TABLE _catalog (name TEXT PRIMARY KEY, row_count INTEGER, field_count INTEGER, source_sha256 TEXT, loader TEXT, schema_source TEXT)')
    conn.execute('CREATE TABLE _fields (table_name TEXT, name TEXT, primitive_type TEXT, call_pc TEXT, native_offset INTEGER, native_slot_offset INTEGER, PRIMARY KEY(table_name,name))')
    conn.execute('CREATE TABLE _semantics (table_name TEXT, field TEXT, name TEXT, confidence TEXT, consumer_pc TEXT, meaning TEXT, PRIMARY KEY(table_name,field))')
    catalog=[]
    schema=json.loads((ROOT/'index/table_schema.json').read_text())['schemas']
    for path in sorted((ROOT/'tables').glob('*.json')):
        t=json.loads(path.read_text());fields=t['fields'];name=path.stem
        types={'str':'TEXT','f32':'REAL'}
        cols=['_row INTEGER PRIMARY KEY','_offset INTEGER','_size INTEGER','_field_offsets TEXT']+[quote(f['name'])+' '+types.get(f['type'],'TEXT' if f['type'].startswith('vec') else 'INTEGER') for f in fields]
        conn.execute('CREATE TABLE '+quote(name)+' ('+','.join(cols)+')')
        order=['_row','_offset','_size','_field_offsets']+[f['name'] for f in fields]
        conn.executemany('INSERT INTO '+quote(name)+' VALUES ('+','.join('?' for _ in order)+')',[[value(r.get(k)) for k in order] for r in t['rows']])
        count=conn.execute('SELECT count(*) FROM '+quote(name)).fetchone()[0]
        assert count==t['_row_count']
        if any(f['name']=='f00' for f in fields):conn.execute('CREATE INDEX '+quote('ix_'+name+'_f00')+' ON '+quote(name)+'(f00)')
        spec=schema.get(name,{})
        conn.execute('INSERT INTO _catalog VALUES (?,?,?,?,?,?)',(name,count,len(fields),t['_source_sha256'],spec.get('loader'),spec.get('schema_source')))
        conn.executemany('INSERT INTO _fields VALUES (?,?,?,?,?,?)',[(name,f['name'],f['type'],f.get('call_pc'),f.get('native_offset'),f.get('native_slot_offset')) for f in fields])
        catalog.append({'table':name,'rows':count,'fields':len(fields),'source_sha256':t['_source_sha256'],'loader':spec.get('loader'),'schema_source':spec.get('schema_source')})
    # LocalStr language identities are observed from the actual strings.
    conn.execute('CREATE VIEW localization AS SELECT _row, f00 AS key, f01 AS ja, f02 AS en, f03 AS ko, f04 AS extra_language FROM LocalStr')
    conn.execute('CREATE VIEW skills_localized AS SELECT s.*, n.f02 AS name_en,n.f01 AS name_ja,n.f03 AS name_ko,d.f02 AS description_en,d.f01 AS description_ja,d.f03 AS description_ko FROM Skill s LEFT JOIN LocalStr n ON n._row=s.f04 LEFT JOIN LocalStr d ON d._row=s.f05')
    conn.execute('CREATE VIEW experience_curve AS SELECT _row, f00 AS level, f01 AS required_exp, sum(f01) OVER (ORDER BY _row) AS cumulative_through_row FROM EXP')
    # These joins are grounded in native consumers (see reports/stages.md).
    conn.execute('CREATE VIEW stage_details AS SELECT s._row AS spawn_row,s.f00 AS key,s.f10 AS wave_row,s.f11 AS map_x,s.f12 AS map_y,w.f00 AS wave_key,w.f01 AS wave_internal_id FROM SpawnPoint s LEFT JOIN Wave w ON w._row=s.f10')
    arms=[]
    for slot in range(7):
        cid='f'+str(5+slot*2).zfill(2);count='f'+str(6+slot*2).zfill(2)
        arms.append(f'SELECT _row AS wave_row,{slot} AS slot,{cid} AS cid_row,{count} AS count FROM Wave WHERE {count}>0 AND {cid}>0')
    conn.execute('CREATE VIEW wave_roster AS SELECT r.*, c.f00 AS character_key FROM ('+' UNION ALL '.join(arms)+') r LEFT JOIN CID c ON c._row=r.cid_row')
    conn.execute('CREATE VIEW stage_roster AS SELECT s.*,r.slot,r.cid_row,r.character_key,r.count FROM stage_details s JOIN wave_roster r ON r.wave_row=s.wave_row')
    # Source config values; consumer branches and flags are documented separately.
    conn.execute('CREATE VIEW gacha_recipes AS SELECT g._row,g.f00 AS key,g.f01 AS cid_row,c.f00 AS character_key,g.f02 AS mode_code,g.f03 AS flag_code,g.f04 AS resource_1,g.f05 AS resource_2,g.f06 AS resource_3,g.f07 AS resource_4,g.f08 AS total_min,g.f09 AS total_max,g.f10,g.f11,g.f12,g.f13,g.f14 FROM Gacha g LEFT JOIN CID c ON c._row=g.f01')
    conn.execute('CREATE VIEW characters_with_skill AS SELECT c._row AS cid_row,c.f00 AS key,c.f02 AS rarity,c.f15 AS attack_growth_reference,c.f16 AS defense_growth_reference,c.f17 AS hp_growth_reference,c.f106 AS active_skill_id,s.f00 AS skill_key,s.name_en AS skill_name_en,s.description_en AS skill_description_en FROM CID c LEFT JOIN skills_localized s ON s._row=c.f106')
    meanings=ROOT/'index/mechanics_semantics.json'
    if meanings.exists():
        semantics=json.loads(meanings.read_text())['tables']
        for name,fields in semantics.items():
            for field,m in fields.items():
                conn.execute('INSERT INTO _semantics VALUES (?,?,?,?,?,?)',(name,field,m['name'],m['confidence'],m.get('consumer_pc'),m.get('meaning')))
        fields=semantics['Skill']
        conn.execute('CREATE VIEW skills_named AS SELECT s.*,'+','.join(quote(f)+' AS '+quote(m['name']) for f,m in fields.items())+' FROM skills_localized s')
    events=ROOT/'index/event_semantics.json'
    if events.exists():
        event_data=json.loads(events.read_text())
        conn.execute('CREATE TABLE _event_opcodes (opcode INTEGER PRIMARY KEY, name TEXT, handler TEXT, used_rows INTEGER)')
        conn.executemany('INSERT INTO _event_opcodes VALUES (?,?,?,?)',[(o['opcode'],o['native_name'],o['dispatch_target'],o['rows_using_opcode']) for o in event_data['opcodes']])
        conn.execute('CREATE VIEW event_commands AS SELECT e._row,e.f00 AS local_line_ordinal_candidate,e.f01 AS entry_label,e.f02 AS opcode,o.name AS opcode_name,e.f30 AS pre_delay_ms,e.f43 AS text_en,e.f42 AS text_ja,e.f44 AS text_ko FROM EventScript e LEFT JOIN _event_opcodes o ON o.opcode=e.f02')
        conn.execute('CREATE VIEW event_spot_entries AS SELECT s._row AS eventspot_row,s.f00 AS key,s.f04 AS entry_label,e.entry_row FROM EventSpot s LEFT JOIN (SELECT f01 AS label,min(_row) AS entry_row FROM EventScript WHERE f01<>0 GROUP BY f01) e ON e.label=s.f04')
    conn.execute('CREATE TABLE _assets (package TEXT, name TEXT, output TEXT, size INTEGER, sha256 TEXT, metadata TEXT)')
    for a in json.loads((ROOT/'index/asset_inventory.json').read_text()):conn.execute('INSERT INTO _assets VALUES (?,?,?,?,?,?)',(a['package'],a['name'],a['output'],a['size'],a['sha256'],json.dumps(a,ensure_ascii=False)))
    conn.execute('CREATE TABLE _evidence_files (path TEXT PRIMARY KEY, kind TEXT)')
    for path in sorted((ROOT/'rea-evidence').glob('*')):
        if path.is_file():conn.execute('INSERT INTO _evidence_files VALUES (?,?)',(str(path.relative_to(ROOT)),'REA output'))
    assert conn.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    conn.commit();conn.close()
    (ROOT/'generated/table_catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
    print('Database:',dest,'tables:',len(catalog),'rows:',sum(t['rows'] for t in catalog))

if __name__=='__main__':main()
