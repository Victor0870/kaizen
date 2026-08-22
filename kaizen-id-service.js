import { EMPLOYEE_ID_LENGTH } from "./constants.js";

/**
 * Mã Kaizen: {4 ký tự mã NV}{mã bộ phận}{năm}-{số thứ tự trong năm}
 * Ví dụ: 003G + GAHR + 2026 + - + 1 => 003GGAHR2026-1
 */
export function buildKaizenIdPrefix(taiKhoan, departmentCode, year = new Date().getFullYear()) {
  const emp = String(taiKhoan || "").trim().toUpperCase();
  const dept = String(departmentCode || "").trim().toUpperCase();
  const y = Number(year) || new Date().getFullYear();
  return `${emp}${dept}${y}-`;
}

export function parseKaizenSequence(kaizenId, prefix) {
  if (!kaizenId || !prefix) return 0;
  const id = String(kaizenId);
  if (!id.startsWith(prefix)) return 0;
  const seqPart = id.slice(prefix.length);
  const seq = Number.parseInt(seqPart, 10);
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}

export function generateKaizenId({ taiKhoan, departmentCode, year, uid, existingRecords = [] }) {
  const emp = String(taiKhoan || "").trim().toUpperCase();
  if (emp.length !== EMPLOYEE_ID_LENGTH) {
    throw new Error("kaizen.invalidEmployeeId");
  }
  const deptCode = String(departmentCode || "").trim().toUpperCase();
  if (!deptCode) throw new Error("kaizen.missingDepartmentCode");

  const targetYear = Number(year) || new Date().getFullYear();
  const prefix = buildKaizenIdPrefix(emp, deptCode, targetYear);
  let maxSeq = 0;

  for (const record of existingRecords) {
    if (uid && record.uid !== uid) continue;
    maxSeq = Math.max(maxSeq, parseKaizenSequence(record.kaizenId, prefix));
  }

  return `${prefix}${maxSeq + 1}`;
}
