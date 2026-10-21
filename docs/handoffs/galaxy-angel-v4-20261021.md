# 星河戰姬 Galaxy Angel 0.4 接力

本輪使用者要求同調／紫星、重複返還、方向編隊、單波星球自動接敵與重置、巡邏即時接觸及非阻斷勝利、任務等待、巡航加速、打擊回饋；最新補充：中文名星河戰姬，返還既有四資源而非新貨幣。

## 開工與契約

先讀AGENTS.md、docs/memory/index.md、docs/ai/START_HERE.md、docs/design/galaxy-angel-v4.md。從最新origin/main開始，核對HEAD／dirty state／公開version.json；本輪分支polish/galaxy-angel-v4，不沿用舊foundation。整合與發布證據以本輪PR最後留言、CI／Pages及網站version.json為準。

- 純核心：domain/model.ts新增同調與返還；economy.ts交易／來源保護／冪等；save-schema.ts schema1加欄位預設。角色ID單調序號防止消耗後重用。
- 方向隊形：domain/formation.ts共享FleetMotion，實際曲線航跡追隨，非固定+X；導航／Combat共享同一實例，進戰不傳送。重載只重建航跡，未保存逐點歷史。
- 守軍：navigation.ts guardianPositions與combat共用；enemies單波，舊waves合併清空。schema新增交戰／警告／重置半徑及重置秒數；工坊星球表單可調。全域rules暫無專用工坊表單，改包／專案JSON後匯入。
- Game自動接敵按實際座標與自身冷卻，取消safeUntil全域抑制；disengagedPlanets抑制原地重新接敵且跨存檔；巡邏勝利toast不打斷導航。
- 角色詳情／同調使用遊戲內確認，技能就緒亮框、等待工作即時顯示、命中閃光／鏡頭與紅邊；減少動態設定關閉震動。六原圖位元組不動，未新增美術生成。
- 內容版本0.4.0，擴充requires為精確m1:core@0.4.0。新增值：duplicateStatBonus .02、duplicateRefundRate .25、travelSpeed180／cruiseSpeed255。2%是可調預設，不是使用者指定。

## 驗證

38項核心：五次同調、保護來源／取消、配方101/203/307/409按25%返還一次、實例ID不重用、四向跟隨／重排不瞬移、單波座標一致、越界重置、舊waves相容、命中訊號、取消巡邏8秒抑制及巡航加速。既有完整六人收集／三據點建設研究、遷移與CAS測試保留。

發布流程：`source scripts/env.sh` → `python3 scripts/project.py check release`，包含daily（內容／typecheck／38項核心）與build、四組瀏覽器（test:e2e／test:playtest／test:exploration／test:refinement）、playtest readiness。美術原圖hash／SQLite庫及範本10項另驗。

新增refinement瀏覽器流程：實際五次手動餵食與取消、紫星、UI輸入配方抽滿階角色且精確退款、正式存檔不受影響；接觸巡邏立即交戰及非modal勝利／實際獎勵；星球接近開戰、技能亮→施放熄→再亮、WASD越界警告／重置／重新接敵，不給虛假解放獎勵。截圖在忽略的.artifacts/v4。

## 後續分派

八組可複製prompt在docs/ai/01–08，任務卡在START_HERE。先一個新角色或一顆星球完整驗證再擴量；核心維持唯一整合者，內容作者只改各自命名空間擴充包／素材／交接，manifest與schema不競改。新增敵群要測單波同時出現的難度／手機負擔，不能沿用三波預算。

使用者已可開始內容擴充；尚未做跨星域旅行、任意技能腳本、BGM／語音、雲存檔。Android／iOS真機、硬體效能、獨立AI實際接力與商業品質審閱仍未驗，不能將Chromium觸控viewport或本輪資料測試冒充完成。舊工坊草稿先備份再用新版正式內容建立，不自動覆蓋玩家改動。
