# 劇情機制：多重護盾／限時干擾與章節臨時設施（作者文件）

供獅子座、南天、大犬座等章節接入。全部為封閉 schema：未知欄位、引用錯誤、門檻不一致都會讓 `npm run content:check` 失敗，不會默默略過。沒有角色或內容 ID 特例；數值、層數、攻擊分類由故事作者依來源核對後配置。

可執行範例：`content/examples/story-mechanics-demo.json`（不在 root manifest，不會進正式遊戲）。驗證：`tests/story-mechanics.test.ts`。

## 一、護盾（`storyEncounter.shields`）

| 欄位 | 說明 |
|---|---|
| `id` | 遭遇內唯一 ref，供 trigger 引用。 |
| `name` | 戰中提示顯示名，例如「三重護盾」。 |
| `tags` | 標籤（小寫英數），干擾設施以標籤選擇要暫停的護盾。 |
| `units` | 戰場演員 id（`storyEncounter.actors`）。 |
| `enemies` | 敵人定義 id；該類所有敵人（含波次）都受保護。`units`／`enemies` 至少一項。 |
| `blocks` | 被阻擋的攻擊分類：`melee`、`normal`（一般彈）、`piercing`、`splash`、`homing`、`laser`、`status`（腐蝕／燃燒持續傷害）。「遠程能量」＝`normal, piercing, splash, homing, laser`。 |
| `multiplier` | 0–1，被阻擋分類的傷害倍率；0＝完全抵消（預設）。 |
| `layers` | 0＝不計層數，只靠干擾／trigger 關閉；>0 時每層承受 `capacity` 點被阻擋傷害（以減傷前傷害計），全部耗盡即「擊破」。**不等於「挨 N 次就破」**，請依來源設定 `capacity`。 |
| `capacity` | 每層容量，只在 `layers>0` 時可設。 |
| `startsActive` | 開場是否生效（預設 true）。 |
| `duration` | 生效後自動到期秒數（可省略＝不到期）。 |
| `restoreAfter` | 被擊破或到期後幾秒自動恢復（恢復時層數補滿）。需有 `layers` 或 `duration`。 |
| `refillOnRestore` | 干擾窗口結束恢復時是否補滿層數（預設 true；false 保留干擾前剩餘層數）。 |

狀態：`up`（生效）、`suspended`（受干擾，窗口結束自動恢復）、`down`（擊破／到期，等 `restoreAfter`）、`removed`（本場永久移除）、`off`（`startsActive:false` 尚未啟用）。

## 二、章節設施（`facilities` 定義＋`storyEncounter.facilities` 擺放）

定義（內容包 `definitions.facilities`，工坊分類「章節設施」）：

| 欄位 | 說明 |
|---|---|
| `id`／`name`／`description`／`status`／`provenance` | 同其他內容。 |
| `color`、`sprite`（可空，空時以六角平台幾何呈現）、`size` | 呈現。 |
| `hp`、`defense` | 生命與防禦。 |
| `side` | `ally`／`enemy`。 |
| `targetable` | false＝不會被索敵、不受任何傷害（舞台等）。 |
| `scope` | `battle`：每場戰鬥以滿血重新出現，不寫存檔；`save`：須先由交易或劇情事件建成，存於 `save.facilities`，跨戰鬥延續生命。 |
| `retry` | 只供 `save`：`restore`（戰敗不保留本場損傷，重試回到開戰前）／`keep`（戰敗也保留損傷）。勝利一律寫回。 |
| `cost` | 只供 `save`：任務交易建造的扣款。 |
| `effect` | `none`；`turret`（`attack`、`range`、`interval`、`pattern`、`count`）；`aura`（`radius`、`modifiers` 沿用技能狀態詞彙，對範圍內同陣營單位每0.5秒刷新）；`jammer`（見下）。 |

`jammer`：`jams`（護盾標籤，空＝本遭遇全部護盾）、`seconds`（突破窗口）、`cooldown`（窗口後冷卻）、`channel`（隊長在 `reach` 範圍內停留幾秒啟動，0＝靠近即啟動）、`charges`（0＝不限次數）。

