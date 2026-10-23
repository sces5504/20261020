# 劇情AI接入契約 · core 0.9.0

這是通用功能與**測試資料**說明，不是核定故事。來源需求見 `story-core-requirements.md`，逐列operand見 `../verification/story-core-source.json`。正式24節點由劇情AI製作；保持QuestS row／EventScript label／第一匹配row與推論／重建／新設計區分。f34／f35不能單獨作speaker。已交付的六名少女與32人三圖可直接使用；三個待核中文名與NPC／背景／表情差分請依需求對照另交角色／素材作者。

## 包、工坊與驗證

沿用schemaVersion 1及additive extension，不新增引擎、不執行任意腳本、不寫玩家欄位。新包`requires`應精確指定`m1:core@0.9.0`，其他依賴按正式manifest版本。命名空間僅可新增自己定義。根manifest由整合者啟用；內容包不能覆寫他人角色或世界。舊`{speaker,text}`對話完全相容，無story欄位仍走舊流程。只有`once`可有`story`，daily保持0.8行為。

工坊「劇情／任務」增加story JSON欄位（未設為null）；「星球」增加storyEncounter JSON欄位；「劇情演員／NPC」可以從空分類新增，設定portrait與variants。JSON本身有嚴格schema、引用、前置循環、座標／預算及語義校驗；未知欄位、未知kind及缺引用會明確報錯，不會略過。保存草稿→校驗→套用隔離測試遊戲；正式save不變。可匯出ZIP，媒體沿既有hash與大小限制。正式內容不要啟用`tools/story/fixture.mts`（僅測試）。

## Quest.story

| 欄位 | 型別／預設 | 行為 |
|---|---|---|
| chapter | namespaced ID，必填 | 將同章任務分組，不代表角色ID |
| autoStart | 布林，預設false | 前置滿足且沒有戰鬥／其他面板時自動觸發一次；false由章節面板開始 |
| chapterRequires | ID陣列，預設[] | 各前置章全部active節點完成才開放；不能自我前置或循環 |
| requires | Condition，可省略 | 任務開始門檻，省略為可開始；已接受流程不因移區失去資格；任務前置引用不能循環 |
| objective | Condition，可省略 | 流程已讀後，條件滿足才標完成；省略為流程已讀即可完成 |
| steps | 1–512個StoryStep | 逐步持久cursor；每個初始化有穩定receipt |

`Save.story.completed`（完成）、`Save.storySeen`（已讀）、`Save.quests`（已領獎）獨立。流程結束只寫已讀並求值objective；領獎由既有quest交易另做，既有reward／character欄位仍可用。對新story，已持有角色的初始化／任務角色獎勵不重複發第二份。**若故事明確要給重複同調素材，需另議新原語，不能藉發角色演出偷偷改玩家欄位。**星球reward是遭遇首勝，quest.reward是章節獎勵；作者須明確分配，不能把同一份獎勵同時填兩處。

已完成是單調狀態：之後變換星域／角色同調不撤銷過去完成。章節開放不等於領獎，也不要求先領獎才開放。要特定已領前置時使用claimed。前置與objective由domain在命令／到期結算更新；位置由航行checkpoint保存，位置條件在下一個checkpoint或交易生效。等待條件時可「返回航行」，達成後從章節面板接續。

## Condition（最多8層）

```json
{"all":[{"fact":"cleared","target":"fixture:planet"},{"any":[{"fact":"character","target":"fixture:hero"},{"fact":"research","target":"fixture:research"}]}]}
```

這是結構例子（fixture引用需替換）；all／any均為1–32項，不能空。葉節點：`fact`必填、`target`預設空字串、`count`預設1（1–1,000,000）、`x/y`預設0、`radius`預設100（1–2000）。未列語義的operand不能夾帶使用。

