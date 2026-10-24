"""Player-facing names/categories for source replay families (LocalStr-derived where known).

Source keys stay in sourceRef; only display text and the challenge grouping change.
Battleship titles follow LocalStr Enemy_Battleship01..06 (JP/EN), mothership follows
BossScoreRank (Quasar Mothership); 'Requested Mission' follows LocalStr EventQ.
"""
import re
BATTLESHIPS={'01':'搜索戰艦［Kiraba］','02':'高速戰艦［Aitsu］','03':'裝甲戰艦［Morugo］','04':'強襲戰艦［Zeruga］','05':'追跡戰艦［Leiga］','06':'殲滅戰艦［Giria］'}
WEEKDAYS={'Monday':'週一','Tuesday':'週二','Wednesday':'週三','Thursday':'週四','Friday':'週五','Saturday':'週六','Sunday':'週日'}
CN_NUM='零一二三四五六七八九十'
def family(key):
 if m:=re.fullmatch(r'Battleship(\d\d)',key):return BATTLESHIPS.get(m[1],'戰艦 '+m[1]),'battleship','戰艦'
 if m:=re.fullmatch(r'Event(\d+)',key):return f'委託任務 {int(m[1]):02d}','mission','委託'
 if m:=re.fullmatch(r'S(\d+)',key):return f'特別委託 S{m[1]}','mission','特別委託'
 if m:=re.fullmatch(r'Chapter(\d+)',key):return f'第{CN_NUM[int(m[1])]}章 · 前線遭遇','mission','前線'
 if key.isdigit():return f'第{CN_NUM[int(key)]}星域 · 首領戰','mission','首領戰'
 return key,'event','遭遇'
def node(key,index):
 short=family(re.sub(r'(_\d.*)$','',key))[2]
 return f'{short} · 第{index+1}戰'
def daily(name):
 day,_,rest=name.partition(' · 母艦 ')
 return f'{WEEKDAYS.get(day,day)} · 類星體母艦 {rest}' if rest else name
