# 原作世界圖片 v1

165個固定新資產，沿用目前深藍紫科幻、亮能量色與裝甲少女風格。既有敵人／Boss ID 與六張原始立繪未覆寫。62個來源model識別各有固定圖，同model的CID共用圖，不因等級換臉。

- [敵人／Boss總覽](../../art/world/original-world/enemy-preview.png)
- [85顆星球總覽](../../art/world/original-world/planet-preview.png)
- [全部媒體與hash](../../art/world/original-world/media.json)
- [敵人固定簡報](../../art/world/original-world/enemy-plan.json)、[星球固定簡報](../../art/world/original-world/planet-plan.json)
- 主檔／prompt：`art/world/original-world/masters/`；網頁WebP：`web/`；14星域背景與4種設施亦在媒體表。

imagegen生成新物件，Canvas只做可重建切片／縮放／WebP編碼。圖集以完整alpha輪廓分類至格位，保留跨格星環／天線，移除鄰物件切片殘影；原始主檔不動。尺寸、crop、pivot與collision分離。敵人512方形、星球384方形、背景保留生成尺寸；透明邊緣與全圖已目視檢視，遊戲與工坊使用相同assetId。

本批為試玩候選，未自行寫approved或冒稱使用者最終美術驗收。不是OBB原圖；缺原作圖片的虛構星體表面與Boss輪廓為固定的新設計。資料與原作數值的證據界線見 [世界契約](../design/original-world.md)。
