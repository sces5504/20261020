# 整合AI4：VFX／UI整合、原作式主線、挑戰重整、技能研究、星域背景（2026-10-24）

- 範圍／branch：`claude/gifted-shannon-coveiq`，接手基準main `072892b`（PR #23劇情已合併部署）。使用者六項要求見owner-preferences「2026-10-24整合AI4直接要求」。
- 開工狀態：cwd `/home/user/20261020`，乾淨；PR #24（`feat/mobile-ui-vfx-polish` `f84b10c`，CI成功）以fast-forward併入本分支，未改其內容。

## 已完成

1. **VFX／UI**：PR #24全部提交原樣整合；其共鳴艙代表仍是待使用者確認的candidate，未批量套用。
2. **原作式主線進程**（`src/domain/story.ts` `mainlineState/mainlineChain`、`src/presentation/mainline.ts`、story-player）：
   - 主線＝含chapter的劇情任務依內容包順序，與原作QuestS單線一致；HUD標題列常駐「主線 n/24」卡：節點名、目前目標、單一行動（開始／接續／出擊／躍遷下一站／導航據點）。
   - 讀完一節點後，下一節點可用即自動開始（第一節點不自動，避免打斷新玩家／工坊）。
   - await步驟不再擋住畫面：自動收起對話，目標達成（例如抵達太陽系）即自動接續，類似原作EventSpot觸發。略過仍不越過await／遭遇。
   - 未改schema、交易、receipt與完成／已讀／領獎分離；沒有內容ID特判。
3. **挑戰重整**（依原作分類）：類星體母艦（每日限次，LocalStr BossScoreRank）、戰艦討伐（Battleship01–06依LocalStr Enemy_Battleship名稱：搜索戰艦［Kiraba］等）、委託任務（EventQ Requested Mission；Event／S系列／Chapter5–6／4_x首領戰）、高難星域、劇情戰役。卡片顯示建議等級、進度、今日剩餘次數；「前往」逐站合法躍遷（每段都走既有travel命令，不繞過解鎖），到達後列出逐戰出擊。
   - region category新增`battleship`、`mission`（封閉schema擴充）；`original-world.json`只改顯示名稱／分類／描述與路線標籤，戰鬥、座標、敵群、獎勵不變，sourceRef保留原Wave key。`tools/world/localize.py`並接入compile.py。
4. **技能持續時間稽核**：226技能以描述token（[time]=f12、[skilltime]=f52）逐一比對，映射全部正確（唯一差異為爆炸擴散動畫）。異常短的真因是正式存檔技能固定Lv1：砲台Lv1為3秒（Lv10 5.7秒）、無人機4秒（Lv10 6.7秒）。新增原作「研究→技能」對應的**技能研究**：角色詳情可升技能Lv2–10，費用＝`rules.skillResearchCost`（缺省為強化費×3）×目前技能等級，需角色Lv≥(目標技能Lv−1)×4（本作適配，原作研究資料／時間未恢復）。存檔`skillLevel`預設1，舊檔相容。召喚物HP／攻擊實際應取Skill.f78所指CID（例：金星小砲台CID199 HP700/ATK90），現行為本體50%推定；因會改動敵方召喚及671世界證據，本輪未改，列為後續。
5. **星域背景清晰度**：所有背景同為1672×941，原本10000單位星域拉伸約4倍。改為各星域統一第一星域像素密度（2.55世界單位／像素），大星域以視差位移取代拉伸；未重畫素材。

## 驗證（只跑受影響項）

- tsc／vite build通過。新增`tests/skill-research.test.ts`、`tests/mainline.test.ts`通過。
- 審閱截圖腳本（非發布門檻）：`tools/game/mainline-preview.mts`、`challenge-preview.mts`、`backdrop-preview.mts`，桌機1440與觸控390 DPR2，零pageerror。
- 單元測試129項（Node 22以`--experimental-test-isolation=none`代替CI Node 24旗標）：首輪127過、2項舊檔往返因`skillLevel`預設補值失敗→改為選填後該兩檔＋新測試12/12通過。
- 受影響瀏覽器流程（本機實跑）：test:story通過；test:chronicle首輪因1-01完成後自動接續1-02擋住導覽而失敗→測試改為斷言自動接續後按「返回航行」，桌機／手機PASS；test:polish通過；test:world首輪兩項失敗：(a)開新航跡後存檔座標為舊航跡x=1200——既有競態，checkpoint在replaceSave寫入期間以呼叫當下座標排隊，已改為執行時讀取；(b)手機六人技能卡58px（PR #24單排六張、6–7px字）——改為三欄兩列120px。修正後桌機／手機PASS。
- 其餘release項目（e2e、playtest、exploration、refinement、content-integration、skills、integration-v8、release:ready）未在本機重跑，交由合併後Pages完整發布門檻；未跑不記為通過。未重跑671場世界戰鬥（戰鬥／技能資料未變；技能研究僅在玩家升級後生效，預設Lv1與既有證據一致）。

## 後續

