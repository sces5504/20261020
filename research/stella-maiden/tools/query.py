"""Search/query the local evidence database without additional dependencies."""
import sqlite3,json,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
g=p.add_mutually_exclusive_group(required=True)
g.add_argument('--sql');g.add_argument('--search');g.add_argument('--catalog',action='store_true')
p.add_argument('--limit',type=int,default=30)
args=p.parse_args()
database=ROOT/'generated/stella_research.sqlite'
if not database.exists():p.error('Run python3 research/stella-maiden/tools/build_database.py first.')
db=sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
if args.catalog:rows=db.execute('SELECT * FROM _catalog ORDER BY name')
elif args.sql:rows=db.execute(args.sql)
else:
    print(json.dumps({'localization_matches':[dict(r) for r in db.execute('SELECT * FROM localization WHERE key LIKE ? OR en LIKE ? OR ja LIKE ? OR ko LIKE ? LIMIT ?',('%'+args.search+'%',)*4+(args.limit,))]},ensure_ascii=False,indent=2));raise SystemExit
for i,r in enumerate(rows):
    if i>=args.limit:print('... output limit reached; raise --limit to continue');break
    print(json.dumps(dict(r),ensure_ascii=False))
