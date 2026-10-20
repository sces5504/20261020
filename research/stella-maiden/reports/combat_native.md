# 戰鬥傷害與技能分派：靜態恢復

本報告補充 `mechanics_native.md`。資料來自同一ARM64 ELF；沒有執行原版或做ARM指令模擬。已保留[逐指令傷害函式](../index/combat_formula.asm)、[常數與範例](../index/combat_evidence.json)、[欄位／技能類型](../index/combat_semantics.json)。

## 傷害呼叫鏈

HeroActor constructor `0x3c7f8c` 設定vtable `0x8de110`；slot `0x210` 指向 `0x3c9bbc`，再經 `0x3b8f20 → 0x3f2d70 → 0x3f236c`。最後一個函式是共通傷害計算，回傳傷害至少1。HP扣除、吸收與附加效果在後續consumer，不能把這個函式單獨當成完整戰鬥迴圈。

## 已補確證的欄位

| 表／欄 | 用途 | consumer |
|---|---|---|
| CID.f16 | 防禦成長基準，補確證先前的secondary stat名稱 | 防禦vtable slot0x1f8→0x3a3658；0x3a36c4使用此欄 |
| CID.f18 | 基礎暴擊百分率；getter乘10轉千分率，再加修正並限制上限 | 0x3a40bc；初始cap950千分率 |
| CID.f19 | 基礎迴避百分率；getter乘10轉千分率，再加修正並限制上限 | 0x3a470c；初始cap950千分率 |
| Skill.f02 | 技能effect type selector | 0x3d69e4 |
| Skill.f90 | 非零時抑制本次迴避路徑；另有攻擊者技能等分支 | 0x3f257c |
| Skill.f91 | 非零時抑制本次暴擊路徑 | 0x3f260c |
| Skill.f28/f29 | type36/37傷害區的等級威力base／increment | 0x3d74c0 |

CID.f16的防禦成長採先前所列ATK同型曲線，但沒有至少1的夾值。實際getter還可能疊加角色實例、裝備、被動與buff，不能只讀表就當成最終戰鬥屬性。

## 共通傷害的順序與定點數

函式把輸入傷害左移16成Q16.16，依序處理傷害浮動、其他減傷、迴避、暴擊、穿防、防禦減傷及最後至少1。輸入參數、狀態旗標與getter結果決定分支；並非每一擊都走全部步驟。

隨機路徑以 `random % 1000 < chance_per_mille` 判定迴避／暴擊。另一條路徑使用10次計數器調度，不是每次獨立隨機；參見 `0x3f2808..0x3f28e8`。PRNG更新方式與先前召喚的16-word狀態結構一致，seed來源尚未完整追查。

對沒有溢位的通常非負值，Q=65536：

```text
d = input_damage * Q

如果本次發生迴避：
    d = floor(d * (Q - 65 * evasion_reduction_getter) / Q)

如果本次發生暴擊：
    d = floor(d * (Q + 65 * critical_bonus_getter) / Q)

def = max(0, defense_getter)
若 penetration_getter > 0：
    def = trunc(def * (1000 - penetration_getter) / 1000)

若沒有type65防禦繞過，且def >= 1：
    armor_fraction_q = trunc(def * Q / (def + K))
    d = floor(d * (Q - armor_fraction_q) / Q)

result = max(1, arithmetic_shift_right(d,16))
```

這是有界簡化：原指令的防禦分子含 `sxth`（16-bit符號擴充），各處有32-bit中間值和64-bit乘法。完整位元一致重現須保留每一步位寬、signedness及溢位，尤其不應將大於32767的防禦直接代入此簡化式。防禦的數學趨勢為 `damage × K/(DEF+K)`，但直接用浮點算一次再取整不能保證逐bit相同。

封裝 `.data` 初始K=100、暴擊bonus=1500、迴避減傷=750。初始化程式會將這些值做runtime XOR；getter可能再加裝備、buff與上限。它們是此版本初始值，不是所有場合的最終戰鬥常數。

**迴避並非在此路徑直接變成零傷害。** 此函式在迴避事件套減傷，最後仍至少1。使用getter=750時，Q16因子為 `(65536−65×750)/65536`，約0.2561。暴擊getter=1500時，因子 `(65536+65×1500)/65536` 約2.4877。這些看似特殊的倍率是上述特定getter值代入指令所得，不應擅自改成常見遊戲的0倍或1.5倍；仍需原版可控測例驗證getter實際值與caller分支。

## 有界範例

以下固定輸入傷害100、防禦100、K100，關閉浮動與其他減傷，穿防0，並直接指定本次是否發生迴避／暴擊：

| 事件 | 最終整數傷害 |
|---|---:|
| 無迴避、無暴擊 | 50 |
| 無迴避、有暴擊，bonus getter1500 | 124 |
| 有迴避、無暴擊，reduction getter750 | 12 |
| 同時迴避與暴擊 | 31 |

中間Q16值見 `combat_evidence.json`。這些是靜態公式檢查，不是聲稱已在原版遊戲量測。

## 技能類型的已知邊界

Skill表可以依f02分組；完整類型分組與原始技能例子已在 `combat_semantics.json`。只有下列分支在這次追查中確認行為：

- type26/27：Blackhole家族；原生分支 `0x3d69f0..0x3d69f8`，包含範圍蒐集／吸引與週期傷害。
- type36/37：DamageZone家族；`0x3d7314..0x3d752c`。威力槽為 `f28+(skillLevel−1)*f29`，再與角色skill attack相乘除100，送入目標傷害呼叫。確切間隔／命中集合仍須配合周邊狀態機。
- type65：`AtkUpDefThrough21`；`0x3f296c..0x3f2974` 繞過此步防禦減傷，不代表繞過先前所有減傷／迴避／暴擊。

其他type僅保存資料分組與技能key例子，沒有把名稱相似性當成已重建的效果。完整戰鬥仍需攻擊節奏、AI、碰撞、投射物、狀態疊加、時間步進、死亡與獎勵流程。
