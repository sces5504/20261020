"""Bounded, read-only research analysis for the remake specification.

Run verify_bundle.py, build_database.py and check_database.py first.
This analyzes table values; it does not execute the APK or reproduce final draws.
Output goes to stdout, so callers choose an ignored/generated report destination.
"""
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research/stella-maiden'


def vector(row):
    return tuple(row[f'resource_{i}'] for i in range(1, 5))


def projected(values, pairing):
    return tuple(sum(values[i] for i in group) for group in pairing)


def distance(a, b):
    return sum(abs(x - y) for x, y in zip(a, b))


def envelope(rows, anchor, project):
    """Include every tie at the fifth-distance boundary; not native final top 5."""
    total = sum(vector(anchor))
    candidates = [r for r in rows if r['total_min'] <= total <= r['total_max']]
    if not candidates:
        return set()
    scores = [(distance(project(vector(anchor)), project(vector(r))), r['_row'])
              for r in candidates]
    cutoff = sorted(d for d, _ in scores)[min(4, len(scores) - 1)]
    return {row for d, row in scores if d <= cutoff}


def projection_report(rows, pairing):
    buckets = defaultdict(list)
    for row in rows:
        buckets[projected(vector(row), pairing)].append(row)
    collision_groups = [group for group in buckets.values()
                        if len({vector(row) for row in group}) > 1]
    anchors = [r for r in rows if r['total_min'] <= sum(vector(r)) <= r['total_max']]
    changed = sum(envelope(rows, a, lambda v: v) !=
                  envelope(rows, a, lambda v: projected(v, pairing)) for a in anchors)
    examples = []
    for group in collision_groups[:3]:
        examples.append({'projected': projected(vector(group[0]), pairing),
                         'source_rows': [{k: r[k] for k in ('_row', 'character_key')}
                                         | {'vector4': vector(r)} for r in group[:6]]})
    return {
        'pairing_zero_based': pairing,
        'unique_vector4': len({vector(r) for r in rows}),
        'unique_vector2': len(buckets),
        'new_exact_collision_groups': len(collision_groups),
        'valid_exact_recipe_anchors': len(anchors),
        'changed_fifth_distance_tie_envelopes': changed,
        'collision_examples': examples,
    }


def main():
    path = RESEARCH / 'generated/stella_research.sqlite'
    if not path.is_file():
        raise SystemExit('Build the research SQLite database first.')
    with sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True) as conn:
        conn.row_factory = sqlite3.Row
        assert conn.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        catalog = conn.execute('SELECT count(*),sum(row_count) FROM _catalog').fetchone()
        assert tuple(catalog) == (67, 37723)
        recipes = [dict(r) for r in conn.execute('SELECT * FROM gacha_recipes ORDER BY _row')]
        pairings = [((0, 1), (2, 3)), ((0, 2), (1, 3)), ((0, 3), (1, 2))]
        modes = {}
        for label, hyper in [('ordinary', False), ('hyper', True)]:
            rows = [r for r in recipes if bool(r['mode_code']) == hyper and r['flag_code'] == 0]
            modes[label] = {'active_recipe_rows': len(rows),
                            'distinct_cid_targets': len({r['cid_row'] for r in rows}),
                            'projections': [projection_report(rows, p) for p in pairings]}
        six = [dict(r) for r in conn.execute('''
            SELECT cid_row,key,rarity,active_skill_id,skill_key,skill_name_en,skill_description_en
            FROM characters_with_skill
            WHERE key IN ('Earth','Mercury','Venus','Mars','Uranus','Moon') ORDER BY cid_row
        ''')]
        source_rows = [dict(r) for r in conn.execute('''
            SELECT spawn_row,key,map_x,map_y,wave_row,slot,cid_row,character_key,count
            FROM stage_roster WHERE key IN ('SE1','SE2','SE3','SE15') ORDER BY spawn_row,slot
        ''')]
        report = {
            'research_source_main_commit': '16e64e5',
            'scope': 'Static research import and hypothetical four-to-two slot-sum projection; not gameplay validation.',
            'coverage': {'tables': catalog[0], 'rows': catalog[1],
                         'all_recipe_rows': len(recipes),
                         'all_recipe_cid_targets': len({r['cid_row'] for r in recipes}),
                         'excluded_recipe_rows': sum(r['flag_code'] != 0 for r in recipes)},
            'method': {
                'resource_slot_names': 'Unknown mapping; refer only to slots 1..4.',
                'projection': 'Pairwise sums; preserves total-input bounds, recomputes unweighted L1 distance.',
                'anchors': 'Source target vectors passing their own inclusive total bounds; not an exhaustive input-space search.',
                'envelope': 'All eligible recipe rows at distance <= the fifth smallest distance, including ties.',
                'excluded': 'Native tie shuffling, rarity draw, account/event overrides, final weighting, server and seed.',
                'interpretation': 'Changes show loss of recipe geometry, not changes in final character probabilities.',
            },
            'modes': modes,
            'six_character_candidates_not_approved': six,
            'solar_sample_primary_waves': source_rows,
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
