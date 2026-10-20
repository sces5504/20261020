# bXML 資源格式與場景／UI 還原

本次已將 **370 個 bXML 檔完整解碼為可逆 JSON 樹**，含 265 個 `.act`、25 個 `.scn`、49 個 `.ui`、23 個 `.uia`、8 個 `.spr`，共 **240,395 個節點**。每個輸出都保留節點順序、重複名稱、型別 ID、值、原始 payload 十六進位內容、原始檔內 offset 與 child 階層；沒有以字串掃描代替結構解析。

原始輸入是已由前一階段還原首 128 bytes XOR 的 `research/assets` 資產。本解碼器不負責解密、圖片解壓或執行遊戲。

## 交付物與驗證

- `research/tools/decode_bxml.py`：只用 Python 標準函式庫的解析／再序列化程式。
- `research/index/bxml_schema.json`：格式、型別、payload 長度分布與已知限制。
- `research/scenes/{Actor_00,Scene_00,UISpr_00}/`：逐檔 JSON，名稱如 `Gacha.ui.json`。
- `research/scenes/manifest.json`：370 個來源的 SHA-256、輸出路徑、節點統計與驗證結果。
- `research/scenes/resource_catalog.json`：各檔根層屬性、Actor/UINode 實例、位置與素材引用的查找索引；完整資訊仍以逐檔樹為準。

重現命令：

```sh
python3 research/tools/decode_bxml.py research/assets --output research/scenes --schema research/index/bxml_schema.json
```

驗證強度：370 檔皆能由解析後的樹重新分配 child offsets，重新輸出完整二進位，與來源 **逐 byte 相同**；再從磁碟重新讀取 JSON 並再次序列化，也全部符合來源 SHA-256。所有 bytes 恰被 header/record 覆蓋，沒有 gap、overlap 或剩餘尾端。這驗證結構與位元保存，沒有驗證原生引擎對每個屬性的實際行為。

## 二進位布局

所有整數欄位皆使用 little-endian。

```text
header:
  magic[4] = "bXML"
  version:u32 = 1
  type_count:u32 = 9
  type_descriptor[type_count]:
    id:u32
    name:NUL-terminated bytes
    opaque_marker:u8 = 0

node:
  payload_length:u32
  if payload_length > 0:
    type_id:u32
    payload[payload_length]
  child_count:u32
  child_index[child_count]:
    child_name:NUL-terminated UTF8
    child_absolute_file_offset:u32
  child records in preorder
```

根節點緊接 descriptor table；本 APK 全部位於 offset 101。空 payload 節點不帶 type_id，通常是容器。child 索引可能有重複的 `Actor`、`UINode`、`RotKey`、`AnimKey` 名稱，必須保留為有序陣列；改成以名稱為唯一 key 的字典會丟資料。descriptor 的額外 marker 全為 0，其原始語意尚未確認。

| ID | 名稱 | payload 解碼 |
| --- | --- | --- |
| 0 | 空字串 | descriptor 保留；本批沒有非空 payload 使用此型別 |
| 1 | string | 以 NUL 結尾的位元組字串 |
| 2 | int | signed int32 |
| 3 | byte | uint8 |
| 4 | word | uint16 |
| 5 | bool | uint32，觀察值只有 0/1 |
| 6 | float | IEEE754 float32 |
| 7 | dword | uint32 |
| 8 | uint | uint32 |

數值 payload 可能是 scalar 或 array；元素數由 payload 長度除以元素寬度取得。向量、矩陣或結構欄位的語意不能僅靠 type name 判定。例如 `Gacha.ui` 的 `WldPos` 宣告為 int array，但部分值像浮點位元表示；目前保留宣告型別與 raw hex，不自行改寫型別。

共 18,742 筆 string payload：18,695 筆可嚴格 UTF8 解碼；47 筆字型名稱為非 UTF8 bytes，CP949 可解為 `나눔고딕 ExtraBold`。後者標成 `inferred-cp949` 並保留原始 bytes，不宣稱從引擎確認編碼。

## 可直接引用的還原例子

以下 offset 皆對應已 XOR 還原的來源資產，非 ELF 位址。

