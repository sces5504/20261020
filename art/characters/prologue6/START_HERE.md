# 序章六位角色美術：固定整合入口

素材固定放在 repo 的 `art/characters/prologue6/`，包含使用者六張原立繪與各自單圖參考生成的 Q 版候選。遊戲接入交整合者，本目錄不會自動啟用角色。

- [完整交接](../../../docs/handoffs/prologue6-character-art-20261023.md)
- [接入對應表](integration-assets.json)：portrait／avatar／sprite、原作 Key／CID、來源 hash。
- [素材索引](catalog.json)／[SQLite](library.sqlite3)：外觀鎖定、版本、尺寸、pivot、安全區與審閱狀態，共6位／30項素材。
- [桌機 Q 圖總覽](evidence/desktop-battle.png)／[手機試套](evidence/mobile-battle.png)。

| 顯示名 | 美術 key | 原作 Key | CID |
| --- | --- | --- | ---: |
| 盾牌座UY | scuti | Scuti | 107 |
| 心宿二 | antares | Antares | 99 |
| 天津四 | deneb | Deneb | 73 |
| Doradus（中文待核） | doradus | Doradus | 48 |
| Mucephei（中文待核） | mucephei | Mucephei | 62 |
| Sargas（中文待核） | sargas | Sargas | 101 |

## 接入用路徑

- `standards/<key>.png`：附件原 PNG，保留位元組，不覆寫。
- `web/<key>.webp`：768×1152 立繪網頁輸出。
- `avatars/<key>.webp`：256×256 個別頭像裁切。
- `battle/<key>-v1-candidate.png`：Q 版 PNG 主檔。
- `web/<key>-battle.webp`：1024×1024 透明 Q 圖，等比縮放加安全留白。
- `prompts/<key>-battle-v1.txt`：實際生成提示。

Mucephei／Sargas 的主形象為本案原創候選，尚無可核對原作外觀；Doradus／Mucephei／Sargas 的中文名繼續待核，勿自行翻譯升格為定案。來源星數與序章職能僅metadata，不是本批修改數值／技能／劇情的指令。

gameCharacterId 全為 null，future ID僅供候選對應。原作世界資料可能有同名敵人或單位，不能當成已建立的少女角色ID。接入時核對原作Key及CID，再建立／綁定角色內容。

全數衍生圖仍 awaiting-user-review；Q 圖為單張靜態候選，未提供動畫幀或骨架。Sargas 包含腳下裝備箱；其 pivot 為整體輪廓底部，場景錨點需整合者校準。大盾、長槍、羽翼與屏障柱也只屬視覺設備，不決定碰撞或技能。

校驗：`python art/characters/prologue6/verify-catalog.py`。預覽：在 repo root 執行 `python -m http.server 5184 --bind 127.0.0.1 --directory art/characters/prologue6`，開啟 `http://127.0.0.1:5184/preview.html`。
