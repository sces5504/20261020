"""Evidence-backed partial model, not a complete game or server emulator.

Growth: ARM64 0xa7e18/0xa7fa8. Skill parameters: 0x1a6b24.
Recipe filtering/distance: 0xe22dc. Full RNG/conditional draws are not modeled.
"""
from pathlib import Path
import argparse,json
ROOT=Path(__file__).resolve().parents[1]

def table(name):return json.loads((ROOT/'tables'/(name+'.json')).read_text())['rows']
def trunc_div(n,d):return (-1 if n<0 else 1)*(abs(n)//d)

def base_growth(cid,level):
    level=max(1,min(150,level));a=cid['f15'];h=cid['f17'];s=cid['f16']
    return {'level':level,'attack':max(1,trunc_div(a,10)+trunc_div(9*(level-1)*a,990)),
            'hp':trunc_div(h,10)+trunc_div(trunc_div(9*h,10)*(level-1),99),
            'defense':trunc_div(s,10)+trunc_div(9*(level-1)*s,990)}

def skill_parameters(row,level):
    if level<1:raise ValueError('skill level must be >=1; maximum skill level is not established')
    k=level-1
    return {'level':level,'interval_ms_inferred_cooldown':row['f06']-k*row['f07'],
            'duration_ms':row['f12']+k*row['f13'],'skill_lifetime_ms':row['f52']+k*row['f53'],
            'attack_speed_multiplier_percent':row['f45']+k*row['f46'],
            'attack_speed_increase_display_percent':row['f45']+k*row['f46']-100,
            'move_speed_multiplier_percent':row['f47']+k*row['f48'],
            'percent_token':row['f54']+k*row['f55'],'cast_time_ms':row['f75'],'drone_count':row['f79']}

def recipe_candidates(resources,hyper=False):
    if len(resources)!=4 or any(x<0 for x in resources):raise ValueError('four nonnegative integer resource amounts required')
    total=sum(resources);characters=table('CID');out=[]
    for r in table('Gacha'):
        if bool(r['f02'])!=hyper or r['f03']!=0 or not(r['f08']<=total<=r['f09']):continue
        cid=characters[r['f01']]
        out.append({'recipe_row':r['_row'],'recipe_key':r['f00'],'character_row':r['f01'],'character_key':cid['f00'],'rarity':cid['f02'],
                    'distance':sum(abs(v-r[f'f{4+i:02d}']) for i,v in enumerate(resources))})
    return sorted(out,key=lambda x:x['distance'])

def damage_known_path(damage,defense,critical=False,evaded=False,critical_bonus=1500,evasion_reduction=750,armor_k=100):
    """Restricted 0x3f236c path: explicit event flags, no variation/extra reduction.

    Reject inputs where the simplified arithmetic would hide native width effects.
    Not a random hit simulator, target getter implementation or full damage system.
    """
    if not 0<=damage<32768 or not 0<=defense<32768 or not 0<defense+armor_k<32768:raise ValueError('outside verified non-overflow input bounds')
    q=65536;d=damage*q;trace=[d]
    if evaded:
        factor=q-65*evasion_reduction
        if factor<0:raise ValueError('negative evasion factor outside modeled path')
        d=d*factor//q;trace.append(d)
    if critical:
        d=d*(q+65*critical_bonus)//q;trace.append(d)
    if not 0<=d<2**31:raise ValueError('native signed32 intermediate overflow not modeled')
    if defense>=1:
        fraction=defense*q//(defense+armor_k)
        d=d*(q-fraction)//q;trace.append(d)
    return {'damage':max(1,d//q),'q16_after_each_step':trace,'scope':'No variation, additional mitigation, penetration, armor bypass, absorption, HP write, RNG or getter modifiers. Events explicitly supplied; no overflow emulation.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True)
    g.add_argument('--character');g.add_argument('--skill',type=int);g.add_argument('--recipe',type=int,nargs=4);g.add_argument('--damage',type=int)
    p.add_argument('--level',type=int,default=1);p.add_argument('--hyper',action='store_true');p.add_argument('--limit',type=int,default=10)
    p.add_argument('--defense',type=int,default=100);p.add_argument('--critical',action='store_true');p.add_argument('--evaded',action='store_true')
    a=p.parse_args()
    if a.character:
        c=next(r for r in table('CID') if r['f00'].casefold()==a.character.casefold())
        result={'character':c['f00'],'cid_row':c['_row'],'rarity':c['f02'],'base_growth_without_equipment_buffs':base_growth(c,a.level),'active_skill_row':c['f106']}
    elif a.skill is not None:
        if a.skill<0:raise ValueError('skill ID must be nonnegative')
        r=table('Skill')[a.skill];l=table('LocalStr')
        result={'skill_row':r['_row'],'key':r['f00'],'name_en':l[r['f04']]['f02'],'description_template_en':l[r['f05']]['f02'],'parameters':skill_parameters(r,a.level)}
    elif a.damage is not None:result=damage_known_path(a.damage,a.defense,a.critical,a.evaded)
    else:
        rows=recipe_candidates(a.recipe,a.hyper)
        result={'resources':a.recipe,'hyper':a.hyper,'candidate_count':len(rows),'candidates':rows[:a.limit],
                'limitation':'Distance ranking only. Ties retain source order for display; original shuffles ties. Rarity selection, account/event overrides, final draw and server behavior are not simulated.'}
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
