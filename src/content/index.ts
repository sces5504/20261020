import raw from "../../content/generated/runtime.json";
import { validatePack, snapshot } from "./schema";
const result = validatePack(raw);
if (!result.pack) throw new Error(result.errors.join("\n"));
export const published = snapshot(result.pack);
