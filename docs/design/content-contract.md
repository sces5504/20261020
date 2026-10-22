> 2026-10-22／0.6更新：[原作技能、彈幕與工坊測試場契約](skill-engine-v6.md) 為本次實際實作；原六人與新十人改用獨立原作技能程式，226技能／74家族／82彈幕模板。四資源、同調、面板暫停與0.5單波探索規則不變。下方舊版缺口以新版契約及最新交接為準。

> 最新0.5契約見[補給、隊形與星域往返](galaxy-angel-v5.md)：regions.routes＋travel已實作空第二區往返，工坊加入session入口鎖，掉頭先等隊長再跟。下方舊版未實作／單星域限制同名條目以0.5為準。

> 0.4更新：同名舊規則以 [星河戰姬最新契約](galaxy-angel-v4.md) 為準。五次手動同調／紫星、滿階依實際配方退25%四資源；航跡方向編隊、星球單波自動接敵及越界重置，取代固定+X／多波／手動解放。

# 資料與模組契約

狀態：0.5 規格提案。所有示意 JSON 為新設計，不是原作資料，不代表平衡定案，也不是可直接啟動的完整內容包。4.3.2 原始資料另外以有證據的 adapter 匯入，不套用範例推猜未知欄位。

0.5 同步：使用者已確認保留四資源，採配方預設、一鍵投入與批次管理；本頁兩資源範例僅作未來mod／遷移示意，不是本版方案。成長／融合消耗仍有未知。

| 配置位置 | 必須表達的已確認選擇 |
| --- | --- |
| CombatPolicy | 普攻自動、技能預設手動可切自動、移動／閃躲手動 |
| PausePolicy | 管理面板停止戰鬥／襲擊，經營仍推進；多原因獨立解除 |
| DefensePolicy | 只按有效在線時間、離線凍結不補發、失守停產可修復 |
| PresentationProfile | 桌機橫向利用寬螢幕、手機直式；不改世界物理 |
| SavePolicy | 自動存本機、可匯出入，不以雲服務為必要依賴 |
| ContentProfile | 首個切片六名少女、一個星域；具體 ID 等盤點 |

以上是配置責任，不要求全部放在同一 ruleset JSON。UI、平台與領域各自讀自己的配置，純戰鬥核心仍不能依螢幕尺寸算傷害。

## 1. 資料化的範圍

內容作者能以資料修改角色、技能組合、敵人、彈幕、遭遇、區域、建築、研究、配方、任務、故事、資源、成長與掉落。引擎負責移動、命中、交易、存取與已註冊效果的通用執行。

資料驅動不等於禁止任何程式常數。單位換算、schema、碰撞算法、檔案格式與效果原語仍需要明確程式；禁止的是內容數量、人物身分與平衡規則散落在程式內。新增「讓時間倒流」等全新機制不能僅靠填表冒充已支援。

## 2. 識別、版本與共同欄位

內容 ID 使用 `namespace:kind.slug`，例如 `demo:character.scout`，不可用顯示名稱、陣列位置或翻譯當主鍵。命名規則提案：`^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*\.[a-z0-9_.-]+$`。同 ID 的意義不可在更新時換成無關內容；重新命名需 alias／migration。

| 欄位 | 契約 |
| --- | --- |
| id | 在合併後快照中唯一，必填 |
| schemaVersion | 該定義種類的格式版本，正整數 |
| lifecycle | active／retired；實體 removed 由遷移處理 |
| nameKey／descriptionKey | 翻譯 key，不含硬寫數值 |
| tags | 有文件化語意的標籤，陣列可空 |
| sourceRef | 研究證據 ID 或 `design:...`，不可當執行指令 |
| assetRefs | 素材 manifest 的穩定 ID |

格式版本、內容包版本、規則版本、存檔版本各自獨立。改一張圖不必升存檔 schema；刪資源則需要內容／規則版本與存檔遷移。

