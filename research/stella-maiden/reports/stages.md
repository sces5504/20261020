# 關卡／波次資料與原生程式證據

本報告以 APK 內嵌資料及 ARM64 靜態程式為準；尚未啟動遊戲或取得伺服器資料。`fNN` 對應 `tables/*.json` 序列化欄位順序。所有 `_row` 均為 **0-based 陣列位置**，不是可任意替換的遊戲欄位 ID。

## 資料規模

- `SpawnPoint`: 530 列，原生 stride `0x50`；529 個非零位置加首列。
- `Wave`: 996 列，原生 stride `0x90`。
- `Galaxy`: 15 列；`GalaxyGate`: 51 列。
- `EventSpot`: 376 列；`EventScript`: 7,809 列；`Script`: 6,468 列。這些是另一層事件／腳本設計，不能把 Wave 當作整個關卡系統。

## 已由 native consumer 確認

| 表欄位 | native offset | 可確證用途 | 證據 |
|---|---:|---|---|
| SpawnPoint `_row` | stride 0x50 | 地圖節點的陣列索引 | `0x3C6B34..0x3C6B6C`：檢查 index 範圍後用 `base + index * 0x50`，存至節點物件 `+0x4E8`。 |
| SpawnPoint `f10` | 0x3C | Wave **row index**，0 為空波次／無主要遭遇 | `0xF483C..0xF48AC`：讀取此欄、解 runtime XOR、與 Wave count 比較，直接乘 `0x90` 取 Wave；`0x223020..0x223088` 亦使用此欄呼叫波次展開 helper。 |
| SpawnPoint `f11`,`f12` | 0x40,0x44 | 節點 X、Y 位置整數 | `0x2ADB4C..0x2ADB70` 讀兩欄，`0x2ADB74..0x2ADBAC` 左移16轉 16.16 fixed-point 並寫入物件 position；`0x2C6D70..0x2C6DCC` 轉 float 做 X/Y 距離判斷。 |
| SpawnPoint `f04` | 0x24 | 節點所在區域／星系編號 | `0x2C6D50..0x2C6D6C` 將此欄與目前區域狀態 byte 比較；`0x3150DC..0x31510C` 將此欄和 f01 傳入節點進度檢查。具體 Galaxy 關聯見候選欄。 |
| Wave `(f05,f06)` 到 `(f17,f18)` | 0x28..0x5C | **7 組 CID row index、出現數量** | `0x10C1F0..0x10C3AC` 將七組 pair 解 XOR 後依序傳 `0x10C3B0`。後者 `0x10C3C8..0x10C404` 用第一值檢查 CID count、乘 `0x278` 取 CID；`0x10C410..0x10C448` 排除 CID=0／count<1，將 CID 值追加第二值所指定的次數。 |
| Wave `f02` | 0x1C | 波次展開的等級／強度參數槽 | `0x21ED94..0x21EDC8` 從此欄取值，`0x21EDEC` 傳給 `0x10C1F0`；helper 將參數下限設為1並存入輸出波次結構的第一個 i32。名稱「等級」仍需其他 combat consumer 追查。 |

`Wave f01` 並非全表主鍵：996 列只有449個不同值，0 出現74次、2出現24次、1出現23次。外鍵必須使用 `_row`。`SpawnPoint f01` 在此版本則530列恰好全部等於 `_row`，但 native 的陣列索引事實仍應保留。

## 高可信資料關聯，尚未完整追到 UI consumer

| 表欄位 | 候選語義 | 支持資料／限制 |
|---|---|---|
| SpawnPoint `f04` | Galaxy row index | 全部落在 Galaxy 範圍；如 `SE1` 為1→`SolarSystem`、`QCyE25` 為7→`Cygnus`；native 已確認它是區域編號，但尚未追完 Galaxy pointer 算式。 |
| SpawnPoint `f05` | 顯示名稱的 LocalStr row index | `SE1`→805→英文`SE1`，`QCyE25`→3000→英文`QCyE25`；已確認資料吻合，尚未完整追 UI 本地化呼叫。 |
| Wave `f03`、`f04`、`f19..f29` | 額外等級、規則、獎勵或倍率 | 已完整無損解碼，尚未逐欄賦予語義。`0xF48B0..0xF4964` 將 `f25..f28` 乘一個基準後除100，應屬百分比參數，但本報告不直接命名資源種類。 |

## 可重現範例

1. `SpawnPoint._row=1` 名稱 `SE1`，`f10=96` 指向 `Wave._row=96` 同名 `SE1`，位置 `(76,25)`。
2. `SpawnPoint._row=529` 名稱 `QCyE25`，`f10=995` 指向末列同名 Wave，`f04=7` 對應 `Galaxy[7]=Cygnus`。
3. 530列 SpawnPoint 的 Wave 索引全數在範圍內，466列 `f10>0`。467列名稱與所指 Wave 完全相同（含首列）；不相同不代表解碼錯誤，其他節點可能用空波次或共用波次。
4. Wave 七組配置共有3,263個「CID>0 且數量>0」的非空 pair，全部 CID index 在342列 CID 的範圍內。

## 解析器與可信度

`tools/decode_gen.py` 已解出67張表、37,723列。每張表都同時通過「依 declared row count 解析後恰好消耗全檔」及「重新序列化與解 XOR 後 payload 逐 byte 完全一致」兩項檢查。

64張表 schema 來自 native loader 的 reader call 順序；Slang 首列與迴圈被 compiler 分開展開，已消除重複 schema。Ban、RndBox、PvPTrainExp 尚無可見 loader，採固定結構推定並明示來源。所有欄名保留中性 `fNN`；`table_schema.json` 保存 reader/call PC/native destination/native offset，方便逐欄查證。
