# 原作技能／彈幕／工坊實驗場整合

使用者 2026-10-22 明確授權：十人依 Stella Maiden 原作技能實作，補通用機制與 VFX、敵人彈幕、既有四資源圖片；內容工坊新增自選角色／等級／敵人的測試訓練場。涅墨西斯顯示名改為復仇女神星，穩定 ID 不變。這是工坊隔離測試功能，並非恢復已取消的遊戲獎勵訓練。

起點 main `4ee060312bf3587174b3955cc272fd0370bacc90`，工作分支 `feat/stella-skill-engine`，起始 clean。基線 typecheck、content:check、49 tests 全通過；研究 863 檔／67 表／37723 列驗證通過，沒有執行原作。日誌 `.artifacts/skills-baseline.log`。

驗收：封閉的宣告式原語、嚴格 schema、工坊可編輯、實際戰鬥使用、可重現命中與時間測試、舊存檔／舊草稿相容；十人不再引用近似 M1 技能；工坊測試不讀寫正式玩家存檔。完整發布須執行 check release（含 test:polish），紀錄 build／包版本／裝置／seed，commercial 仍需品質與真機證據。

證據界線：研究包沒有 APK／OBB 或原作實機結果。Skill.f02 原生分派與部分參數已恢復，原生目標選取、完整 tick／疊加等尚未完全恢復。新技能標為 description fidelity，不能宣稱逐幀等同原作。已向使用者詢問可供比對的版本位置，同時繼續有依據部分。原始 archive 不改。

進行中：新增通用 action/status/projectile schema。後續接核心 runtime、十人精確描述與來源列、VFX、能力盤點、工坊測試場、四資源圖，再做影響測試及 main 整合。尚未宣稱完成。

## 使用者追加證據授權

使用者確認 repo 已是完整逆向交付，當時無法運行原作或取得 OBB；明確要求缺乏部分從 Stella Maiden wiki／網路資訊推定、盡量還原。可以進行有標示的推定，不再等待原版執行檔。已瀏覽 Namu 行動鏡像的行星／衛星／矮星及個別木星／冥王星／木衛三／木衛一／復仇女神星頁。復仇女神星頁提供「鎖定目標死亡則技能取消」的重要補充，需落實通用鎖定／取消語意；木衛一頁的13秒CD、3秒時長、移速70%／攻速80%、範圍8公尺與抽出表一致。Wiki 明示部分版本資料陳舊，保留 APK 表優先、wiki補機制。

當前已寫入十人獨立技能＋1–10級資料、封閉 action schema、基礎狀態／區域／光束／召喚核心、工坊隔離測試場初版、主戰場持續場／狀態VFX、四資源AI原創透明圖集（art/resources，候選）。尚未完成完整家族翻譯、深度測試／瀏覽器與發布。resource sheet 主檔保留，網頁輸出512² WebP，sprite+iconFrame顯式綁定。

容量決策（待驗證）：目前舊完整快照26,211,963 bytes已幾乎耗盡25 MiB；此次完整遊戲擴充升級壓縮64 MiB／解壓總量128 MiB／單檔30 MiB獨立上限，集中於src/platform/budgets.ts，出口／入口一致、內容實際bytes去重保留。不能以此省略壓縮炸彈防護或重新編碼原六人立繪。

## 成品驗收要求更新

使用者明確要求本次直接交付商業水準成品，不接受將缺口留待後續校正。因此所有已納入技能家族／彈幕／測試場／資源圖均須在此次完成與驗證；保留已知／推定的來源標記是誠實證據記錄，不能用作省略實作的藉口。不得偽造真人品質批准／真機／原作執行結果。

