# 2026-10-26 十一位新繪／重繪：固定整合入口

交付 PR：[#44](https://github.com/sces5504/20261020/pull/44)，素材提交 `a6575fa`。

本批固定在repo `art/characters/stellar11-20261026/`。11張使用者Drive最新立繪與各自單張標準參考生成的11張Q版候選已完成，交美術包與試套給整合者。

- [完整交接](../../../docs/handoffs/stellar11-character-art-20261026.md)
- [素材接入表](integration-assets.json)／[8位更新＋3位新素材整合計畫](integration-plan.json)：精確目標ID、舊引用與新assetId。
- [素材JSON索引](catalog.json)／[SQLite](library.sqlite3)：11位／55項素材，含版本、hash、來源提示、pivot、安全區、外觀鎖定與待審狀態。
- [互動預覽](preview.html)／[桌機Q圖總覽](evidence/desktop-battle.png)／[手機試套](evidence/mobile-battle.png)／[頭像裁切](evidence/avatar-crops.png)。

## 角色對應

| 顯示名 | key | repo CID | 遊戲接入目標 |
| --- | --- | ---: | --- |
| Posterior | posterior | 123 | 新角色素材，待內容定義 |
| Alpheratz | alpheratz | 120 | 新角色素材，待內容定義 |
| Alrami | alrami | 119 | 新角色素材，待內容定義 |
| Gienah | gienah | 118 | story40:character.gienah |
| 水星 | mercury | 3 | m1:mercury |
| 少衛增八 | alrai | 63 | story40:character.alrai |
| 弧矢一 | wezen | 57 | story40:character.wezen |
| Hypatia | hypatia | 65 | story40:character.hypatia |
| 冥王星 | pluto | 10 | solar10:character.pluto |
| 復仇女神星 | nemesis | 11 | solar10:character.nemesis |
| 木衛三 | ganymede | 16 | solar10:character.ganymede |

使用者已明確確認來源`posteior`為拼字誤植，採`Posterior`（CID123）；Alpheratz以名字為主，採repo CID120，來源ID115只留metadata，不綁到Elacrab。原始manifest完整留在source-records/，不改寫來源。

Gienah／Hypatia分別替換目前借用的Aldebaran／Nix美術；只能改目標角色引用，不直接覆寫共用圖。水星是m1:mercury的新版本，六張M1 standard原檔不動。Posterior／Alpheratz／Alrami目前未找到可玩角色定義，本批不自行新增數值或技能。

## 素材路徑與版本

- `standards/<key>.png`：Drive原圖位元組保留；實際尺寸見索引。Nemesis為1042×1509，其他10張1024×1536；來源manifest的Nemesis尺寸敘述有誤。
- `battle/<key>-v1-candidate.png`：11張imagegen透明SD主檔，實際提示在prompts/。
- `web/<key>.webp`：768×1152立繪輸出，等比縮放與框置，不拉伸。
- `avatars/<key>.webp`：256×256逐位臉部裁切。
- `web/<key>-battle.webp`：1024×1024透明SD輸出，等比縮放並加至少80px安全留白。

全數awaiting-user-review，沒有自行approved。M1約2.4頭身為生成目標，比例／髮型／配件細節仍待逐張核定；不是精確比例量測或動畫驗收。SD是獨立繪製的靜態圖，不是裁立繪，也沒有動畫幀／骨架。Alpheratz同張sprite包含一位少女與機甲搭檔；翼、長兵器、四尾與推進器均需整合者校準顯示尺度及pivot，不能當碰撞範圍。

立繪原檔的柔光殘留保持原樣，另有新SD透明圖。來源manifest的外部生成歷史／核定字句只留來源資料，不作本repo授權。來源所列retainedVersions不在ZIP內，未宣稱已封存。

## 驗證與預覽

`python art/characters/stellar11-20261026/verify-catalog.py`：本批55項素材hash／尺寸／解碼、SD透明安全區、SQLite完整性，73張既有標準原圖hash未變。

repo root執行 `python -m http.server 5186 --bind 127.0.0.1 --directory art/characters/stellar11-20261026`，開啟 `http://127.0.0.1:5186/preview.html`。桌機1440×1000／觸控viewport390×844 DPR2的素材試套通過，不代表真機、遊戲戰鬥或完整發布驗收。
