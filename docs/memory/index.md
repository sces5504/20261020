# 接力索引

專案狀態：Stella Maiden 規格0.6，AI重繪／AI音效與內容圖鑑／編輯器已要求；已選個人測試後匯出發布、妮姬立繪／UI／特效及碧藍航線／棕色塵埃2立繪參考。遊戲與編輯器尚未實作。

- Stella Maiden研究入口：`research/stella-maiden/START_HERE.md`；資料交付接力：`docs/handoffs/stella-research-20261020.md`。先按導覽查局部資料，不需重新逆向或一次載入全部JSON。
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

目前任務：`docs/handoffs/stella-ai-collaboration-20261020.md`；素材／編輯器前輪：`docs/handoffs/stella-editor-art-20261020.md`；先前規格／研究接力見 `stella-spec-20261020.md` 與 `stella-spec-research-integration-20261020.md`。branch `main`，0.5在`d8fbca9`；研究來源main為`16e64e5`，備份`backup/stella-spec-v03`。
已驗證：研究863檔、67表37723列、370份bXML、4個有界傷害樣例、SQLite integrity與關聯；遊戲、真機、效能及部署未驗證。
下一步：依已確認的個人測試／匯出流程準備共用schema與遊戲＋編輯器；以三款已選參考建立代表角色／UI／特效品質樣本，不先批量生成。素材走AI不等OBB，繼續追四槽映射／成長與切片行為；已確認方向不重問。


接力製作安排：使用者希望本 chat AI 做 M1，其他 AI 擴充；已補核心／內容責任、共用契約變更與 M1 擴充演練建議。具體交付仍按主規格確認狀態安排，尚無遊戲實作。
