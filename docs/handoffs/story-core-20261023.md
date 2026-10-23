> 通用功能與六人整合已完成；整合PR [#20](https://github.com/sces5504/20261020/pull/20)。最終main完整發布／公開站精確收據以PR最新描述為準，避免為記錄部署自己的SHA再觸發一輪發布。下方是如實保留的過程與局部驗證，不能把歷史失敗當目前待修。

# 整合AI3 · 24節點通用核心／六人／入口／圖鑑

本輪直接授權（2026-10-23）：為完整序章＋太陽系＋處女座24原作節點補必要schema、任務／事件、存檔、UI、工坊、測試；正式故事由劇情AI製作，不代寫或核定。另整合六人與美術、改善高難／活動入口、提供跟正式遊戲資料同步的主立繪／Q圖gallery。README由使用者管理。

## 接手核對

實際repo `/workspace/20261020`；初始分支work、HEAD `ff7d31a904a02109e49670897333279e4807beed`，乾淨。命令列fetch第一次因sandbox代理無法連線失敗；啟用命令網路權限後fetch成功，遠端main與GitHub工具均確認同SHA。保留0.8最終PR #17完整發布／公開證據，早期候選缺背景失敗是歷史，非本輪待辦。沒有重跑671來源遭遇。commercial仍缺人工素材批准、獨立接力、Android/iOS真機及硬體效能證據。

六人交付PR #18（角色／原技）與 #19（美術）已merge進本輪分支，保留作者原提交：`a4540dd`／`26e5ae1`，不cherry-pick改寫。六人是Scuti、Antares、Deneb、Doradus、Mucephei、Sargas，原26人保留，合計32人。後三位中文名仍待核；Mucephei獨立過載補彈速的原作者適配保留，不改共享來源技能。

## 資料與實作

- 研究包verify PASS：863檔、67表37,723列、370 bXML；SQLite已建立。未執行原版APK。
- `docs/design/story-core-requirements.md`先交來源→舊支援→必要擴充表；`tools/story/trace.py`按QuestS[1..24]與EventScript label第一匹配row，追蹤EventSpot／Script key，保留各operand，輸出`docs/verification/story-core-source.json`。正label不等於停止點，順序到End；f34/f35不認作speaker。
- core0.9.0：story嚴格條件／步驟、actor/NPC素材、storyEncounter共用Combat；存檔schema1新增有預設的story帳本，完成／已讀／領獎獨立，初始化receipt、舊檔resumeIf、流程signature。
- story步驟／戰中cue／戰前後對話與安全略過、只讀回看；工坊能建NPC與填嚴格story／storyEncounter JSON、校驗、套用隔離測試與ZIP。
- Combat增加護送／保護／限時存活／防衛／清敵目標、角色定時進退場／換隊／移動／生命門檻與增援。不改既有敵人數值、原技能、四資源、五次手動同調／紫星／滿階25%實際配方返還，不恢復日常入侵／失守／修復。
- 以明確航區category區分campaign/hard/event/daily，高難／活動面板列逐站實際航路、前置與目前區內挑戰導航；不開繞過前置的傳送。
- 32人三圖正式manifest接入。獨立`gallery.html`與`#/gallery`／相容`#/art`，讀同一正式snapshot，搜尋＋主立繪／Q圖切換；不再是固定六人。
- 完整作者契約／欄位與測試範例：`docs/design/story-core-authoring.md`。正式24節點尚未由內容作者提供，沒有把測試fixture啟用於正式manifest。

## 驗證記錄（階段，不把待跑寫成通過）

- 初次typecheck因未安裝tsx未執行；首次npm ci因未source環境導致不可寫預設cache失敗，source scripts/env.sh後lockfile安裝PASS。
- content:check、typecheck與build階段PASS：10包、32角色、758節點。後續以最終發布收據為準。
- 新domain測試首次5/7通過，發現護送移動被編隊移動覆蓋與角色換隊讀敵人欄位；修正後只重跑失敗2項PASS。舊檔／條件變更另驗2項PASS。
- 瀏覽器首次sandbox不允許listen，開命令網路權限後可執行；第一次選擇器重複是測試錯誤，縮至deck-nav。後續實際流程找出取得彈窗在新章節期間插入導致戰鬥暫停，已阻擋章節進行中自動取得／戰果彈窗。流程繼續到回看驗證，原測試錯把正常checkpoint receipt當劇情副作用；改比對故事／遭遇收據與完成／已讀／已領／角色／資源。
- 瀏覽器最終結果、完整發布、公開驗證待後續末段及整合PR描述，未標為通過。

## 真正接力事項

劇情AI使用0.9契約製作正式24節點、確認speaker及任務／對話，保留來源row／label。素材AI依正式劇情逐列補NPC差分、背景與艦隊／屏障等演出素材；主立繪／Q圖已有不等於所有差分齊備。角色AI核三個中文名。這些內容不是通用核心未實作；正式內容交付後依受影響路徑整合，不重跑未改671場。

當前分支`feat/story-core-v9`。最後狀態與部署收據請看後續追加段／PR，以上驗證是過程記錄。只測必要路徑，完整check release留最終main發布一次；失敗只補跑失敗或受修改影響項。不用功能測試宣稱商業品質或真機驗收。

## 新流程局部驗證完成

桌機1440×1000與觸控viewport390×844（DPR2）新story browser PASS：32人獨立圖鑑、搜尋與Q圖解碼、略過初始化、重載不重發、真實2秒防衛＋戰中對話、完成／已讀／領獎分離、回看不改故事狀態／角色／資源、高難／每日入口、空NPC分類工坊新增，save:main測試標記不變，零pageerror。此為Chromium視窗，不是真機。後續有鏡頭與淡入淡出呈現收尾，最終main完整發布會驗最終整合樹；不把此局部結果冒充完整發布結果。手機圖鑑截圖已目視檢查。

最終呈現收尾局部驗證：build（含tsc）PASS；同一新story browser雙viewport再驗鏡頭聚焦／縮放與兩段fade後接續戰鬥成功，零pageerror。舊圖鑑e2e的六張／固定1024px假設已改為正式清單及每張素材宣告尺寸，未降低解碼／尺寸門檻。PR #20第一輪daily Checks run39927679569：122/122核心、內容／型別成功。最終發布尚待main完整門檻；不另本機跑全套。

最後邊界修正：region/position等requires只在接受任務時判定；已接受流程移區後仍能接續，流程已讀後按objective獨立完成。針對跨區／完成條件2項測試PASS，typecheck PASS，未重跑已成功瀏覽器。

補齊來源SpawnCID的不可收集單位契約：storyEncounter演員可二擇一引用character或enemy，沿同一Unit與來源成長，不要求先做成可抽少女才能在戰場出場／被保護／接收生命門檻。針對不可收集單位＋五目標＋進退場3項PASS，typecheck PASS；不重跑其他瀏覽器。戰場角色來源與正式speaker仍由劇情作者逐row指定。