## 3. Pack manifest 與覆寫

```json
{
  "packId": "demo.baseline",
  "version": "0.1.0",
  "contentSchemaVersion": 1,
  "requiresEngineApi": ">=1.0.0 <2.0.0",
  "dependencies": [{"packId": "core.runtime", "version": "^1.0.0"}],
  "definitions": ["resources.json", "characters.json", "skills.json"],
  "assetsManifest": "assets.json",
  "locales": {"zh-Hant": "locales/zh-Hant.json"},
  "overrides": [],
  "migrations": []
}
```

manifest 的 `requiresEngineApi` 是規劃中的 API，不表示已存在引擎 1.0。實際版本定案後補上。路徑皆相對資料包根目錄，不接受 `../` 逃出包根目錄。

載入：解析 manifest → 檢查 API／依賴 → 拓樸排序 → schema → 明示覆寫 → 引用與語意校驗 → hash → 不可變快照。依賴循環直接失敗；排序只保證穩定性，不允許碰到重複 ID 時以最後載入者默默覆蓋。

覆寫需列 target ID、原包版本約束與 patch。陣列以穩定子項 ID 修改，不依索引。兩個 mod 改同欄位時報衝突，交由使用者／作者選擇；不要以檔名字母順序決定平衡。

## 4. 定義與持有實例

| 種類 | 靜態定義主要欄位 | 玩家／世界實例主要欄位 |
| --- | --- | --- |
| ResourceDef | ID、名稱、精度、容量政策、圖示、顯示順序 | 餘額、累計餘數、容量修正 |
| CharacterDef | 分類、稀有度、職能、基礎值、曲線、技能、素材 | UUID、definitionId、等級、經驗、配點、生命、鎖定 |
| FormationDef | maxMembers、槽位置、適用加成、巡航政策 | 預設 ID、實例成員、位置與啟用狀態 |
| SkillDef | 目標、費用、冷卻、效果、動畫 cue、AI 提示 | 戰鬥中剩餘冷卻、充能與施放狀態 |
| ProjectileDef | 行為、速度、判定、生命期、效果、貼圖 | 位置、速度、來源、剩餘壽命與已命中集合 |
| EnemyDef | 基礎值、AI、武器、技能、首領階段、掉落 | entityId、血量、位置、目標與階段 |
| EncounterDef | 出生、波次、條件、勝負、時限、獎勵 | 發現／擊破、刷新、當次 checkpoint |
| RegionDef | 地圖、座標、節點、連線、解鎖 | 玩家位置、已發現／完成節點 |
| PlanetDef | 面積、起始電力、啟動費、資源、建築政策 | 領地、建築、派駐、襲擊、產能 |
| BuildingDef | 類型、等級、費用、面積／電力、效果、時間 | instanceId、level、工作／可用狀態 |
| ResearchDef | 前置、等級、成本、時間、解鎖／修正 | 已完成等級、當前工作 |
| SummonModeDef | 投入範圍、資格池、權重、時間、槽位 | 工作、已抽結果、預留容量、領取狀態 |
| QuestDef | 啟用條件、目標、進度、獎勵、重置 | 當期進度、完成、領取 receipt |
| StoryDef | 節點、對話、演出、條件、選項與命令 | 目前節點、已讀與選擇旗標 |
| Item／EquipmentDef | 效果、條件、堆疊、槽位、強化 | 數量、個體值、裝備者、等級 |
| RulesetDef | 時間、失敗、數值策略、經濟簡化、啟用系統 | save 鎖定版本，個別工作保存開工政策 |

實例引用定義，不複製整份技能與角色資料。任務、配方與動畫不持有彼此的 UI 物件。移除定義要走 lifecycle 與遷移，不能讓引用自然失效。

## 5. 單位、精度與能力計算

