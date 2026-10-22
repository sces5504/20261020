# 世界／地圖／敵人／Boss AI：起始 prompt

目前產品：星河戰姬 Galaxy Angel，核心包0.7.0。先讀 docs/ai/START_HERE.md、docs/design/original-world.md 與 docs/handoffs/original-world-20261022.md，再核對0.6技能／彈幕契約及0.5既有規則。完整發布含八組瀏覽器流程，保留test:polish。掉頭後排先等待隊長，掉隊加速；敵人orbitSpeed、regions.routes與travel可配置。工坊需前端入口碼，完整發布含test:polish第五組瀏覽器流程。五次手動同調＋紫星、滿階按實際共鳴配方返還25%既有四資源；方向航跡編隊、星球守軍單波自動接敵／越界重置、巡邏非阻斷結算，不重加三波或新碎片。
請擴充指定星域的世界與敵群內容包。先讀 AGENTS.md、記憶索引、目前交接、docs/ai/START_HERE.md、docs/design/content-contract.md、interaction-flows.md、m1-implementation。確認命名空間、起點 commit、目標隊伍／等級／戰力、資源收益預算與已有行為清單。

只改自己的 content/extensions/<task>.json、區域設計與交接。定義星域尺度／起點、星球座標／依賴、遭遇敵群、解放獎勵、啟動成本、每秒產量、掉落角色與素材引用。先交一顆星球＋一場遭遇確認節奏，再擴量。

敵人及 Boss 使用目前已註冊的18種普通彈型及封閉技能動作（見skill-engine-v6），不再只限aim／fan／ring；需要新階段邏輯／移動／預警／勝負條件時，提出核心能力需求。不要硬改共享 Combat，也不要假設一個 phaseAt 就能表示任意 Boss 行為。

確認地圖前置無循環、所有目標可達、缺素材有狀態；不要靠 UI 畫一條線卻沒有實際解鎖資料。依探索版0.2維持巡邏遭遇／離線不補打，管理面板暫停戰鬥、經營繼續；防衛／失守／修復已取消。視覺位置不決定碰撞，手機仍須看懂畫外威脅。

來源盤點用 SQLite 局部查詢，已知／推論／新設計分開。驗收內容校驗、入口／出口、先後解鎖、首勝不重領、正常與較弱隊伍試玩、桌機與手機預警。交付小批 commit／PR、地圖示意、難度／收益對照、測試 seed 與缺口。根 manifest 與刪包遷移交整合者處理。

0.3追加：先讀 docs/design/galaxy-angel-v3.md。巡邏路線中心x/y、patrolRadius、patrolSpeed、phase、detectionRadius可配置；用domain/navigation.ts作唯一位置計算，不另寫碰撞公式。星球／敵人／建築／研究／星域sprite與星域background都須可預覽／替換。前鋒沿移動方向，後衛沿實際航跡追隨；安排遭遇時測試轉彎與坦克接敵。

0.5已提供星域航路選單與通用travel命令；regions.routes指定to／label／requires，雙向回程需明確配置。現有空測試第二星域可往返；新增星域仍須接上可達航線、驗前置／保存／返回。修改基底routes交唯一核心整合者，不以extension偷偷覆寫。

0.5世界新增欄位：enemies.orbitSpeed為往返側移角速上限，strafeSpeed為近距側移速限（普通14／Boss6）；遠距追擊仍用speed。新增敵人要實測普通攻擊可命中，不能只增加移動速度造成玩家無法有效攻擊。regions.routes為to／label／requires，回程需另配；目前從航路選單躍遷到目的地入口，沒有實際星門碰撞觸發。正式第二區沿用m1:frontier-test或另作明確遷移，不能刪除正在使用的區域而不給回復路徑。

0.7追加：本輪完整世界original:包已含CID成長、啟動前置、空守軍起點、臨時基地、每日排程與傷害挑戰、活動遭遇航跡及165個固定新資產。初始三人、收集後最多六人；本包基地免費20秒整補與13區補給巡邏為明示恢復適配。相同來源model共用圖片，不同model固定不同外觀；不要因等級更換既有外觀。來源／適配／未知界線與測試seed見世界契約及交接。使用者2026-10-22特准本輪世界chat補必要共用欄位與流程；此例外已記錄，不是其他世界作者永久可改核心的授權。
