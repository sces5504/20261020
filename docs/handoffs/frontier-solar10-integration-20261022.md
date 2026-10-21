# 第二區與十名角色整合

使用者直接要求整合地圖、十名角色及既有美術並推到 main。起點 main `4610e8ab24360cdff39473befc5b37a0d1298c0f`；開工 work 分支乾淨。唯一整合分支 `integrate/frontier-solar10`。使用者確認美術另在本地 `313f835`，已請作者推送，2026-10-22 Asia/Taipei 回覆 PR #10 已建立；以遠端實際 SHA 為準。

## 作者與邊界

| 交付 | 包／版本、依賴 | 自有路徑、來源 SHA |
| --- | --- | --- |
| 世界 PR #8 | beacon:package.frontier@0.2.0，m1:core@0.5.0 | content/extensions/frontier-beacon.json、art/world/beacon、自己的設計／交接；49056dca84493ec10bead9c3c9e0800302d21d21 |
| 角色 PR #9 | solar10:package.first-ten@0.1.0，m1:core@0.5.0 | content/extensions/solar10.json、docs/characters/solar10.md、自己的交接；a26fcde26620fb91fe0a0a68eeda3b9d80a62927 |
| 美術 PR #10 | 獨立素材交付，不是 runtime 包 | art/characters/stellar10、docs/handoffs/stellar10-character-art-20261022.md；a248a1c12f0499271395217da4d94c5917328c3e |

只由本整合者維護 manifest、共用 loader／戰鬥事件／UI、建置、發布與共用測試。作者提交歷史以 merge 保留。四資源／面板暫停、五次同調／25%實際配方退款、單波、巡邏非阻斷不變。

## 整合設計與檢查點

- manifest 明確啟用兩包；根 manifest 的 regionPresentation／characterPresentation 僅能綁外觀（角色三圖；星域名稱／說明／背景／縮圖），schema 嚴格拒絕戰力欄位、缺目標、重複綁定與缺素材。extension 仍只新增資料、不按順序覆寫；core 單獨 assemble 保持有效，無核心反向依賴 extension。
- 保留 m1:frontier-test ID、入口及雙向回程，正式顯示邊境信標；空域支援另留獨立有效 fixture，沒有刪除覆蓋。
- 技能 Flash 帶 skillId 與 sourceDefinition，UI 不再按技能名字／第一位持有人猜頭像。沒有角色 ID 分支、eval、存檔 schema 變更。
- 星球情報具名顯示未解放前置並修正 resetSeconds 插值；footer 按快照顯示人數／區域數。
- version.json 增加精確包清單與有效內容 fingerprint，不把 core 版本當全部內容身分。

基底 content:check／typecheck／43 核心通過。兩包啟用後原 43 與新增 4 項整合測試（共47）通過，後續又新增角色綁定拒絕案例，須在最終版重跑。世界五張逐張開圖，雙 hash／原參考 hash、22,609,434-byte ZIP roundtrip、範本10項通過。合併快照種子1／7／42、Lv1／3與自動技能／純普攻12組成功（40.5–57.9秒），含首勝不重領／生產／越界重置／返回。新版 test:polish 五號流程已通過。

## 美術接入檢查點與待發布驗證

已merge PR #10，讀固定入口與交接，十張原立繪及十張指定Q圖逐張檢視；按originalKey/CID核對solar10的sourceRow。stellaart美術包0.1.0與30項明確media映射已接入，全部candidate。solar10改0.1.1僅移除過時缺圖文字。50項素材／SQLite／原六圖hash通過；重建SQLite的本地位元組變化已恢復作者提交，不另提交無意義DB差異。

完整ZIP原本26,215,863 bytes，超25MiB共1,463 bytes；改以實際媒體bytes去重與短封裝路徑、緊湊JSON，沒有重編任何圖片或放寬預算。新增測試覆蓋同圖不同src去重／假hash碰撞不得合併。

遊戲內實際開圖發現獨立裁切頭像被舊CSS再放大、手機前置與重置說明被舊CSS隱藏；已修正並增加真實CSS／可見文字斷言。原五組瀏覽器保留，新增第六組test:content-integration，含十人詳情／30圖解碼／四組真實Q圖編隊／Sun與Mars共技能實際施法者／具名前置／插值／第二區接敵與回程／正式檔隔離。桌機1440×1000 DPR1及觸控390×844 DPR2、seed77。製作表與CSV更新16已整合／110待製作。

本機完整發布已通過，見下方最終證據；正式main／Pages與公開站SHA以整合PR #11的最後部署證據為準，不把本機通過當已上線。

現有真機／真人品質／效能限制保留；候選素材不升 approved。不要把 Chromium 觸控 viewport 當真機。

最終本機整合檢查點：49/49核心通過。新增整合瀏覽器桌機／觸控兩種viewport皆通過，已實際開啟修正後頭像／手機前置／新編隊／信標戰鬥截圖。完整正式工坊快照ZIP 26,211,963 bytes，低於25MiB；餘量僅2,437 bytes，未來新增媒體前須另外規劃分包／交付預算，不能直接提高匯入上限或默改原圖。

## 最終本機發布證據

- 驗證實作 SHA `7799c6287e700016a3ff846016935095e11f3873`，check release開始／結束工作樹乾淨；正式主線合併SHA由PR #11記錄。本次後續提交僅補交接／驗證JSON。
- `GITHUB_SHA=<上列SHA> python3 scripts/project.py check release` exit0。11項命令全部exit0，49核心、原五組瀏覽器含polish與新增第六組、playtest readiness全數完成；原exploration截圖超時本輪未再現。
- 633.16秒，超過8分鐘時間目標：保留原五組完整流程，增加雙viewport十角色詳情／30圖解碼／四編隊實際Q圖與第二區往返的第六組；沒有以時間目標跳過檢查、放寬timeout或記失敗為通過。
- 版本與裝置：Node24.21.0／Linux headless Chrome for Testing156.0.8078.4／Playwright1.64.0（工具鎖檔），1440×1000 DPR1、390×844觸控DPR2，整合seed77；世界平衡另以seed1／7／42、Lv1／3、純普攻／自動技能12組完成。
- 有效內容hash `07798ea20b5af667b1478bd7070072eb61abf80acac4e80ee786787adcb9e6a4`；core0.5.0、beacon0.2.0、solar10 0.1.1、stellaart0.1.0。版本build已帶精確SHA與四包清單。
- 同名 `.validation.json` 保存完整命令與exit code，`.browser.json` 保存build／viewport／seed，`.snapshot.json` 保存乾淨實作起點。原圖／媒體hash與美術SQLite、ZIP roundtrip、範本10項另通過。
- commercial dry-run預期exit1，確認candidate立繪、qualitySamplesAccepted、Android與iOS真機、accepted狀態仍阻擋。沒有自行批准任何新圖或品質旗標。

合併與部署證據集中在 https://github.com/sces5504/20261020/pull/11 的最新描述，避免每次補部署SHA再次觸發新一輪Pages。後續以公開version.json核對SHA／內容hash；使用者試玩代表關與新角色，再依回饋推進真機、硬體效能與動畫品質。舊工坊草稿先備份，再從新版正式內容建立，不默覆寫本機草稿。