- 召喚物數值：使用者2026-10-24回覆「不要變弱的方案」，維持本體比例，不改依f78 CID；已定案。
- 共鳴艙UI方向待使用者回覆後再批量套用。
- commercial仍缺人工素材批准、真機與效能證據。

## 發布紀錄

- PR #25合併為main `4164f9f`；Checks 40080385135成功。Pages release 40080385134失敗、未部署：build、e2e、playtest、exploration、refinement、polish通過後，test:content-integration找不到`.squad-card .avatar-cropped img`（PR #24把編隊卡改為operator-card，原選擇器失效）。
- 修正：測試改看`.operator-art img`，並把「transform必須none」改為「不可縮放／旋轉／翻轉」，因PR #24以translateX(-50%)置中。本機重跑content-integration桌機／觸控PASS；之前未跑的skills、integration-v8、release:ready也在本機各跑一次，全部通過。
- 第二輪：PR #26合併為`c714bb3`，Pages release 40081875663在test:world「管理面板暫停挑戰」失敗（0.13%→0.14%）；content-integration與skills已在CI通過。根因：暫停即時生效，但HUD戰況文字由250ms UI計時器刷新，測試開面板當下讀到暫停前的舊畫面。測試改為等一次刷新（300ms）再取樣，仍要求500ms內不變；本機test:world桌機／觸控PASS。
- 第三輪：PR #27合併為`6bd8896`，Pages release 40083233135中world、integration-v8、story皆通過，test:chronicle在等待自動接續的1-02時逾時：結算面板較晚彈出時，舊測試只檢查一次就略過，面板擋住接續（設計上有覆蓋層時不插入劇情）。改為持續關閉晚出現的結算／取得面板直到劇情出現；本機chronicle桌機／觸控PASS。剩release:ready已於本機通過。
- **最終發布**：PR #28合併為main `c0dec4c117e006933a76df1e09da5f6c30cd9aaa`；Pages release 40084530908 build／deploy成功（完整release門檻一次跑完，未用接續）。公開`version.json` commit＝c0dec4c、core 0.9.0。公開站以Chromium 1440與390 DPR2觸控實測：主線卡「主線 0/24 序章·指揮官／開始」、挑戰五分頁（類星體母艦／戰艦討伐／委託任務／高難星域／劇情戰役），零pageerror。非真機；commercial仍未驗收。

## 下一步

1. 共鳴艙UI代表待使用者確認後再批量延伸其他頁。
2. 繼續打磨（使用者第6項）：依實玩回饋逐項處理；Doradus／Mucephei／Sargas中文名仍待核對。

## 第二輪實玩回饋（2026-10-24，使用者直接要求）

使用者附原作手機截圖，列：航跡演出空白、手機大世界預設最小縮放並記憶、任務一鍵領取、按鈕後不跳頂、劇情不自動接續且每段由玩家按、需自己到目標不傳送、非Boss不顯示頂部血量、難度對照原作、單位不重疊（不犧牲效能）、戰中不跳對話、據點／高難進場沒開戰、對話兩句之間不要閃、移除暫停鍵、手機UI參考原作佈局；後續追加：右側頭像只截頭部、去掉就緒勾勾、右側按鈕改為下方等寬橫排。

- 劇情播放器：每節點一個持久場景，逐句原地更新；背景／淡入等非對白步驟自動帶過（原「航跡演出」空框）。不自動接續、不傳送：await與遭遇只由追蹤卡「接續／出擊」觸發，遭遇需艦隊飛到戰場附近（max(600, 2×engageRadius)）。隱藏只綁定當下步驟。戰中cue改為不暫停的通訊橫幅（只顯示對白；cue內camera／fade不再於戰中播放）。
- 大世界：探索縮放存localStorage，手機預設最小0.5；戰鬥單位以呈現層網格錯開（最多28px），模擬／判定／戰鬥證據不變。無法開戰時提示原因（需整補、前置未解、剛撤離、手動出擊、排程）；挑戰「前往」抵達後關閉面板使遊戲繼續。
- UI：一鍵領取（逐項交易）、同面板重繪保留捲動且不搶焦點、頂部血量僅Boss、移除暫停鍵；手機（≤760px）照原作：細資源列、地圖滿版、左上主線／獎勵卡、右側頭部特寫直排編隊、下方等寬工具列。
- 難度：原作來源等級對照後，劇情遭遇等級取max(章節基準, 來源roster等級)；探針顯示可選助戰即使Lv1也能扛下戰鬥（原作劇情戰由玩家隊伍作戰），故只保留護送／保護目標與木星劇本晚到。31戰在敵人等級+2重驗全勝；保守經濟路線三人約Lv12/12/11完成；Lv1在復仇女神星對決、琳達、Mitsuba失敗。對白未改。
- 驗證：單元129/129；本機test:story、chronicle、world、e2e、playtest、exploration、refinement、polish、content-integration、skills、integration-v8皆通過（最後的頭像裁切／工具列CSS與「自動：開／關」字樣在這些之後，交由發布門檻）。chronicle-battles／economy收據已重產。
- **第二輪發布**：PR #29合併為main `09f753b194df99521974015afa9ebe46c366619d`；Pages release 40091867708 完整門檻一次通過並部署（含最後的頭像裁切／工具列CSS）。公開version.json＝09f753b；公開站桌機1440／觸控390實測主線卡、挑戰五分頁、零pageerror（非真機）。

