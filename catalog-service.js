import { DEPARTMENT_OPTIONS, CAP_BAC_OPTIONS } from "./constants.js";

export const CATALOG_COLLECTION = "settings";
export const CATALOG_DOC_ID = "catalog";

export function getDefaultDepartments() {
  return DEPARTMENT_OPTIONS.map((name) => ({ name, code: name }));
}

export function getDefaultCatalog() {
  return {
    departments: getDefaultDepartments(),
    ranks: [...CAP_BAC_OPTIONS]
  };
}

export function normalizeDepartmentEntry(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const name = String(item.name || "").trim();
    const code = String(item.code || item.name || "").trim().toUpperCase();
    if (!name || !code) return null;
    return { name, code };
  }
  const legacy = String(item || "").trim();
  if (!legacy) return null;
  return { name: legacy, code: legacy.toUpperCase() };
}

export function normalizeDepartmentsList(items) {
  const seenNames = new Set();
  const seenCodes = new Set();
  const result = [];
  for (const item of items || []) {
    const entry = normalizeDepartmentEntry(item);
    if (!entry) continue;
    const nameKey = entry.name.toLowerCase();
    const codeKey = entry.code.toLowerCase();
    if (seenNames.has(nameKey) || seenCodes.has(codeKey)) continue;
    seenNames.add(nameKey);
    seenCodes.add(codeKey);
    result.push(entry);
  }
  return result;
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

export function buildDepartmentsByName(departments) {
  const map = {};
  for (const dept of departments) {
    map[dept.name] = dept.code;
  }
  return map;
}

export function parseCatalogData(data) {
  if (!data) return getDefaultCatalog();
  const departments = normalizeDepartmentsList(Array.isArray(data.departments) ? data.departments : []);
  const ranks = normalizeCatalogList(Array.isArray(data.ranks) ? data.ranks : []);
  if (!departments.length || !ranks.length) return getDefaultCatalog();
  return { departments, ranks };
}

export function getDepartmentNames(catalog) {
  return (catalog?.departments || []).map((d) => d.name);
}

export function getDepartmentCode(catalog, departmentName) {
  const name = String(departmentName || "").trim();
  const found = (catalog?.departments || []).find(
    (d) => d.name.toLowerCase() === name.toLowerCase()
  );
  return found?.code || name.toUpperCase();
}

async function readCatalogSnap(ref, getDocFn, getDocFromServerFn = null, timeoutMs = 15000) {
  let timer = null;
  try {
    return await Promise.race([
      getDocFn(ref),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("catalog-read-timeout")), timeoutMs);
      })
    ]);
  } catch (error) {
    if (error?.message === "catalog-read-timeout" && getDocFromServerFn) {
      console.warn("getDoc catalog chậm, thử getDocFromServer...");
      return getDocFromServerFn(ref);
    }
    throw error;
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

export async function fetchCatalog(db, docFn, getDocFn, getDocFromServerFn = null) {
  const ref = docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID);
  const snap = await readCatalogSnap(ref, getDocFn, getDocFromServerFn);
  if (!snap.exists()) return getDefaultCatalog();
  return parseCatalogData(snap.data());
}

export async function ensureCatalogDefaults(db, docFn, getDocFn, setDocFn, serverTimestampFn, getDocFromServerFn = null) {
  const ref = docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID);
  const snap = await readCatalogSnap(ref, getDocFn, getDocFromServerFn);
  if (snap.exists()) {
    const raw = snap.data();
    const parsed = parseCatalogData(snap.data());
    const needsRepair =
      !Array.isArray(raw.departments) ||
      !raw.departments.length ||
      !Array.isArray(raw.ranks) ||
      !raw.ranks.length ||
      // Legacy: departments lưu dạng chuỗi thay vì { name, code }
      (Array.isArray(raw.departments) &&
        raw.departments.some((item) => typeof item === "string" || (item && !item.code)));

    const needsByName = !raw.departmentsByName || Object.keys(raw.departmentsByName).length === 0;

    if (!needsRepair && !needsByName) {
      return { ...parsed, seeded: false };
    }

    try {
      await setDocFn(ref, {
        departments: parsed.departments,
        departmentsByName: buildDepartmentsByName(parsed.departments),
        ranks: parsed.ranks,
        updatedAt: serverTimestampFn(),
        seededBy: needsRepair ? "catalog-repair" : "departmentsByName-backfill"
      }, { merge: true });
      return { ...parsed, seeded: needsRepair };
    } catch (error) {
      console.warn("Không thể ghi sửa danh mục, dùng dữ liệu đã đọc:", error);
      return { ...parsed, seeded: false, writeFailed: true };
    }
  }

  const defaults = getDefaultCatalog();
  try {
    await setDocFn(ref, {
      departments: defaults.departments,
      departmentsByName: buildDepartmentsByName(defaults.departments),
      ranks: defaults.ranks,
      updatedAt: serverTimestampFn(),
      seededBy: "system"
    });
    return { ...defaults, seeded: true };
  } catch (error) {
    console.warn("Không thể khởi tạo danh mục mặc định:", error);
    return { ...defaults, seeded: false, writeFailed: true };
  }
}

export async function saveCatalog(db, docFn, setDocFn, serverTimestampFn, { departments, ranks }, updatedBy = "") {
  const cleanedDepartments = normalizeDepartmentsList(departments);
  const cleanedRanks = normalizeCatalogList(ranks);
  if (!cleanedDepartments.length || !cleanedRanks.length) {
    throw new Error("catalog.emptyNotAllowed");
  }

  await setDocFn(docFn(db, CATALOG_COLLECTION, CATALOG_DOC_ID), {
    departments: cleanedDepartments,
    departmentsByName: buildDepartmentsByName(cleanedDepartments),
    ranks: cleanedRanks,
    updatedAt: serverTimestampFn(),
    updatedBy
  });

  return { departments: cleanedDepartments, ranks: cleanedRanks };
}