| 項目 | 內部契約 |
| --- | --- |
| 生命／傷害 | 整數，限制及捨入點由公式版本定義 |
| 時間 | 持久 job 用整數 epoch ms；戰鬥用整數 tick／換算 ms |
| 世界位置 | world units；相機再轉 CSS／render pixels |
| 移動／彈速 | world units／second |
| 射程／半徑 | world units，不使用貼圖尺寸 |
| 攻擊速度 | `attackIntervalMs > 0`，較低較快；顯示頻率為 1000／間隔 |
| 機率 | basis points，0～10000；不混用 0.2、20 與 2000 |
| 資源 | 精度由 ResourceDef 規範，持久以最小單位整數 |
| 隊形 | 局部世界偏移或正規化位置，須指定 coordinateSpace |

能力計算提案：基礎 → 等級曲線 → 永久配點 → 固定加成 → 加成百分比彙總 → 獨立乘區 → clamp → 指定捨入。修正項含來源、目標屬性、操作、值、疊層群與優先序。不同來源順序不靠載入時機；詳細頁能解釋每項來源。

增加全新能力欄位需要能力 registry、語意與顯示契約；不是任意拼字就自動生效。所有已知欄位都校驗 finite、範圍與單位。

## 6. 角色與技能示意

```json
{
  "id": "demo:character.scout",
  "schemaVersion": 1,
  "lifecycle": "active",
  "nameKey": "character.scout.name",
  "descriptionKey": "character.scout.description",
  "sourceRef": "design:example-only",
  "tags": ["ranged", "starter", "satellite"],
  "stellarClass": "satellite",
  "rarity": 2,
  "roles": ["skirmisher"],
  "baseStats": {
    "maxHp": 150,
    "attack": 20,
    "attackIntervalMs": 800,
    "defense": 3,
    "criticalBps": 500,
    "evasionBps": 300,
    "projectileSpeed": 180,
    "range": 220,
    "moveSpeed": 80
  },
  "growthCurveId": "demo:curve.scout_growth",
  "weaponId": "demo:weapon.scout_cannon",
  "skillIds": ["demo:skill.star_burst"],
  "assetRefs": {
    "portrait": "demo:asset.scout_portrait",
    "icon": "demo:asset.scout_icon",
    "combat": "demo:asset.scout_sd"
  }
}
```

```json
{
  "id": "demo:skill.star_burst",
  "schemaVersion": 1,
  "lifecycle": "active",
  "nameKey": "skill.star_burst.name",
  "descriptionKey": "skill.star_burst.description",
  "cooldownMs": 12000,
  "targeting": {"selector": "priority_enemy", "fallback": "nearest_enemy", "range": 260},
  "effects": [
    {
      "type": "emit_projectiles",
      "projectileId": "demo:projectile.light_shot",
      "pattern": {"type": "fan", "count": 5, "arcDegrees": 40},
      "payload": {
        "type": "damage",
        "amount": {"op": "mul", "args": [{"stat": "source.attack"}, {"const": 1.5}]},
        "damageType": "energy"
      }
    }
  ],
  "presentationCueId": "demo:cue.star_burst"
}
```

技能原語 registry 首批提案：damage、heal、shield、apply_status、remove_status、emit_projectiles、dash、spawn_unit、modify_resource（僅授權領域命令使用）。原語有各自參數 schema；傷害與資源效果不能無條件跨領域呼叫。

目標選擇器有敵我、範圍、數量上限、排序與失效回退；禁止沒有邊界的全場遞迴查詢。表達式採有限 AST：常數、屬性、加減乘除、min／max／clamp、條件；不 `eval` 字串、不讀檔／網路、不允許任意函式。除零、循環、深度與執行預算有上限。

狀態效果需指定 `stackPolicy`（replace／refresh／add）、maxStacks、持續時間、tick 間隔、解除與免疫標籤。連鎖觸發要有限深度與「每事件／每 tick」上限，避免反傷互相觸發無限循環。

