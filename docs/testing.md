# 有限投入的有效測試

日常目標約3分鐘，上線約8分鐘。失敗、高風險或初次安裝可延長，記錄原因；時間到了不算通過。測試初始化缺漏、缺工具、跳過都需明確標記。

- 文件／素材 metadata：相關格式與路徑；不為微小文字改動新增模仿實作的測試。
- 一般程式：相關 type/lint/build和受影響邏輯。
- 玩法／輸入／存檔：加對應瀏覽器或單元測試；修 bug 先確認能重現，必要時留一個防回歸測試。
- 美術／布局：查看受影響畫面，對照風格指南與基準；固定狀態避免隨機動畫產生無效差異。
- 合併／上線：測當前整合 commit，執行 release checks與build，確認載入、資源相對路徑、受影響的主要操作／存檔。Pages 部署後確認公開網址及資源可讀。

在 `.template/project.json` 設定 `checks.daily`、`checks.release` 與 `build`。指令以參數陣列表示；release會先跑daily再跑release，所以不重複配置同一命令。每個命令保留 stdout/stderr；失敗非零退出，後續部署停止。

工具 smoke 只證明Chromium能啟動與執行JavaScript，不證明遊戲正確。範本CI只檢查工具／部署契約；`initialized: false`時，遊戲release checks 明確失敗，正式部署不啟動。初始化時需加入實際遊戲驗收命令。

可用 `python3 scripts/handoff.py capture <task-id>` 取得非秘密的 branch/commit/修改路徑快照。記錄測試時是否有未提交內容，不宣稱只測了HEAD。

