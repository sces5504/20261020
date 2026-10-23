import type { Owned, Save } from "../domain/model";
/** One card per definition; every persistent instance remains reachable in its detail picker. */
export function rosterGroups(s: Save) {
  const groups = new Map<string, Owned[]>();
  for (const o of s.roster) {
    const copies = groups.get(o.definition) ?? [];
    copies.push(o);
    groups.set(o.definition, copies);
  }
  return [...groups.values()].map((copies) => {
    const rank = (o: Owned) =>
      (s.team.includes(o.id) ? 1e6 : 0) +
      (Object.values(s.colonies).some((c) => c.assigned === o.id) ? 1e5 : 0) +
      o.level * 10 +
      (o.resonance ?? 0);
    return {
      primary: [...copies].sort((a, b) => rank(b) - rank(a))[0],
      copies,
    };
  });
}
