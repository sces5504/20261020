> 0.5：電腦M切換大星圖；「星域航路」可前往第二測試空域並返回。工坊需入口碼，解鎖限同分頁session；可主動鎖定。舊草稿先備份再從新版正式內容建立。新契約見[0.5](design/galaxy-angel-v5.md)。

> 目前版本：星河戰姬 Galaxy Angel 0.4。新玩法與數值契約見 [0.4規格](design/galaxy-angel-v4.md)。角色詳情可同調，滿5次追加紫星，其後重複共鳴返還實際配方25%四資源；靠近星球守軍自動開戰，超界有重置倒數。工坊舊草稿先備份再從新版建立。

# 使用方式

原始範本的實測結果與能力界線：`docs/template-verification.md`。

## 建立新專案

1. 在GitHub使用此repo的 **Use this template**，建立公開的新repo；需要私人時由你改選。不選複製所有分支。
2. 先在本地或雲端用本repo的grilling完成規格。明確載入`.agents/skills/grilling/SKILL.md`可避免與本地同名舊版本混淆；例如：「使用此repo的grilling skill，以原生選項卡訪談並建立遊戲規格」。若雲端沒有選項卡，回本地訪談後提交spec、decisions、美術指南。
3. 遊戲框架、裝置操作、存檔、畫質等由該專案規格決定。初始化專案並填`.template/project.json`，設定name、install/start、daily/release檢查及build，最後才把initialized設true。root可以使用任意框架與套件管理器；通用工具在tools/。
4. 新repo的Pages設定選 **GitHub Actions**。template複製檔案，不代表雲端設定、repo權限與Pages設定也自動複製。執行`bash scripts/github-bootstrap.sh OWNER/NEW-REPO`可設定並核對公開、template、Pages及安全權限；此腳本只適用你有admin權限的目標repo，建立新repo後在本地有適當登入時執行。它不儲存token，也不新增費用。
5. 在Codex Cloud建立新環境，選新repo；貼上`docs/cloud-setup-prompt.md`。工具實測成功後Publish，用新chat確認可用。

bootstrap只允許GitHub官方actions，workflow token預設唯讀。main需要PR與checks通過、禁止force push及刪分支；不要求人類核准票，所以AI通過檢查後可自主合併。若要其他供應商action，先審閱後加入允許清單。main必須已有初始commit才能設定保護；新repo先推送初始內容。

## 本地工具

執行`bash scripts/setup.sh`，每個新shell`source scripts/env.sh`。第一次下載較久；重複安裝會復用Node與browser下載快取，套件依lockfile重新確認。macOS與Linux支援；Windows需WSL或由其原生Node24/Python3.11環境另行設定。

日常：`python3 scripts/project.py check daily`。正式上線：`python3 scripts/project.py check release`，再`build`、`stage`。沒有build命令表示直接準備靜態site_dir，仍必須有index.html和release驗收。不要把docs／repo root選為site_dir。

## project.json 的命令格式

所有命令是參數陣列，不是shell字串。例如daily可以是`[["npm","run","typecheck"],["npm","run","test:unit"]]`，release放額外的`[["npm","run","test:smoke"]]`，build是`[["npm","run","build"]]`。僅在實際建立這些命令後才填入；測試必須有意義，不能用echo冒充。

install與start同樣使用陣列；命令從repo root執行，需要子目錄時用套件管理器的`--prefix`或`--dir`參數。新依賴先審閱lockfile／腳本，再安裝。ready_url指向實際本地dev server，雲端Start skill负责就緒確認。

## 接力與美術分工

每個任務使用唯一task-id與自己的handoff檔。重要決策更新index／decisions／偏好檔，避免大量重複聊天紀錄。先提交修改與交接，再給接手chat分支或PR和任務路徑。接手者先核對Git實況。美術額外chat使用同一style-guide與asset-contract，交付後合併素材並檢視受影響畫面。

`python3 scripts/handoff.py capture task-id`只產生branch、HEAD、修改路徑的快照，不記錄秘密內容，也不自動提交。AI仍需要寫決策、測試與下一步。

## Pages與更新

- 主分支push觸發正式部署；未初始化時正式部署跳過并明確說明。初始化後，release checks或build失敗會阻止部署。
- `Pages diagnostic`是原始範本repo手動驗證用，只部署fixtures/pages-probe，複製後的新repo不允許執行該診斷。該頁不代表遊戲通過測試。
- 網址以實際Pages API結果為準。專案通常在`https://OWNER.github.io/REPO/`，遊戲資源路徑需兼容這個子路徑。
- 模板工具與規則更新不會自動覆蓋舊專案。記錄版本，選擇性搬入工具／規則更新，保留該遊戲的spec、任務、美術基準與專案指示；更新lockfile與雲端設定後重驗，再Republish。
- README.md一律由你管理。此使用說明獨立存放在docs，不建立或修改README，也不加入README變動檢查。

## 能力邊界

repo技能在current Codex Cloud可用；原生選項卡取決於host工具，skill無法新增工具。此範本包含可重用Install/Start內容，仍需在雲端介面建立與發布。突然中斷、未提交的語義決策無法保證被另一chat取得；靠階段checkpoint降低遺失。

參考：
- https://learn.chatgpt.com/docs/environments/cloud-environments
- https://learn.chatgpt.com/docs/build-skills
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