| fact | target／語義 | count |
|---|---|---|
| region | 星域ID，目前所在區 | 固定1 |
| position | 星域ID＋x/y/radius，已保存的隊長位置進入圓形區域 | 固定1 |
| cleared / activated | 星球／據點ID，已解放／星球已啟動 | 固定1 |
| character | 角色定義ID，當前持有實例數（不是owned ID） | 指定數量 |
| research | 研究ID，已完成 | 固定1 |
| building | 建築ID，所有領地已建等級總數 | 指定數量 |
| completed / read / claimed | 任務ID，完成／已讀／已領 | 固定1 |
| event | 由event步驟宣告的事件ID，初始化累積數 | 指定數量 |
| battleWon | 空＝所有新勝利；或指定星球／巡邏ID；舊cleared可證明該遭遇至少1勝 | 指定數量 |
| summoned | 空＝既有總召喚次數；指定角色＝新流程實際召喚完成次數 | 指定數量 |
| built | 空＝既有總建造次數；指定建築＝新建造事件數／現有建築等級總數取大值 | 指定數量 |
| leveled / healed | 空＝新事件總數；指定角色＝新強化／治療完成事件數 | 指定數量 |
| constructed / upgraded | 空＝新事件總數；指定建築＝首次建造／後續升級事件數 | 指定數量 |

舊存檔沒有的歷史強化／治療次數不能捏造。舊有cleared／角色／研究／建築與總built/summoned直接沿用，對新故事提供resumeIf銜接，不能重置世界。events/counters只由成功domain交易寫入，掉線工作到期也只記一次。

## StoryStep

| kind | 欄位 | 執行／略過行為 |
|---|---|---|
| say | speaker字串、text 1–3000字；actor?、portrait? | 顯示明確speaker，actor只決定立繪；略過不阻擋初始化 |
| stage | actor ID、visible布林、slot left/center/right、portrait? | 入場／退場與差分；略過呈現後仍能由cursor前綴重建畫面 |
| background | asset ID | 切背景；必須是正式assets引用 |
| camera | x/y、zoom 0.5–2、seconds 0–10 | 鏡頭聚焦與縮放演出，不改玩家座標 |
| fade | opacity 0–1、seconds 0–10 | 黑幕轉場 |
| wait | seconds 0–30 | 呈現等待，略過可跳過 |
| acquire | character定義ID | 必要初始化，若尚未持有才透過addCharacter＋receipt發放，不能重複 |
| event | event ID | 必要初始化，每步receipt只記1次event計數，可用於其他once條件 |
| encounter | planet ID、resumeIf? Condition | 開始同Combat的非每日event據點；勝利後續播、失敗停在此步可整補重試。resumeIf滿足時舊檔可跳過已完成遭遇，**不發遭遇獎勵** |
| await | condition | 條件未達成停留；略過不能繞過 |

在steps中放encounter前的say＝戰前對話，後面的say＝戰後對話；戰中對話在storyEncounter.cues。略過可以跳過say/stage/background/camera/fade/wait，但仍依序處理acquire/event與await/encounter門檻，不用「整章已讀」跳過初始化。重新整理從持久cursor接續；開戰中重載以原seed重建當場Combat（和既有遭遇一致，非逐tick保存），已確認的cue不重播；未確認cue會重播。重試失敗遭遇重開seed／時間，不重複章節初始化。

## NPC與差分

`actors`是獨立演員庫，不加入召喚池，不需要先建立可玩少女：

```json
{"id":"fixture:npc","name":"測試通訊員（非正式）","portrait":"fixture:portrait","variants":{"neutral":"fixture:portrait","worried":"fixture:worried"}}
```

say/stage的actor可引用actors或characters；portrait是明確assets ID，差分可從variants取得該ID。speaker永遠由作者核對明填，不能根據角色圖、f34/f35或畫面左右位置推定。既有speaker/text不受影響。素材缺失會報錯，不能借另一少女圖片假裝該NPC。

## Planet.storyEncounter（非每日event限定）

沿用既有Combat、技能、敵人、傷害、暫停與結果交易；不新增日常入侵、失守或修復。外層objective維持eliminate、timeLimitSeconds保持0；本欄獨立描述故事目標。

