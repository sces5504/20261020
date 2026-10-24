# UI／VFX polish · 2026-10-24

使用者直接要求：整個遊戲 UI 打磨為成熟手機遊戲、提升技能 VFX、修正手機劇情標題擋角色，單一 PR 交整合 AI；追加最新劇情／任務需有合適 UI。不做造型系統、不合併或部署。代表畫面已在本 chat 提交；使用者回覆「角色大一點，腳可以被下面字擋住」，已放大角色並允許腿腳延伸到對話框後。

## 基準與改動範圍

從乾淨 work／072892b 開始；fetch 核對 origin/main 同為072892b（PR23已合，0.9／11包／32少女／24新劇情節點）。使用者 prompt 的0.5規則限制保留，不回退後續版本。

本次獨立呈現範圍：`src/style.css`、`src/presentation/{ui.ts,story-player.ts,space.ts,icons.ts,journal.ts,combat-vfx.ts,ui-polish.css}`。只讀既有 Game／Combat；不改 domain、application、schema、內容包、角色／世界素材、存檔。相關驗證腳本與本任務文件另附；README由使用者管理。未啟用子代理。

## 交付

- 舊對話與新章節播放器共用標題／角色／文字／操作安全區，使用dvh及safe-area；單人放大，腳可被對話框遮住。長文只捲文字區；控制鈕保持可見，手機直／橫向皆試套。
- 深海軍藍／青／金共用介面：資源列、戰場、技能卡、下方導覽、管理面板、共鳴、研究、領地、角色、編隊、挑戰與結果／設定共用層次。手機操作列獨立於canvas，六人技能單列顯示；隱藏的頂部圖鑑／工坊可由設定進入。
- 航行紀錄分章節／每日／舊航行；24節依content的chapter分組、不硬寫節點清單。顯示前置、objective、四資源獎勵、閱讀／完成／領獎分離與可讀回看；既有命令仍驗前置及交易。
- 頂部任務捷徑顯示可領數量／接續劇情，捷徑優先帶到有獎勵的分類。每日進度條／更新倒數及領獎沿用既有daily帳本。護送／保護／限時戰鬥顯示模式、時限、required演員生命。
- VFX依宣告式技能種類分類，沿原作已接入action／field／bullet資料繪製；光束寬度／場範圍與命中仍由Combat決定。基底NORMAL、裝飾ADD、敵彈／有效邊界NORMAL在角色上方，低特效及reduced-motion保留完整危險線索。無動畫傷害回呼、無新亂數或新計時器。
- 素材契約與來源／版本／hash／尺寸／pivot／alpha／幀表替代規格：`docs/art/ui-polish-v1/manifest.json`。本輪為程序VFX與CSS；無新增角色貼圖、UI烘字圖或atlas。工坊原有Canvas測試場仍採原renderer，本輪新版VFX以正式Game隔離測試預覽為準；共用的模擬與素材引用不變。

## 驗證／審閱

- `npm run build`（含tsc）成功；保留既有大型chunk提示，未做無關bundle架構重寫。VFX兩項只讀／低特效邊界測試成功：連續繪製不改模擬／RNG、敵彈與真實zone／beam邊界完整保留。
- `test:polish`／v8桌機＋觸控成功：前端工坊碼、等待圖片、M、跨區／取消／重載／回程、保存隔離、施放立即冷卻／再就緒；32人同角色單卡、同調小圖、編隊移出、領地返回／派駐、七每日與領獎等受影響流程。
- 新UI按階段驗1440×1000、390×700 DPR2、320×568 DPR2、844×390。桌機／390完整共用面板已驗；最終兩尺寸另外定向驗新章節角色、長文字捲動／保存更新後位置保留、未領序章時太陽系預設選取／領獎／只讀回看、獎勵捷徑、六名實際角色原技能手動施放與低特效切換，正式save不動。窄／橫向驗舊對話、控制項安全區、無水平溢出、章節／每日／舊紀錄與前置／獎勵。各次來源／範圍保留於驗證收據，不冒稱所有畫面在最後SHA重跑完整release。
- `test:story`最終桌機1440×1000／觸控390×844全部通過，含略過初始化、重載不重發、實際戰鬥與cue、camera／等待演出、領獎／只讀回看、高難入口、NPC工坊、正式save隔離；零pageerror。沒有重跑124核心／671世界全量或31場劇情戰。
- 六張standard位元組與catalog SHA-256全部一致。研究包verify／SQLite重建成功，863檔、67表、37,723列；未執行原APK。
- 正式審閱頁：`docs/art/ui-polish-v1/review.html`；7項截圖／錄影、alpha／pivot／來源／hash見manifest；測試收據 `docs/verification/mobile-ui-vfx-20261024.json`。觀看過桌機主畫面／章節／戰鬥、新劇情與手機舊／新對話、章節、六人戰鬥，皆為實際renderer候選。
- 所有新UI／VFX為candidate；代表方向回覆不升格成全案approved。無Android／iOS真機、硬體效能、原APK逐幀或商業美術人工批准證據；不改commercial旗標。

### 如實保留的測試／布局修正

- 手機新UI測試首次直接點到隱藏的桌機編隊入口，改走可見「角色→調整編隊」，不force／不移除可見性斷言。
- 長文stress最初在入場動畫還沒結束時量測，改為有限CSS入場動畫完成後量測，保留捲動與控制分離斷言。進一步修掉原播放器每次經營revision重建DOM的問題；現在實際跨1300ms經營更新驗DOM與scrollTop保持。
- details-only的新鮮gallery context沒有IndexedDB store，seed補onupgradeneeded；不修改正式儲存行為。
- 原chronicle瀏覽器桌機實戰／cue後，在claim時發現章節預設偏好最早未領序章。改為目前session／第一個未完成chapter，頂部獎勵捷徑則精確到可領分類／chapter。最終實際章節領獎／回看定向驗通過；不重跑31戰。
- 舊story fixture原本所有章節平鋪；分組後，測試初次開啟與reload後須真的選fixture章節。已保留完整交易／只讀／戰中cue／camera斷言，只補兩次分類點擊。其首輪最終source的實戰／cue／camera已成功，後段在reload未選分類時逾時；後續結果獨立記錄。

## 整合方式

整合者review單一PR；一般merge保留本作者歷史，不另複製內容包或修改version。編輯器、領域、角色圖維持現有版本。整合後按原release門檻（含test:polish第五組與後續既有流程）發布；本PR不自行執行部署。驗證工具`node --import tsx tools/game/ui-vfx-e2e.mjs`支援`UI_VIEWPORTS=390x700,320x568`定向重驗，預設四尺寸。舊v8測試只新增切到「每日任務」分類的真實點擊。

最終本機受影響驗證已完成；最新fetch的origin/main仍為072892b。PR交整合者審閱與發布，本作者未merge／部署。
