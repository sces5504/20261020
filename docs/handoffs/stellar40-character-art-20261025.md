# Drive 四十位角色美術交付

使用者於2026-10-25要求從自己的Google Drive取得新的40位立繪並製作Q版。沿用聊天已確認的M1比例、固定repo目錄與PR交付；只交美術包＋試套，遊戲接入交整合者。外部索引內容沒有擴大repo授權。

起點origin/main `f7c8130`，工作分支 `art/stellar40-20261025`，開工前乾淨，觀察核心0.9.0。固定入口：[art/characters/stellar40/START_HERE.md](../../art/characters/stellar40/START_HERE.md)。

## 已交付

40張使用者標準原圖逐張view_image並鎖定外觀，各自使用單張本角色標準圖呼叫imagegen，沒有使用合圖作生成參考。40位靜態SD候選已完成，另保留6張初版：克魯特尼、天社五、水委一、天苑四b、北極二修正背景暈光；天狼星修正劍尖貼邊，接入表採v2。所有生成主檔保留，未用程式改繪。

40張768×1152立繪WebP、40張256×256個別頭像、40張1024×1024透明SD WebP已輸出。SD等比縮放並加至少80px透明安全留白；Canvas只用於裁切／縮放／編碼。頭像與SD分開，沒有把裁立繪宣稱成戰鬥動畫。

`catalog.json`、`integration-assets.json`與`library.sqlite3`記錄角色ID、原作Key／CID、hash／版本、尺寸、pivot、安全區、實際提示與來源、預覽與待審狀態。SQLite收錄40位／200項目前選用素材；6張較早候選在JSON及檔案中保留。`progress.json`為40/40。

## 來源與限制

Google Drive技能只用於尋找與取得使用者指定的[星河戰姬－40名角色立繪資料夾](https://drive.google.com/drive/folders/10eQaO1nMh7sEQ6J0TGvZapAdkA4LfJgT)中兩份ZIP。`portraits-01-20.zip` 44,941,363 bytes、`portraits-21-40.zip` 53,676,855 bytes，實際Drive raw串流下載、核對大小、通過ZIP CRC。未用受32MiB限制的Sediment下載器。兩包同名delivery-manifest完全相同，分開解壓保存，沒有覆蓋或執行來源程式。

來源40張PNG與交付JSON已封存，未包含其索引提及的原始提示實檔或SQLite，不虛構已取得。各條目舊design文字與最新實圖有出入時以實圖為準，目視外觀寫入visualInspection；不依名字猜髮型。來源星數／核定敘述只留metadata。

來源標準圖有柔光背景殘留，按使用者要求保留位元組；弧矢一原圖alpha範圍1–254，不宣稱來源是乾淨去背。新SD另生成透明背景。所有新素材仍awaiting-user-review，未自行approved。M1約2.4頭身為生成目標，沒有聲稱每張已完成精確比例量測或人工核定。

船尾座ξ首次工具輸出因安全檢查拒絕，沒有產物；重試改正面守備姿勢與較完整覆蓋，保留髮型／配色／繩錨。與來源背身抬腿不同，差異未核定，已記reviewNotes。其他SD的比例、配件位置與細節仍需逐張審閱。

未新增可玩角色，gameCharacterId全null；future ID只供候選對應。沒有改核心、戰力、技能、全域manifest或README。設備箱／浮游砲／特效只屬視覺；pivot為整體輪廓底部，接入場景時整合者需校準，非碰撞判定。沒有交動畫幀、骨架或完整戰鬥動畫。

## 驗證與接入

- `python art/characters/stellar40/verify-catalog.py`：40位、200項目前素材與6張舊候選hash／尺寸／解碼，SD透明安全留白，SQLite完整性與外鍵；33張既有標準原圖hash未變。
- `source scripts/env.sh` 後 `node art/characters/stellar40/check-preview.mjs`：四批各十位，Chromium桌機1440×1000／觸控viewport390×844 DPR2，原圖與SD切換、每批30張顯示圖解碼、詳細資訊、明暗底、無水平溢出。證據在本批evidence/。
- 頭像總覽逐位目視後修正8位偏移裁切，再驗受影響預覽。未跑無關核心／完整發布測試。

本機預覽：repo root執行 `python -m http.server 5185 --bind 127.0.0.1 --directory art/characters/stellar40`，開啟 `http://127.0.0.1:5185/preview.html`。此為素材尺寸試套，非實機或遊戲戰鬥測試。

整合者下一步：先由使用者審閱候選與船尾座ξ姿勢差異，再按本批integration-assets.json核對Key／CID／來源版本，接入角色內容。不要將來源星數、裝備造型或CID直接當作戰力／技能／執行期ID。