目前完整來源庫已產生226技能、74種有效效果家族（前述71為初步口頭盤點誤差，正式計數以SQL distinct f02排除None為準），共用同一宣告式核心，不以角色ID分支。庫包stella:package.skills@0.1.0已啟用，仍需逐家族情境驗證。十人solar10@0.2.0，art依賴更新0.1.1；核心版本尚未升號。下一步優先做完整機制測試、修引擎邊界，避免僅有schema卻無行為。基線49項於初版機制後通過，但最新連鎖／分裂／屏障改動尚未全測。

檢查點：新增17個機制情境測試通過（.artifacts/mechanics-tests.log，約1.9秒，seed77）；含十人實際效果、屏障三種行為、穿透／濺射／分裂／連鎖、時間停止、DoT、工坊隔離，以及226技能×Lv1/10各重播兩次的有限／確定性驗證。這不是74家族全部人工品質驗收，仍須補其餘互動測試、完整瀏覽器與VFX視覺驗證。最新typecheck已通過。無PR／發布；仍在實作。

## 0.6功能收尾檢查點

原六人也已換成對應原作主動技能，ID保留；總226來源技能／74家族，82個Attack／Bullet作者模板，18種基本彈幕／近戰pattern。新增原生f90／f91命中旗標、真正前方有限屏障（可保護後方友軍）、分類誘敵、無視防禦、蓄傷不重複計／排除召喚物、傷害代受含護盾、引導打斷、定向／追蹤光束、週期與狀態刷新、彈體分裂／連鎖／向心生成、批次與掃射。未知類型拒絕，超預算不靜默丟敵彈；配置遭遇會在內容校驗估算預算。

工坊：6名自選角色與等級／技能等級、三組敵人（總60）／等級／數量／彈幕、任意已註冊技能覆寫、seed77預設、暫停／固定單步／速度、自動與手動、雙方生命鎖定／傷害統計、狀態／幾何資料。使用已保存草稿且只用獨立副本，無正式進度讀寫。原語與狀態表單、82模板選擇已加入，舊草稿保留並提示新版原作技能。

包／責任（本批仍只有核心整合者負責整合）：

| 作者／包 | 版本與依賴 | 可改路徑／整合界線 |
| --- | --- | --- |
| 核心／m1:core | 0.6.0 | src/domain/application/content/platform、共用編輯與呈現、content/core、根manifest、建置發布 |
| 地圖／beacon:package.frontier | 0.3.0；精確m1@0.6.0 | content/extensions/frontier-beacon.json、art/world/beacon、該作者handoff；本批新增連射／追蹤／螺旋與受損雷射配置 |
| 角色／solar10:package.first-ten | 0.2.0；精確m1@0.6.0 | content/extensions/solar10.json、docs/characters/solar10.md；來源翻譯由整合工具重建，不再近似共用M1 |
| 美術／stellaart:package.stellar10 | 0.1.1；精確solar10@0.2.0 | art/characters/stellar10、素材包；原圖bytes與Q圖不改，僅名稱metadata與依賴更新 |
| 共用來源庫／stella:package.skills | 0.1.0；精確m1@0.6.0 | content/extensions/stella-skills.json、content/source、tools/game兩個來源翻譯工具 |

近期測試：32項專門機制情境已通過（含226技能Lv1/10雙次seed重播與82模板）；日常核心共82項曾有一項新屏障fixture因未同步fleet anchor失敗，已修正fixture且專門機制通過；另補顏色編輯真實作用測試，目前最後一輪完整測試進行中。桌機／觸控瀏覽器初版流程曾通過，壓力流程已完成但資源樣式斷言遇到Playwright取到被即時更新替換的DOM節點，已改同一次page.evaluate查live nodes；此為測試讀取競態，會完整重跑，不記為最新通過。當前仍未發布／未合main。

完整驗證命令增加第七組 `test:skills`，既有第5組test:polish保留。下一步：核對最後日常測試、commit封存程式，再以實際HEAD執行完整check release；收集瀏覽器build／版本／viewport／seed／60敵壓力FPS、保存視覺證據；完成PR／main與公開版檢查。commercial旗標不能假冒實機／真人接受。

