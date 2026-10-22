# Stella Maiden 技能重建依據

使用者2026-10-22授權：原生缺口可依wiki／網路資訊推定，以盡量還原為目標。技能表／原生已確認參數優先；公開wiki補充時序與目標語意，跨版本差異保留。不是逐幀原作實機認證。

可重建資料：`python3 research/stella-maiden/tools/build_database.py`，接著 `python3 tools/game/import-stella-skills.py`。完整原始研究不修改。227 source rows（含None）盤點在 content/source/stella-skill-inventory.json；十人原始非零欄位、來源列與推定在 stellar10-skill-evidence.json。

2026-10-22 實際瀏覽：

- [Namu：復仇女神星](https://m.namu.moe/w/네메시스(스텔라%20메이든))：技能著重單目標，目標死亡會取消；因此應支援鎖定同一目標、死亡取消，而非彈體任意重選敵人。
- [Namu：木衛一](https://m.namu.moe/w/이오(스텔라%20메이든))：減速與攻速干擾的基值／成長可與抽出表交叉檢查；距離以公尺顯示，800表格單位對應8公尺。
- [Namu：行星](https://m.namu.moe/w/행성(스텔라%20메이든))、[衛星](https://m.namu.moe/w/위성(스텔라%20메이든))、[矮星](https://m.namu.moe/w/왜성(스텔라%20메이든))：分類與攻擊傾向線索。頁面警告部分能力值與圖片屬舊版，不能當目前數值唯一真值。
- [木星](https://m.namu.moe/w/목성(스텔라%20메이든))、[冥王星](https://m.namu.moe/w/명왕성(스텔라%20메이든))、[木衛三](https://m.namu.moe/w/가니메데(스텔라%20메이든))個別頁已查，正文缺乏技能時序證據；不假稱已確認tick。
- [MIST Game Wiki：Jupiter](https://mist-game.fandom.com/wiki/Jupiter)搜尋結果提供Gravity Concentration名稱與近戰前方武器線索，未證實本作完整傷害公式。

本次不複製wiki圖片或文章進runtime。技能名稱／行為以資料與描述重建，自製VFX。技能等級1–10為目前可測試範圍，不宣稱原作上限。未提供技能強化玩法前，正式存檔角色預設技能Lv1；訓練場可獨立切換技能等級。
