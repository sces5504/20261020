# 接力索引

專案狀態：Stella Maiden 規格0.5，已確認保留四資源，用配方預設、一鍵投入、批次管理簡化；4.3.2研究／SQLite已驗證，成長消耗鏈仍有未知。遊戲尚未初始化。

- Stella Maiden研究入口：`research/stella-maiden/START_HERE.md`；資料交付接力：`docs/handoffs/stella-research-20261020.md`。先按導覽查局部資料，不需重新逆向或一次載入全部JSON。
- 已確認規格：`docs/spec.md`
- 原作研究／證據：`docs/research/stella-maiden.md`
- 4.3.2接入／簡化分析：`docs/research/apk-spec-integration.md`；有界SQL：`docs/research/stella-maiden-queries.sql`
- 架構／資料契約／驗收：`docs/design/architecture.md`、`content-contract.md`、`production-plan.md`
- 玩家流程與交界：`docs/design/interaction-flows.md`
- 使用者要求與偏好：`docs/memory/owner-preferences.md`
- 決策：`docs/memory/decisions.md`
- 美術：`docs/art/style-guide.md`、`docs/art/asset-contract.md`
- 任務紀錄：`docs/handoffs/`；格式見 `docs/handoffs/task-template.md`
- 使用方式：`docs/guide.md`

新專案第一次開工：確認遠端與分支，開始規格訪談，再建立任務檔。不要把範本建立過程當成新遊戲的已完成工作。

目前任務：`docs/handoffs/stella-spec-20261020.md`，0.4研究接力見 `docs/handoffs/stella-spec-research-integration-20261020.md`。branch `main`；來源main為 `16e64e5`，保留規格合併為 `b51525c`；備份 `backup/stella-spec-v03`。
已驗證：研究863檔、67表37723列、370份bXML、4個有界傷害樣例、SQLite integrity與關聯；遊戲、真機、效能及部署未驗證。
下一步：核對四槽名稱映射、追查融合／配點／被動消耗的具體缺口，再確認六名角色與SolarSystem候選及其所需技能／素材。四資源與操作簡化已確認，勿重問或默認兩資源；OBB／美術原檔仍缺，不重索已收錄表的APK。

