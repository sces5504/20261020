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

資源方案以原生卡片詢問：保留四資源＋配方預設／批次操作（推薦）、兩資源重設、先保留試玩後再定。沒有回答就保持pending；不要預設採推薦。若本chat稍後收到答案，優先依最新直接回答與更新後規格。

融合／配點／被動只有部分規則與UI證據，完整成本尚未恢復；不能宣稱成長簡化已可以完整等價換算。下一步針對具體consumer與資料追查，不重新全量解析已有表。

六名來源候選Earth／Mercury／Venus／Mars／Uranus／Moon與SolarSystem未核定；多數技能完整效果仍需追查。缺預期OBB `main.431.com.mistgame.smus.obb`、132565279 bytes，repo無PNG／音訊／骨架二進位；不能把metadata當可發布素材。

保留影片共通玩法基準，4.3.2作可追溯數值來源；研究不是自動批准玩法。已確認九題不重問，未實作／未執行的內容不宣稱完成。

## 驗證與提交

研究檢查在`b51525c`的研究內容上執行，未修改原研究包。新分析的資源總和保留與投影L1下界sanity通過。其上加本輪未提交修改驗證：13份當前文件、21個本地連結、5段JSON與fence配對通過；分析腳本AST與7條唯讀SQL通過；`template-check.py`10項範本契約通過，game status仍uninitialized；`git diff --check`通過。新增此結果與舊交接導向後再做whitespace檢查。

本輪不提交generated SQLite／分析JSON；它們可由已提交腳本重建。將來源main與既有規格安全整合後，以普通fast-forward push同步main供其他chat接力，無force push。最終commit／遠端成功與否以本chat最後工具結果及Git為準；沒有遊戲、真機、效能或部署驗收。