擺放（`storyEncounter.facilities[]`）：`id`（遭遇內唯一，trigger 引用）、`facility`、`x`／`y`（需在 `leashWarningRadius` 內）、`onDestroyed`：`fail`（被摧毀即戰敗，須為可受擊友方設施，用於必要存活目標）／`disable`（只失效，預設）。

`save` 設施未建成或已被摧毀時，該擺放不會出現在戰場。設施不會計入全滅判定，也不會混入殖民地生產建築。

## 三、觸發（`storyEncounter.triggers`）

每條 trigger 必須且只能有一種門檻：

- `at`：戰鬥秒數。
- `hpBelow`＋`actor`：演員生命比例 ≤ 門檻。
- `defeated`：演員被擊倒。
- `facility`＋`state`：設施擺放 `activated`（每次啟動）或 `destroyed`。
- `shieldDown`：指定護盾不在生效狀態。

`then`（1–8 個）：`enableShield`（恢復並補滿）、`suspendShield`（`seconds` 可選；省略＝直到再 enable）、`removeShield`、`activateFacility`（`facility`＝擺放 id，直接觸發效果，例如劇情演出啟動干擾器）。`repeat:true` 時每次條件由假轉真都再觸發。

戰中提示為畫面上方非阻斷狀態列：「三重護盾生效 · 3/3層」「三重護盾受干擾 · 突破窗口 8 秒」「靠近干擾裝置即可啟動／啟動中 60%／冷卻」「前線防禦砲台已被摧毀」。破層、擊破、干擾啟動另有戰場浮字。戰中通訊（cues）照舊不暫停。

## 四、建造／啟動與任務條件

- **交易建造**：劇情 `await` 條件含 `{ "fact": "facility", "target": <設施> }` 時，主線追蹤卡顯示「建造 · 名稱（費用）」按鈕，送出正式 `facility-build` 指令：檢查目前劇情確實要求該設施、資源足夠、尚未建成，扣款一次。指令有收據，重載重送不重複扣款；已建成再送會被拒絕。
- **事件建造**：劇情步驟 `{ "kind": "facility", "facility": <id>, "op": "grant" | "repair" | "remove" }`，免費、略過對白也會執行、有收據不重複。只供 `scope:"save"`。
- **任務條件**（可用於 `await`、`resumeIf`、`objective`、`requires`）：`facility`（已建成且未被摧毀）、`facilityDestroyed`、`facilityActivated`（累計啟動次數，`count`）。
- 與既有保護／防衛模式銜接：`defend`／`survive` 守到 `seconds` 勝利；`protect`／`escort` 仍以 `actors[].required` 為必要存活目標；設施以 `onDestroyed:"fail"` 加入必要存活。

## 五、範例流程

1. 護盾 → 干擾 → 到期恢復（`demo:planet.shield-trial`）：守衛擁有 3 層、每層 400 的三重護盾，擋遠程能量、不擋近戰；隊長飛到干擾裝置停留 1.5 秒，暫停 8 秒；窗口結束自動恢復並補滿；擊破後 10 秒恢復；守衛生命低於 50% 由 trigger 重新啟用。
2. 設施完成 → 防衛 → 成功／摧毀失敗（`demo:quest.defense`）：`await` 要求建成防禦砲台 → 追蹤卡建造（金屬60、水晶30）→ `defend` 30 秒，砲台自動射擊；砲台被毀即戰敗，`retry:restore` 讓重試回到建成狀態；勝利後劇情 `facility remove` 拆除。

## 限制

- 不提供自由擺放或建造編輯器；位置由作者指定。
- 護盾只作用於劇情遭遇（`storyEncounter`），不影響一般據點、巡邏與 671 場世界戰鬥。
- 設施沒有專屬美術時用幾何備援；美術由作者另交素材後填 `sprite`。
- 敵方設施只會開火或提供光環，不會移動；不可受擊的敵方設施不計入殲滅勝利。
- 「三重護盾」等來源描述的實際層數、攻擊分類、數值未由本實作推定，需故事作者核對來源。
