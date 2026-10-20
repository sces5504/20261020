# 原生技能、成長與召喚機制證據

分析對象：APK 4.3.2 的 `lib/arm64-v8a/libStella.so`。以下地址均為原始 ELF 虛擬地址，執行時須加模組載入基址。資料來源為同一 APK 的 GEN 表；未連線遊戲伺服器、未修改程式。欄位順序對應 `research/tables/*.json` 的 fNN，機器可讀對照在 `research/index/mechanics_semantics.json`。

## 證據等級與可重現範圍

- **已知**：實際讀到 native instructions、欄位序列、常數、資料值及 caller/consumer 連結。
- **強推論**：運算已知，但名稱依 UI 功能推定，例如「冷卻時間」。
- **未知**：未定位完整分支或未經執行驗證；不能拿欄位命名補齊。

已恢復技能描述公式、CID→Skill 連結、角色基礎成長公式、升級成本與突破限制，以及召喚配方距離、基本稀有度機率和角色加權抽選。這些足以製作資料檢視器與部分離線模擬器；尚不足以宣稱整款遊戲行為相同。

後續補充已追出共通傷害主鏈，並確認CID.f16為防禦：見 [戰鬥報告](combat_native.md)。以下保留原追查階段的說明；較新的語義標記已同步到mechanics_semantics.json。

## 技能與角色連結

**已知**：CID runtime row stride 為 0x278；Skill stride 為 0x1b0。`CID.f106`（offset 0x1f8）是主動技能 ID。證據：0x1a1db4 讀 CID[0x1f8]，0x1a1dc4 解碼為技能索引；0x299bd4、0x2f39ec、0x2fe2f8 重複相同連結，接著索引 Skill 表。

`Skill.f04`、`f05` 是 LocalStr 的名稱與描述索引。例 Sun → Skill[71] `DefPowerDot32` → 名稱 `Corruption\\nBarrier`、描述「Increases defense [defup] of allies within [dist] for [time] and resists corrosion and blaze.」。Venus → Skill[87] `MakeTurret12`，描述包含 [dronenum]、[skilltime]、[hp]、[atk]。

0x1a6b24 為技能描述模板渲染器；能確定各個 token 的數字從哪裡取得，而不是僅憑技能英文 key 命名。

| 欄位 | runtime offset | 已恢復用途 | consumer |
|---|---:|---|---|
| f06 / f07 | 0x2c / 0x30 | 技能間隔 base − (level−1)×reduction；毫秒。冷卻名稱屬強推論 | 0x1a445c–0x1a44bc |
| f12 / f13 | 0x44 / 0x48 | [time] = base + (level−1)×increment；毫秒 | 0x1a7014–0x1a70a4 |
| f18 | 0x5c | [skillatk]；UI 乘0.001後顯示，戰鬥量綱未確認 | 0x1a7684–0x1a76f8 |
| f45 / f46 | 0xcc / 0xd0 | 攻速倍率百分比 base + (level−1)×increment | 0x1a7a7c–0x1a7c7c |
| f47 / f48 | 0xd4 / 0xd8 | 移速倍率百分比；同樣成長結構 | 0x1a7e5c、0x1a7f48 |
| f51 | 0xe4 | [splashdmg] 百分比 | 0x1a8cd4、0x1a8db0 |
| f52 / f53 | 0xe8 / 0xec | [skilltime] = base + (level−1)×increment；毫秒 | 0x1a74b8–0x1a7550 |
| f54 / f55 | 0xf0 / 0xf4 | [percent] = base + (level−1)×increment；[percentinv] = 100−結果 | 0x1a8e70–0x1a8fbc |
| f75 | 0x150 | [casttime] 毫秒 | 0x1a72e4–0x1a7358 |
| f79 | 0x160 | [dronenum] 整數數量 | 0x1a78c0–0x1a7900 |
| f82 / f83 | 0x16c / 0x170 | [projspd] / [projspdup] 彈速倍率 | 0x1a7cc8–0x1a7de0 |

