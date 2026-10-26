# late3：指定角色補齊

來源：2026-10-26使用者指定posteior(123)、Alpheratz(115)、Alrami(119)、Gienah(118)。已核對來源Key為Posterior／123；Alpheratz為CID120、5星，CID115實為Elacrab、4星，使用者明確選擇Alpheratz／120，故不加入Elacrab。Gienah／118已整合在story40，使用者確認不用重加。本批僅新增3位，既有Gienah原ID／數值／技能／媒體不變。

起點origin/main `ed6cbda`（核心0.9.0，72角色），分支content/requested4。包 `late3:package.additional-three@0.1.0`，精確requires m1:core@0.9.0及stella:package.skills@0.1.0；擴充檔content/extensions/late3.json。只改自己的內容包、簡報及交接，不改root manifest／核心／生成檔。

代表Posterior：CID[123]／Skill[205]／Gacha[122]，5星；HP534、ATK93、DEF13、原始DPS116.25、射程430、間隔0.8秒。使用原作來源庫Absolute hit：0.5秒延遲後發射8枚追蹤彈，基礎CD18秒。實際Lv1／Lv10測試確認8枚homing彈體及命中傷害；不因技能名稱推斷未證實的必中或額外效果。

三種圖片引用均空，缺美術用現有色標／幾何，不借既有Gienah或其他角色圖；未新增造型戰力副本。

## 新增名單與原作對應

|角色|CID|星數|Skill／CD秒|HP／ATK／DEF|原始DPS|共鳴四槽|
|---|---:|---:|---|---|---:|---|
|Posterior|123|5|205 / 18.0|534 / 93 / 13|116.25|337／762／653／458|
|Alpheratz|120|5|200 / 13.0|896 / 18 / 41|22.50|330／660／220／466|
|Alrami|119|5|197 / 14.0|478 / 32 / 14|40.00|466／275／550／292|

Posterior對應stella:skill.205（Absolute hit）；Alpheratz對應stella:skill.200（Assault order），是範圍內友軍攻擊提高、防禦降低，不是降低敵方防禦；Alrami對應stella:skill.197（Superfragmentary arrow），提高自己攻擊並無視敵防。三位均直接引用現有來源program／等級1–10，不新增近似M1技能或角色ID例外。原作名稱不是額外效果證據，fidelity沿現有description重建，不假稱原版逐幀一致。

Gienah／CID118，5星，既有 `story40:character.gienah`／Skill193（Time reduction）保持原樣；不在新包建立第二位、替換媒體或修改取得。曾為使用者初始清單作一次來源／技能／取得回歸核對，收到「不用重加」後不增加任何Gienah定義。

## 數值、取得與素材

沿使用者前輪核定的固定story10尺度：原生Lv1為CID.f17／f15／f16除10向零取整，HP×3.0670575995460134、ATK×1.780185758513932、DEF×1.1428571428571428後四捨五入。rarity直接取f02，critical／evasion取f18/100／f19/100；星級不乘傷害。速度180／射程430／間隔0.8／growth0.08沿本作目前標準，並非完整原生曲線。

三位starter=false／summonable=true。配方以來源mode0四槽作本作水晶／氣體／金屬／乙太預設，非原生槽名認證。Alpheratz來源mode0的flag1本來排除普通池，本包按既有新增角色方式明示適配為本作可共鳴，不新增hyper或假稱原作普通池可抽。精準配方不是保證角色，合併後75人、三位新預設與原72人預設均仍在前五可達。

共鳴遵守最新main：到期先等待，玩家在共鳴頁開獎才入庫；同一開獎receipt不重發。驗收不是沿用過期的到期自動入庫假設。保存既有工作、資源、同調與技能研究機制，不新增任務／碎片或角色ID特例。

三位尚缺立繪、頭像與同人Q圖，使用現有缺圖備援；無新實檔／hash，不借Gienah或其他少女圖。日後頭像可引用立繪，Q圖需從同人立繪衍生；補圖交實檔、來源、尺寸、hash、review與建置複製，由整合者綁定，造型不複製戰力。

## 證據界線與精簡驗收

已知：三人CID／Skill／Gacha來源、星級／原生參考屬性／機率，現有來源技能動作與Lv1–10；Gienah在最新main已整合。已核准：以Alpheratz／120為準、Gienah不重加。推論／本作適配：固定數值換算、角色站位建議、四槽名稱與Alpheratz普通池旗標適配。未知：人物外觀／官方繁中名、原版完整時序與實機對照，不依技能標題猜出原生效果。

新增包顯式assemble75人，舊72人深比較不變；原始表核對來源／星數／換算與機率，實際召喚→等待→手動開獎取得、重複receipt冪等與舊save可讀。真實Combat測Lv1／Lv10：Posterior延遲後8枚homing彈且實際命中；Alpheratz友軍加攻與減防同時存在；Alrami加攻與無視護甲的實際命中（敵方防禦1000／0結果一致）。不重跑未變的全世界戰鬥或全核心套件。
