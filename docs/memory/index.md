# 接力索引

專案狀態（2026-10-21）：M1 已發布（PR #3）；使用者16項回饋已實作為0.2探索版，23項核心測試和三組瀏覽器流程通過。整合PR #4（polish/exploration-v2），main為發布分支；發布結果見最新交接／PR／version.json。六張原圖已匯入並保持原樣；原批 SD 重繪停止；2026-10-21新的直接要求已授權另外生成六張Q版戰鬥圖，原立繪不動。較新要求已依使用者明確對應套用六角色；完整 M1／商業品質尚未驗收。

- Stella Maiden研究入口：`research/stella-maiden/START_HERE.md`；資料交付接力：`docs/handoffs/stella-research-20261020.md`。先按導覽查局部資料，不需重新逆向或一次載入全部JSON。
- M1 實作：`docs/design/m1-implementation.md`；後續 AI 起始 prompts：`docs/ai/START_HERE.md`
- 六張原圖／美術庫：`docs/art/character-standards.md`、`hairstyle-library.md`；映射見content/core/art-bindings.json
- 已確認規格：`docs/spec.md`
- 原作研究／證據：`docs/research/stella-maiden.md`
- 4.3.2接入／簡化分析：`docs/research/apk-spec-integration.md`；有界SQL：`docs/research/stella-maiden-queries.sql`
- 架構／資料契約／驗收：`docs/design/architecture.md`、`content-contract.md`、`production-plan.md`
- 玩家流程與交界：`docs/design/interaction-flows.md`
- AI 分工／M1 接力：`docs/design/ai-collaboration.md`
- 內容管理／編輯器：`docs/design/content-editor.md`
- 使用者要求與偏好：`docs/memory/owner-preferences.md`
- 決策：`docs/memory/decisions.md`
- 美術：`docs/art/style-guide.md`、`docs/art/asset-contract.md`
- 任務紀錄：`docs/handoffs/`；格式見 `docs/handoffs/task-template.md`
- 使用方式：`docs/guide.md`

新專案第一次開工：確認遠端與分支，開始規格訪談，再建立任務檔。不要把範本建立過程當成新遊戲的已完成工作。

目前任務：`docs/handoffs/exploration-v2-20261021.md`（16項試玩修正）；生效規格 `docs/design/exploration-v2.md`。前輪：`docs/handoffs/m1-playtest-20261021.md`；驗收證據與限制：`docs/design/m1-acceptance.md`。舊實作紀錄：`docs/handoffs/m1-implementation-20261020.md`；素材原交接的 SD／差分指示已被使用者保留原圖要求取代。

目前確定原圖對應：05地球、04水星、01金星、03火星、02天王星、06月球。原 PNG 位元組不變。

整合 PR：https://github.com/sces5504/20261020/pull/3 。發布結果以 PR 最後的驗證留言／Pages workflow 及網站 version.json 為準，接手先 fetch 核對，不沿用舊 main 僅規格的假設。

下一步：使用者實際試玩回報、Android／iOS 真機與獨立 AI 接力演練；不能把 Chromium 觸控 viewport 或本輪內容新增測試冒充真機／另一 AI 接手。預設 commercial 品質門檻仍保留，試玩發布採 playtest profile。
