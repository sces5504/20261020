"""Bounded research query: only the 126 distinct CID targets referenced by Gacha."""
import csv, json, re, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
c=sqlite3.connect(ROOT/'research/stella-maiden/generated/stella_research.sqlite');c.row_factory=sqlite3.Row
current={x['sourceRow']:x for x in json.loads((ROOT/'content/generated/runtime.json').read_text())['characters']}
priority={'Sun':1,'Jupiter':2,'Saturn':3,'Neptune':4,'Pluto':5,'Nemesis':6,'Ganymede':7,'Io':8,'Titania':9,'Ariel':10,'Spica':11,'Arcturus':12}
zh={'Sun':'太陽','Earth':'地球','Mercury':'水星','Venus':'金星','Mars':'火星','Jupiter':'木星','Saturn':'土星','Uranus':'天王星','Neptune':'海王星','Pluto':'冥王星','Moon':'月球','Nemesis':'涅墨西斯（暫譯）','Ganymede':'木衛三','Io':'木衛一','Titania':'天衛三','Ariel':'天衛一','Spica':'角宿一','Arcturus':'大角星'}
rows=[]
for r in c.execute('SELECT c.* FROM characters_with_skill c WHERE c.cid_row IN (SELECT DISTINCT cid_row FROM gacha_recipes) ORDER BY c.cid_row'):
 loc=c.execute('SELECT ja,en,ko FROM localization WHERE key=? LIMIT 1',(r['key'],)).fetchone()
 done=current.get(r['cid_row']);key=r['key'];slug=re.sub(r'[^a-z0-9.-]+','-',key.lower()).strip('-');slug=slug if slug[0].isalpha() else 'star-'+slug
 rows.append({'cidRow':r['cid_row'],'sourceKey':key,'name':zh.get(key,loc['ja'] if loc else key),'nameEn':loc['en'] if loc else key,'nameJa':loc['ja'] if loc else '', 'rarityCode':r['rarity'],'skillName':r['skill_name_en'].replace('\\n',' '),'skillDescription':r['skill_description_en'].replace('\\n',' '),'skillRow':r['active_skill_id'],'contentId':done['id'] if done else 'future:'+slug,'status':'已整合（試玩）' if done else '待繪製／待實裝','priority':0 if done else priority.get(key,99),'category':'原作變體／造型候選' if '_' in key else '原作角色候選','portrait':done['portrait'] if done else '', 'artBrief':'立繪／頭像／獨立Q圖已接入；新衍生素材仍為候選，原圖保留。' if done else '全身透明立繪＋一致Q版；髮型、服裝、配色待設計。原作完整美術缺OBB，不臆造已核定外觀。','evidence':'Gacha CID引用已知；稀有度為基礎碼；英文技能描述含原作占位參數，非本作已實作效果。'})
assert len(rows)==126 and len({r['cidRow'] for r in rows})==126
out=ROOT/'public/catalog';out.mkdir(parents=True,exist_ok=True)
(out/'characters.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8')
fields={'cidRow':'CID row','sourceKey':'原作Key','name':'對照名稱（未標譯者沿用日文）','nameEn':'原作英文名稱','nameJa':'原作日文名稱','rarityCode':'原作基礎稀有度碼','skillName':'原作技能英文名稱','skillDescription':'原作技能英文描述（含占位）','skillRow':'Skill row','contentId':'本作ID（future為建議未啟用）','status':'製作狀態','priority':'建議繪製順序（0已做／99未排）','category':'候選分類','artBrief':'美術需求與缺口','evidence':'證據界線'}
for dest in [out/'future-characters.csv',ROOT/'docs/art/future-characters.csv']:
 with dest.open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f,lineterminator="\n");w.writerow(fields.values());w.writerows([[r[k] for k in fields] for r in rows])
print(f'Character art roster: {len(rows)} evidenced targets, {sum(r["status"].startswith("待") for r in rows)} future candidates (including source variants).')
