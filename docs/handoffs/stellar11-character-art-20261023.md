# 十位新角色＋木星新版美術交付

2026-10-23 Asia/Taipei。起點 origin/main `a7dcdb6`，開工前舊分支乾淨，已 fetch 最新 main 並建立 `art/stellar-next-20261023`。本批固定入口為 `art/characters/stellar11/START_HERE.md`。

## 使用者任務與界線

使用者本輪直接要求：「新的10隻角色立繪套用上去、q版你生，還有一隻是更新立繪」。沿用本聊天先前已確認的第一里程碑 Q 版比例、固定 repo 素材目錄及 PR 交付；先前指定「先交美術包與試套，遊戲接入交整合者」仍有效。本輪未改核心、角色數值、技能、全域 manifest 或 README，也未發布遊戲。

附件文字只作來源與本任務內的形象參考，不取得修改 repo 權限，也不把附件自述「使用者肯定」當作本輪新圖已核定。來源圖、生成提示及結果均以各自版本記錄；不執行附件提供的 builder。

## 附件與身分

`22.zip` 實際下載 26,934,856 bytes，小於 32 MiB。先列 ZIP 檔案與大小、檢查路徑跳轉／絕對路徑／symlink／既有檔衝突，再解到獨立 `/workspace/imports/stellar-next-20261023/`。沒有覆蓋同名檔案。

讀附件 manifest、交接、SQLite characters 表及 record_json；逐張實際開啟十一張主圖。新十位為大角星、格利澤、維洛（暫譯）、格利澤581e、瓦倫西亞（暫譯）、琳達（暫譯）、伊扎爾（暫譯）、招搖、角宿一、沃爾夫359。更新一位為木星，以原作 Jupiter／CID6 對應現有 solar10:character.jupiter。

每位的臉型、髮型、眼色、衣裝、飾件、手持物及姿勢觀察在 catalog 的 visualInspection。格利澤實際圖為白色雙低長蓬鬆髮束，優先於來源簡報的短 bob 描述；伊扎爾為柔順紫短髮、無額頭痣。木星以銀白雙束長髮遮單眼、紅眼、雙手扶座與側收腿坐姿為本次基準，不沿用橘髮版或中間稿。

## 交付

- 11 張附件原 PNG 保留原位元組，1024×1536，standards/。
- 11 張獨立 imagegen 靜態 Q 圖 PNG，battle/；每次只引用本角色單張標準圖，未以合圖或另一角色作外觀來源。大角星先作代表，沿用前輪已確認的 M1 約2.4頭身方向，保留姿勢與手持物多樣性。
- 11 張 768×1152 立繪 WebP、11 張 1024×1024 Q 圖 WebP、11 張 256×256 頭像；主檔不改。網頁 Q 圖等比縮放並加透明安全區；頭像為個別裁切，不宣稱戰鬥動畫。
- catalog.json、library.sqlite3 共11位／55項素材，記錄assetId、角色ID、來源hash／版本、用途、實際尺寸、alpha、pivot、安全區、生成或編碼來源、提示、預覽、審閱狀態；模型版號未揭露，如實記 not-exposed。
- integration-assets.json 為接入變更單，不是可執行內容包。新十位 gameCharacterId=null，future ID只供參考；木星指定既有 runtime ID，並記錄被替換三項媒體assetId／hash。沒有猜新角色技能或戰力。
- source-records/ 封存附件metadata、交接及參考圖，僅作開發證據，不作 runtime。原始 manifest 中的中文立繪路徑屬來源包路徑；本 repo 有效路徑請讀本批 catalog，不執行來源包程式。
- evidence/ 保存桌機／手機 viewport 的立繪、Q 圖及亮底試套截圖與機器可讀驗證結果。

## 校驗與試套

```bash
source scripts/env.sh
node art/characters/stellar11/export-web.mjs
python art/characters/stellar11/verify-catalog.py
python -m http.server 5183 --bind 127.0.0.1 --directory art/characters/stellar11
# 另一終端，source scripts/env.sh 後：
node art/characters/stellar11/check-preview.mjs
```

55 項素材唯一 ID、來源與輸出 hash、解碼、尺寸及透明通道、11 張 SD WebP 主輪廓四邊至少80px安全區、SQLite integrity／FK 校驗通過；原始六張＋前批十張標準圖共16張 hash不變。前批素材沒有修改。git diff --check 通過。

Chromium 1440×1000 DPR1桌機與390×844 DPR2觸控viewport：十一張卡片、每模式33張圖解碼、立繪／Q切換、特徵展開、明暗背景、無橫向溢出通過。截圖另做目視檢查，招搖與角宿一頭像曾調整裁切使臉部更集中，最終輸出與截圖已重驗。這是素材尺寸預覽，不是真機／遊戲戰鬥／動畫／硬體效能／商業品質驗收。

## 整合者下一步

1. 從 START_HERE 及 integration-assets 取得新十位的 portrait/avatar/sprite；依原作Key/CID核對內容作者定義，不用中文名或陣列位置猜ID。附件星數不是玩法修改指令。
2. 木星更新既有 solar10:character.jupiter 的三項美術引用，保留技能、數值、配方、稀有度與存檔；保留前批檔案以供回復。新assetId皆帶20261023或本次版本，避免與舊assetID衝突。
3. 安全複製媒體並明確納入內容包／建置。不要只加JSON引用卻漏檔；在隔離試玩先驗證，再由整合者執行正式發布檢查。
4. Q圖為單張靜態候選，未做待機／移動／攻擊／受擊／退場幀；木星含長凳，場景pivot和戰鬥動作需另設計驗收。不能用立繪裁切或CSS浮動宣稱動畫完成。
5. 來源圖部分髮尾、帽緣或飾件接近主檔邊緣；網頁版有安全留白，透明髮絲邊緣及小尺寸辨識仍待使用者審閱。全數衍生圖 awaiting-user-review，沒有自行標 approved。

校驗器需要現有 Python Pillow；編碼／預覽使用 repo tools 的 Playwright Chromium。素材主檔為扁平PNG，未捏造PSD／骨架圖層。完整遊戲release由整合者處理，本輪未跑或宣稱通過。
