# 劇情AI：序章＋太陽系＋處女座交接

## 使用者直接要求與基準

2026-10-23使用者告知前置已完成，要求開始完整序章＋太陽系＋處女座。隨後直接授權本chat依各敵人Q圖畫缺少的立繪，保持遊戲少女畫風一致。原六少女原圖不改。

從`work/1c088bd`開始，fetch確認最新main `9da3fdd`（core0.9.0，PR20／21／22）；已merge保留作者歷史，工作分支`content/story-first-three`。先前0.8提示由新核心契約取代。讀過最新交接、作者契約、24節點來源、角色／世界／美術契約與記憶；研究包verify及SQLite重建通過，沒有重新逆向或聲稱原APK執行。

## 交付

- `content/extensions/chronicle-first-three.json`：24 QuestS節點、518框繁中來源譯寫、31場同Combat劇情遭遇、2個獨立戰役航區、2 NPC／4圖。現有32位與世界／技能數值不改。
- `content/story-first-three/dialogue.txt`：可編輯的逐框繁中原稿；`sources.json`：逐框來源row／明填speaker、每任務入口label／row、遭遇來源與適配。
- `tools/story-first-three/build.py`可重建本包；不會改他人定義或自動寫根manifest。
- `art/story-first-three/`：Kiraba／Mitsuba透明立繪（依各自Q圖與現有少女風格）、地球母艦／屏障戰背景、人造黑洞背景、主檔／WebP／來源記錄／SHA。PNG保留，WebP僅編碼不裁切；候選非人工批准。
- 章節簡報：`docs/design/chronicle-first-three.md`，含時間線、聲線、詞彙表、預算、原作／譯寫／適配界線。
- 根manifest／素材catalog只做必要啟用；package.json與.template/project.json登錄`test:chronicle`發布流程，不改schema／domain／UI／README。

入口為航行紀錄章節區。所有新章節autoStart=false，避免強制中斷舊玩家；序章→太陽系12節→處女座11節。保留原有M1操作引導，不冒稱其為原作。故事戰場有返回原星域的航路，31個事件不疊在原星球座標。清除太陽系SE1–15的世界前置保持；到處女座需經既有星門。對應舊世界已清星球／Boss，可用resumeIf跳過已解放的同源遭遇，不重發原世界獎勵。

## 經濟

章節資源每種合3100（四種合12400），遭遇首勝reward空，不發新貨幣／新碎片／免費可抽少女。救出與本場助戰不代表永久入手。保留共鳴與五次同調／紫星／25%實際配方返還。

經濟路線只用初始錢包＋章節補給；真實扣款強化34次、到期治療28次，三人最後Lv13／12／12，31戰全勝，最後四資源各餘450–540。世界清除與抵達是明標fixture，未計其收入，不是新帳號完整探索／通關時間證明。原15據點／671遭遇證據沿既有世界交付，不重跑。

## 已完成驗證

- content:check、build（含tsc）、playtest readiness通過。
- 新31戰seed42、固定移動／自動技能、各聲明等級三人隊全勝；調整護送過短／增援節奏後重驗受影響本批。成功原始結果保留於`chronicle-battles.json`，後續完整flow重用這些實戰結果，不再重算每場。
- 24節點順序／前置、序列化重載、略過不越過等待／遭遇、完成／已讀／已領分離、receipt重送、二次領獎拒絕通過：`chronicle-content.json`。
- 保守付費養成／治療路線：`chronicle-economy.json`。
- 桌機1440×1000及觸控390×844 DPR2：正式序章、略過初始化／重載不重發、實際金星救援與戰中cue、章節領獎、回看不改資源、正式save隔離、二NPC／黑洞預覽、4素材HTTP／SHA／尺寸／解碼、零pageerror通過：`chronicle-browser.json`。
- 已目視桌機／手機章節、NPC及背景截圖。手機沿用0.9三槽演員布局，單一演員仍佔32%寬；文字與按鈕可讀且未溢出。若要放大單角色展示，由核心AI另改共用播放器，不用內容資料夾帶CSS。

## 如實保留的驗證修正

首輪schema拒絕只有hostile故事演員而空enemies；改成本包自己的敵對星靈定義，引用原角色技能／Q圖與明示HP適配，不改核心拒絕條件。首輪流程斷言誤把已滿足await也要求停住、並用不同commandId重送已完成遭遇；修正測試以真實條件與同commandId驗receipt。首輪battle fingerprint忘await，僅修metadata序列化，成功實戰不重跑；後改autoStart只影響入口，以battleInputFingerprint固定戰鬥依賴核對重用。首輪瀏覽器同hash沒有重載新fixture，改先離開遊戲；其後補正常關閉既有戰果面板，以及回看跳過不執行的await提示。未用force click／放寬可見性或刪驗證掩蓋問題。

## 界線與後續

這是完整24節點的本作繁中敘事適配，非每個原生opcode或全部重複對白逐句復刻；不自造原作分支／後章結局。原作、推論與設計見簡報。關鍵時序／敵方編成依來源，等級／護送／防衛／增援節奏明標適配。木星與伊扎爾使用既有正式立繪，沒有謊稱完成Hp／Boss差分。新增艦隊／屏障是靜態背景，沒有新增動畫／配音／音樂。

最終PR／main／Pages與公開SHA待發布後更新PR描述，避免只為記自己的SHA再次觸發全套。人工素材批准、Android/iOS真機及commercial驗收未宣稱完成。未修改任何進行中既有story signature；本包新ID首次發布。

## 最終校對：保護目標

「姊妹重逢」需保護格利澤581e，初稿support順序卻讓木星成為required。已把妹妹置為受保護目標，木星仍同場助戰；與已提交extension逐定義比較，只有這一遭遇runtime變動。按保守經濟路線同樣三人Lv10重驗，10.45秒勝利、三人滿血；其他30場不重跑，battleInputFingerprint與定向收據保存。原經濟全程報告保留並註明這次修正，不冒稱整輪重跑。其後只再驗24節點交易串接。正式瀏覽器序章／金星／NPC／回看路徑未受這一戰場修正影響，保留已成功收據。
