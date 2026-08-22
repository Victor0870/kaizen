import { DEPARTMENT_OPTIONS, CAP_BAC_OPTIONS } from "./constants.js";

export const CATALOG_COLLECTION = "settings";
export const CATALOG_DOC_ID = "catalog";

export function getDefaultCatalog() {
  return {
    departments: [...DEPARTMENT_OPTIONS],
    ranks: [...CAP_BAC_OPTIONS]
  };
}

export function normalizeCatalogList(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const trimmed = String(item || "").trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

export function parseCatalogData(data) {
  if (!data) return getDefaultCatalog();
  const departments = normalizeCatalogList(Array.isArray(data.departments) ? data.departments : []);
  const ranks = normalizeCatalogList(Array.isArray(data.ranks) ? data.ranks : []);
  if (!departments.length || !ranks.length) return getDefaultCatalog();
  return { departments, ranks };
}

export async function fetchCatalog(db, docFn, getDocFn) {
  const snap = await getDocFn(docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID));
  if (!snap.exists()) return getDefaultCatalog();
  return parseCatalogData(snap.data());
}

export async function ensureCatalogDefaults(db, docFn, getDocFn, setDocFn, serverTimestampFn) {
  const ref = docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID);
  const snap = await getDocFn(ref);
  if (snap.exists()) {
    const parsed = parseCatalogData(snap.data());
    const raw = snap.data();
    const needsRepair =
      !Array.isArray(raw.departments) ||
      !raw.departments.length ||
      !Array.isArray(raw.ranks) ||
      !raw.ranks.length;
    if (!needsRepair) return { ...parsed, seeded: false };
  }

  const defaults = getDefaultCatalog();
  await setDocFn(ref, {
    departments: defaults.departments,
    ranks: defaults.ranks,
    updatedAt: serverTimestampFn(),
    seededBy: "system"
  });
  return { ...defaults, seeded: true };
}

export async function saveCatalog(db, docFn, setDocFn, serverTimestampFn, { departments, ranks }, updatedBy = "") {
  const cleanedDepartments = normalizeCatalogList(departments);
  const cleanedRanks = normalizeCatalogList(ranks);
  if (!cleanedDepartments.length || !cleanedRanks.length) {
    throw new Error("catalog.emptyNotAllowed");
  }

  await setDocFn(docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID), {
    departments: cleanedDepartments,
    ranks: cleanedRanks,
    updatedAt: serverTimestampFn(),
    updatedBy
  });

  return { departments: cleanedDepartments, ranks: cleanedRanks };
}
