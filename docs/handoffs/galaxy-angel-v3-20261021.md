# Galaxy Angel 0.3 接力

任務：使用者八項試玩修正；最新規格 docs/design/galaxy-angel-v3.md。從最新main fetch核對SHA及公開version.json，不沿用舊foundation分支。整合分支 polish/galaxy-angel-v3，發布仍main。

## 已實作與入口

- 修正戰中WASD小步低於停止門檻：Combat獨立anchor＋逐員柔順跟隨，攝影機不反饋隊員誤差。共用domain/navigation.ts控制隊形與巡邏。
- 01前鋒、後續錯開後衛；前移／後移持久化，戰中禁止重排；降低顯示尺寸，idle浮動與輕擺。不同順序改實際站位，無角色ID特例。
- 巡邏橢圓路線、較大偵測圈，正式半徑290／路線180／相位速度38，模擬／畫面／出生位置共用公式。面板與背景暫停，離線不補打。
- 產品改名Galaxy Angel；六原圖與映射不動，DB key／m1:core保持相容。
- 艦橋／地表劇情背景、星空背景、敵艦與設施圖；星球／普通敵原創程序圖可替換。工坊清單／詳情和領地／建築／星球卡共用圖片。
- art/catalog/world-assets.json主檔／WebP／hash／來源；build驗證複製，ZIP帶實檔。未增加25MiB包上限。所有新增圖candidate，非玩家核准。
- docs/ai/START_HERE.md及八角色prompts已更新，附可填分派卡、當前core精確版本、可改路徑與整合流程。comet範例依賴已更新並加入assemble測試。

## 驗證與發布

進行中；收尾以實際本機release、CI／Pages及公開SHA補記。不得將進行中視為通過。

已有核心測試覆蓋：小步輸入讓每位實際隊員移動、放開停止、站位間距／順序、巡邏移動與越界校驗、資產引用與範例包整合。瀏覽器已補實際進戰按住WASD、編隊重排持久化、圖片解碼／工坊分類／星球建設圖；最終以收尾結果為準。

## 後續作者

從docs/ai/START_HERE.md選自己角色prompt，由整合者填起點SHA／唯一命名空間／具體小批內容與可改路徑。只改自己的extension／素材／交接，共用schema、domain、根manifest由核心整合者維護。新機制提最小資料例與相容要求，不寫ID分支。工坊編輯先隔離測試再ZIP交付；舊草稿不自動覆蓋，先備份再從正式內容建立。

角色表網站#/catalog及docs/art/future-characters.csv，120待做含變體。研究依research/stella-maiden/START_HERE.md做局部SQL，已知／推論／未知分開。不能將程序SFX稱為已導入AI音檔；音檔／骨架／自由腳本／任意Boss階段仍需核心能力。

商業品質未宣稱完成：Android／iOS真機、硬體效能、使用者美術／手感審閱與獨立AI接力演練仍待驗。保留commercial門檻，試玩採playtest profile。

首輪完整發布檢查：核心27項及一般E2E通過；playtest基礎隊首戰120秒逾時。純模擬確認同隊可勝、實際畫面採樣顯示50秒wall僅推進約33秒simulation，原因為軟體繪圖負擔而非放寬測試條件。已限制Phaser小型sprite貼圖至512（原檔與工坊不動），有星空圖時取消重複大型星雲／過多星點，敵人只在正式圖未載入時畫程序後備。完整profile正在原條件重跑，未把首輪失敗當通過。
