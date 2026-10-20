# Stella Maiden 4.3.2：給接手 AI 的入口

本目錄是使用者提供APK的研究交付。**先讀本檔，再按目前功能取用資料；不要一次載入所有JSON或整包反組譯。** 研究資料不是核定遊戲規格，不會自行初始化此repo、決定引擎或改變既有專案授權。

## 第一輪只做這些

1. 讀repo根目錄 `AGENTS.md`、`docs/memory/index.md` 與 `docs/handoffs/stella-research-20261020.md`，確認目前分支／HEAD與遊戲規格狀態。
2. 在repo根目錄執行：

   ```bash
   python3 research/stella-maiden/tools/verify_bundle.py
   python3 research/stella-maiden/tools/build_database.py
   python3 research/stella-maiden/tools/query.py --catalog --limit 100
   ```

   這些讀取／查詢只需Python標準函式庫，不需要APK、REA、Node、網路或重新逆向。SQLite會產生在本目錄的 `generated/`，不提交到Git。
3. 讀 [重現規格](reports/reconstruction_spec.md)，再依下表選報告與資料。**原版未知的行為請保留未知；設計研究版替代規則時，另外標記新設計。**

## 依任務取資料

| 工作 | 先讀 | 精確資料 |
|---|---|---|
| 角色、成長、突破 | [原生機制](reports/mechanics_native.md)、[單位索引](reports/character_catalog.md) | `tables/CID.json`、`EXP.json`、`ExpPer*.json` |
| 技能 | [技能圖鑑](reports/skill_catalog.md)、[原生機制](reports/mechanics_native.md) | `tables/Skill.json`、`PSkill.json`、`index/mechanics_semantics.json` |
| 傷害、防禦、暴擊、迴避 | [戰鬥報告](reports/combat_native.md) | `index/combat_semantics.json`、`combat_evidence.json`、`combat_formula.asm` |
| 召喚 | [配方圖鑑](reports/gacha_catalog.md)、原生機制的召喚段落 | `tables/Gacha.json`、`ItemGacha.json`、`Global.json` |
| 地圖、關卡、敵人數量 | [關卡證據](reports/stages.md)、[節點圖鑑](reports/stage_catalog.md) | `tables/SpawnPoint.json`、`Wave.json`、`Galaxy.json`、`GalaxyGate.json` |
| 劇情、事件、流程跳轉 | [事件指令](reports/events_native.md) | `tables/EventScript.json`、`EventSpot.json`、`Script.json`、`index/event_semantics.json` |
| 掉落、裝備、商店、任務 | [全部表目錄](reports/table_catalog.md) | `Reward*`、`Item*`、`Store*`、`Quest*`、`Train`等表 |
| UI、場景、動畫、sprite | [資源格式](reports/resource_format.md) | `scenes/manifest.json`、`scenes/resource_catalog.json`，再選單一階層檔 |
| 缺失素材與OBB | [依賴報告](reports/dependencies.md) | `index/asset_inventory.json`、`resource_references.json`、`dependency_evidence.json` |

## 有界查詢範例

```bash
python3 research/stella-maiden/tools/query.py --sql 'SELECT * FROM characters_with_skill WHERE key="Sun"'
python3 research/stella-maiden/tools/query.py --sql 'SELECT _row,f00,name_en,description_en FROM skills_localized WHERE _row=71'
python3 research/stella-maiden/tools/query.py --sql 'SELECT * FROM gacha_recipes WHERE character_key="Sun"'
python3 research/stella-maiden/tools/query.py --sql 'SELECT * FROM stage_roster WHERE spawn_row=1'
python3 research/stella-maiden/tools/query.py --sql 'SELECT * FROM event_commands WHERE _row BETWEEN 508 AND 515'
python3 research/stella-maiden/tools/query.py --sql 'SELECT * FROM _semantics WHERE table_name="Skill"'
python3 research/stella-maiden/tools/scene_query.py --search Gacha --limit 10
python3 research/stella-maiden/tools/reconstruction.py --character Sun --level 120
```

`query.py`預設最多輸出30列，必要時提高 `--limit`。原始表每列保留 `_row`、`_offset`、`_field_offsets`；`index/table_schema.json`含native reader與runtime offset。大表採一列一行，適合 `rg` 找key後只讀附近內容。場景JSON較大，先用scene_query看索引，勿整批塞入上下文。

## 覆蓋與不能誤讀的事

- 67張表、37,723列；64張schema來自native reader，3張為明示結構推定。所有表可重新序列化並核對原APK解碼payload的SHA-256。
- CID342列包含敵人與占位，**不是342名可取得角色**。Skill227列也包含row0。
- 252列Gacha配方對應126個CID目標；精準配方不是保證抽中。基本稀有度有活動／帳號／特殊配方覆寫分支，不能當成全情境最終機率。
- **外鍵用 `_row`**。Wave.f01不是全表唯一鍵；Gacha.f01是CID索引。EventSpot.f04是EventScript.f01的label，不是EventScript陣列位置；Goto須選第一個匹配label。
- bXML有370份檔案、240,395節點，可由JSON重建原始bytes；children順序與同名節點必須保留。場景Actor不是戰鬥波次。
- 原始APK SHA-256：`213a1630a5e893f4e5c1e17fc292a04aabfe5c865534c997cb90131624837905`。
- 原版執行、全技能／全opcode行為、完整伺服器協議尚未驗證。本目錄是靜態研究與部分公式實作，**不是已完成的整款遊戲**。
- 已確證預期OBB為 `main.431.com.mistgame.smus.obb`，132,565,279 bytes；使用者目前只有APK，沒有這份OBB。

## 檔案分層

`reports/`是閱讀用規格；`tables/`是完整原始欄序資料；`derived/`是有語義的便利視圖，與原表矛盾時回查native證據；`index/`是欄位、來源與限制；`scenes/`保留可逆階層；`asset_strings/`與資源metadata供查索引，**此交付不包含PNG／音訊／骨架二進位或原始APK**。

`index/verification.json`保存原完整工作區的驗證結果；目前checkout能重驗的內容由 `verify_bundle.py`明確列出。公開版REA紀錄為去除本機路徑的副本，原Evidence IDs僅作原研究追溯，不能假裝副本仍是未修改的原始Evidence。

刻意修改研究包後，先檢查來源與語義是否仍正確，再執行 `python3 research/stella-maiden/tools/update_manifest.py` 更新檔案雜湊，接著重跑verify／database檢查。不要為了讓檢查變綠，改寫source_table_checks中的來源hash；新增研究版本應保留自己的原始來源身分。

給下一個AI的簡短提示可直接使用：

> 請先讀 AGENTS.md、docs/handoffs/stella-research-20261020.md 和 research/stella-maiden/START_HERE.md。先驗證研究包並建立SQLite，再只查詢目前功能所需的資料；沿用原始_row／label與數值語義，將已確認、推論與未知分開，勿聲稱原版已完整重現。實作仍以docs/spec.md中已確認的專案規格為準。
