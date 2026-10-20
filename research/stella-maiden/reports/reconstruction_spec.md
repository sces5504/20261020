# 重現規格與證據缺口

目標是讓後續實作能直接使用本次研究成果，而不把未恢復的規則悄悄補成猜測。本文件中的模組介面是建議的重建設計；原版行為仍以對應native／資料證據為準。

## 目前能直接匯入的資料

| 模組 | 輸入 | 已可重現 | 不能由資料單獨確定 |
|---|---|---|---|
| 表儲存層 | tables67份JSON／SQLite | 所有欄位值、型別、列序、來源offset | 尚未賦義欄位的行為 |
| 單位／成長 | CID、EXP、ExpPer各表 | ATK／HP／DEF基礎曲線、逐級成本與門檻 | 完整實例buff、裝備／羈絆／skin疊加、每場經驗來源 |
| 技能 | Skill、PSkill、CID.f106、LocalStr | 主動技能關聯、描述、已命名參數、部分type | 全部target selector、疊加／解除、傷害時序 |
| 召喚 | Gacha、ItemGacha、Global | 角色配方距離與篩選、基本稀有度分支及部分權重 | 所有caller旗標、seed權威、正式服務結果、裝備抽選完整分支 |
| 地圖／遭遇 | Galaxy、GalaxyGate、SpawnPoint、Wave | 節點座標、主要波次、七組CID／數量 | 全部移動限制、隨機生成、模式與發獎規則 |
| 事件VM | EventSpot、EventScript | 124種名稱／dispatch、label映射、已證實operand | 102種已使用opcode的全部執行語義與佇列行為 |
| 場景／UI | scenes370份階層JSON、資源檔 | node順序、型別、原值、視覺物件樹 | 所有引擎屬性的渲染語義、動畫插值、事件回呼enum |
| 戰鬥 | 共通傷害函式與Attack／Shot／Proj／Bullet／AI | 傷害主要順序及有界定點公式 | 全部hitbox、AI轉移、逐tick時序、溢位與全部分支 |

## 必須保留的資料約束

1. **TableRef使用表名＋`_row`**，不是一律f01。CID／Skill在此版本f01恰等row；Wave卻大量重複，Gacha.f01是外部CID索引。
2. **EventLabel是獨立型別**：EventSpot.f04與Goto.f21解析成label，再選EventScript.f01第一個匹配列。不得把label當陣列位置。
3. **定點、整數與浮點分開**：節點XY轉16.16；傷害中有Q16、32／64-bit有號運算；時間模板有float32與向零截斷。浮點統一計算再四捨五入會產生差異。
4. **bXML的children必須是有序list**：同名Actor／UINode合法，不能壓成名稱唯一的dictionary。值保留原type_id與payload_hex；部分欄位可能由consumer重新解讀bit pattern。
5. **空白／保留列保留原位置**：例如row0。不能先刪掉占位列再重新編號。
6. **配方key與角色key不同**：Sun2配方仍透過f01選Sun。f03排除旗標與f02 pool旗標不可因名稱相同而合併。
7. **來源值與有效屬性分開**：CID.f18是基礎暴擊百分率，但getter還會轉千分率、加修正並套cap；資料表值不能直接替代最終屬性。

## 建議的最小實作介面

```text
TableStore.row(table_name, row_index) -> 原始列 + 語義註解
UnitBaseStats(cid_row, level) -> ATK, HP, DEF
SkillParameters(skill_row, skill_level) -> 已確認模板參數
RecipeCandidates(input4, mode, source_flags) -> 候選／距離／篩選原因
MapNode(spawn_row) -> XY, region_code, primary_wave_row
ExpandWave(wave_row) -> CID row list（依七組count展開）
ResolveEventLabel(label) -> 第一個匹配EventScript row或未找到
EventVM.step(tick_context) -> 狀態更新 + 明示side effects
DamagePipeline(hit_context, getters, random_state) -> damage + trace
SceneLoader(decoded_bxml) -> ordered runtime node tree
```

其中前五項與部分傷害／事件lookup可使用既有參考實作；EventVM、完整DamagePipeline與SceneLoader仍需完成。未實作的opcode／effect type應回報未支援並記錄原值，不能默默當no-op，否則遊戲流程看似可執行但已偏離原版。

## 本地狀態服務的邊界

重建研究版本可以獨立設計本地持久化：角色實例、等級／經驗／突破階段、物品、隊伍、地圖進度、任務、事件旗標與資源帳本。這是新實作設計，不是聲稱已恢復原版伺服器schema或協議。

原生抽選函式存在，只能證明客戶端有該算法；正式流程是否呼叫、伺服器是否驗證／覆寫、扣款與存檔交易如何完成，目前仍未知。應把「本地研究抽選」與「正式伺服器結果」維持不同證據標記。

## 可重現的驗證基準

- 資料輸入：APK SHA-256固定；五個pkg目錄及502 members CRC／長度檢查。
- 表解析：67份JSON從磁碟重新序列化，必須與原始payload逐byte一致。
- 場景解析：370份bXML JSON重新計算offset，重建整檔與來源逐byte一致。
- 結構關係：全部SpawnPoint主要Wave索引在範圍內；有效CID／count配對在CID範圍內；事件入口label解析及Goto row711→735保持一致。
- 成長／模板：Sun與AtkSpeed11的已恢復範例；HP Lv100分步取整得到2336，不能粗略回填2337。
- 共通傷害：固定100傷害／100DEF、指定迴避與暴擊四種組合的Q16 trace，結果50／124／12／31。這只是有界靜態路徑，不是完整戰鬥golden。
- 待取得原版可執行環境後：固定初始狀態與seed，逐tick對照位置、HP、事件指令、生成列表與獎勵帳本，再確認視覺／音訊時序。

## 阻止完整重現宣告的實際缺口

目前只有APK。已確證缺少預期OBB `main.431.com.mistgame.smus.obb`（132,565,279 bytes）的內容，並未取得裝置更新快取或伺服器狀態；尚未做原版執行對照。其餘缺口是具體程式語義追查與實作工作，不代表解析出的資料失效，也不能以通用遊戲規則取代。

完整重現的驗收至少需要：必要素材齊備、所有實際使用的opcode／技能type有行為、全關卡與養成／獎勵流程可完成、持久化一致，以及與原版的可控輸入對照。這些條件尚未全部滿足。
