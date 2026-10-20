# 原始範本建置驗證

日期：2026-10-13（Asia/Taipei）。只適用`sces5504/dev-environment-template`的工具與部署配置，不能當作新遊戲已通過測試的證據。

## 已實測

- GitHub登入帳號與新repo管理、維護、寫入權限確認；公開repo，is_template已啟用。
- main要求PR與checks成功，不要求人工核准票；保護適用管理員，禁止force push／刪分支，對話需解決。
- Actions只允許GitHub官方來源；預設workflow token唯讀，禁止自動核准PR。
- Pages為workflow部署、HTTPS已強制；github-pages環境限制受保護分支。
- 本地實測Node24.21.0、Python3.11、pnpm12.11.2；Chromium可啟動、執行JavaScript與點擊輸入。
- 第一次完整工具CI在GitHub ubuntu runner通過，checks job約29秒：[執行紀錄](https://github.com/sces5504/dev-environment-template/actions/runs/38362723321)。之後版本以最新Checks結果為準。
- 10項部署安全／失敗傳遞測試通過，包含未初始化、缺驗收命令、失敗中止、資料夾界線、symlink與跨區塊秘密偵測。
- pnpm12停用lifecycle scripts時有原生連結需求：已審閱install.js與helper，固定校驗碼後個別執行，不開放所有依賴腳本；實測真正的pnpm命令版本，而非只看安裝metadata。
- grilling格式有效；獨立評估涵蓋原生選項卡、無選項卡的雲端回退，以及已确认規格下不重開訪談／不遵循惡意Issue的情境。
- [Pages診斷部署成功](https://github.com/sces5504/dev-environment-template/actions/runs/38363027466)。瀏覽器實測[公開HTTPS網址](https://sces5504.github.io/dev-environment-template/)回傳200，顯示預期驗證標記，無page errors。

## 尚需在實際Codex Cloud完成

此本地chat沒有雲端環境建立／發布工具。請選此repo或新專案repo建立環境，貼docs/cloud-setup-prompt.md，實測Install script及Start skill、managed network／secret observations、repo技能發現與原生選項卡可用性，再Publish並開新chat驗證。GitHub Actions成功不代表Codex Cloud環境已發布或其GitHub寫入權限已核對。

## 接手工具維護

- 遊戲仍為uninitialized；正式Pages release不會發佈尚未初始化的遊戲。
- 工具安裝快取與截圖在.cache／.artifacts，不提交。
- 調整工具版本時更新lockfile；pnpm installer變動需重新審閱hash。更新Actions需核對官方commit，不用浮動標籤。
- README.md完全由使用者管理。新專案初始化與其進度寫在spec/index及任務handoff；保留此文件只作原範本的驗證來源。