技能說明模板讀同份係數與冷卻，例如 `{damageMultiplier}`、`{cooldownSeconds}`，不得手寫「12 秒」後只改實戰資料。

## 7. 事件條件與前置

統一可序列化條件：`all`、`any`、`not`、`flag`、`count`、`resourceAtLeast`、`researchLevelAtLeast`、`regionCleared` 等。每個條件有可展示的 unmet reason。條件可供解鎖、任務、建築與召喚使用，但不能直接修改狀態。

任務進度使用事件 ID 去重、target selector 與計數策略；「擊破任意敵人十次」和「擊破十個不同據點」需不同策略。首通、當期任務與永久達成分開。故事旗標有 namespace，不互相覆蓋。

## 8. 資源與配方

`ResourceAmountMap` 為 `resourceId -> integer amount`，不是固定四欄或按索引陣列。角色 UI、費用、領獎、容量、格式化與不足提示都讀 registry 與 map。

以下僅是可變維度的兩資源mod示意。正式基準已選四資源；不將此例載入正式內容包：

```json
{
  "resources": [
    {"id": "demo:resource.material", "nameKey": "resource.material", "precision": 0, "displayOrder": 10},
    {"id": "demo:resource.energy", "nameKey": "resource.energy", "precision": 0, "displayOrder": 20}
  ],
  "recipe": {
    "id": "demo:recipe.light_focus",
    "modeId": "demo:summon.standard",
    "inputRanges": {
      "demo:resource.material": {"min": 100, "max": 600},
      "demo:resource.energy": {"min": 100, "max": 600}
    },
    "eligibility": {"tagsAny": ["satellite", "planet"], "rarities": [1, 2, 3]},
    "rarityWeights": {"1": 60, "2": 30, "3": 10},
    "durationMs": 60000,
    "emptyPoolPolicy": "reject"
  }
}
```

這裡的資格標籤須在候選角色明確建立；分類欄位不自動視為 tag。範例角色已明列 satellite tag，也可改用明示分類 selector；校驗應抓到空池，不能猜測作者意思。此片段沒有列全候選角色，因此不是完整可抽取資料包。

抽取演算法提案：先依投入與解鎖算候選 → 依可用候選稀有度形成有效權重 → 依選定稀有度的角色權重抽取。缺候選的稀有度應依 mode 定義 reject／明示重新正規化；未定義即拒絕載入。保底若納入需獨立 pity 狀態、更新時點與重複政策。

此一般權重池提案不是 4.3.2 原生算法。原生策略先取距離列表前5／特定前10，再做稀有度與名次權重分支；不得以一般池的先篩全池方式替代。ModeDef 應有 `strategyId` 與相對應 schema，策略版本分開。原始 Gacha 的 f10..f14 未賦義，保留原值，不接到 `rarityWeights` 或角色權重。

抽選結果、使用亂數、投入與所用池版本在開始召喚時保存。工作完成後只有 claim，不再次抽取。正在執行的工作保存開工時成本與產物承諾，更新不能任意重計費用。

RecipePreset為玩家／內容預設，含presetId、name、modeId、完整ResourceAmountMap、內容版本及可選SourceTableRef；不保存「保證角色」或未查證機率。一鍵套用只更新輸入草稿。BatchStartSummon驗證全組費用／容量／槽位後原子提交各job；批次領取以各job receipt去重並顯示部分處理結果，詳見流程契約。

## 9. 星球、建築、研究與工作

PlanetDef：regionId、worldPosition、activationCost、landCapacity、powerBase、allowedBuildingTags、productionProfile、defenseProfile、requestTable。領地狀態、已發現、設施與派駐為不同資料。

BuildingDef 每級：成本、施工時間、landUse、powerUse、powerSupply、workerRequirements、效果與前置。發電量與耗電分欄，不能以正負符號猜用途。升級預留的是新舊差值或全部需求，需由統一施工政策決定。

