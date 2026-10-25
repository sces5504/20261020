# 獅子座／南天／大犬座：接續製作盤點

日期：2026-10-25。main核對點 `f7c8130296603d0b7aac9fb560d8135f49dbc585`；依賴PR [#36](https://github.com/sces5504/20261020/pull/36)，核對head `f194e22758f0b391d8c146a1aa05456f9b4fce7a`。本文件是製作簡報與交接，不是已發布章節。

## PR36更正結論

先前「缺22名角色」以已合併main為基準；PR36已提供全部22人的角色、來源技能、星數與共鳴配方。不要重做數值、技能或另建同名角色。PR36尚未合併，root manifest也尚未啟用；正式內容作者需在整合版本核對依賴後引用。

直接檢查PR36的 `content/extensions/story40.json`：下列22名全部存在，portrait／avatar／sprite全部為空，共66項媒體綁定待補。這表示該包未提供素材；不斷言其他未整合美術分支沒有原檔。依同包角色name填speaker，勿另造繁中譯名造成舊對白立繪不匹配。

| 章節 | 包內name | 正式角色ID | CID row | 美術狀態 |
|---|---|---|---|---|
| 獅子座 | Luyten | `story40:character.luyten` | 38 | 三圖未綁定 |
| 獅子座 | Regor | `story40:character.regor` | 39 | 三圖未綁定 |
| 獅子座 | TseenKe | `story40:character.tseenke` | 40 | 三圖未綁定 |
| 獅子座 | Alherem | `story40:character.alherem` | 42 | 三圖未綁定 |
| 獅子座 | Suhail | `story40:character.suhail` | 41 | 三圖未綁定 |
| 獅子座 | 南河三 | `story40:character.procyon` | 36 | 三圖未綁定 |
| 獅子座 | 軒轅十四 | `story40:character.regulus` | 34 | 三圖未綁定 |
| 獅子座 | Arkas | `story40:character.arkas` | 35 | 三圖未綁定 |
| 南天 | Aegir | `story40:character.aegir` | 47 | 三圖未綁定 |
| 南天 | OTS44 | `story40:character.ots44` | 50 | 三圖未綁定 |
| 南天 | DEN | `story40:character.den` | 51 | 三圖未綁定 |
| 南天 | Musca | `story40:character.musca` | 43 | 三圖未綁定 |
| 南天 | 十字架二 | `story40:character.acrux` | 44 | 三圖未綁定 |
| 南天 | Acamar | `story40:character.acamar` | 49 | 三圖未綁定 |
| 南天 | Ran | `story40:character.ran` | 46 | 三圖未綁定 |
| 大犬座 | 天狼星 | `story40:character.sirius` | 52 | 三圖未綁定 |
| 大犬座 | Canis | `story40:character.canis` | 56 | 三圖未綁定 |
| 大犬座 | 弧矢一 | `story40:character.wezen` | 57 | 三圖未綁定 |
| 大犬座 | Furud | `story40:character.furud` | 59 | 三圖未綁定 |
| 大犬座 | 弧矢二 | `story40:character.aludra` | 58 | 三圖未綁定 |
| 大犬座 | Bayes | `story40:character.bayes` | 53 | 三圖未綁定 |
| 大犬座 | 弧矢增二十二 | `story40:character.naos` | 60 | 三圖未綁定 |

南天另使用已有完整三圖的Doradus，並沿用前章Procyon；沃爾夫359及前兩章其他既有角色不重製。PR36另外包含Achernar與Rufus，其製作順序是經授權的同章推定補位，不能宣稱兩人有直接Chat／SpawnCID登場證據；Achernar的文內提及另與實際出場區分。

## 原作篇幅與場景

來源入口 `research/stella-maiden/START_HERE.md`；沿用 `docs/handoffs/story-roadmap-20261023.sources.json` 的QuestS／EventScript來源，label按第一匹配row解析，不把label當row，Chat的f34／f35不單獨決定speaker。文字為繁中改寫，不能標成原作官方繁中。

- 獅子座：QuestS[25–36]，入口label 6024–6035，共12節。調查與追蹤、救援、Aitsu的情報、建立防線、古代艦／黑洞砲、高速母艦Samael、章末。來源演出變體與99角色不另算可玩少女。
- 南天：QuestS[37–48]，入口label 6036–6047，共12節。蟲洞漂流與支援、Ran／Aegir、Haitsu、召喚母艦與奪艦、人格解放、章末。
- 大犬座：QuestS[49–59]，入口label 6048–6058，共11節。Canis與四名偶像、Sirius／Bayes支援舞台建設與防衛、追蹤巡邏、多重護盾與干擾裝置、Morugo、演出與傷後收束。

合計35節；詳細逐句speaker、演出與戰鬥預算在各節正式資料落地前逐一核對，不把此摘要當完整對白來源。

## 剩餘美術與特殊單位

1. 角色AI優先補上表22人的立繪、頭像、Q版，按章節順序，保持現行風格與正式ID。頭像可按素材規格由立繪裁切，不要求66張獨立創作。交原檔、正式assetId、尺寸與hash、來源和review；不可用幾何備援冒充正式美術。
2. 新敵方對白演員Aitsu（CID191）、Haitsu（192）、Morugo（193）已有原世界Q圖，缺對白立繪。本故事作者已獲使用者授權可依Q圖製作，無須再索取同項授權。Kiraba／Mitsuba可用現有正式演員與立繪。通訊員／系統若採純文字旁白需明示，不借其他少女立繪。
3. Samael／高速母艦（原CID180 Enemy_Mothership03）目前查無正式敵人定義與對應素材；不能把既有母艦178改名冒充。古代艦、黑洞砲、干擾器、舞台／砲台及Boss變體要先按用途列非可玩單位與素材對照，不加進共鳴池、不把99演出變體做成新少女。
4. 背景需求按情境：獅子座前線指揮／防線／古代艦，南天蟲洞漂流／母艦內部，大犬座舞台與設施／戰後演出。已用艦橋可沿用開場與通訊；新情境先核對素材庫再補圖，不用單色或角色名硬編assetId。

## 核心：可沿用與待確認

已支援：來源角色acquire、持久事件與條件、移動到指定區域、殲滅／保護／護送／生存／防衛、分波、定時／血量觸發與戰中非阻斷通訊、失敗重試與一次獎勵。依最新整合交接，章節由玩家手動接續，實際飛到戰場再出擊；不新增中繼星域、不恢復自動瞬移或阻斷戰中通訊。

不能目前直接承諾完整原作效果的需求：

- 多重護盾與限時干擾器：底層有免疫、方向屏障、彈體抵消／反射及dispel，但目前故事timeline只有retreat／team／move／setHp，不能直接透過劇情資料啟閉指定單位的護盾。先做機制原型，驗證「遠程受阻、近戰有效、裝置啟動後有限窗口、到期恢復」；若現有技能／狀態足夠就純內容實作，否則交核心AI加通用支援。不得把所有傷害減免假稱原作的遠近攻擊差異。
- 舞台／砲台建造與防衛：建築條件與保護演員已存在，但「任務中建立指定臨時設施，保留HP，連結其效果與後續戰鬥」仍需先確定資料方案。不能以任意寫玩家旗標、只說建好了、或永久生產建築代替場景設施。
- 必要新特殊單位與Boss來源技能：先盤點現有來源技能及敵人資產再建立內容定義，不能看到缺CID就宣稱必須改核心。

此處是待原型確認的能力需求，不是已證實必須新增三套核心。新分支、旗標、回看或不支援的演出不預埋在資料內默默略過。

## 下一步與驗收

先接PR36正式角色ID，按獅子座→南天→大犬座製作；先交一段Luyten／沃爾夫359代表通訊與一個調查任務，核對來源speaker、字數與手機換行、飛行門檻、勝敗重載與獎勵，再擴充35節。新包獨立命名空間，保留前24節與舊存檔；角色取得與獎勵走資料關聯，整合者檢查新增共鳴池和獎勵的經濟影響。

正式門檻：必要初始化略過仍執行；刷新／重試不重領；舊存檔能接續；角色／立繪引用有效；戰中通訊非阻斷；手機可讀。遵守減少重複測試偏好，只測本次受影響內容，完整發布檢查留整合發布一次。本次僅盤點，未啟用PR36、未新增35節內容、未執行遊戲驗收，也未宣稱商業品質已驗收。

---

## 已完成製作（使用者回覆前置完成後，取代上方舊缺口）

同步main `69fb108ee9ca91dcd7a105f60e7462ee446d4a73`，已整合72角色、美術與護盾／設施。保留先前盤點作歷史；22人的缺角色／缺圖不再是阻塞。依使用者直接授權完成敵方立繪與特殊素材，未改共享核心或他人包。

正式簡報：[chronicle-next-three](../design/chronicle-next-three.md)。本輪完整交付：

- `content/extensions/chronicle-next-three.json`，`chronicle3:package.next-three@0.1.0`：35節、625框、56場戰鬥＋6處無守軍掃描、8設施、3新演員、3非收藏交戰定義（Samael、十字架二、Canis近戰客席）。依賴核心／世界／前24節／story40／stellar40正式版本，沒有新增共鳴角色或掉落。
- `content/story-next-three/dialogue.txt`與`sources.json`：逐框來源、章節label→首row、遭遇適配與預算。編譯器 `tools/story-next-three/build.py`，不修改研究原表。
- `art/story-next-three/masters`原始候選及`web`衍生圖，12項；`media.json`給整合，`source-records.json`記Q圖／風格來源、hash、尺寸、alpha與檢視狀態。不是原版素材／使用者人工批准。
- `tools/story-next-three/load.mts` 顯式assemble候選，根manifest不啟用；`verify.mts`／`browser.mts`為本包隔離驗收，不動正式存檔。媒體在browser時只複製到忽略的dist測試目錄。

### 已驗證與精簡測試紀錄

1. 研究包verify／SQLite建立通過；根程式build（含tsc）通過。根build仍是已啟用main內容，候選另外assemble，不能把此命令當候選已上線。
2. 先驗獅子座第一任務兩場，再驗其餘54場：56/56勝利，seed42，初始三人、敵方等級＋2、零研究／同調、自動技能與明示走位。沒有健康鎖、強制勝利或修改Combat。最慢Samael決戰181.83秒，護盾樣本二98.33秒。固定操作是驗證條件，非所有隊伍／打法勝利保證。
3. 首輪625框／35節交易流程完成。發現同區position條件沒有導航按鈕，改六處調查為可導航的空守軍event，三秒掃描；不改核心、不加假敵人或默默省略調查。新6/6掃描通過，原56場資料fingerprint相同，沿用成功證據未重跑。
4. 35節順序、略過不越過門檻、JSON重載、35次實際領獎與第二次拒絕、六次正式建造扣款及重送receipt不重扣、六個調查初始化各一次、章末設施撤除均通過。必要舞台HP=0強制邊界確認失敗與retry:restore，明標非自然戰敗實玩。Morugo最終戰實際看到45秒干擾啟動、到期恢復後仍可近戰完成。
5. 桌機1440×1000與觸控390×844 DPR2：Luyten／沃爾夫開場、文字／按鈕不重疊、首場真實伏擊勝利、正式設施建造按鈕與扣款重載、3敵方立繪、各章情境與最長框、12媒體HTTP／SHA／尺寸／decode、正式save隔離通過。六調查更改後只補跑雙viewport調查流程；導航時第一個斷言讀到尚未自動保存的舊座標，補等1.3秒再讀存檔，沒有改遊戲或force點擊。補跑雙viewport帶建造章節的唯讀回看，錢包、設施、receipts不變。
6. 未重跑未變的134核心／671世界與整套發布；完整發布閘門留給啟用整合一次。收據為 `docs/verification/chronicle-next-battles.json`、`chronicle-next-content.json`、`chronicle-next-browser.json`。真機與人工商業品質未驗。

### 給核心整合者的具體下一步

變更單：`content/story-next-three/integration.json`。沒有待補核心機制；只需兩項共享資料接入：

1. 根 `content/manifest.json` 的extensions末尾加入 `extensions/chronicle-next-three.json`，保留既有順序／全部bindings。不可覆寫前24節或把包內容貼進核心pack。
2. 把 `art/story-next-three/media.json` 的12筆追加至 `art/catalog/extension-assets.json`；現有build會依hash複製，無需改複製程式。不能只啟用包卻漏媒體，也不能把dist測試副本當來源。
3. 用正常build重新產出，再做舊存檔接續、主線卡跨章航路、設施與最終護盾代表路徑、共鳴／既有主線回歸及一次完整release（保留test:polish等）。發布仍只stage的site，公開SHA依實際結果記錄。
4. 經濟：新增每種9000；建造每種540，淨新增每種8460。戰場本身零獎勵、零產能、無角色掉落；既有配方／同調不變。請依實玩與既有每日／被動產量審視成長曲線；本包不假稱新帳號零農達成全部推薦等級。

可重現：

```bash
source scripts/env.sh
python3 tools/story-next-three/build.py
node --import tsx tools/story-next-three/verify.mts
npm run build
node --import tsx tools/story-next-three/browser.mts
```

第一次完整verify不要帶`--resume`；resume只在輸入fingerprint吻合時沿用成功戰鬥，不能在資料改變後偽稱已驗。browser的`--survey-only`／`--replay-only`需先有完整收據，只供本次局部接續，不能當初次驗收捷徑。

整合後更新共享索引／公開發布狀態由整合者負責。此內容分支未合main、未啟用、未部署；PR與commit結果見下方紀錄或實際Git，不能沿用前24節PR23的發布成功當這三章成功。

交付PR：[PR #40](https://github.com/sces5504/20261020/pull/40)。美術提交 `96499b4`；故事／驗證提交 `dbcf869`。PR未啟用共享manifest；下一位核心整合者按上方步驟完成接入及發布。最後文件更新不重新跑未改的遊戲測試。
