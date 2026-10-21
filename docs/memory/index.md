> 最新：產品改名Galaxy Angel；0.3任務／實際驗證見目前交接，歷史名稱保留為研究來源。

# 接力索引

專案狀態（2026-10-21）：Galaxy Angel 0.3八項修正已完成，29項核心與三組瀏覽器流程通過；整合PR #5，Pages從main發布，實際公開SHA／workflow以PR最後驗證留言與version.json為準。前輪M1與0.2見PR #3／#4。六張原始立繪不變，六張獨立Q圖及新增世界素材為候選；商業品質與真機尚未驗收。

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

目前任務：`docs/handoffs/galaxy-angel-v3-20261021.md`（八項巡邏／編隊／圖片／改名修正）；生效規格 `docs/design/galaxy-angel-v3.md`，搭配 `docs/design/exploration-v2.md`。前輪：`docs/handoffs/m1-playtest-20261021.md`；驗收證據與限制：`docs/design/m1-acceptance.md`。舊實作紀錄：`docs/handoffs/m1-implementation-20261020.md`；素材原交接的 SD／差分指示已被使用者保留原圖要求取代。

目前確定原圖對應：05地球、04水星、01金星、03火星、02天王星、06月球。原 PNG 位元組不變。

整合 PR：https://github.com/sces5504/20261020/pull/3 。發布結果以 PR 最後的驗證留言／Pages workflow 及網站 version.json 為準，接手先 fetch 核對，不沿用舊 main 僅規格的假設。

下一步：使用者實際試玩回報、Android／iOS 真機與獨立 AI 接力演練；不能把 Chromium 觸控 viewport 或本輪內容新增測試冒充真機／另一 AI 接手。預設 commercial 品質門檻仍保留，試玩發布採 playtest profile。
