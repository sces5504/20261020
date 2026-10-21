# 探索版 0.2 接力（試玩16項修正）

起點 main a785566，分支 polish/exploration-v2。使用者要求改善經濟／戰鬥／Q圖／技能／取得／互動／清晰度、完全移除防衛訓練、加入領地總覽、持續銀河探索和大星圖切換、WASD、角色／編隊詳情、對話引導、未來角色表、禁止瀏覽器彈窗並以商業品質打磨。直接授權這些變更，不重問舊玩法確認。

實作與驗收入口：`docs/design/exploration-v2.md`。舊Q圖禁止由較新Q圖要求更新：僅新增獨立戰鬥Q圖；原六立繪不動，對應仍05地球、04水星、01金星、03火星、02天王星、06月球。

已重驗863研究檔／67表37723列／370場景，建立SQLite；角色表僅取126個Gacha CID目標（不是全342CID）。`tools/game/build-character-roster.py`產生公開可下載CSV／JSON與docs/art/future-characters.csv，120後續候選包含造型變體。研究原包未修改。

程式主要入口：schema 的 waves／waveDelay／patrols／intro；Game 持續導航／探索／巡邏；Combat 多波次；UI 對話／取得佇列／角色和編隊／領地；dialog.ts全程取代native confirm。舊save schema1加預設欄位，舊失守領地載入恢復，舊貨幣不刪。工坊有保留復原歷史後重建新版草稿，不能暗覆寫使用者自訂包。

測試入口：`npm test`、`npm run test:e2e`、`npm run test:playtest`、新增 `npm run test:exploration`，release profile已納入。本輪完整 `python3 scripts/project.py check release` 通過：23項核心測試、TypeScript／內容校驗、build、三組Chromium瀏覽器流程。`template-check.py`10項通過，stage成功；原六圖hash／SQLite美術庫重驗通過。實際部署commit以整合PR與Pages workflow及公開version.json為準。當前核心模擬三場約41／52／70秒。Q圖為imagegen衍生候選，已逐張檢視與接入，沒有擅稱使用者批准。

瀏覽器回歸與結果已完成；發布驗證記於整合PR描述，需核對Pages公開遊戲／工坊／catalog及version.json。README不動。尚未做Android／iOS真機或真人商業視聽品質審閱，不能宣稱完成。

整合PR：https://github.com/sces5504/20261020/pull/4 ，功能提交44a22aa。全部實作的release驗證已完成；合併後以main為起點。公開部署SHA／驗證結果於PR描述追加，網站version.json含contentVersion 0.2.0與精確commit。

第一次GitHub Pages發布在playtest的建造工作斷言被擋下：點擊後僅等待100ms就讀IndexedDB，得到0件而非1件。已把固定短等待改成輪詢實際持久化狀態（最多10秒，逾時輸出工作／領地／餘額及畫面訊息），完工也等待真正寫入；不略過斷言或放寬通過條件。最終以後續Pages成功與公開SHA核對為發布證據。

第二次GitHub發布的建造／編輯playtest已通過；探索測試的800ms按鍵脈衝＋3200ms等存檔仍受雲端DPR2繪圖／計時影響。改成持續按鍵直到實際位移已寫入（保留原>35單位斷言與15秒上限），觸控／共鳴也等持久化，取得確認等畫面關閉；不降低功能條件或宣稱性能基準通過。

收尾修正：戰鬥中也能實際切大星圖，進場／續戰預設跟隨鏡頭；角色名單中的人像始終開詳情，戰場技能按鈕仍施放；輸入欄位收到keyup也會清除移動鍵。新開局／匯入／相容修復另存CAS原子保護的`:restore-point`，普通自動存檔不覆寫；匯出還原備份優先讀此還原點。新增瀏覽器斷言已驗新開局後再自動存檔，舊roster與summoned紀錄仍保留。

CI後續曾在自動接續的章節攔住點擊：測試不再用300ms盲跳，而是依已解鎖章節逐一操作略過、等待storySeen持久化；地圖切換也等待文字狀態更新，不使用force click。收尾build／typecheck、探索完整流程（含戰中詳情／地圖及受保護重開備份）、既有E2E全部通過；playtest章節／建造／第七角色流程亦已本機重驗。最終Pages需完整profile成功，原失敗紀錄不視為已發布。

匯入舊存檔的失守領地也會即時恢復；新增實際JSON匯入→免費恢復領地→新開局→再次自動存檔→驗證還原點保留的瀏覽器流程，與戰中地圖／角色詳情一起通過。本輪收尾不改平衡／圖檔，重新build與受影響流程已通過；下一步僅發布並核對公開版本。
