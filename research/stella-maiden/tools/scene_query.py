"""Read bounded scene-index results without loading every scene into AI context."""
from pathlib import Path
import argparse,json
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--search',required=True);p.add_argument('--limit',type=int,default=10);args=p.parse_args()
catalog=json.loads((ROOT/'scenes/resource_catalog.json').read_text());needle=args.search.casefold();matches=[]
for file in catalog:
    selected=[node for node in file['instances'] if needle in str(node.get('Name','')).casefold() or needle in str(node.get('AName','')).casefold()]
    if needle in file['decoded_json'].casefold() or selected:
        matches.append({'file':file['decoded_json'],'statistics':file['statistics'],'matching_instances':selected[:args.limit],'source_sha256':file['source_sha256']})
print(json.dumps({'matching_files':len(matches),'files':matches[:args.limit],'limit':args.limit},ensure_ascii=False,indent=2))
