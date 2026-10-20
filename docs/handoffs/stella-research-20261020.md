# Stella Maiden 研究資料接力

- 任務／範圍／branch：將已完成的APK靜態研究交給專案AI使用；`codex/stella-research-handoff`。不初始化遊戲、不更動既有玩法／架構／部署設定。
- 狀態：研究資料、導覽、唯讀查詢／有界模型與可攜驗證工具已準備；提交與PR狀態以Git實況為準。
- 開工HEAD：`ea8223ffc3d4dc7e16ddd2e862435923d58b4c23`。測試在此基底加本任務未提交修改上進行；不可把它當成只有原HEAD通過新檢查。
- 直接使用者來源：2026-10-20，使用者問應將本次Stella Maiden研究放repo或打包，指定 `https://github.com/sces5504/20261020` 並授權直接處理。使用者另已確認目前只有APK，沒有OBB。這只授權資料交付，不代表已確認遊戲引擎／完整產品規格。
- 已完成：`research/stella-maiden/START_HERE.md`是唯一優先入口；67張完整表、37,723列、370份可逆bXML、原生機制／戰鬥／事件報告、素材metadata及來源雜湊已收錄。`MANIFEST.json`追蹤此交付每檔SHA-256。
- 可直接用：Python標準庫建立SQLite、查語義view、搜尋單一場景索引；不需要原APK、REA、網路或pip安裝。生成檔寫到忽略的 `generated/`。
- 驗證命令：

  ```bash
  python3 research/stella-maiden/tools/verify_bundle.py
  python3 research/stella-maiden/tools/build_database.py
  python3 research/stella-maiden/tools/check_database.py
  python3 scripts/template-check.py
  ```

- 檢查範圍：研究包檔案完整性、67表與370份bXML對原始來源hash的重編碼、4個有界傷害樣例、124個opcode、SQLite列數／關聯、既有範本契約。專案仍未初始化；沒有遊戲測試、原版執行或部署通過的宣告。驗證實際結果補記於本檔的「本次驗證」段落。
- 已知缺口：預期OBB `main.431.com.mistgame.smus.obb`（132,565,279 bytes）未提供；所有技能／opcode的行為、正式伺服器協議與逐tick對照未全部恢復。此repo未收錄APK、美術／音訊二進位、Python vendor或REA安裝目錄。
- 大型資料讀法：先查 `_catalog`／`_semantics`／`scene_query.py`，依問題只取一列或少量列；不要把圖鑑、全事件表和所有場景一次塞入模型上下文。
- 對資料的要求：外鍵用 `_row`；事件入口與Goto用label→第一匹配列；保留定點取整、同名bXML子節點與原始欄序；未知機制不得默默套用通用遊戲規則。
- 部署／回復：此變更不部署遊戲；如需撤回，回復本資料交付PR即可，不觸及原遊戲存檔或服務。
- 下一個AI前3步：讀根AGENTS／START_HERE／本檔；執行研究驗證與SQLite建置；依使用者接下來的任務讀局部報告，若開始遊戲實作則先依docs/spec.md完成規格確認。

## 本次驗證

2026-10-20，本地在開工HEAD加本任務未提交修改的工作樹執行：

- `verify_bundle.py`：PASS；863個manifest檔案、67張表／37,723列對來源hash重編碼、370份bXML重建、124種opcode與4個有界傷害樣例。
- `build_database.py`及`check_database.py`：PASS；SQLite integrity=ok，完整列數與CID→Skill／關卡→Wave→CID／Gacha→CID／EventSpot label入口關聯通過。
- `query.py`：Sun→Skill71／DefPowerDot32；`scene_query.py`可有界找出Gacha場景。
- `python3 scripts/template-check.py`：PASS，10項既有範本測試。遊戲仍為uninitialized，沒有宣稱遊戲驗收或部署成功。
- 新增Research integrity workflow，供PR／main持續重驗交付完整性；遠端checks結果以GitHub當前commit為準。
