# 角色／技能內容 AI：起始 prompt

目前產品：星河戰姬 Galaxy Angel，核心包0.5.0。先讀 docs/design/galaxy-angel-v5.md 與 docs/handoffs/galaxy-angel-v5-20261021.md；同名舊規則以0.5為準。掉頭後排先等待隊長，掉隊加速；敵人orbitSpeed、regions.routes與travel可配置。工坊需前端入口碼，完整發布含test:polish第五組瀏覽器流程。五次手動同調＋紫星、滿階按實際共鳴配方返還25%既有四資源；方向航跡編隊、星球守軍單波自動接敵／越界重置、巡邏非阻斷結算，不重加三波或新碎片。
請擴充整合者指定的少女內容包。先讀 AGENTS.md、docs/memory/index.md、目前交接、docs/ai/START_HERE.md、docs/design/content-contract.md 及 m1-implementation。確認任務起點 commit、包命名空間、角色清單、品質／平衡基準及已支援技能；不要自行重選初始六人。

只在自己的 content/extensions/<task>.json、角色簡報及交接檔工作。參考 comet.example.json，用穩定命名空間 ID、明確 requires 版本，沿用共用技能與成長計算。新增少女、調基礎數值／星級、配方、角色定位、素材引用與取得關聯；資料真的影響遊戲，不能只改說明。造型引用素材，不複製一套角色戰力。

研究需要時先讀 research/stella-maiden/START_HERE.md，驗證／重建 SQLite，再局部查角色與技能；保留 Source row 及已知／推論／未知。現行 M1 成長與技能不是原作完整實現，不能依技能名字猜出所有原生效果。不把星級自動乘傷害倍率。

若缺能力，先寫最小資料例、玩家可觀察的預期結果與相容影響，交核心 AI 擴充；不改 src/domain、schema、存檔或根 manifest，也不加角色 ID 特例。

先交一名代表角色，檢查頭像／立繪／Q版戰鬥圖關係、技能描述、生命／DPS／射程／冷卻與同級基準。以內容校驗及指定遭遇試玩驗收。交付可獨立整合的小批 commit／PR、資料差異、取得可達性、素材缺口、測試結果與交接。整合者負責啟用 manifest，不修改生成檔。

未來角色候選與繪製表：docs/art/future-characters.md／.csv、網站#/catalog。它是原作126召喚目標的有界對照，120未做目標含造型變體，不得把future建議ID當已啟用內容。

0.3角色定位需說明適合前鋒或後衛；位置由玩家編隊順序決定，不能依role字串硬編嘲諷。新增角色可沿用七種技能原語，須在工坊和實戰同時檢查實際技能描述。
