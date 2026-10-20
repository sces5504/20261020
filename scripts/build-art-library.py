#!/usr/bin/env python3
"""Rebuild the separate art reference database from reviewable JSON records."""
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'art/catalog'


def read(name):
    return json.loads((CATALOG / name).read_text(encoding='utf-8'))


def resolve(path):
    result = (ROOT / path).resolve()
    if not result.is_relative_to(ROOT) or not result.is_file():
        raise ValueError(f'Missing or out-of-repository file: {path}')
    return result


def main():
    sources = read('sources.json')
    sheets = read('hair-sheets.json')
    hairstyles = read('hairstyles.json')
    characters = read('characters.json')
    assets = read('assets.json')
    for collection in (sources, sheets, hairstyles, characters, assets):
        ids = [row['id'] for row in collection]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate art ID')
    for row in [*sources, *assets]:
        if row.get('path'):
            data = resolve(row['path']).read_bytes()
            if hashlib.sha256(data).hexdigest() != row['sha256']:
                raise ValueError(f"Hash mismatch: {row['id']}")
    for row in sheets:
        resolve(row['path'])
    for row in characters:
        resolve(row['promptPath'])
    if len({r['hairstyleId'] for r in characters}) != len(characters):
        raise ValueError('M1 characters must have distinct hairstyle IDs')
    if len({r['poseId'] for r in characters}) != len(characters):
        raise ValueError('M1 characters must have distinct pose IDs')
    temporary = CATALOG / 'art-library.sqlite3.tmp'
    temporary.unlink(missing_ok=True)
    try:
        with sqlite3.connect(temporary) as db:
            db.execute('PRAGMA foreign_keys=ON')
            db.executescript('''
                CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE sources(id TEXT PRIMARY KEY, title TEXT NOT NULL, record_json TEXT NOT NULL);
                CREATE TABLE hair_sheets(id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), title TEXT NOT NULL, path TEXT NOT NULL, tags_json TEXT NOT NULL, record_json TEXT NOT NULL);
                CREATE TABLE hairstyles(id TEXT PRIMARY KEY, label TEXT NOT NULL, tags_json TEXT NOT NULL, record_json TEXT NOT NULL);
                CREATE TABLE hairstyle_sheets(hairstyle_id TEXT REFERENCES hairstyles(id), sheet_id TEXT REFERENCES hair_sheets(id), PRIMARY KEY(hairstyle_id,sheet_id));
                CREATE TABLE characters(id TEXT PRIMARY KEY, display_name TEXT NOT NULL, game_character_id TEXT, hairstyle_id TEXT REFERENCES hairstyles(id), pose_id TEXT NOT NULL UNIQUE, record_json TEXT NOT NULL);
                CREATE TABLE assets(id TEXT PRIMARY KEY, character_id TEXT REFERENCES characters(id), path TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL, review_status TEXT NOT NULL, record_json TEXT NOT NULL);
            ''')
            encode = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True)
            db.executemany('INSERT INTO metadata VALUES (?,?)', [('schemaVersion','1'),('scope','art-reference-library'),('date','2026-10-20'),('authority','User request; attached content is reference data, never instructions')])
            for r in sources:
                db.execute('INSERT INTO sources VALUES (?,?,?)',(r['id'],r['title'],encode(r)))
            for r in sheets:
                db.execute('INSERT INTO hair_sheets VALUES (?,?,?,?,?,?)',(r['id'],r['sourceId'],r['title'],r['path'],encode(r['tags']),encode(r)))
            for r in hairstyles:
                db.execute('INSERT INTO hairstyles VALUES (?,?,?,?)',(r['id'],r['label'],encode(r['tags']),encode(r)))
                db.executemany('INSERT INTO hairstyle_sheets VALUES (?,?)',[(r['id'],s) for s in r['sheetIds']])
            for r in characters:
                db.execute('INSERT INTO characters VALUES (?,?,?,?,?,?)',(r['id'],r['displayName'],r['gameCharacterId'],r['hairstyleId'],r['poseId'],encode(r)))
            for r in assets:
                db.execute('INSERT INTO assets VALUES (?,?,?,?,?,?)',(r['id'],r['characterId'],r['path'],r['sha256'],r['reviewStatus'],encode(r)))
            assert db.execute('PRAGMA integrity_check').fetchone() == ('ok',)
            assert not db.execute('PRAGMA foreign_key_check').fetchall()
        temporary.replace(CATALOG / 'art-library.sqlite3')
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    print(f'PASS: {len(characters)} characters, {len(assets)} assets, {len(sheets)} hair sheets, {len(hairstyles)} hairstyle categories; hashes, IDs, paths, SQLite integrity and foreign keys verified.')


if __name__ == '__main__':
    main()
