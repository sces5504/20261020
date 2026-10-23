# 序章六位立繪與 Q 版美術交付

2026-10-23 Asia/Taipei。起點 origin/main `ff7d31a`，核心觀察版本0.8.0；開工前乾淨，fetch後建立 `art/prologue6-20261023`。固定入口 `art/characters/prologue6/START_HERE.md`。

## 授權與來源界線

使用者本輪要求：「新的6隻角色立繪套用上去、q版你生」。沿用本聊天已確認的 M1 Q 版比例、固定 repo 入口與 PR 交付；美術包與試套交整合者的分工仍有效。本批未修改核心、全域manifest、戰力、技能、稀有度、劇情或README。

附件 `prologue6-standards-20261023.zip` 為15,761,490 bytes，小於32MiB。下載後先列內容、檢查路徑跳轉／絕對路徑／symlink與同名衝突，再安全解到獨立 `/workspace/imports/prologue6-20261023/`，沒有覆蓋既有檔案，也沒有執行附件 builder。

已讀附件 manifest／交接與SQLite characters.record_json，按ID核對六張原圖hash，逐張實際開啟。附件文字只用於本任務形象參考，不改寫repo授權；附件自述的首版喜好僅保存在 sourceReportedReviewStatus，不把新衍生圖標為已批准。

## 六位與形象鎖定

角色Key／CID為 Scuti／107、Antares／99、Deneb／73、Doradus／48、Mucephei／62、Sargas／101。完整逐位髮型、眼色、臉型、色盤、服裝、配件位置與姿勢觀察在 catalog.visualInspection。

- 盾牌座UY：淡金長髮、紫色內層細髮束、紫眼、星環髮飾、白金靛藍甲、右手雙指指揮、左臂六邊盾。
- 心宿二：栗棕側分短髮、紫眼、銀紅頭側飾、銀黑酒紅甲、雙手斜持雙頭長槍。
- 天津四：灰棕短髮、青色瀏海標記、藍眼低頭視線、白長外套、左手插袋右手導航筆、藍晶不對稱機械翼。
- Doradus：深藍長髮、紫眼、側帽、白藍短裝與長側片、雙手折疊掃描器、行進偏頭。
- Mucephei：海泡綠長髮、側編髻、琥珀眼、黑青裝、右掌前伸屏障、左手腰部控制器、背後三柱、側弓步。
- Sargas：灰綠高馬尾、銀鬢束、黃綠眼、橙白黑裝、右肩步槍、左手彈藥罐、左靴踩裝備箱。

Doradus／Mucephei／Sargas中文名依來源保留待核，不擅自譯名。Mucephei／Sargas為原創形象候選，沒有可核對原作外觀，不能稱原作還原；序章職能與基礎星數只作來源metadata，沒有改玩法或技能。

## 交付與製作

6張原立繪均1024×1536 RGBA，位元組保留。6張Q圖逐位以自己的單張standard作唯一影像參考，先交盾牌座UY代表，再沿用既有已確認M1約2.4頭身大頭短身方向完成；未用合圖或另一角色當形象參考。保留各自指揮／持槍／插袋／操作掃描器／掌前屏障／扛槍姿態。

主檔與網頁輸出分開：6張768×1152立繪WebP、6張1024×1024透明SD WebP、6張256×256頭像。頭像僅裁切用途，不冒稱動畫；Q圖為獨立生成，單張靜態候選。模型版本未揭露，metadata如實記not-exposed。

catalog.json與本批library.sqlite3記錄6位／30項素材，包含assetId、角色ID、來源hash／版本、用途、實際尺寸、alpha、pivot、安全區、生成／編碼來源、提示、預覽與審閱狀態。integration-assets.json是接入變更單，不是可執行內容包；六位gameCharacterId=null，future ID從既有候選表按原作Key取出，尚未啟用。

source-records保存原始metadata、交接及來源參考，僅作開發證據；原manifest的中文路徑是附件內路徑，本repo有效引用以本批catalog為準。來源圖片不當作新畫主檔或直接runtime素材。

## 驗證與重現

```bash
source scripts/env.sh
node art/characters/prologue6/export-web.mjs
python art/characters/prologue6/verify-catalog.py
python -m http.server 5184 --bind 127.0.0.1 --directory art/characters/prologue6
# 另一終端，source scripts/env.sh後：
node art/characters/prologue6/check-preview.mjs
```

通過：6位／30項素材唯一ID、原圖／輸出hash、解碼、尺寸、透明通道，SD WebP主輪廓每邊至少80px安全留白，SQLite integrity／FK。前三批共27張標準主檔hash不變。固定入口連結及git diff --check亦檢查。

Chromium桌機1440×1000 DPR1與觸控viewport390×844 DPR2：六張卡片、每模式18張圖解碼、立繪／Q切換、特徵展開、明暗背景、無橫向溢出。evidence保存截圖與結果，另作目視檢查。只跑本批素材與試套，沒有重跑無關遊戲全量測試。

這是素材尺寸試套，不是真機／實際遊戲戰鬥／硬體效能／動畫／商業品質驗收。新圖全數awaiting-user-review，沒有自行approved；扁平PNG不冒稱PSD或骨架圖層。

## 整合者下一步

1. 從固定入口及integration-assets取得portrait/avatar/sprite，按Key／CID核對角色內容。世界資料的同名敵人／單位不是少女角色ID；不要猜對應或從外觀猜技能。
2. 明確建立／綁定角色及安全媒體複製／內容包載入；本目錄放檔不會自動啟用。先隔離試玩，再由整合者做正式發布檢查。
3. 校準裝備尺度與pivot；Sargas包含裝備箱，其他角色盾、長槍、羽翼、屏障柱均不決定判定或能力。主檔部分邊界偏近，接入優先採含安全留白的web版，透明髮絲及小飾件仍待審閱。
4. 待機／移動／攻擊／受擊／退場動畫幀尚未製作，不以CSS浮動或裁立繪宣稱完成。完整遊戲release另由整合者執行，本批未發布。