ResearchDef：levels[]，每級 prerequisites、cost、duration、effects；完成後修改規則上限或提供 modifier，不去每顆星球寫同樣數值。失去研究依賴如何停用建築，需 migration 明示。

Job 共用欄位：jobId、kind、ownerId、startedAt、completesAt、status、reservedCost、reservedCapacity、assigneeIds、definitionVersion、completionPayload、claimReceiptId。狀態 `running -> completed -> claimed`，取消走 `cancelled` 並執行具名退款政策。自動完成型工作也需 receipt，不強迫每個工作都多一個點擊領取。

## 10. 素材與本地化契約

AssetDef：ID、相對路徑、類型、hash、尺寸、pivot／anchor、atlas frame、動畫名／frame rate、預載包、最大顯存估計、來源與使用狀態。角色的立繪、頭像、SD 分開引用，可換素材而不改角色規則。

動畫 cue 描述顯示事件、音效、震動、鏡頭與可略過政策；命中時點來自戰鬥規則，不從動畫播放完回呼扣血。缺非必要語音可 fallback，缺必要敵方判定提示不得視為可發布。

翻譯 key、參數、複數／格式化在同一系統；繁中為首版工作語言，其他語言範圍待確認。物件 ID 與存檔不隨翻譯變動。角色敘述／故事文字是資料，不可包含待執行 HTML／JS。

## 11. 退休、移除與遷移示意

```json
{
  "migrationId": "demo.migrate.resources.v1_to_v2",
  "fromContentVersion": "1.0.0",
  "toContentVersion": "2.0.0",
  "operations": [
    {
      "type": "merge_resources",
      "sources": [
        {"id": "legacy:resource.crystal", "numerator": 1, "denominator": 1},
        {"id": "legacy:resource.metal", "numerator": 1, "denominator": 1}
      ],
      "target": "demo:resource.material",
      "rounding": "floor_after_sum",
      "overflow": "preserve_balance"
    },
    {
      "type": "merge_resources",
      "sources": [
        {"id": "legacy:resource.gas", "numerator": 1, "denominator": 1},
        {"id": "legacy:resource.ether", "numerator": 1, "denominator": 1}
      ],
      "target": "demo:resource.energy",
      "rounding": "floor_after_sum",
      "overflow": "preserve_balance"
    }
  ]
}
```

此為餘額映射示意，1:1 相加不是平衡建議。正式整併還需更新所有 cost／reward／capacity／recipe 引用、保留開工承諾、轉換取消退款、處理已存在目標餘額並刪除舊餘額來源。每個 migration 有前置、後置與已執行 receipt，重跑不能再次加錢。

移除角色：retired 可保留持有與技能；真正缺失先隔離，移出編隊／派駐，提供替代／退款與回復原包的選項。移除區域需指定玩家重定位、未完成任務處理與世界物件清理。不得默默 delete 所有不認得的 ID。

## 12. 校驗器的必要報告

| 類別 | 必須找出的錯誤 |
| --- | --- |
| 結構 | 未知欄位、型別、缺必填、負成本、零間隔、NaN、機率越界 |
| 身分 | 重複 ID、非法 namespace、無約束覆寫 |
| 引用 | 缺角色／技能／素材／翻譯／資源／區域 |
| 圖 | 依賴循環、不可達主線、無出口劇情、無法滿足的研究前置 |
| 行為 | 未註冊原語、無效目標、無界觸發、錯誤單位 |
| 經濟 | 空配方池、總權重零、無來源必需資源、開局無法啟動第一循環 |
| 遷移 | 缺版本鏈、重複 migration ID、未處理刪除與進行中工作 |
| 發布 | 必要素材缺失、使用狀態未定、主線缺翻譯、未解決衝突 |

錯誤報告含檔案、JSON path、ID、原因、引用來源與可修復方向。作者可在開發預覽用 placeholder；正式發布時必要項目必須阻擋。