時間 UI 的精確步驟為 float32(ms) × float32(0.001) × 100 → 向零截斷為整數 → ×0.01，以秒顯示。這與直接四捨五入可能相差0.01秒。攻速增加 token 顯示「倍率−100」，降低 token 顯示「100−倍率」；不可將原始140直接當成「增加140%」。

範例：`Skill[1] AtkSpeed11` 的 f06=12000、f07=300，推得技能等級1間隔12秒、等級10間隔9.3秒；f12=3000、f13=300，持續時間3秒→5.7秒；f45=140、f46=5，攻速增加40%→85%。這是資料與 UI 公式產生的結果，尚非實機戰鬥逐幀驗證。

**未知**：完整技能 effect type enum、選取目標規則、全體/單體/範圍效果、每種狀態疊加與解除順序、完整傷害與暴擊防禦公式。戰鬥 consumer 已見 0x3d6944 與0x3d7298 的 type dispatch，但尚未逐支對照全部技能類型。不能把已解227筆 Skill等同227種效果都已重建。

## 成長與經驗

**已知**：EXP 120列，f00=1-based level，f01=該等級升下一級的經驗成本。0xa7db8(level) 以 `EXP[level−1].f01` 讀值；不存在或超出範圍時回傳1,000,000。0xb3c24 把獲得經驗加入目前經驗並逐級扣除 f01，因此不是累計總經驗表。

0xb3c24 及迴圈0xb40ec–0xb4284存在突破門檻：

| 當前等級上限 | 允許繼續升級所需 tier |
|---:|---:|
| 20 | ≥1 |
| 40 | ≥2 |
| 60 | ≥3 |
| 80 | ≥4 |
| 100 | ≥5 |
| 110 | ≥6 |
| 120 | 此函式硬上限 |

tier 為角色 instance offset0x0f 的解碼 byte，level 為offset0x0e。將 tier稱「突破/覺醒階段」屬功能推論，原始 UI正式名稱仍須另外對照。此升級路徑上限120；下列基礎數值函式另支援1..150，兩者不可混為同一限制。

**已知公式**，令 `L=clamp(level,1,150)`、`trunc`為向零取整，先忽略外加裝備、羈絆、被動、skin、隊伍與battle buff：

```text
AttackReference = CID.f15 (offset0x64)
ATK(L) = max(1, trunc(AttackReference / 10)
               + trunc(9*(L−1)*AttackReference / 990))

HPReference = CID.f17 (offset0x6c)
HP(L) = trunc(HPReference / 10)
        + trunc(trunc(9*HPReference / 10)*(L−1) / 99)
```

ATK consumer 0xa7e18–0xa7ee0：常數0x66666667實現除10、0x21195767實現除990；HP consumer 0xa7fa8–0xa807c：內層除10、後段0xa57eb503實現除99。它們分別被描述渲染器用於 [atk]、[hp]，證據0x1a6f10與0x1a6f94。CID.f16（offset0x68）在0xa7ee4採與ATK相同的曲線但無至少1的夾值；名稱可能為防禦，但這次未核對 UI label，保留secondary_stat名稱。

例Sun f15=110，ATK level1=11、level100=110、level120=130。f17=2337，HP level1=233、level100=2336、level120=2760。分步取整重要：HP level100不必等於表的2337。

0xb3c24還依ExpPer/ExpPerS/ExpPerHard類表調整獲得經驗；需依模式和參數完整對照才可重現每場經驗。只採EXP表無法得出所有戰鬥獎勵經驗。

## 召喚：配方、稀有度與加權

**已知**：0xe22dc是使用Gacha表的實際抽選函式，非僅顯示機率的UI。Gacha252列，每列runtime stride0x50，1 string、9 i32、5 f32；最後5個float目前未確認用途。不要把它們當成抽選權重。

