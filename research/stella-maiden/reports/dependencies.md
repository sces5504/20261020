# 擴充檔與素材依賴

依目前提供的APK做離線解析，沒有向遊戲伺服器請求資料。原始DEX指令及Spine檔頭見 [dependency_evidence.json](../index/dependency_evidence.json)。

## 確切預期的OBB

```text
main.431.com.mistgame.smus.obb
132,565,279 bytes
```

`classes.dex` 的 `com.mistgame.smus.i::<clinit>` 建立唯一descriptor：`true, "431", 132565279`；`Helpers.getExpansionAPKFileName` 依main／patch旗標、version與package拼出檔名。APK本身versionCode是432，擴充檔version卻是431，兩者不能混用。

目前使用者只有APK，未提供此OBB。因而尚未取得其目錄、內容雜湊、角色美術或任何更新快取，也沒有證據證明OBB仍可從遠端取得。不能單靠APK檔名推算完整安裝內容，更不能把「APK全部member解出」視為「完整素材已齊」。

Java入口 `DKActivity.StartOBBDownload` 經Runnable啟動DownloaderActivity；原生資源載入程式同時處理AppPath／DataPath／ObbPath及Material、Etc、Scene、Tex、UISpr、Actor、Mesh、Motion封包名稱。這證明有外部資料路徑，但尚未逐條確認各裝置狀態下的優先順序、OBB內解壓位置和更新覆寫規則。

## Spine版本

APK內三份 `.skel`（Door、FX_BossAppear、Title1）的binary header都明示 `3.6.53`。每個版本字串offset、檔案SHA-256和header hex保留於證據JSON。重建時應按這個版本的格式處理，不應未驗證就交給任意新版Spine runtime。

這是檔頭宣告的版本；本次沒有實際播放骨架、驗證atlas材質、blend mode或動畫事件相容性。

## 仍未恢復的依賴

- OBB內封包與全部角色／skin美術。
- 動態產生的角色素材檔名規則、所有fallback和快取覆寫行為。
- 遊戲更新manifest格式／位置及實際可用性。
- 原版裝置上的存檔、伺服器初始狀態與帳號交易流程。

目前可繼續使用已取得的資料、UI／場景結構與原生規則製作本地研究模型。視覺完整性與正式帳號行為，須保留為後續證據缺口。
