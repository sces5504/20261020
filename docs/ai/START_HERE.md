# 後續 AI 的工作入口

使用者已要求開始 M1，並準備後續各 AI 起始 prompt。此頁的「角色」是分工安排，沒有自動啟動多個代理。M1 尚在製作，較小美術附件已匯入，六張原圖保持原樣；使用者停止 SD 重繪，依使用者新要求已套用原先M1六角色；不要把程式骨架當成完整商業品質版本。

先讀 repo 的 AGENTS.md、記憶索引及目前交接；進行中的實作在 `m1/foundation`，合併前不要只以 main 的規格檔推測已有程式。由整合者告知已整合的起點 commit，再建立自己的分支／worktree。不要盲目 reset、覆蓋未提交工作或改 README。

| 順序／角色 | 起始 prompt | 可改範圍 | 何時可開始 |
| --- | --- | --- | --- |
| 0 核心整合 | [01-core](01-core.md) | src、工具、契約、存檔與整合清單 | 持續保留一位負責人 |
| 1 角色美術維護 | [02-character-art](02-character-art.md) | 個別角色素材與美術資料庫／自己的交接 | 原圖維護可做；重新生成須有使用者新的具體要求 |
| 2 角色／技能內容 | [03-characters](03-characters.md) | 自己的 content/extensions 包 | 代表角色／能力清單穩定後 |
| 3 地圖／敵人／Boss | [04-world](04-world.md) | 自己的區域／敵人包及交接 | 世界與敵群契約穩定後 |
| 4 劇情／任務 | [05-story](05-story.md) | 自己的故事包與詞彙提案 | 核定世界觀與角色設定後 |
| 5 造型／VFX／UI | [06-presentation](06-presentation.md) | 自己的素材包；程式呈現改動單獨分派 | 核定代表畫面與角色基準後 |
| 6 音效 | [07-audio](07-audio.md) | 自己的音效檔／cue 規格 | 核定聲音樣本與可用工具後 |
| 7 獨立驗收／平衡 | [08-qa](08-qa.md) | 測試、證據與缺陷報告；平衡另分派 | 每個可執行整合版本 |

起始 prompt 檔可直接交給另一個 chat。每個任務還須由整合者附上：起點 commit、任務包命名空間、角色／區域與數量、可改路徑、依賴版本、品質樣本、驗收範圍。未提供時先查 repo 可確定的項目，剩餘列待定，不自行擴大工作。

初期建議同時跑整合、角色美術、單一內容包三路；劇情與音效可排在品質樣本後。不需要一次開八個 chat。

最新美術要求優先：保留六張原圖，不採用本輪 SD 重繪；映射已依使用者明確指定套用：05 地球、04 水星、01 金星、03 火星、02 天王星、06 月球。`#/art` 展示未改動的六張標準圖。

## 現在已存在的工具

```bash
npm ci --ignore-scripts
npm run content:check
npm run typecheck
npm test
npm run dev
```

建置後瀏覽器驗證（先依 repo 工具安裝說明準備 Chromium）：

```bash
npm run build
source scripts/env.sh
npm run test:e2e
```

`npm run release:ready` 是完整 M1 發布門檻，缺必要素材／品質證據時應失敗。不能刪閘門讓未完成版本上線。遊戲 `#/play`、工坊 `#/studio`、隔離試玩 `#/test`。

## 內容協作規則

- 基底 `content/core/pack.json` 由整合者維護；各 AI 建立自己的 `content/extensions/<task>.json`。參考 `comet.example.json`，它目前未啟用。
- 每包宣告 id、版本、requires 及 definitions；定義只能使用所屬命名空間。整合者統一更新 `content/manifest.json`。不編輯 `content/generated/runtime.json`，它由工具生成。
- 現行套件是新增定義的擴充，不支援暗中覆寫基底。調整既有內容透過工坊完整快照匯出，或明確分派整合變更；不要靠載入順序覆蓋。
- `src/content/schema.ts` 是型別／語意校驗來源；`src/domain` 不得 import Phaser、DOM 或 IndexedDB。
- 目前已註冊技能：shield、barrage、fortify、turret、accelerate、weaken、heal；敵彈 aim、fan、ring。這些是 M1 原語，並非完整原作效果。
- 未知技能／融合／原生抽選分支保持未知；現行配方為 M1 四維 L1 前五名＋名次權重示範，不能標成完整原生召喚。
- 作者草稿、測試進度、正式進度分開。匯出 ZIP 不等於發布；內容包移除造成舊檔缺引用時，目前拒絕載入並保留原檔，尚無自動退款／重定位遷移器。
