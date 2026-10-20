# Stella Maiden 0.4：逆向研究接入

## 目前任務與來源

使用者在本chat要求更新main，讀AGENTS／START_HERE，驗證研究、建立SQLite、局部查詢並保留已知／推論／未知。仍延續詳細規格任務，不製作遊戲。

開工branch／HEAD：`work`／`30f408e`，乾淨。來源main更新至`16e64e5`。建立備份`backup/stella-spec-v03`，合併為`b51525c`後切本地main；決策檔衝突保留兩側內容。沒有reset、沒有丟棄既有規格。

## 已完成

- 讀更新後AGENTS、研究START_HERE、研究交接、reconstruction_spec及目前功能所需局部報告。
- 審閱verify／build／check／query與import依賴，使用Python標準庫，不安裝工具、不執行原APK。
- verify_bundle通過：863 manifest檔、67表／37723列重編碼、370份bXML重建、124種opcode索引與4個有界傷害樣例。
- 建立`research/stella-maiden/generated/stella_research.sqlite`，check_database通過integrity與角色／技能、關卡／波次、配方／角色、事件label關聯。generated在Git ignore。
- 新增`docs/research/apk-spec-integration.md`、有界SQL與`scripts/analyze-stella-spec.py`；原研究包／MANIFEST／來源hash未改。
- 資源分析：普通未排除112配方、高級81；三種兩兩相加不新增完全配方碰撞，但分別改變21～25／112、39～48／81個測點的第五距離含同距集合。僅排序幾何，不含最終抽選或服務。
- 重跑Sun Lv100（ATK110／HP2336／DEF440）、Skill1 Lv10模板（9300ms、5700ms、攻速倍率185%）、樣例配方。保留有界／靜態限制。
- 主規格0.4、架構、資料契約、研究索引／未知清單、製作計畫與記憶同步；修正原先純泛用傷害／抽卡抽象可能覆蓋原生行為的問題。

## 尚待與下一步

資源已於後續直接回答定案：保留四資源，用配方預設、一鍵投入與批次管理簡化，見末尾0.5。不要再維持pending或默認改成兩資源。

融合／配點／被動只有部分規則與UI證據，完整成本尚未恢復；不能宣稱成長簡化已可以完整等價換算。下一步針對具體consumer與資料追查，不重新全量解析已有表。

六名來源候選Earth／Mercury／Venus／Mars／Uranus／Moon與SolarSystem未核定；多數技能完整效果仍需追查。缺預期OBB `main.431.com.mistgame.smus.obb`、132565279 bytes，repo無PNG／音訊／骨架二進位；不能把metadata當可發布素材。

保留影片共通玩法基準，4.3.2作可追溯數值來源；研究不是自動批准玩法。已確認九題不重問，未實作／未執行的內容不宣稱完成。

## 驗證與提交

研究檢查在`b51525c`的研究內容上執行，未修改原研究包。新分析的資源總和保留與投影L1下界sanity通過。其上加本輪未提交修改驗證：13份當前文件、21個本地連結、5段JSON與fence配對通過；分析腳本AST與7條唯讀SQL通過；`template-check.py`10項範本契約通過，game status仍uninitialized；`git diff --check`通過。新增此結果與舊交接導向後再做whitespace檢查。

本輪不提交generated SQLite／分析JSON；它們可由已提交腳本重建。將來源main與既有規格安全整合後，以普通fast-forward push同步main供其他chat接力，無force push。最終commit／遠端成功與否以本chat最後工具結果及Git為準；沒有遊戲、真機、效能或部署驗收。

## 0.5：使用者確認四資源

續作main／HEAD `c0548dd`，乾淨，fetch後main無新增。使用者原生卡片直接選「保留四資源，用配方預設、一鍵投入與批次管理簡化操作」。此題已結束，成長消耗／具體角色等仍保留原未知。

已同步主規格U-18、資源／召喚、D-03、資料契約、研究結論與記憶。interaction-flows第16節補預設版本／四項量值、一鍵只填入、缺額不改比例、批次開工全成或不開、各job領取receipt及R-01～07未來驗收；這些是操作提案，不宣稱已有遊戲功能。

本輪只有文件變更，原研究包與分析工具未改，不重跑其已通過檢查；檢查文件連結／JSON／需求ID／whitespace後提交並普通push main。下一步追四槽正式名稱映射、融合／配點／被動消耗及切片行為覆蓋，不重新詢問資源種類。

0.5驗證：在`c0548dd`加本輪文件修改檢查11份相關文件、21個本地連結、5段JSON、fence與U-01～18唯一性，均通過；whitespace通過。新增此紀錄後再檢whitespace並提交。未執行遊戲或新增研究分析。
