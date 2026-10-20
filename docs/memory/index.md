# 接力索引

專案狀態：M1 已由使用者授權開工，功能骨架／工坊實作在 m1/foundation。六張原圖已匯入並保持原樣；SD 重繪已依使用者要求停止、不採用。較新要求已依使用者明確對應套用六角色；完整 M1／商業品質尚未驗收。

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

目前任務：`docs/handoffs/m1-implementation-20261020.md`；素材原交接：`docs/handoffs/m1-character-art-20261020.md`（其中較舊 SD／差分指示已被使用者保留原圖要求更新）。
下一步：完成本輪程式／原圖展示驗證並提交 draft PR；六圖已依原M1順序套用角色，繼續原圖呈現與品質驗證。不得恢復已停止的圖像改造。完整缺口見 m1-implementation，不將功能骨架視為商業品質版本。

目前確定的原圖對應：05地球、04水星、01金星、03火星、02天王星、06月球。

交付檢查點：程式 `630be63`，分支 `m1/foundation`，草稿 PR https://github.com/sces5504/20261020/pull/3 。main未合併，正式發布未執行；後續接手從此分支／PR同步。
