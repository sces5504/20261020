# 十位角色美術：固定整合入口

後續批次：[十位新角色＋木星形象更新](../stellar11/START_HERE.md)；木星的新原圖與Q圖另存版本，本批舊素材保留。

本批素材固定放在 repo 的 `art/characters/stellar10/`，不依賴聊天附件、下載目錄或 `/workspace/generated_images`。整合者取得此批 Git 提交後，即可從本檔開始。

- [完整交接與驗證結果](../../../docs/handoffs/stellar10-character-art-20261022.md)
- [素材接入對應表](integration-assets.json)：各角色 portrait／avatar／sprite 的 assetId、路徑與 hash。
- [完整美術索引](catalog.json)：角色外觀鎖定、來源原圖版本、尺寸、pivot、安全區與審閱狀態。
- [本批 SQLite 資料庫](library.sqlite3)：characters 與 assets 表。
- [桌機 Q 圖試套總覽](evidence/desktop-battle.png)；[手機試套](evidence/mobile-battle.png)。

## 接入用檔案

| 用途 | 固定路徑 |
| --- | --- |
| 使用者原立繪，禁止覆寫 | `standards/<key>.png` |
| 立繪網頁輸出 | `web/<key>.webp` |
| 頭像 | `avatars/<key>.webp` |
| Q 版網頁輸出，已加透明安全區 | `web/<key>-battle.webp` |
| Q 版 PNG 主檔 | 依 `catalog.json` 的 `battleAsset.path`，勿掃目錄自行挑舊版 |

十位 key：sun、jupiter、saturn、neptune、pluto、nemesis、ganymede、io、titania、ariel。

新版採接近第一里程碑的 Q 版比例。太陽等使用 v2，涅墨西斯使用 v3；其他版本僅封存。全數衍生素材仍為待審候選，Q 圖為單張靜態圖，沒有動畫幀。

使用者指定本輪交美術包與試套，遊戲接入交整合者；本批未變更玩法、角色數值、技能、核心或全域載入設定。gameCharacterId 仍為 null，future ID 僅供對應，不能把這份美術表當成已啟用內容包。

校驗：在 repo root 執行 `python art/characters/stellar10/verify-catalog.py`。
