# 貼到 Codex Cloud「建立環境」對話

先用 GitHub 的 Use this template 建立該遊戲的新 repo；再在 Work in → Cloud → Create environment 選取**新repo**。同一遊戲的接力 chat 選同一個環境；不同遊戲有自己的repo及環境。以下內容可以整段貼上：

> 請依此repo的AGENTS.md與docs/guide.md準備可重用開發環境。先檢查當前 managed environment 的runtime/network policy與工具可用性，不列印秘密值。保留executor設定的proxy與CA；如內建cloud-environment-runtime skill可用，先讀取它並查runtime狀態。網路選All (unrestricted)，環境Only me，不加入任何會產生新增費用的服務。
>
> 使用`.node-version`的Node版本、Python3.11以上、Git、curl、tar與Linux解壓工具。缺少的系統工具從核准的官方套件來源安裝。Install script設定為`DEV_TEMPLATE_INSTALL_SYSTEM_DEPS=1 bash scripts/setup.sh`；只有Linux/有安裝權限時才使用with-deps。如果沒有系統安裝權限，先準備Playwright需要的官方系統套件，再用`bash scripts/setup.sh`。請實際執行，不只儲存指令。瀏覽器二進位與npm工具由lockfile鎖定，保留本環境的憑證代理與CA變數。
>
> 每個新shell先`source scripts/env.sh`。把docs/cloud-start-skill.md的內容設為Start skill。環境內repo的`.agents/skills/grilling/SKILL.md`要能被發現；本地個人skill不會自動同步。驗證本chat是否真的有原生可點選問題工具；没有就使用本地訪談流程，不假冒點選卡。
>
> GitHub連接僅限本專案所需repo權限；不把主帳號全域PAT放環境。Pages用GitHub Actions的短效權限與OIDC部署，不提供部署PAT。其他服務有需要時才設定目的地受限的Network secrets；一般開發不放秘密。設定是否ready與API是否有實際權限分別查核。
>
> 驗證Node/Python/Git/npm/pnpm、Chromium JavaScript及輸入smoke、template-check。專案未初始化時明確標記，不能假裝遊戲測試通過。已初始化時依project.json審閱安裝命令後準備專案，再執行相關檢查。以最小測試分支／PR核對repo寫入與整合能力，使用者允許一般提交／合併；驗證後清理臨時分支，不輸出token。這個chat不碰README.md。
>
> 回報安裝與browser smoke實際結果、套件版本、網路/secret觀測狀態、repo讀写／合併權限及尚未成功的項目。準備好後提示我按Publish；發布後用新chat再驗證Start skill、grilling發現及工具可用性。不要把已準備的本地狀態聲稱為已發布雲端環境。

環境更新後需Republish，新chat才拿到新設定。既有chat保留自己的狀態。重要交接需commit／push，同一環境不代表chat共享未提交內容。

