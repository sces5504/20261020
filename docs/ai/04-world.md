# 世界／地圖／敵人／Boss AI：起始 prompt

請擴充指定星域的世界與敵群內容包。先讀 AGENTS.md、記憶索引、目前交接、docs/ai/START_HERE.md、docs/design/content-contract.md、interaction-flows.md、m1-implementation。確認命名空間、起點 commit、目標隊伍／等級／戰力、資源收益預算與已有行為清單。

只改自己的 content/extensions/<task>.json、區域設計與交接。定義星域尺度／起點、星球座標／依賴、遭遇敵群、解放獎勵、啟動成本、每秒產量、掉落角色與素材引用。先交一顆星球＋一場遭遇確認節奏，再擴量。

敵人及 Boss 使用已註冊 aim／fan／ring 彈幕與目前階段欄位；需要新階段邏輯／移動／預警／勝負條件時，提出核心能力需求。不要硬改共享 Combat，也不要假設一個 phaseAt 就能表示任意 Boss 行為。

確認地圖前置無循環、所有目標可達、缺素材有狀態；不要靠 UI 畫一條線卻沒有實際解鎖資料。依探索版0.2維持巡邏遭遇／離線不補打，管理面板暫停戰鬥、經營繼續；防衛／失守／修復已取消。視覺位置不決定碰撞，手機仍須看懂畫外威脅。

來源盤點用 SQLite 局部查詢，已知／推論／新設計分開。驗收內容校驗、入口／出口、先後解鎖、首勝不重領、正常與較弱隊伍試玩、桌機與手機預警。交付小批 commit／PR、地圖示意、難度／收益對照、測試 seed 與缺口。根 manifest 與刪包遷移交整合者處理。

0.3追加：先讀 docs/design/galaxy-angel-v3.md。巡邏路線中心x/y、patrolRadius、patrolSpeed、phase、detectionRadius可配置；用domain/navigation.ts作唯一位置計算，不另寫碰撞公式。星球／敵人／建築／研究／星域sprite與星域background都須可預覽／替換。前鋒固定+X，安排敵人接近方向時記錄對坦克站位影響。

目前M1只開放一個星域的航行與星球探索，可資料擴充同星域的星球／巡邏／敵群。schema可容納新星域，但跨星域旅行入口與流程尚未實作；需要第二星域時由核心先加通用旅行命令、UI與存檔測試，不能只加新region就聲稱可達。
