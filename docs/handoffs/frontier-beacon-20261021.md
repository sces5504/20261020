# 世界內容接力：第一區盤點＋第二區邊境信標

- 使用者授權：先補第一區缺件，再做第二區一顆星球／一場遭遇代表包。本批先交代表關節奏供審閱，再擴量。
- 基底 `4610e8ab24360cdff39473befc5b37a0d1298c0f`，fetch後與origin/main一致。分支 `content/frontier-beacon`。內容／設計commit `0c59bd4`，測試針對該內容與本交接的驗證夾具，不當成基底已含新包。
- 自有包 `beacon:package.frontier@0.1.0`，requires精確 `m1:core@0.5.0`，檔案 `content/extensions/frontier-beacon.json`。
- 僅修改本包、自己的區域設計／驗證文件及本交接。未修改核心、根manifest、共享Combat、既有資產或生成檔。

## 已完成

第一區三顆星球、三巡邏與六角色取得來源盤點，未發現內容引用／解鎖斷鏈；既有戰役測試通關三顆星球並完成建設／研究與六人收集。共享UI小缺口列在設計文件的整合變更單，不越權修改。

第二區沿用 `m1:frontier-test`，保持既有雙向航路及存檔回程。新增 `beacon:planet.signal`（1600/1000），依賴黯星之門已解放；4游弋＋2護衛＋1指揮，單波，Boss低血量沿用核心fan→ring。入口600/1000安全，不改區域入口與尺度。未新增巡邏或新貨幣。

正常地球／水星／金星Lv3，零同調、無研究：自動技能40.5秒，僅普攻50.3秒。較弱Lv1：46.2／57.9秒，皆三人生還。種子1／7／42固定1/60，固定守軍出生使結果相同；不是隨機難度統計，也不當成人工手感核准。

首勝110/90/100/80，啟動80/70/90/60；每秒0.06/0.10/0.08/0.08（水晶／氣體／金屬／乙太）。一次掉落既有天王星，重複走既有同調／滿階四資源轉換，不新增碎片。數值及擺位全是本案新設計。

地圖、難度／收益對照、素材hash／candidate狀態、SQLite來源與已知／推論／新設計見 [區域設計](../design/frontier-beacon.md)。可執行驗證夾具保存在 [驗證重現](../design/frontier-beacon-validation.md)，從Markdown抽出到忽略的.artifacts後執行；不額外改共用測試目錄。

## 驗證證據

- 研究verify_bundle：863檔、67表／37723列與370份bXML重建；build_database／check_database成功，SQLite integrity=ok；局部查stage_roster／SpawnPoint 1–3列。未執行原版APK，OBB仍缺。
- `npm run content:check`、`npm run typecheck`、`npm test`（43/43）、`npm run build`成功。正式manifest仍是三顆星球，不能把這項當作擴充已載入。
- 另用真正 `assemble(base,[extension])`，再對四顆星球快照跑內容校驗成功。驗證全圖requires無循環、前置拒絕、守軍共用navigation座標、單波、12組隊伍／seed／技能組合、普攻通關、首勝資源／掉落不重領、沒錢不啟動、60秒產量、越界重置、重載與返回。
- 本包專用Chromium流程：1440×1000桌機及390×844、DPR2觸控viewport成功。保留敵人原數值，驗自動接敵、WASD轉彎／掉頭、邊界預警、無水平溢出、第二區重載／回程與save:main隔離，無pageerror。已實際檢視桌機戰鬥與手機畫外威脅／邊界警告截圖。
- 本機證據 `.artifacts/frontier-beacon/assembled.json`、`results.json`、`desktop-battle.png`、`mobile-battle.png`、`desktop-warning.png`、`mobile-warning.png`。均為忽略產物，可依驗證文件重建。
- `test:exploration`：允許localhost網路權限後仍兩次在既有第60行開場story.png截圖超過15秒；該流程未通過，未更動測試或放寬timeout。第一次沙箱EPERM也不記成功。新包專用截圖流程正常，不能據此聲稱既有整組通過。
- `test:polish`：成功；工坊錯／對碼、session／鎖定、等待圖、M與輸入防誤觸、跨區取消／往返／重載、工作／領地保存、滑鼠／鍵盤技能光暈及手機入口均完成。其正式快照驗核心0.5，不把空域測試當作本擴充包測試。
- 未執行完整release／未部署；未宣稱五組瀏覽器發布驗收、Android/iOS真機、效能或商業品質通過。

## 核心整合者的下一步

1. 審閱代表關與第一區共享UI缺口。若接受本包，再啟用manifest；更新基底第二區空域說明／測試航路文案，保留 `m1:frontier-test` ID和雙向routes，不以extension覆寫。
2. 基底空域測試中「第二區0星球」斷言在正式啟用時須依新契約更新，保留空區案例為獨立fixture；不能直接刪掉空區支援測試。
3. 如需試玩ZIP，按驗證文件產生assembled.json，經工坊完整快照匯入／隔離試玩再匯出；不要把extension JSON誤當完整工坊包，既有草稿先備份。
4. 解決或重驗exploration截圖超時，執行完整check release（五組瀏覽器含polish）才發布。公開version.json與實際CI結果另外核對。
5. 取得代表關節奏回饋後再擴星球／巡邏；本包尚無專屬新美術，只引用既有candidate圖。刪包／遷移交整合者做修復預覽及備份，不可無保護移除已有領地。

## 回復與限制

根manifest未啟用，因此此PR合併本身不改正式遊戲快照。隔離試玩使用content:test／save:test，正式檔未改。未上線前可撤回本包；若核心日後正式啟用並產生領地，必須保留包或執行現有缺內容修復／備份，不能直接刪檔。

新多階段Boss（召喚／轉場／衝刺／新預警或勝負）不在現有phaseAt能力內，本輪沒有提出這些行為或改動核心。前端工坊入口鎖、0.5隊形、離線不補打與面板經營政策沿用。