首次完整release（21688e2）通過內容、typecheck、83核心與第一組瀏覽器，在test:playtest停止：舊流程仍要求地球顯示固定護盾，與本次原作40%偏折／3秒相反。已把playtest與exploration兩處舊斷言換成獨立的原作數值驗收，未降低條件。另補舊草稿barrage的施放次數／傷害歸屬及舊砲台召喚歸屬，預算估算涵蓋舊effect。最新typecheck與84項核心測試全通過（約10.8秒），新完整release尚待重跑。

## 最終驗證候選（PR #12）

已建立 https://github.com/sces5504/20261020/pull/12 ，ccdd9c7已完整通過check release：84核心與全部七組瀏覽器、playtest readiness。其後補齊連續衝撞／瞬移區別、光束扇面與旋轉／目標距離截斷、連鎖完整次數、分裂避免重傷同目標、擴散單次震波／蓄傷反擊波、來源DoT週期，工坊依動作隱藏無效欄位；最新92核心全過，typecheck/build過，需以後述最終發布結果為準。這些改動均有實際命中測試，並非僅增加schema。原始人物素材bytes未改。

四資源圖集已在錢包／成本／配方顯示；五個啟用包依上表，總16角色／2區／4星球。使用者要求本次完成、不安排「後續校正」。本版已採用的推定數值與幾何是明確設計，來源界線寫在證據文件，不是未實作清單。候選素材review與Android／iOS真機旗標不造假；完整release採既有playtest profile，commercial檢查不等同功能完成。

## 完整驗證通過／整合交付

實作 `33b77f6b84895d471c463035547bec6a6ec90e30`：92核心、typecheck、內容校驗、build，以及完整check release全部七組瀏覽器與playtest readiness通過。GitHub Checks run39723037449亦success。正式驗證副本：[skill-engine-0.6.json](../verification/skill-engine-0.6.json)。Chrome156.0.8078.4；桌機1440×1000@1與觸控390×844@2；技能seed77；60敵環形彈壓力流程90個rAF樣本約60FPS、模擬5秒，僅代表目前虛擬環境。桌機／手機實際畫面已檢視：光束／黑洞／分身、追蹤、資源圖。

之後僅補3個素材選單舊名稱為復仇女神星，內容校驗通過，沒有改圖bytes或runtime；Pages會對最終main樹再次執行完整release。PR #12為本輪唯一整合PR；精確main／公開SHA以合併結果及公開version.json為準。程式工作已完成，不列待補機制或後續校正；真人品質批准、獨立作者接力、真機與硬體效能是未取得的外部證據，commercial實跑仍阻擋，不能混稱已通過。

後續操作：核對PR #12最終合併SHA及Pages成功、公開站0.6.0與5包hash、工坊測試場及31項素材SHA／解碼。部署證據更新於PR描述；接手不要回舊foundation或覆寫玩家舊草稿。

## 合併後共用邊界修正

PR #12已合main `7fe51c115e257903e047e4f42800d6571301d56e`，合併後build／92核心通過。再檢查普攻變更與主動技能共存時，確認attackPattern倍率誤套所有主動彈，且正常近戰／雷射與延遲連射不一致。新增失敗重現（原本主動200傷害被誤降至100），修正只由普攻路徑套倍率，延遲普攻保持普攻身分，近戰／雷射也一致；主動技能沿用自己的power。最新typecheck及93核心全通過。此為同次交付收尾，非留待後續校正；另開小PR整合並驗證最終main／Pages。

收尾PR：https://github.com/sces5504/20261020/pull/13 。修正實作 `eb5417a62b94826c7eaab26acd97091473dd870a` 的build與test:skills桌機／觸控完整通過（含編輯、實際技能、60敵壓力與正式存檔隔離），93核心／typecheck通過。此後只補交付證據連結；最終main SHA與Pages完整release／公開核對結果記在PR #13描述，避免再為記錄部署SHA產生新部署。
