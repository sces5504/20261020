# Drive 四十位角色美術：固定整合入口

交付 PR：[#37](https://github.com/sces5504/20261020/pull/37)，素材提交 `88c9f49`。

素材固定放在 repo `art/characters/stellar40/`。40張使用者立繪原檔與40位獨立參考生成的Q版候選已備妥；本批只交美術與試套，遊戲接入交整合者。

- [完整交接](../../../docs/handoffs/stellar40-character-art-20261025.md)
- [接入表](integration-assets.json)：portrait／avatar／sprite、原作Key／CID、hash與版本。
- [JSON索引](catalog.json)／[SQLite資料庫](library.sqlite3)：40位、200項目前選用素材；另保留6張較早Q版候選。
- [互動預覽](preview.html)：四批各十位、原圖／Q版、明暗底與78px靜態尺寸。
- 桌機總覽：[1–10](evidence/desktop-battle-1.png)、[11–20](evidence/desktop-battle-2.png)、[21–30](evidence/desktop-battle-3.png)、[31–40](evidence/desktop-battle-4.png)。
- 手機試套：[1–10](evidence/mobile-battle-1.png)、[11–20](evidence/mobile-battle-2.png)、[21–30](evidence/mobile-battle-3.png)、[31–40](evidence/mobile-battle-4.png)。

## 素材路徑

- `standards/<key>.png`：Drive標準原圖，保留位元組；1024×1536。
- `web/<key>.webp`：768×1152立繪網頁版。
- `avatars/<key>.webp`：256×256逐位頭像裁切，與SD分開。
- `battle/<key>-v1-candidate.png`／部分`v2-candidate.png`：Q版生成主檔。實際選用版本依接入表。
- `web/<key>-battle.webp`：1024×1024透明SD網頁版，等比縮放加至少80px安全留白。
- `prompts/`：本次實際生成提示；`source-records/`：Drive原交付索引。

所有新素材均 `awaiting-user-review`，沒有自行核定。Q版為單張靜態候選，未製作動畫幀／骨架。M1約2.4頭身為生成目標，實際比例、外觀細節與配件位置仍需逐張核定。船尾座ξ改正面守備姿勢，與標準圖背身抬腿不同；差異已列審閱備註。六位v2修正背景暈光或劍尖，v1完整保留。

來源立繪含柔光背景殘留，原檔不修改；弧矢一原圖alpha範圍為1–254。Q版輸出另有透明背景。原始ZIP未附其索引提及的提示實檔或SQLite，未宣稱取得。

`gameCharacterId`全為null；future ID、原作CID與來源星數僅對應metadata，不能當作已建立的可玩角色或數值規格。包含設備箱、長兵器、浮游砲或特效的pivot為整體輪廓底部，場景錨點需整合者校準，非碰撞判定。

## 角色對應

| 顯示名 | 美術key | 原作Key | CID |
| --- | --- | --- | ---: |
| 北極星 | polaris | Polaris | 61 |
| 海姆達爾 | heimdal | Heimdal | 13 |
| 克魯特尼 | cruithne | Cruithne | 14 |
| 火衛一 | phobos | Phobos | 15 |
| 瑞亞 | leah | Leah | 18 |
| 天衛二 | umbriel | Umbriel | 21 |
| 海衛七 | larissa | Larissa | 22 |
| 尼克斯 | nix | Nix | 23 |
| 許德拉 | hydra | Hydra | 24 |
| 軒轅十四 | regulus | Regulus | 34 |
| 阿爾卡斯 | arkas | Arkas | 35 |
| 南河三 | procyon | Procyon | 36 |
| 魯坦星 | luyten | Luyten | 38 |
| 天社一 | regor | Regor | 39 |
| 天紀 | tseenke | TseenKe | 40 |
| 天社五 | suhail | Suhail | 41 |
| 天壇座α | alherem | Alherem | 42 |
| 蒼蠅座 | musca | Musca | 43 |
| 十字架二 | acrux | Acrux | 44 |
| 水委一 | achernar | Achernar | 45 |
| 天苑四 | ran | Ran | 46 |
| 天苑四b | aegir | Aegir | 47 |
| 天園一 | acamar | Acamar | 49 |
| OTS 44 | ots44 | OTS44 | 50 |
| DEN | den | DEN | 51 |
| 天狼星 | sirius | Sirius | 52 |
| 貝葉斯 | bayes | Bayes | 53 |
| 魯弗斯 | rufus | Rufus | 54 |
| 船尾座ξ | asmidiske | Asmidiske | 55 |
| 大犬座 | canis | Canis | 56 |
| 弧矢一 | wezen | Wezen | 57 |
| 弧矢七 | aludra | Aludra | 58 |
| 孫增一 | furud | Furud | 59 |
| 弧矢增二十二 | naos | Naos | 60 |
| 少衛增八 | alrai | Alrai | 63 |
| 織女星 | vega | Vega | 66 |
| 北極二 | kochab | Kochab | 68 |
| 畢宿五 | aldebaran | Aldebaran | 89 |
| 五帝座一 | denebola | Denebola | 117 |
| 天樞 | dubhe | Dubhe | 127 |

## 本機檢查

`python art/characters/stellar40/verify-catalog.py` 核對本批hash、尺寸、SD透明安全區與SQLite，並保護33張既有標準原圖。

預覽：repo root執行 `python -m http.server 5185 --bind 127.0.0.1 --directory art/characters/stellar40`，開啟 `http://127.0.0.1:5185/preview.html`。瀏覽器證據只涵蓋Chromium桌機1440×1000與觸控viewport390×844，不代表實機、遊戲戰鬥或動畫驗收。
