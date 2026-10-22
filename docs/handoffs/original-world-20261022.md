# 完整原作世界／敵人／Boss／美術

## 授權與範圍

使用者2026-10-22直接要求完整原作地圖與敵人，包含全星域／主線／高難、每日Boss／活動與其圖片，數值依原作邏輯。使用者明確追加：**「你一併補必要欄位與流程，沿用架構（這次的特殊授權）（要記錄，這樣核心ai跟其他工作ai才知道）」**。本輪世界作者可增補實現該內容必要的共用schema／domain／application／存檔／UI／工坊／整合與測試，這是原先唯一核心整合者分工的單次例外；其他AI避免競改，先核對本交接。已寫owner-preferences、decisions及memory/index。

不恢復取消的防衛／失守／修復／獎勵避彈訓練、不動原六角色圖片、不購買服務、不建另一套Combat。沿用0.6封閉彈幕／技能原語與navigation／formation；原作資料不足處明標推定，不用未知欄位假裝確證。

## 起點與分支

- origin/main `5e6d471`，核心0.6.0，前輪beacon已由PR #8整合、PR #11啟用；不能覆蓋核心後續對beacon0.3.0彈幕更新。
- 本輪分支 `content/original-world`，開工clean。既有原圖／外觀不改，新增使用 `original:` 命名空間。
- 原作入口research/stella-maiden/START_HERE；SQLite局部查詢，來源archive唯讀。

## 盤點檢查點（尚在實作）

`tools/world/inventory.py`可重建 `content/source/original-world/`。來源14個非None星域、85顆PID星球、529個非None SpawnPoint、940個非空Wave。所有Wave與每日Boss用65個CID，按來源model欄可分62個外觀識別；Probe／Scout／Fighter的01與99共用原來源model，不隨等級重新畫圖。529節點包含None-region、Dummy與事件／未啟用佔位，不等於529個正式星球。

原生確證：Wave七組CID/count與主要Wave行索引；CID.f15／f16／f17逐級ATK/DEF/HP整數取整。PID.f05→GalaxyN_M波次與f12/f13座標、四資源欄序為跨列及wiki交叉推定。Galaxy／PID／Wave原列與索引完整保留。

已實際查公開Namu總覽／太陽系／處女座：正常星域需全敵據點各勝一次才開下一區、太陽系12星球固定解鎖順序、其他行星不一律串接、星球資源類型。具名Boss可用的技能／彈幕需依現有來源庫對接。原作逐幀／OBB仍無實機證據，不據此省略已授權可重建的流程。

## 下一步

完成全內容與原生數值adapter、節點種類／每日／活動共用欄位與命令、完整美術、整合及驗證。保持本文件檢查點更新；尚未宣稱內容／完整發布完成。
