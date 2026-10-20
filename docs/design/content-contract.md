# 資料與模組契約

狀態：0.1 規格提案。所有範例為本案示意，不是擷取到的原作資料，不代表平衡定案。以下 JSON 是片段，不是可以直接啟動的完整遊戲內容包。

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

示意兩資源方案，仍待使用者決策：

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

抽選結果、使用亂數、投入與所用池版本在開始召喚時保存。工作完成後只有 claim，不再次抽取。正在執行的工作保存開工時成本與產物承諾，更新不能任意重計費用。

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