## 13. 4.3.2 原始層與正規化匯入

每個來源引用含 `sourceBuild`、`table`、`row`、`sourceHash` 與研究證據，保留原 `_offset`／`_field_offsets` 供查核。正規化 ID 如 `stella432:character.earth` 透過匯入映射連回 CID[2]；角色中文名稱與排序不能改變來源引用。

| 來源特性 | 匯入契約 |
| --- | --- |
| `_row` 為外鍵 | 不把所有 f01 視為主鍵；保留 row0／占位的來源位置 |
| Gacha key 可有後綴 | `Sun2` 仍透過 f01 指到角色，不以配方 key 推人物 |
| EventSpot.f04／Goto label | 用 EventLabel 型別，取 EventScript.f01 第一個匹配列 |
| bXML 同名子節點 | children 保留有序 list，不壓成名稱唯一 dictionary |
| CID 暴擊／迴避百分率 | 與 getter 千分率、RNG 門檻分開；正規化 bps 不代表原生抽樣可以換模數 |
| Q16／signed 位寬 | 原生比對策略保留步驟與取整，不以浮點一次取整替代 |
| 等級函式支援150 | 與升級流程120上限分欄，不以函式 clamp 當玩家可達上限 |
| 未知 fNN | 保存原名／值與 unknown；不能當成已知成本、權重或職業 |

來源 archive 不直接成為發布內容。先明確選定切片角色、星域與必要資產／行為，再產正規化資料包；資料結構校驗、語意覆蓋、素材齊備與遊玩驗收分別記錄。

## 14. 內容編輯器契約（0.6新增）

使用者已要求可瀏覽／編輯的額外網頁。可編輯欄位由共用schema補充labelKey、unit、group、範圍、唯讀來源與關聯選擇器等宣告；表單與runtime不能各自定義同名欄位的不同意義。schema註解不是任意可執行腳本。

EditorProject包含projectId、baseContentLock、revision、overrides、新definitions、asset blobs／manifest、操作歷史與校驗結果，獨立於PlayerSave。預覽產生不可變快照及測試存檔，匯出包含媒體實檔。實際包格式／schema版本在工具實作時定案。

CharacterDef基礎rarity與角色實例level／tier分開；數值表單改基礎／曲線，最終值由共用計算預覽。Acquisition來源以typed relation表示召喚／掉落／任務／商店，不用無法影響遊戲的文字標籤替代。

編輯器更改資料仍走ID、引用、空池、效果支援、素材、前置及遷移校驗。原始SourceTableRef、未知fNN與研究hash唯讀；作者修改是有來源的override，不重寫研究包。完整範圍與ED驗收見 [內容編輯器](content-editor.md)。

## 15. M1 已落地的契約（2026-10-21）

上述完整設計保留為後續目標；當前可執行定義以 `src/content/schema.ts` 為準，避免 AI 依理想 schema 直接寫入 runtime 未支援欄位。

- `Pack` 為完整平坦快照；擴充包透過 `definitions` 新增具命名空間的實體，禁止覆寫既有 ID。`content/generated/runtime.json` 為產物。工坊 `Project` 實際為 `{schemaVersion:1,revision,pack,past,future}`，不是已實作任意 overrides 或 script 系統。
- `characters[].summonable` 省略時視為 true；與 starter、planets[].dropCharacters、quests[].character 共同定義實際取得來源。工坊關聯勾選會原子修改這些來源，沒有只改顯示字串。
- `audio[]` 預設空陣列，各 cue 包含共用來源／狀態欄位、category（ui/shot/hit/skill/victory/defeat/arrival/alert）、waveform（sine/triangle/sawtooth/square）、startHz/endHz、seconds、gain、noise。這是 WebAudio 程序配方；不等同可播放任意音訊檔。新音訊能力先交核心擴充。
- `rules.trainingSeconds` 預設30、`rules.raidWarningSeconds` 預設45，可在工坊調整。視覺及音效不決定碰撞／傷害時序。
- 存檔仍為 schemaVersion1，加欄位都有預設。contentHash 是 canonical JSON SHA256；缺定義的 held characters／wallet／colonies／jobs 先隔離保留，缺依賴工作取消並退款一次。領地／資源隔離帳本不自行推導跨資源交換率。恢復角色內容時提供恢復預覽。沒有通用 migration DSL，未來 schema 保持拒絕。
- 媒體匯出／測試／匯入會檢查 SHA256、尺寸、可解碼性與大小。原六圖 build 按 manifest 驗證後複製原位元組。主檔保持不變；顯示頭像視窗不建立新的改圖檔。

