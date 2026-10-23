# 劇情任務盤點交接（2026-10-23）

使用者最新要求：目前已0.8.0，先列原作任務進度、討論分批與所需授權，並列登場角色和缺角供先製作。本輪是規劃，不直接全面灌入故事或變更核心。

起點 `/workspace/20261020`，branch `work`，HEAD `ff7d31a`（PR17 merge），開工乾淨。已讀AGENTS、記憶索引／偏好、目前交接、AI入口、主規格、0.5歷史契約／交接、0.8契約、角色資料、研究入口與事件／重現報告；現行程式schema／economy核對一次性與daily條件。

交付：`docs/design/story-roadmap-20261023.md`（83節點、8批建議、逐章候選角色與缺口）；`story-roadmap-20261023.sources.json`（逐節QuestS row／label／EventScript entry row與立繪operand）。僅三個本任務文件，不改README／共用規格／核心／正式包。

查證：研究包verify通過863檔／67表／37723列／370場景；SQLite建置與catalog成功。83是QuestS排除None，不是137列QuestM。f34/f35僅視為Chat立繪operand候選，不能當確證speaker；後續須追蹤f36／Chat腳本／引用event的真實控制流。原作可確認故事只到Chapter7，不把後期地圖當現成故事。

目前26角色都已整合；story10十人美術以manifest為準，舊缺圖敘述無效。序章需要先補Scuti107／Antares99／Deneb73／Doradus48／Mucephei62／Sargas101；保留來源Key未定繁中。太陽系和處女座主要可取得少女已有，Boss戰鬥圖不等於NPC對話立繪；Master與Boss變體不能當新可抽少女。

未核定：完整／壓縮序章、必要通用核心支援由誰做、人物聲線／詞彙／時間線／章節與獎勵預算、缺章新創範圍。先前世界作者單次核心授權不套用本chat。未執行遊戲測試、發獎、部署或宣稱商業品質通過；下一步討論後先交代表對話與一任務，再擴章。