`research/assets/UISpr_00/Gacha.ui` 的 root 第 0 個 `UINode` 位於 offset 120，含 `Name=UINode01`、`Width=720`、`Height=1280`、`Pos=[0,0]`、`BGSprName=GachaBG.png`。其 child `Name=Get` 位於 offset 13145，含 `Pos=[424,925]`、`Width=265`、`Height=115`、`BGSprName=Gacha.spr`；`Name=Exit` 位於 offset 14733，含 `Pos=[663,1202]`、`Width=40`、`Height=49`、`BGSprName=Main.spr`。來源樹是 `research/scenes/UISpr_00/Gacha.ui.json`，因此可以重建控制項階層與初始幾何配置，但點擊事件與動態文字需另外追 native code。

`research/assets/Scene_00/Gacha.scn` 的 Actor 子樹包含 `AName=GachaSpineActor`、`Name=GachaSpineActor`、`Pos=[0,0,0]`；場景根層包含 `CameraEye=[0,0,-4]`、`CameraPerspective=true`、`CameraNear=1`、`CameraFar=500`、`CameraFOVy=2.515585422515869`。這是召喚展示場景的靜態配置證據，沒有包含召喚機率或動畫資源自動綁定規則。

`research/assets/Scene_00/Space_Gemini.scn` 有 111 個 Actor。第一個 Actor 有 `AName=PlaneActor`、`Name=Bg_Back08`、`Pos=[224.4145050048828,-218.4077911376953,10]`、`Rot=[0,0,906.460693359375]`、`PivotX=PivotY=0.5`、`Bloom=true`。同檔保留相機與後製效果參數。這是視覺場景設計；戰鬥敵人波次、掉落或關卡獎勵仍須對照玩法資料表，不能由背景 Actor 數量推斷敵人數。

`research/assets/UISpr_00/Gacha.spr` 的 `Spr` 含 14 個 `AnimKey`、`Tex=Gacha.png`、`StartTime=0`、`EndTime=1.4000002145767212`、`SubUVAnim=true`；完整 UV／時間資料保留在 child nodes。`RotLoop.uia` 有兩個 `RotKey`：第二個的 `Rot=6.2831854820251465`、`Time=0.8571428656578064`、`Tween=3`，並有 `Speed=0.4000000059604645`、`TweenPwr=[2,2,2,2,2]`。Tween enum 的實際插值函式仍需程式證據。

`research/assets/Actor_00/HitSpark.act` 的 Actor 位於 offset 119，`AName=PtcActor`，帶 `Additive=true`、`EmitRate=8.5`、`EmitTime=2`、`LifeMin=0.6000000238418579`、`LifeMax=0.8999999761581421`、`SprName=spr::Flame`，可用於重建粒子效果參數。粒子發射計算、亂數序列與 blend enum 的精確行為尚未透過 runtime 驗證。

## 重建渲染時仍需整合的部分

JSON 已足以供匯入器建立有序 scene/UI tree，並連結 sprite、texture 與 Actor 定義。完整視覺重現仍須處理：

1. UI 的局部／世界座標、anchor/pivot、文字基線、裁切、nine-slice、層序與輸入 hit-test；不可只依儲存順序當作最終 draw order。
2. `.spr` 的 UV/動畫 key 與 texture 頁面、`.uia` 的播放模式與 Tween enum，並驗證每個 key 的時間／單位語意。
3. `.scn` 的 camera/view/projection、Actor transform、particle emitter、材質 blend、Bloom/後製效果與 mesh/texture 來源。
4. Spine skeleton、atlas、texture、skin/animation 名稱與 Actor class 的綁定；場景出現 `GachaSpineActor` 名稱不代表 generic bXML 已包含 skeleton 本體。
5. PNG/KTX 的實際解碼與 GPU 壓縮格式、透明度／色彩空間／premultiplied alpha；UI 圖層與 Spine 動畫需在同一渲染器中驗證。

本批沒有原生 Android runtime 的幀畫面、點擊流程或動畫觀察；沒有聲稱已重現遊戲引擎。generic parser 的 byte-roundtrip 驗證與上列原生行為未知應分開理解。REA 證據及執行限制另見 `research/rea-evidence/README.md`；本 bXML 解碼為獨立格式研究工具，並非 REA 原生 formatter 的輸出。