當前能力的驗收與限制見 [M1 試玩驗收](m1-acceptance.md)。新增內容作者先交一個小包，核心負責 schema、存檔、通用行為與 manifest；不要在內容包放 JavaScript 或角色 ID 分支。


## 16. 探索版0.2可執行增量

使用者直接取消防衛／訓練。`raidSeconds`／`trainingSeconds` 等舊欄位保留解碼相容，runtime不再讀它們執行玩法，不能新增防衛事件。領地舊lost載入即恢復。

- `planets[].enemies` 第一波、`waves` 後續波次陣列，`waveDelay` 增援秒數；所有enemy引用共用校驗。
- `regions[].discoveryRadius` 掃描距離；`patrols[]` 包含命名空間id、x/y、enemies、reward、respawnSeconds。巡邏不寫星球clear／首次掉落。`encounter.kind` 省略時仍為舊星球戰，新增patrol型。
- save新增`discovered`／`storySeen`／`acquisitionQueue`／`voyageSeconds`／`patrolCooldowns`，皆有預設；取得佇列用持有實例ID，確認才移除。`voyageSeconds`只在有效前景模擬前進，非牆鐘離線攻擊。
- `quests.condition="intro"` 為序章；其餘條件仍由舊命令驗證。dialogue每句speaker可用角色名／ID對應立繪，未對應則用通訊訊號，不推測出不存在的人物圖。
- 工坊已有完整快照及新波次／巡邏JSON欄位，舊草稿保留不暗合併。使用「從新版正式內容建立草稿」會先保留復原歷史，再切換新版基底。

詳細已確認需求見 [探索版0.2](exploration-v2.md)。

## 17. Galaxy Angel 0.3 執行增量

現行原始契約仍為schemaVersion1，新增欄位皆有預設，不更動舊存檔ID。精確欄位／範圍／站位行為見 [0.3契約](galaxy-angel-v3.md)：region的sprite／background、building／research的sprite、quest的background、patrol的detectionRadius／patrolRadius／patrolSpeed／phase，以及rules的隊距／顯示尺寸。所有非空圖片引用均檢查assets存在；巡邏路線完整在星域範圍內。只用畫面縮放改大小，不改碰撞。

擴充requires為精確版本；目前core 0.3.0，comet.example.json已有實際assemble測試，未自動啟用。新媒體須交實檔與來源／hash，整合者接入build複製與完整性檢查；原六圖、Q圖、世界圖分別由各manifest驗證。工坊完整ZIP包括WebP bytes，可離開原機器匯入；不准依賴本機路徑／objectURL。現行25MiB壓縮／60MiB總解壓預算不放寬。

## 2026-10-22 跨包美術整合

根 `content/manifest.json` 由唯一核心整合者維護：`regionPresentation` 可明確指定已存在區域的 `region/name/description/sprite/background`；`characterPresentation` 以 `character` 指向已存在角色，綁定 `portrait/avatar/sprite`。所有綁定在擴充包新增完成後做嚴格 schema 與最終引用校驗，未知欄位、重複／缺目標、缺圖一律拒絕。這不是 extension override、戰力覆寫或 migration DSL；獨立核心包仍可單獨組裝。

