/**
 * Client-safe module helpers (no server-only imports).
 * Server code that needs the DB lives in ./modules.
 */

export const GATED_MODULES = [
  { key: "admissions", label: "Admissions Portal" },
  { key: "bus", label: "Bus Management" },
  { key: "feeding", label: "Feeding Management" },
  { key: "academics", label: "Academics & Report Cards" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "accounting", label: "Accounting" },
] as const;

export type ModuleKey = (typeof GATED_MODULES)[number]["key"];

const ALL_KEYS = GATED_MODULES.map((m) => m.key) as string[];
const MODULE_PREFIX = "module:";

/**
 * A plan's `features` jsonb array holds marketing strings AND module access
 * entries encoded as "module:<key>". If a plan contains NO module entries at
 * all, every gated module is treated as enabled (back-compat for legacy plans).
 */
export function getPlanModules(features: unknown): string[] {
  if (!Array.isArray(features)) return [...ALL_KEYS];
  const explicit = features
    .filter((f): f is string => typeof f === "string" && f.startsWith(MODULE_PREFIX))
    .map((f) => f.slice(MODULE_PREFIX.length))
    .filter((k) => ALL_KEYS.includes(k));
  if (explicit.length === 0) return [...ALL_KEYS];
  return explicit;
}

/** Split a stored features array into module keys and free-text marketing lines. */
export function splitFeatures(features: unknown): { modules: string[]; marketing: string[] } {
  if (!Array.isArray(features)) return { modules: [...ALL_KEYS], marketing: [] };
  const modules: string[] = [];
  const marketing: string[] = [];
  for (const f of features) {
    if (typeof f !== "string") continue;
    if (f.startsWith(MODULE_PREFIX)) {
      const k = f.slice(MODULE_PREFIX.length);
      if (ALL_KEYS.includes(k)) modules.push(k);
    } else {
      marketing.push(f);
    }
  }
  // If the plan had no explicit module entries, treat all as enabled.
  return { modules: modules.length ? modules : [...ALL_KEYS], marketing };
}

/** Recombine module keys + marketing lines into the stored features array. */
export function combineFeatures(modules: string[], marketing: string[]): string[] {
  const validModules = modules.filter((m) => ALL_KEYS.includes(m)).map((m) => `${MODULE_PREFIX}${m}`);
  return [...validModules, ...marketing.filter((m) => typeof m === "string" && m.trim() !== "")];
}
