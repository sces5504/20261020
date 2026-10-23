# Galaxy Angel 0.8：第二輪整合與操作改善

來源：2026-10-23（Asia/Taipei）使用者要求接替整合 AI 1，整合新十人／全部世界，修正重複角色、返回、編隊、派駐立繪及隊長擋彈。從實際遠端 main `a7dcdb6`（0.7，PR #15）開始，不回舊 foundation。PR #14、#16 以 merge 保留作者提交。

## 驗收條件

- 26 位角色，story10 十人各自對應 CID／原作技能、可共鳴、完整立繪／頭像／Q圖；木星只更新媒體，原ID／數值／技能／配方不變。新33媒體明確接入manifest、SHA複製、工坊及ZIP，原六圖與前批原檔不改。
- 角色選單每種少女一張卡，標持有數。優先顯示編隊、派駐、培養中的實例；詳情用小圖切換所有持有實例，不合併／刪除存檔。重複角色仍可獨立編隊或派駐，同調只消耗既有規則允許的實例，選材使用小圖。
- 角色選單直接可調編隊；每個編隊槽最上方有移出按鍵，戰鬥中與最後一人禁用。領地建設可返回總覽，保留管理暫停。領地卡／建設畫面有派駐少女立繪、姓名與加成，未派駐明示。
- 戰中以隊長面向最近敵人或玩家選定敵人，後排在隊長背後單列（距離為既有隊距0.72倍），全員同幀接收玩家位移。朝向最多2.4弧度／秒，位置以有限速度逐步收攏，不瞬移；整隊修正不能抵銷玩家閃避方向。探索仍沿原航跡追隨、掉頭等待；仍共用FleetMotion與同一碰撞，沒有額外無敵、嘲諷或傷害轉移。正面普通彈實測先命中隊長，不保證側射、穿透與包圍攻擊皆被攔截。
- 原0.7的48新增區域／754節點／671來源遭遇、7高難、25事件航跡、每日母艦繼續使用原有世界／Combat／日期額度。不另建第二套遭遇引擎。劇情與任務敘事留給使用者後續交付，已納入的戰鬥與每日流程本次可用。

## 每日任務

同一 Quest 定義增量 `repeat=once/daily`（舊包預設once）、`utcOffsetMinutes=540`、`resetHour=0`。KST午夜即台灣23:00；各任務可在工坊調整。事件條件新增battleWon／leveled／healed／constructed／upgraded／eventWon；summoned／built可使用每日計數。daily不可發放角色、不能使用intro或星球布林條件，schema語意校驗拒絕。

原作 `research/stella-maiden/tables/Quest.json` 共13類；局部SQLite localization核對 EnemyBase／SummonGirl／ForceGirl／HealGirl／Construct／BuildUpgrade／EventQ 文案。七項採用來源 `f02=1` 次與 `f10..13` 四槽基本獎勵：前五每種50、設施升級每種100、委託50／0／50／0。沒有誤把 f14..17 進階獎勵當已知日常公式。四槽對本作資源名稱、EnemyBase放寬成一次遭遇勝利、EventQ用事件航跡勝利，是明示適配（inferred），非原生任務controller執行認證。

來源剩餘六類：TrainQ／WaveQ／PvPTrainQ屬已取消訓練／入侵防衛；SellGirl不對應本作手動同調，不能擅自恢復遣返；SummonItem／ForceItem屬本輪未新增的裝備系統。保留來源，不把這些變成無法完成的假每日任務。

Save schema1新增預設空 `dailyTasks[questId]={period,progress,claimed}`。成功的domain交易／工作完成／遭遇結果推進計數，失敗不計；相同receipt不重計。工作以ends歸屬完成日期，離線不補戰鬥。每天獨立領取，過期未領不累加；回退時鐘不清除較新的帳本。每日與原本一次性quests憑據、每日母艦dailyClaims／dailyAttempts分開，不相互誤扣或重發。航行紀錄上方有進度、獎勵、更新倒數與已領狀態；開著面板跨日也更新。

## 架構與來源邊界

核心0.8.0，來源技能庫與世界數值無修改，extension requires精確更新；story10 0.2.0僅升依賴與移除過期缺圖描述。stellaart:package.stellar11@0.1.0依賴story10@0.2.0，根characterPresentation按CID/sourceRow核對綁定，不按中文順序猜角色。木星舊三媒體仍保留在原包。

新的每日行為位於純domain/daily-quests.ts、既有economy事件流；UI不直接扣款／領獎。內容仍為封閉schema，無角色ID條件、eval、第二套戰鬥或重置玩家草稿。ZIP原有64MiB／128MiB／30MiB防護保留。新素材candidate與靜態Q圖界線不變，不假稱完成骨架動畫。

完整發布需九組瀏覽器（原八組全保留，新增test:integration-v8）、核心測試、內容／型別／build與playtest readiness；commercial人工素材批准、獨立接力、Android／iOS真機與硬體效能證據繼續未通過。
