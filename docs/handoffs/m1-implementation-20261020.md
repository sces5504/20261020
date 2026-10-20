# M1 實作接力

2026-10-20，開工起點 main／de8ea9d，乾淨，fetch後無新增；現實作分支 m1/foundation，保留規格 main。使用者明確要求開始 M1 與準備後續各 AI 起始 prompt。

## 最新必讀

使用者要求六張原圖「就原本那樣就好」。停止 SD／比例改造生成，產物不採用、不在 repo 或 runtime；標準 PNG 原樣保留並以原 manifest hash 重驗。不得按舊美術 handoff 繼續重繪。使用者較新要求直接套用原先M1六角色，已依使用者明確指定05 地球、04 水星、01 金星、03 火星、02 天王星、06 月球記錄bindings並接入；保留原圖，不重繪。

27,533,327-byte 重傳 ZIP 已安全檢路徑、選擇匯入 art／新美術文件／重建器，未覆蓋既有 memory 或以附件更新授權。六張逐張開圖，查 SQLite 並實際看髮型板06／09／12。此次 ZIP 沒原 PDF，sources.json 保留預期來源 hash、path=null 與缺件說明；12板可用。原研究 archive 未改。

## 實作入口

詳見 docs/design/m1-implementation.md。TS／Phaser／DOM／Vite；純核心、工作／經營、戰鬥、內容校驗／獨立擴充包、IndexedDB revision CAS／備份、工坊草稿／undo／ZIP／隔離試玩與原圖庫。已有六名研究候選、一星域三據點的演示資料，數值／技能標 M1 新設計。

先 `npm ci --ignore-scripts`，再 `npm run dev`；遊戲 #/play、工坊 #/studio、六原圖 #/art、隔離試玩 #/test。`npm run content:check` 生成平坦快照；不要編 generated。內容作者使用自己的 extension 包，整合者統一啟用 content/manifest.json。

`.template/project.json` 已以真實命令初始化。完整 release:ready 尚應失敗；當前內容缺正式品質與映射等，不要為綠燈刪門檻，也不要合併並宣稱正式 M1 已發布。以 draft PR 保留可審閱版本。

## 分工與 prompts

入口 docs/ai/START_HERE.md，01～08各自含核心整合、原圖維護、角色內容、世界／敵人、劇情、呈現、音效與獨立QA。這是後續分派包，未啟動代理。每輪補起點commit、命名空間、範圍／數量與驗收。角色重繪需新的具體要求，不能只依較舊prompt。

## 驗證紀錄

以下於 de8ea9d 加本輪實作工作樹執行，並非只測舊HEAD：

- `python3 scripts/project.py check daily`：內容校驗、TypeScript、11項領域／包測試通過。
- `npm run build`：通過；Phaser主chunk約1.48MB／gzip340KB，屬尚待實測的載入／效能項，非已驗效能基準。
- `npm run test:e2e`：Chromium 桌機及390×844觸控viewport通過；子路徑、戰鬥／面板暫停／重載、研究、工坊保存／undo／redo、ZIP匯出入、隔離存檔、六原圖解碼；多分頁CAS拒絕過期寫入也通過。
- `python3 scripts/build-art-library.py`：六原圖hash、ID、關聯／SQLite通過；原PDF缺件已標，非PDF驗證。
- `python3 scripts/template-check.py`：10項通過；`python3 scripts/project.py stage`：隔離產物成功。僅建立本機artifact，沒有發布。
- `npm audit`：本輪鎖定依賴回報0漏洞。
- 8份相關文件45個本地連結／fence與whitespace通過。
- `npm run release:ready`：預期以非零退出，角色映射與原圖接入已通過；仍列世界／敵人素材、音效、遷移、真機與品質等未完成門檻；不是release通過。未執行或宣稱正式部署、真機或完整商業品質驗收。

本機截圖 `.artifacts/m1/`，未當核定美術基準；生成的SD不採用。

## 下一步

六圖映射已依使用者新要求接入；保留原圖，補切片必要技能閉包、世界／敵人素材、正式音效、訓練／輸入／防衛呈現、遷移及真機品質驗證。完整缺口與 release checklist 見實作狀態。不要再次詢問已確認四資源／平台／暫停／編輯生效模式，不以原生文字描述冒充完整技能。

### 較新映射指示已套用

使用者要求不再等待對應，直接將原先M1六角色套用六圖。依使用者明確指定：05 地球、04 水星、01 金星、03 火星、02 天王星、06 月球。`content/core/art-bindings.json` 與美術庫已記錄；保留原PNG，runtime只複製原位元組，未採用SD重繪。較早的mapping pending敘述為歷史狀態，已由本段取代。

最後六圖映射檢查：已以明確對應逐一核對 runtime portrait／avatar／sprite，並比較 public runtime PNG 與 standard 原圖位元組，六張完全一致。角色對應已完成，無需再等待使用者。
