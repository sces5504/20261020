> 0.7 世界／敵群已完成完整試玩發布驗收：[PR #15](https://github.com/sces5504/20261020/pull/15)、[本輪交接](../handoffs/original-world-20261022.md)、[世界契約](../design/original-world.md)、[106核心＋八組收據](../verification/original-world-0.7.json)。使用者單次特殊授權本世界chat補必要核心欄位與流程，其他AI先查交接避免競改。新增original:命名空間、CID成長、空守軍／啟動前置／基地／每日限時與三次額度、六人上限與恢復路徑。下段0.6為歷史起點；公開SHA依PR合併與version.json。

> 目前任務：[0.6技能／彈幕／工坊測試場整合](../handoffs/skill-engine-20261022.md)。使用者要求本次直接交付成品；缺原版實機部分已授權依wiki推定。契約[skill-engine-v6](../design/skill-engine-v6.md)，不要再為十人選近似M1技能。下段為上一輪整合歷史。

> 最新內容整合：[第二區與十人交接](../handoffs/frontier-solar10-integration-20261022.md)／PR #11。啟用beacon0.2.0、solar10 0.1.1與stellaart0.1.0，16角色／2區／4星球，核心仍0.5.0；根manifest呈現綁定與安全媒體複製由核心整合者維護。下方六人等為首個切片歷史。

# Galaxy Angel：後續 AI 擴充入口

最新產品契約：[0.5補給／隊形／跨區](../design/galaxy-angel-v5.md) → [0.4同調與連續遭遇](../design/galaxy-angel-v4.md) → [0.3航行與呈現](../design/galaxy-angel-v3.md) → [0.2經濟與探索](../design/exploration-v2.md) → [內容契約](../design/content-contract.md)。最新交接：[galaxy-angel-v5-20261021](../handoffs/galaxy-angel-v5-20261021.md)。先讀 AGENTS.md、記憶索引與本輪交接，再 fetch 核對 main／HEAD；從最新 main 建立自己的分支。**不再使用舊 m1/foundation 作整合入口**。不改 README，也不直接編輯生成檔。

M1 已可試玩並有可編輯工坊，商業品質尚未核准。後續可以逐批擴充既有能力的內容；真機／效能／玩家手感審閱與獨立 AI 接力演練仍待完成。防衛／失守／修復／訓練已取消。產品改名不更動 m1:core、原作研究資料與舊存檔ID。

| 分工 | 可直接提供的起始 prompt | 可改範圍 |
| --- | --- | --- |
| 核心整合（保留一位） | [01-core](01-core.md) | schema、domain、存檔、工坊能力、發布與整合 |
| 角色美術 | [02-character-art](02-character-art.md) | 指定角色新素材／美術資料庫／交接 |
| 角色／技能內容 | [03-characters](03-characters.md) | 自己的擴充包、角色簡報 |
| 地圖／敵人／Boss | [04-world](04-world.md) | 自己的世界擴充包、難度與收益表 |
| 劇情／任務 | [05-story](05-story.md) | 自己的故事擴充包、角色語氣與背景引用 |
| 造型／VFX／UI | [06-presentation](06-presentation.md) | 指定素材；呈現程式另授範圍 |
| 音效 | [07-audio](07-audio.md) | cue參數、音色樣本；音檔能力另交核心 |
| 獨立驗收 | [08-qa](08-qa.md) | 測試、證據與缺陷；平衡另分派 |

這是給後續各 chat 的分工，沒有自動啟動多個代理。建議先同時進行核心、指定角色美術、一個小內容包三路，避免多人競改共用檔。

## 每次分派都填這張任務卡

```
請依 docs/ai/<角色prompt>.md 工作，先讀 AGENTS.md 與最新交接。
起點：origin/main 的 <實際 SHA>；自己的分支：content/<任務名>。
任務：<具體角色／星球／故事及數量>，先交一個完整代表項再擴量。
包命名空間：<唯一前綴>；擴充檔：content/extensions/<任務名>.json。
依賴：m1:core@0.5.0（開工再核對實際 pack 版本）。
可改：<確切路徑>。共用 schema／引擎／根manifest／既有六張原圖不改。
品質：docs/art/style-guide.md、asset-contract.md、已整合代表畫面。
驗收：內容校驗、取得／觸發可達、桌機與手機預覽、引用／媒體／舊檔相容。
交付：小批 commit／PR、自己的 docs/handoffs/<任務>.md，附已知／推論／未知、素材hash、測試與限制。
```

## 內容與美術規則

- `src/content/schema.ts` 是執行契約；`content/core/pack.json`／`content/manifest.json` 僅核心整合者改。自己的 extension 使用自己命名空間的定義；requires 是**精確版本**，不是 semver 範圍。`comet.example.json` 是未啟用的可校驗範例。
- 擴充包只能新增定義，不能以載入順序覆寫基底。修改既有角色／星球的掉落、造型等需交整合變更單，或用工坊完整快照匯出，不能假稱 extension 自動覆寫。
- 現行0.6／0.7採封閉技能動作與18種普通彈型，226個來源技能／74效果家族／82個彈幕模板；精確欄位以schema與[skill-engine-v6](../design/skill-engine-v6.md)為準，不再只限aim／fan／ring。0.7世界支援CID成長、啟動前置、基地、每日排程／傷害目標，初始三人、最多六人；先讀[世界契約](../design/original-world.md)。需要新階段／部件／移動或勝負條件時交核心能力需求，不寫角色ID分支／eval、不假稱一個phaseAt可重建任意Boss。
- `domain/navigation.ts` 共用巡邏／守軍座標，`domain/formation.ts` 共用航跡跟隨；敵艦位置用模擬時間，不用 Date.now。前鋒／後衛由 team 順序決定，不依角色名字決定。
- 角色 portrait／avatar／sprite 分開；世界物件 sprite、劇情／星域 background 指向 assets。每項可見實體都交圖片及hash，工坊可預覽／替換；圖片不決定碰撞。新素材放自己命名空間，附媒體檔；**僅加入 assets 欄位不會自動複製新檔，需核心整合建置複製步驟**。工坊 ZIP 匯出則已含實檔。
- 六張 standard 原始PNG不可覆寫，映射05地球／04水星／01金星／03火星／02天王星／06月球。另有已授權的六張候選Q圖，不再沿用舊的全面禁止SD敘述。新增角色／造型依任務授權，以同角色單張標準圖為參考並先實際開圖；candidate 不自行改 approved。
- 原作未來角色表：`docs/art/future-characters.md/.csv`、網站 `#/catalog`；126召喚目標中120待做，含造型變體，不能當342名已證實可玩角色。研究先讀 research/stella-maiden/START_HERE.md，再局部SQL；未知原生公式不自行補作已知。

## 工坊與驗收流程

1. `#/studio` 查看／編輯自己的草稿；舊草稿不會被正式更新覆蓋，要新版預設圖片先備份，再按「從新版正式內容建立草稿」。
2. 改數值、技能、星級、取得方式、sprite／background引用；上傳PNG／JPEG／WebP後保存。
3. 套用 `#/test` 做隔離試玩，測試進度與 `#/play` 分開。
4. 匯出 ZIP 交整合者，或交 repo extension＋媒體＋交接。匯出不等於發布。
5. 核心校驗、適當流程測試、舊檔相容檢查後才啟用 manifest／部署。刪包先修復預覽與備份；不能自動丟棄舊收藏。

```bash
source scripts/env.sh
npm run content:check
npm run typecheck
npm test
npm run build
npm run test:exploration
```

完整發布：`python3 scripts/project.py check release`。`release:ready -- --target playtest` 是使用者授權的試玩門檻；預設 commercial 仍保留真機／品質未驗項，不能刪閘門或捏造通過。入口：`#/play`、`#/studio`、`#/test`、`#/art`、`#/catalog`。

0.5已提供星域航路選單與通用travel命令；regions.routes指定to／label／requires，雙向回程需明確配置。現有空測試第二星域可往返；新增星域仍須接上可達航線、驗前置／保存／返回。修改基底routes交唯一核心整合者，不以extension偷偷覆寫。
