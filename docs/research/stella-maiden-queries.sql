-- Read-only queries for SQLite generated from research commit 16e64e5.
-- Use _row for foreign keys; preserve source rows and distinguish UI descriptions
-- from native-confirmed behavior. These are not finalized remake game rules.

SELECT name, row_count, field_count, schema_source
FROM _catalog
WHERE name IN ('CID','Skill','Gacha','EXP','BID','PID','Global','Global2','Galaxy','Wave');

SELECT table_name, field, name, confidence, consumer_pc, meaning
FROM _semantics
WHERE table_name IN ('CID','Gacha','EXP')
ORDER BY table_name, field;

SELECT _row, key, character_key, mode_code, flag_code,
       resource_1, resource_2, resource_3, resource_4, total_min, total_max
FROM gacha_recipes
WHERE character_key IN ('Sun','Earth','Mercury','Venus','Mars','Uranus','Moon')
ORDER BY _row;

SELECT cid_row, key, rarity, active_skill_id, skill_key,
       skill_name_en, skill_description_en
FROM characters_with_skill
WHERE key IN ('Earth','Mercury','Venus','Mars','Uranus','Moon')
ORDER BY cid_row;

SELECT _row, f00, f01 FROM EXP
WHERE f00 IN (1,19,20,39,40,99,100,110,119,120)
ORDER BY _row;

SELECT _row, key, en FROM localization
WHERE key IN ('Unlimit','LimitedGirlConfirm','EnergyCoreLimited',
              'EnergyCoreLimitedWithGirl','LimitMinLevel','PassiveExpHelp',
              'Crystal','Gas','Metal','Ether')
ORDER BY _row;

SELECT spawn_row,key,map_x,map_y,wave_row,slot,cid_row,character_key,count
FROM stage_roster
WHERE key IN ('SE1','SE2','SE3','SE15')
ORDER BY spawn_row,slot;