## 第三輪：原作式流程（2026-10-24，使用者直接要求）

使用者手機實測：主線卡按鈕按了沒用；「希望遊戲流程跟原作一樣」。

- 根因：劇情戰場可從情報卡以一般`begin`開打，據點變已完成但劇情不前進，追蹤卡停在「前往迎戰」；另外追蹤卡按鈕隨存檔busy停用並重建，手機點擊可能落空。修正：情報卡改「劇情出擊」(flow-open)；遭遇的resumeIf已成立時追蹤卡顯示「已完成，可接續劇情」並以story-next接續，不重戰；追蹤卡只在戰鬥中停用。
- 原作EventSpot綁定SpawnPoint：劇情事件發生在大地圖實際節點。31個劇情戰場由獨立「戰役航跡」移回太陽系／處女座真實星圖，置於來源節點旁（與世界節點≥650單位避免誤觸自動交戰；無地圖節點的Wave來源沿用前一戰場），移除兩個staging區域與根manifest入口。劇情戰場只在當前段落顯示（nodeVisible：storyFields／activeStoryField）。
- 左側照原作加入「主要任務」與兩張「每日任務」卡（點擊開對應紀錄分頁）。
- 驗證：31戰（敵人等級+2）31/31、24節點流程、經濟路線通過並重產收據；單元129/129；test:story、chronicle、world通過。其餘發布項目交由合併後門檻。
- **第三輪發布**：PR #30合併為main `df101c865c5f8ff9a93dc6e15a90aa628d5f0bea`；Pages release 40095538757 完整門檻一次通過並部署。公開version.json＝df101c8；公開站桌機／觸控實測主線卡、主要任務＋兩張每日任務卡、挑戰四分頁（劇情戰役分頁因戰場移回星圖而不再出現）、零pageerror（非真機）。

## 第四輪：節奏、自動交戰與手機操作（2026-10-24，使用者直接要求）

使用者列十項：勝利後約1秒再接劇情；據點／挑戰進入範圍即開戰、巡邏無法觸發；「遭遇已完成」不跳窗改畫面文字；手機左欄可摺疊只留主線；桌機地圖延伸到航行編隊列並移走大星圖／跟隨／星域工具；巡航加速更快且藍色拖尾；全滅自動回可回血處；星域航路面板太亂；編隊移動不要死板直線；手機搖桿。

- 根因（巡航／據點不開戰）：結果面板`report`未關閉時擋下所有接觸，劇情進行中HUD又抑制結果面板，導致巡邏／據點全部不觸發。移除`report`概念：結算改為畫面通知文字（`✧ 名稱 · 已完成`），不再有需關閉的結果窗。
- 自動交戰：`engagesOnContact`＝政策自動，或非每日母艦且非劇情戰場；每日母艦（每日3次）維持手動，劇情戰場由追蹤卡／情報卡出擊。
- 劇情：戰鬥結束後1000ms內不顯示劇情場景。
- 全滅：結算時艦隊拖回最近已解鎖整補點／啟用殖民地（否則星域起點），並排入零費用定時修復（`-rescue-`），顯示通知。
- 巡航速度255→380；探索艦隊移動時垂直航向的正弦擺動，巡航時藍色拖尾（低特效關閉）。純呈現層。
- 手機：主線卡下方「任務」摺疊鈕（手機預設收合，localStorage記憶）；左下觸控搖桿（pointer coarse）。桌機（≥761px）：航行編隊列去背景、地圖延伸，工具移至右上。
- 星域航路面板：目前位置＋解放進度，分組（主要／高難／挑戰）每列一個躍遷鈕與鎖定原因。
- 追加（使用者提供原作影片連結＋縮放要求）：影片在本環境被YouTube擋（bot驗證），只取得縮圖，研究包也無移動規則紀錄，故編隊為推論實作非逐格對照。探索：呈現層鬆散楔形（隊長在前、隊員分列後方兩側、各自延遲跟隨與緩慢漂移，停下時靠攏；轉向時整隊平滑擺動），進入戰鬥時顯示偏移平滑收斂到戰鬥位置。戰鬥：保留domain的隊長在前直線（既有機制與測試：隊長先吃正面彈），只加≤10px呈現漂移。縮放：手機預設最遠（minZoom 0.4），玩家縮放存localStorage，戰鬥中在探索視角也沿用並記憶，不再進戰重設為1；大星圖不寫入。撤離時已在範圍內的據點標為剛撤離，避免一撤離就被鄰近據點拉進戰鬥。
- 驗證（第四輪）：單元129/129；本機test:e2e、playtest、exploration、refinement、polish、content-integration、skills、integration-v8、story、chronicle、world皆通過（playtest／exploration／polish因結算改通知而更新判定後重跑通過；編隊／縮放／撤離修改後重跑單元、exploration、world通過）。671世界全量未重跑（戰鬥domain未改）。
