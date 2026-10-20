# Start skill 的內容

每個新任務／恢復工作時：

1. 讀AGENTS.md、docs/memory/index.md及當前任務交接檔。核對repo／branch／HEAD與未提交修改，必要時安全同步遠端；不覆蓋其他工作。
2. 先確認當前managed runtime/network policy。cloud-environment-runtime skill可用時遵循它。保留proxy/CA，不列印環境秘密；不要用舊chat的instance或狀態推定本chatready。
3. 每個terminal先`source scripts/env.sh`，驗證工具版本與Chromium可執行。沒有工具時用Install script修復，不下載未知遠端腳本直接執行。
4. 查`python3 scripts/project.py status`。未初始化時開始規格工作，不啟動不存在的遊戲，也不把工具smoke當遊戲驗收。grilling優先原生問題卡，無工具時走本地規格流程。
5. 已初始化時先讀`.template/project.json`與相關規格。審閱install命令後安裝需要的專案依賴；各start命令在managed terminal session啟動服務，保存必要日志到`.artifacts/`，不因長駐server阻塞其他服務啟動。`project.py start`是前景指令，適用只有一個server的情況。若ready_url有值，實際確認該URL與服務就緒；ready_url只能是本地服務，不向任意第三方送資料。
6. 本階段只跑必要檢查，不在每次chat啟動重跑完整release suite。記錄真實結果、阻塞與下一步；重要改動做checkpoint，結束前提交交接。