| 欄位 | 格式／限制 |
|---|---|
| mode | eliminate清敵；protect目標存活且清敵；escort受保護角色抵達；survive限時小隊存活；defend限時小隊與指定目標存活 |
| seconds? | 1–1800有效戰鬥秒，survive/defend必填；protect/eliminate/escort有填時為失敗deadline |
| actors | 最多12：id（戰場實例ID）、character（角色定義ID）或enemy（敵人定義ID）二擇一、x/y、side ally/enemy、level 1–120預設1、required預設false、spawnAt預設0、destination? {x,y,radius:10–300} |
| waves | 最多24，按at遞增：{at,enemies:[{enemy,count:1–30,level:1–120}]}；預定波次未抵達不能提早清敵獲勝 |
| timeline | 最多64：actor、at?、hpBelow?（0–1）、action。at與hpBelow至少一個，兩個都填則AND，每列只執行一次 |
| cues | 最多24：at?、hpBelow?、actor?、steps（1–32個純PresentationStep）。生命門檻必須指向戰場actor；兩門檻同時配置為AND |

required目標死亡立刻失敗；護送需要required友軍與destination，protect需要required友軍。非編隊演員可引用少女或不可收集的敵人定義（不需新增可抽少女），使用同一戰鬥單位、傷害、技能和可見素材，不加入玩家持有／編隊、不持久修改HP。友方故事演員自動施技；移動按destination或timeline，靜止者保持位置，沒有隱形無敵或傷害轉移。增援按有效戰鬥秒執行；管理／劇情對話暫停與離線都不推進倒數。倒數勝利不會自動消滅所有敵人。演員與目標位置須在星域及遭遇警告圈內；總單位與既有技能彈體／場域預算一起校驗。

timeline action只接受：retreat（移除且不能用於required）、team（必填side，required不可變敵）、move（必填x/y）、setHp（必填ratio 0–1）。其他operand明確拒絕。這些是明示重建原語；setHp不可直接改存檔角色HP，亦非讓內容包任意寫玩家欄位。使用原作SpawnCID／ChangeTeam等線索時，作者需另記row、參數換算與未確認之處。

## 最小測試範例

在既有有效quest物件加下列story，保留原有base欄位／reward／dialogue；**非正式故事**。替換所有fixture引用，新增actor與assets後才可校驗。

```json
{
  "chapter":"fixture:chapter",
  "requires":{"fact":"region","target":"fixture:region"},
  "objective":{"fact":"event","target":"fixture:initialized"},
  "steps":[
    {"kind":"say","speaker":"測試NPC","actor":"fixture:npc","text":"測試資料，非正式台詞。"},
    {"kind":"acquire","character":"fixture:hero"},
    {"kind":"event","event":"fixture:initialized"},
    {"kind":"encounter","planet":"fixture:encounter","resumeIf":{"fact":"cleared","target":"fixture:encounter"}},
    {"kind":"say","speaker":"測試NPC","text":"測試戰後對話。"}
  ]
}
```

有效的完整測試pack由`tools/story/fixture.mts`從正式快照建立，含NPC、演出、取得、事件、戰前／中／後對話與防衛。不啟用於正式manifest。`tests/story.test.ts`驗交易／舊檔／目標；`tools/story/e2e.mjs`驗真實UI、重載、回看、工坊與圖鑑。

## 回看與內容改版

章節面板「章節回看」僅在已讀／舊已領章節開放。使用本地呈現cursor，acquire/event/encounter/await都不執行domain命令；不改進度、不發獎、不進入實戰。要重戰請用世界挑戰入口，首勝獎勵仍由原receipt保護。未讀章節要用「開始劇情／接續劇情」，不能從回看繞過完成條件。

進行中流程保存signature；若同一quest的步驟／條件被改寫，舊流程會明確拒絕載入並保留原存檔，需恢復原內容包後結束流程，或另交明確遷移方案。不要在已發布且有進行中玩家的quest中插入步驟而重用原cursor；新版本內容應先驗舊檔銜接。歷史已讀／完成／獎勵收據不因內容退休而刪除。正式24節點內容完成後仍須做其實際流程驗證，通用核心測試不等於正式故事驗收，更不等於商業品質或Android/iOS真機驗收。
