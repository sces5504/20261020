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
