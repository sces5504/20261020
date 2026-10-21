import { z } from "zod";
import type { Save } from "../domain/model";
import { packSchema, type Pack } from "../content/schema";
import { saveSchema } from "../domain/save-schema";
export { saveSchema } from "../domain/save-schema";
export function checkSave(raw: unknown, p: Pack): Save {
  const s = saveSchema.parse(raw);
  if (s.contentId !== p.id) throw Error("存檔屬於不同內容包。");
  if (!p.regions.some((r) => r.id === s.region))
    throw Error("存檔星域缺失，請恢復原內容包後再匯入。");
  if (
    s.team.length > p.rules.teamSize ||
    new Set(s.team).size !== s.team.length
  )
    throw Error("編隊數量或成員重複。");
  if (new Set(s.roster.map((o) => o.id)).size !== s.roster.length)
    throw Error("角色實例重複。");
  for (const o of s.roster)
    if (!p.characters.some((c) => c.id === o.definition))
      throw Error(
        `角色 ${o.definition} 缺失；請恢復內容包或先提供遷移，原存檔保留。`,
      );
  if (s.team.some((id) => !s.roster.some((o) => o.id === id)))
    throw Error("編隊引用缺失。");
  for (const r of Object.keys(s.wallet))
    if (!p.resources.some((v) => v.id === r))
      throw Error("存檔資源缺失，需要明確遷移。");
  // Historical clear receipts remain valid even if an optional planet is removed.
  for (const [id, col] of Object.entries(s.colonies)) {
    if (!p.planets.some((v) => v.id === id)) throw Error("領地星球缺失。");
    if (
      col.assigned &&
      (!s.roster.some((o) => o.id === col.assigned) ||
        s.team.includes(col.assigned))
    )
      throw Error("派駐角色衝突。");
    for (const bid of Object.keys(col.buildings))
      if (!p.buildings.some((v) => v.id === bid)) throw Error("建築定義缺失。");
  }
  for (const j of s.jobs) {
    if (j.kind === "summon" && !p.characters.some((v) => v.id === j.payload))
      throw Error("召喚工作角色缺失。");
    if (j.kind === "research" && !p.research.some((v) => v.id === j.definition))
      throw Error("研究工作缺失。");
    if (
      j.kind === "build" &&
      (!p.buildings.some((v) => v.id === j.definition) || !s.colonies[j.owner])
    )
      throw Error("建造工作缺失。");
    if (j.kind === "heal" && !s.roster.some((o) => o.id === j.owner))
      throw Error("治療工作缺失。");
  }
  if (
    s.encounter &&
    !(s.encounter.kind === "patrol"
      ? p.regions.some((r) =>
          r.patrols.some((v) => v.id === s.encounter!.planet),
        )
      : p.planets.some((v) => v.id === s.encounter!.planet))
  )
    throw Error("戰鬥星球缺失。");
  return s;
}
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("stella-maiden-m1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("records");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function read<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("records", "readonly"),
      r = tx.objectStore("records").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function write(key: string, value: unknown) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("records", "readwrite");
    tx.objectStore("records").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error("儲存已中止"));
  });
}
export async function commit(
  key: string,
  next: Save,
  expected: number | null,
  preserveRestorePoint = false,
) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("records", "readwrite"),
      store = tx.objectStore("records"),
      r = store.get(key);
    let failure: Error | undefined;
    r.onsuccess = () => {
      const old = r.result as Save | undefined;
      if ((old?.revision ?? null) !== expected) {
        failure = Error("其他分頁已更新進度。請重新載入後再操作。");
        tx.abort();
        return;
      }
      if (old) {
        store.put(old, `${key}:backup`);
        if (preserveRestorePoint) store.put(old, `${key}:restore-point`);
      }
      store.put(next, key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(failure ?? tx.error ?? Error("儲存失敗"));
  });
}
export type Project = {
  schemaVersion: 1;
  revision: number;
  pack: Pack;
  past: Pack[];
  future: Pack[];
};
export function parseProject(v: unknown): Project {
  return z
    .object({
      schemaVersion: z.literal(1),
      revision: z.number().int().nonnegative(),
      pack: packSchema,
      past: z.array(packSchema).max(30),
      future: z.array(packSchema).max(30),
    })
    .strict()
    .parse(v);
}
export function download(
  name: string,
  data: BlobPart,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
