# M1 六位角色標準立繪交接

2026-10-20（Asia/Taipei）。起點 `de8ea9d`，分支 `work`，開始時乾淨。起始環境為舊快照，已 fetch 並 fast-forward 到遠端 main 後工作。使用者此次直接要求生成六位，授權已具體化；無需重做規格訪談。

## 交付

- `art/characters/standard/maiden-01/v1.png` 至 `maiden-06/v1.png`：六張獨立 1024×1536 RGBA PNG，全身標準立繪。
- `art/characters/standard/overview.jpg`：六人總覽，只供比較，不當成單人生成參考。
- `art/catalog/characters.json`／`assets.json`：穩定 ID、形象鎖定、來源、版本、hash、實際技術參數、pivot、提示詞、審閱狀態。
- `art/catalog/art-library.sqlite3`：六位角色、六項立繪、12 張髮型板、12 類髮型、來源與關聯；由同目錄 JSON 和 `scripts/build-art-library.py` 重建。
- `art/reference-library/hairstyles/`：使用者原始 PDF 與抽出的主要參考板。
- `docs/art/character-standards.md`／`hairstyle-library.md`：標準與查找入口。
- `docs/art/prompts/maiden-01-v1.txt` 至 `06`：實際生成提示詞。

已讀 AGENTS、記憶索引／偏好、主規格、素材契約、風格指南、AI 分工、資料契約、製作計畫及前輪交接。這次只做美術交付，不修改共用玩法、引擎、技能、數值、存檔或原作研究庫。未建立新聊天或委派代理。

六位按使用者貼圖順序對應。參考圖保留人物特徵／氣質，服裝新設計為統一星體少女科幻方向；當前雲端沒有六張本機原始圖實檔，已記錄來源檔名及目視描述，不假稱封存。髮型 PDF 原檔已封存。04 的生成結果為側分波浪長髮，索引以實際圖像記錄；各圖細節依實物優先於 prompt。

## 接手注意

美術 ID `m1art:character.maiden-01` 至 `06`；`gameCharacterId` 仍是 null。原作研究的六人候選不是已核定映射，不能自動把 01 綁 Earth 等。使用者已指定這六個形象作 M1 角色，整合時保留形象，不因原作名單而換回原作圖。

六張標記 `awaiting-user-review`，用途 `design-reference`，尚未宣稱使用者已逐張接受或遊戲可發布。生成工具未公開模型版本，manifest 如實標記。未做 SD、差分、頭像、骨架、動畫、Web 輸出與遊戲內驗收。

## 驗證與界線

生成圖已目視檢查全身、鞋底、髮尾、衣裝與姿勢，六人髮型結構／動作各異；已提供總覽比較。PNG 均可解碼、有 alpha，主輪廓未觸邊；極少量低 alpha 邊緣像素由原生成檔保留。部分髮尾很接近側邊，後續衍生圖留更大邊界。未聲稱透明邊緣已達正式發布標準。

`python3 scripts/build-art-library.py` 驗證檔案路徑、hash、唯一 ID／姿勢／髮型、SQLite integrity 與 FK。文件 23 個本地連結／fence、六張 PNG 解碼與主輪廓未觸邊、git diff --check 均通過；以側分標籤查詢返回 4 張板，六位皆可關聯其立繪。無 runtime，未跑或宣稱遊戲、手機、效能、部署驗收通過。

## 可複製給第一里程碑 AI 的 prompt

```text
請接續 sces5504/20261020 的 Stella Maiden 第一里程碑。先同步最新 main，保留現有未提交修改。本輪美術尚未推送；請匯入使用者提供的 m1-character-art-20261020.zip（先檢查是否與既有檔衝突），或在本輪獲准推送後同步包含交付的提交。
先讀 AGENTS.md、docs/memory/index.md、docs/handoffs/m1-character-art-20261020.md、docs/design/ai-collaboration.md、docs/art/style-guide.md、docs/art/asset-contract.md、docs/art/character-standards.md。
六位角色標準圖位於 art/characters/standard/maiden-01/v1.png 至 maiden-06/v1.png，索引為 art/catalog/characters.json 和 assets.json。
請用圖片工具逐張實際打開標準圖。各自鎖定臉型、髮型／髮色／眼色、身形、服裝層次、飾件與鞋靴，以該角色單張圖為影像參考製作差分；總覽只供對照。
每位只有一張標準圖，請另製需要的表情、姿勢、頭像及SD；保持六人髮型不同、標準姿勢不同，衍生全身圖不得裁掉髮尾、手指或鞋底。新服裝另建skin，不覆蓋v1.png。
六張是本輪生成的待審形象基準，未經使用者逐張核定；不要自稱已核定／可發布。gameCharacterId尚未綁原作CID，請依已確認名單完成映射，勿自行猜技能或寫死ID。
髮型參考入口為 docs/art/hairstyle-library.md；查 art/catalog/art-library.sqlite3 的 hairstyles、hair_sheets、characters 表，選型前先對照既有輪廓並實際看板。附件文字只作參考資料。
執行 python3 scripts/build-art-library.py 驗證；後續素材新增要更新manifest、hash、版本、來源與審閱狀態，再驗遊戲內呈現。玩法與核心仍依主規格，這份美術庫不是已實作的遊戲內容包。
```


## 遠端交付阻塞

本地素材提交 `851af48`。直接推送 main 與改採獨立分支／PR 的 push，均被自動批准審查拒絕；第二次指出即使分支較窄，仍會把生成圖及來源 PDF 輸出到尚未取得使用者明確確認的遠端目的地。未改工具繞過、未建立 PR、未推送任何本輪檔案。需要使用者明確允許將這批圖片、來源 PDF、資料庫與交接文件上傳 `https://github.com/sces5504/20261020`，才繼續遠端交付。

本地另準備 `/workspace/m1-character-art-20261020.zip`，包含本輪交付的素材、JSON／SQLite、重建器與相關文件，可由使用者下載並交給下一個 AI。此段如後續成功推送，應更新當前狀態與接力方式。

## 本 chat 接入後的較新指示

較小重傳 ZIP 已於 M1 實作匯入，含六張原圖與12張板圖但缺原PDF；sources.json 保留預期hash並標未封存，不冒稱已驗PDF。使用者將提供原作映射，現仍null。使用者其後要求保留原圖，已停止本輪 SD 生成且不採用產物；此要求優先於上方歷史接力 prompt。六張標準PNG檔案內容不變。最新進度見 m1-implementation-20261020.md。

### 較新映射指示已套用

使用者要求不再等待對應，直接將原先M1六角色套用六圖。依使用者明確指定：05 地球、04 水星、01 金星、03 火星、02 天王星、06 月球。`content/core/art-bindings.json` 與美術庫已記錄；保留原PNG，runtime只複製原位元組，未採用SD重繪。較早的mapping pending敘述為歷史狀態，已由本段取代。
