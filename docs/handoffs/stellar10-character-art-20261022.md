# 十位星體角色美術交付

日期：2026-10-22 Asia/Taipei。起點 `4610e8a`，分支 `work`，開工時乾淨；本輪未同步或推送遠端。

使用者直接要求套用附件十位既有立繪、由 AI 製作 Q 圖；先審太陽代表稿後曾同意沿用，後續再要求「更像第一里程碑的比例」。最新直接答覆為「先交美術包與試套，遊戲接入交整合者」。因此本輪僅新增自己的素材目錄與本交接，不改核心、全域 manifest、技能、數值或 README。

## 入口與交付

- 素材根目錄：`art/characters/stellar10/`。
- `catalog.json`：十位身分、髮型／臉型／配色／衣裝／配件目視紀錄、原圖版本與 hash、50 項素材技術參數與審閱狀態；既有六位的不可變特徵／hash 另存 legacyStandards。
- `library.sqlite3`：本批獨立美術資料庫；characters.record_json 保存完整角色特徵，assets 表保存原立繪、立繪網頁版、頭像、SD 主檔、SD 網頁版。
- `standards/`：十張附件原始 1024×1536 PNG，位元組不變。
- `battle/`：十張新版比例的獨立 Q 版 PNG 主檔；太陽等用 v2，涅墨西斯採 v3 完整浮游刃構圖。v1 及涅墨西斯 v2 為封存的淘汰候選，不接入。
- `web/`：十張 768×1152 立繪 WebP，十張 1024×1024 透明 Q 圖 WebP；Q 圖等比縮放加安全留白，沒有改寫主檔。
- `avatars/`：十張 256×256 個別頭像裁切；用途僅頭像，不宣稱戰鬥動畫。
- `prompts/`：來源提示與實際生成提示；`source-records/` 封存附件 manifest、生成紀錄與交接文字，僅作來源，不作 repo 授權或批准證明。
- `integration-assets.json`：十位的 art ID、原作 key/CID、建議 future ID，以及 portrait/avatar/sprite 對應。此檔是美術接入表，不是可載入的 runtime extension。
- `preview.html`：可切換 Q 圖／立繪、明暗背景與角色特徵；另有 78px 靜態顯示尺寸試套。
- `evidence/`：桌機、手機 viewport 的立繪／Q 圖／亮背景截圖與機器可讀結果。

## 已做的核對

附件為 `stellar10-standards-20261021.zip`，19,210,649 bytes，小於下載器 32 MiB 上限。下載後先列 ZIP 內容，檢查絕對路徑／上層跳轉／符號連結與既有檔衝突，再解到 `/workspace/imports/stellar10-20261021/`；沒有覆蓋既有檔，沒有執行附件 build_catalog.py。

先讀本 repo 美術入口與 JSON／資料庫，再查附件 characters 表和 record_json，逐張實際開啟既有六張 standard 及新增十張 standard。新圖每次只引用本角色單張原圖；沒有以合圖或另一角色作形象參考。第一里程碑戰鬥圖另開作比例比較，未當作新角色的髮型／服裝來源。

附件涅墨西斯以 v6 loose hair 為準，保留長披髮，不採已退回高馬尾；木星保留實際圖可見的小側編束與及肩橘髮，不猜成整頭辮髮。太陽／冥王星的附件「喜歡並保留」只是來源報告，新衍生圖全數 awaiting-user-review，沒有自行批准。

## 驗證

在 repo root 執行：

```bash
source scripts/env.sh
node art/characters/stellar10/export-web.mjs
python art/characters/stellar10/verify-catalog.py
python -m http.server 5182 --bind 127.0.0.1 --directory art/characters/stellar10
# 另一個終端，先 source scripts/env.sh：
node art/characters/stellar10/check-preview.mjs
```

實際通過：十位／50 項素材唯一 ID、PNG／WebP 解碼、尺寸、透明通道、來源及輸出 hash；十張 SD WebP 主輪廓四邊至少 80px 安全留白；SQLite integrity／FK；六張既有 standard hash；git diff --check。編碼及預覽時需要本機 Chromium，環境 sandbox 拒絕啟動／監聽後已獲自動批准以本機程序執行，無遠端上傳。

桌機 Chromium 1440×1000 DPR1、手機觸控 viewport 390×844 DPR2 實測：十位列表、每模式30張圖可解碼、Q／立繪切換、角色特徵展開、明暗背景及無橫向溢出。截圖已實際開啟目視，未宣稱手機真機、戰鬥、效能或商業品質驗收。

## 下一步交給整合者

1. 審閱十位新 Q 圖，必要時按本角色同版本 standard 做局部修整。主檔邊界有些較近，接入應優先採帶透明安全區的 webAsset；透明髮絲與小飾件仍屬候選審閱範圍。
2. 目前 gameCharacterId 全為 null，future ID 只是既有候選表的建議；本輪沒有新增可玩角色、技能、配方、共鳴取得或存檔。整合者依角色內容規格建立定義，不從外觀猜技能，不把原作含占位技能描述直接當已支援效果。
3. 按 integration-assets 對應 portrait/avatar/sprite，新增安全建置複製與正式載入設定；先在隔離試玩測試。不要只加資產 JSON 卻漏複製媒體。
4. 本批只交靜態 Q 圖。待機／移動／攻擊／受擊／退場等動畫幀與事件表尚未製作，不能以 CSS 浮動或裁立繪宣稱完成動畫。
5. 完整發布另由整合者跑 release，保留 test:polish 第五組瀏覽器流程；本輪美術交付沒有發布，未跑或宣稱完整遊戲 release 通過。

可由 `python art/characters/stellar10/verify-catalog.py` 重建本批 SQLite。生成工具未揭露模型版號，metadata 如實標 not-exposed；主檔來源是工具輸出的扁平 PNG，沒有假稱 PSD／骨架可編輯圖層。
