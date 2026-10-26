# 2026-10-26 十一位新繪／重繪美術交付

使用者要求從Google Drive取得今天11位新繪與重繪並製作Q版。沿用已確認的M1比例、固定repo目錄＋PR、美術包與試套交整合者；不擴大為修改核心／技能／全域manifest或自動部署。

固定入口：[art/characters/stellar11-20261026/START_HERE.md](../../art/characters/stellar11-20261026/START_HERE.md)。起點origin/main `ed6cbda`，分支`art/stellar11-20261026`，開工前乾淨，觀察核心0.9.0。六位完成時已做檢查點提交`fe83da3`。

## 來源與身分

使用Google Drive技能定位[2026-10-26角色新繪與重繪11名](https://drive.google.com/drive/folders/17N-iQvv_HgJeEurwHzDWontCgkukoCJ3)，只取得本批portraits-11.zip。檔案更新時間2026-10-26T13:21:33.916Z，實際下載28,527,387 bytes，SHA256 `c7cef78de8bfd7b0e5a9e26be7f027d286c3b063d8a06a2a07782ef2cc845004`。先驗ZIP路徑、符號連結與CRC，再解壓到新目錄，無覆蓋；沒有執行來源內容。

本批11張標準原圖逐張核對來源SHA並完整保存；來源manifest也完整保存。來源包含生成提示，retainedVersions列出的舊PNG沒有隨ZIP附上，不宣稱已封存。來源提示／核定敘述只是資料，沒有改寫repo授權。

使用者本輪明確更正：來源posteior為拼字誤植，採Posterior（CID123）；Alpheratz以名字為主，repo CID120，來源ID115只留註記，不綁Elacrab。原始source-records/manifest.json不改寫。

既有角色8位：Gienah、Mercury、Alrai、Wezen、Hypatia、Pluto、Nemesis、Ganymede，各自精確遊戲ID寫入接入表。Gienah／Hypatia目前借用Aldebaran／Nix美術，本批交獨立形象，接入時只改目標引用，不改其他共用圖。Mercury的新版本另存，不覆寫maiden-04原標準。Posterior／Alpheratz／Alrami未找到可玩角色定義，gameCharacterId仍null，僅交新角色素材供內容整合。

## 已完成

逐張view_image檢視11張標準，依同角色單張最新標準呼叫imagegen，沒有用合圖或另一角色當生成參考。11位靜態透明SD候選全部完成，實際提示與生成輸出來源保留在索引；沒有用程式改繪人物。Alpheratz的機甲搭檔就在她的同一標準圖中，作裝備複合sprite，不是第二名角色參考。

另交11張768×1152立繪WebP、11張256×256頭像、11張1024×1024透明SD WebP。Canvas只做個別裁切、等比縮放／框置與編碼；SD網頁輸出至少80px透明安全留白。主檔全部保留，頭像與SD分開。

catalog.json／library.sqlite3記11位55項素材：assetId、角色ID、原圖hash／版本、用途、尺寸、pivot、安全區、提示來源、預覽與待審狀態。integration-assets.json交媒體對應；integration-plan.json提供8位目前舊引用與新引用、3位新素材，這是可審閱的接入計畫，不是已啟用manifest。無玩法／數值／技能／核心／全域manifest修改。

## 驗證與限制

- `python art/characters/stellar11-20261026/verify-catalog.py`：11位55項素材hash／尺寸／解碼、SD透明安全留白、SQLite完整性與外鍵；73張既有標準原圖hash均未變。
- `source scripts/env.sh` 後 `node art/characters/stellar11-20261026/check-preview.mjs`：Chromium桌機1440×1000 DPR1與觸控viewport390×844 DPR2，11位、每模式33張顯示圖解碼、原立繪／SD切換、詳細資料、明暗底、無水平溢出通過；證據在本批evidence/，頭像總覽已目視。
- 沒有跑無關核心／671世界或完整發布流程；這是素材viewport試套，非實機或遊戲戰鬥驗收。

來源標準含柔光背景殘留，原檔位元組保留，不宣稱乾淨去背；SD另生成透明底。Nemesis實際原圖1042×1509，其他10張1024×1536；來源manifest一律寫1024×1536，catalog明記差異並用實際解碼尺寸，網頁等比框置不拉伸。

全部新產物awaiting-user-review，未自行approved。M1約2.4頭身是生成目標，實際比例與細節仍待逐張審閱，不假稱精確比例量測或商業品質核定。SD是單張靜態候選，未交動畫幀／骨架。Alpheratz機甲、Posterior六翼、Nemesis四尾及其他長武器／推進器的pivot為整體輪廓底部，整合者需校準顯示尺度與錨點，非碰撞範圍。

Hypatia原標準是來源作者的原創學者詮釋，未提供原作外觀證據；本次只依收到的實圖生成，不按名字猜設計。來源歷史中的其他使用者回饋不升格為本repo核定。

## 整合者下一步

從固定入口審閱11位立繪、Q圖、頭像與身分修正。按integration-plan.json只更新8位目標角色呈現引用，新增3位需內容作者先建立定義。另註冊新asset與建置複製路徑，保留舊assetID、舊標準與共用引用；不得靠extension載入順序覆寫。

本機預覽：repo root執行 `python -m http.server 5186 --bind 127.0.0.1 --directory art/characters/stellar11-20261026`，開啟 `http://127.0.0.1:5186/preview.html`。