本輪啟用 `beacon:package.frontier@0.2.0`、`solar10:package.first-ten@0.1.1`、`stellaart:package.stellar10@0.1.0`，核心維持 `m1:core@0.5.0`。solar10 0.1.1 只移除過期缺圖文字，數值與取得配方不改；美術包精確依賴 solar10 0.1.1。原作者美術表與原圖保留，runtime 綁定在根manifest與獨立 art extension，不改素材身分。

`art/catalog/extension-assets.json` 明列來源、runtime路徑、主檔／輸出SHA；建置只容許 art 來源和 public/assets/extensions 輸出，校驗快照中的src／hash，再複製原位元組。該目錄為忽略產物，非手改內容。角色 avatar 與 portrait 引用不同時，視為獨立頭像構圖；同圖重用才沿用舊版面部放大框。

工坊 ZIP 以實際 bytes 的SHA去重（不信任宣告hash來決定合併），使用短的封裝相對路徑；包格式與舊 ZIP 匯入仍相容，所有媒體原位元組不變。維持25MiB壓縮／60MiB解壓限制，不以放寬上限通過新增素材。試玩允許候選三種角色圖，commercial仍需approved與既有品質／真機門檻，候選metadata不自動升格。version.json記錄精確包清單與有效內容fingerprint。

## 2026-10-22 世界內容 0.7 增量

本輪世界作者獲使用者單次特殊授權補必要共用欄位／流程，見 [交接](../handoffs/original-world-20261022.md)；不是其他擴充作者可任意覆寫共享核心的長期授權。核心0.7.0，schemaVersion仍1，舊ID／資料有預設。詳細來源、適配及數值見 [完整世界契約](original-world.md)。

- enemies.growthReference={attack,defense,hp}、group.level（1～150）支援來源CID成長；未填沿用既有直接數值。原生HP須保留兩次截斷，不能先浮點算完。sourceRef明示引用／推定，不能用provenance掩蓋缺口。
- planets.kind=planet/stronghold/camp/event/dailyBoss/gate；非planet不得有啟動費／產量或建造領地。enemies可空，須initiallyCleared或camp；initiallyCleared不發首勝、不灌入歷史領獎憑據。
- requires沿用清除前置；requiresActive必須指生產星球。兩種依賴一起驗循環。hiddenUntilUnlocked控制呈現／選取／發現；UI線條不代替資料。
- encounterPolicy=auto/manual；手動挑戰須到入口，日程未開或額度用完不能進場。timeLimitSeconds（最多3600）、objective=eliminate/damage，damage僅允許限時dailyBoss。普通星球仍單波自動接敵／越界重置。
- schedule={weekdays[0..6],utcOffsetMinutes,resetHour,attemptLimit}；星期0週日，預設KST／0點／3次。額度以region共用；存檔dailyAttempts[region]={period,count}、dailyClaims[node]=ISO日期，舊檔預設空。進場記日期與次數、跨換日結果歸進場日、同日不重領／回退時鐘不增領。
- regions.campaignStart供設定選擇新航跡起點；rules.startRegion可供新存檔入口，未設沿用原起始區。不刪m1:frontier-test或偷偷搬動既有進度。
- 根manifest.regionRoutes只能在擴充組裝後新增明示region/routes連結，嚴格引用與重複目標校驗；extension仍不可覆寫基底。安全回程須實際配置，獨立core仍能單獨校驗。
- 本輪不改0.6既有可攜ZIP預算（64MiB壓縮／128MiB解壓／30MiB單檔），候選美術可試玩，commercial原門檻保留。

完整世界將rules.teamSize由M1三人上限升至6，沿用原有編隊／技能鍵1～6／航跡功能，不新增另一套隊伍模型。新存檔仍只取得三位起始少女；後期收集後可編成六人，來源Global CubePartySlot4/5/6與適配界線見world-constants.json。