| Gacha欄位 | 用途 | 證據 |
|---|---|---|
| f01 | CID索引，最後回傳的角色ID | 0xe3778–0xe378c |
| f02 | 普通池需為0；hyper模式需非0 | 0xe2498–0xe24b0 |
| f03 | 需為0才能納入候選 | 0xe2480–0xe248c |
| f04..f07 | 四種投入資源的目標配方 | 0xe250c、0xe2528 |
| f08 / f09 | 投入總和最小 / 最大值，含等號 | 0xe24c4–0xe24fc |

候選距離 `D = |input1−f04|+|input2−f05|+|input3−f06|+|input4−f07|`。0xe2540–0xe2574實作四次絕對值與加總；0xe1308 comparator按距離由小到大。相同距離候選在0xe25dc–0xe28dc做隨機排列，再以0xe131c comparator按距離和隨機次序排序。精準配方影響排名，並非固定某角色100%或單純提高五星率。

普通召喚在未套用特殊條件時：五星3%、四星9%、三星18%、二星70%。值來自Global[186..188].f01（`Gacha5StarPer=3`、`Gacha4StarPer=9`、`Gacha3StarPer=18`），0xe29e8–0xe2d78將PRNG值模10000後比較100×門檻。高級召喚基礎五星10%、四星40%、三星50%，Global[189..191]提供基礎與每級額外5的常數；額外核心輸入的參數條件仍待caller正式命名。

**重要分支**：0xe2c70讀取玩家狀態，當offset0x2b2≥211時可改變結果；0xe2da4–0xe2ddc包含配方500/250/600/250的覆寫；0xe2a50後有日期/活動旗標條件。因此3/9/18/70不能宣稱為所有模式、活動與帳號狀態下的最終機率。

高星路徑0xe2e00–0xe3174：先看排序後的前5個候選，特定普通三星情況看前10個，保留CID.f02符合這次抽到稀有度的角色。若有n個保留下來，順序權重為 `2000*n, 2000*(n−1), ..., 2000`，累加成CDF，使用 `random % sum(weights)` 抽一個。注意「前5」是原始距離列表的掃描範圍，不是一路搜尋直到湊滿5個符合稀有度的角色。

若高星路徑沒有保留候選，或進入低星分支，0xe3178–0xe3744使用Global `GachaLowGradePer1..15`：10,8,8,6,6,4,4,4,4,4,4,4,4,4,4，後續每名2。按符合該分支稀有度及特殊限制的候選排序分配，乘100累加，累積超過9999即停止，最後以模總和抽選。這些是角色名次權重，不是五星/四星機率。

PRNG具有16個32bit狀態、index位於0x40、位移16/15/11/18/28/5/2、mask0xda442d20，與WELL512a結構相符（演算法命名屬強推論；指令可直接核對0xe27c0–0xe284c）。使用取餘數而非拒絕採樣，精確復刻時須保留這個行為以及整數溢位。seed初始化尚未定位。

## 客戶端 / 伺服器界線

**已知**：角色成長、技能模板與上述召喚候選/抽選程式實際存在APK native code，相關表皆是離線包內資料。因此「抽卡公式一定只能在伺服器」不適用這個樣本。

**仍未知**：這個函式是否在正式連線流程使用、是否為測試/預覽/離線fallback、伺服器是否驗證或覆蓋結果、seed權威來源、資源扣款和最終存檔交易。僅憑有本地函式不能證明伺服器接受任意本地結果。研究重現應把本地演算法與網路協議權威獨立標示。

## 下一階段仍需完成

1. 完整戰鬥傷害、暴擊、屬性、碰撞與技能type dispatch；用已抽出的Attack/Shot/Proj/AI/CID/Skill表做交叉驗證。
2. 關卡wave與Boss編排的runtime consumer，確認時間、生成點、隨機分支、獎勵觸發條件。
3. 經驗獲取、突破/養成消耗、合成、裝備與被動的全部公式。
4. 執行期可控測例：同一輸入與固定PRNG seed，對照本地模擬器與原版輸出；未執行前只能稱靜態推導。
