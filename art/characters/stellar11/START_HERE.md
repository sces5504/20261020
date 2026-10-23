> 0.8 接入更新（2026-10-23）：十人與既有木星三類素材已透過stellaart:package.stellar11@0.1.0綁定，根content/manifest.json的characterPresentation為本批正式遊戲引用。木星保留原角色ID與戰力，舊素材仍保留；素材人工品質狀態仍為候選。公開部署結果依整合PR #17與version.json核對。

# 十位新角色與木星更新：固定整合入口

本批素材固定放在 `art/characters/stellar11/`。這是美術交付，遊戲接入由整合者處理，不需另向聊天作者索取 ZIP。

- [完整交接](../../../docs/handoffs/stellar11-character-art-20261023.md)
- [接入對應表](integration-assets.json)：十位新角色、木星更新，portrait／avatar／sprite、來源 hash 與替換前引用。
- [完整素材索引](catalog.json)：外觀目視鎖定、原圖版本、尺寸、pivot、安全區與來源。
- [本批 SQLite](library.sqlite3)：characters／assets 表，11 位／55 項素材。
- [桌機 Q 圖總覽](evidence/desktop-battle.png)；[手機試套](evidence/mobile-battle.png)。

| 用途 | 本目錄內固定路徑 |
| --- | --- |
| 附件原立繪，位元組保留 | `standards/<key>.png` |
| 立繪網頁輸出 | `web/<key>.webp` |
| 頭像裁切 | `avatars/<key>.webp` |
| Q 版 PNG 主檔 | `battle/<key>-v1-candidate.png` |
| Q 版 WebP，含透明安全區 | `web/<key>-battle.webp` |
| 生成提示 | `prompts/<key>-battle-v1.txt` |

十位新角色 key：arcturus、gliese、vello、e581、valencia、linda、izar、seginus、spica、wolf359。木星更新 key：jupiter。原作 581E 的美術 key 是 e581，研究候選表建議 ID 為 future:star-581e，不能當同名格利澤或靠順序綁定。

## 木星：更新既有角色，勿新增第二個木星

本輪為銀白長雙束髮、紅眼、遮左眼瀏海、白銀金邊裝、雙腿側收坐姿，標準版本 `v11-safe-seated-user-pose-direction`。接入既有 `solar10:character.jupiter`；對應表提供先前橘髮版的三個媒體 assetId／hash。保持技能、戰力、配方、稀有度、收藏及存檔 ID，不移除前批素材。

木星 Q 圖也含長凳。pivot 是整體視覺輪廓底部，包含長凳；動態戰鬥的場景錨點需整合者實測。此包沒有站姿動作、骨架或動畫幀，不能把靜態坐姿宣稱成完成戰鬥動畫。

全數衍生圖為 awaiting-user-review。附件星數僅來源記錄，不等同已修改遊戲稀有度。原始六位與前批十位標準圖全數保留。

校驗命令：`python art/characters/stellar11/verify-catalog.py`。預覽從 repo root 執行 `python -m http.server 5183 --bind 127.0.0.1 --directory art/characters/stellar11`，再開 `http://127.0.0.1:5183/preview.html`。
