/**
 * true = xem giao diện không cần login / Firebase (dữ liệu lưu localStorage).
 * Đổi thành false khi đã cấu hình Firebase và muốn bật đăng nhập thật.
 */
export const PREVIEW_MODE = false;

/** Cấp bậc dùng cho phân quyền phê duyệt phiếu ý tưởng (sẽ triển khai sau). */
export const CAP_BAC_OPTIONS = [
  "Operator",
  "Junior",
  "Staff",
  "Supervisor",
  "AM",
  "MG",
  "SMG",
  "DGM",
  "GM",
  "DGD",
  "GD"
];

/** Danh sách bộ phận mặc định (có thể mở rộng sau). */
export const DEPARTMENT_OPTIONS = [
  "GAHR",
  "PROD",
  "QA",
  "QC",
  "WH",
  "ENG",
  "PUR",
  "FIN",
  "IT",
  "SALES",
  "OTHER"
];

export const CLASSIFICATION_CODES = [
  { code: "S", labelVi: "An toàn", labelEn: "Safety" },
  { code: "Q", labelVi: "Chất lượng", labelEn: "Quality" },
  { code: "P", labelVi: "Năng suất", labelEn: "Productivity" },
  { code: "C", labelVi: "Chi phí", labelEn: "Cost" },
  { code: "E", labelVi: "Môi trường", labelEn: "Environment" },
  { code: "W", labelVi: "Công việc", labelEn: "Work" }
];

/** Vai trò phân quyền hệ thống Kaizen. */
export const USER_ROLES = ["user", "manager", "top_manager", "admin"];

export const KAIZEN_STATUS = {
  SUBMITTED: "submitted",
  L1_APPROVED: "l1_approved",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  /** legacy */
  IDEA: "submitted",
  REPORT: "completed"
};

export const LIST_STATUS_FILTERS = [
  "submitted",
  "approved",
  "in_progress",
  "completed"
];

/** Luồng phê duyệt phiếu ý tưởng. */
export const APPROVAL_PATH = {
  MANAGER_ONLY: "manager_only",
  TOP_MANAGER: "top_manager"
};

export const LIST_VIEW_MODES = ["mine", "pending_approval", "approved_by_me"];

/** Các bước hiển thị trên trang tiến độ phiếu. */
export const WORKFLOW_STEPS = [
  { key: "proposal", statuses: ["submitted", "l1_approved", "approved", "in_progress", "completed"] },
  { key: "l1_approval", statuses: ["l1_approved", "approved", "in_progress", "completed"] },
  { key: "l2_approval", statuses: ["approved", "in_progress", "completed"] },
  { key: "in_progress", statuses: ["in_progress", "completed"] },
  { key: "completed", statuses: ["completed"] }
];

export function normalizeRole(role) {
  const r = String(role || "user").trim().toLowerCase();
  return USER_ROLES.includes(r) ? r : "user";
}

export function canSubmitKaizen(role) {
  return USER_ROLES.includes(normalizeRole(role));
}

export function canApproveL1(role, profile, record) {
  const r = normalizeRole(role);
  if (r !== "manager" && r !== "admin") return false;
  if (r === "admin") return true;
  if (!profile || !record) return false;
  return getRecordDept(record) === String(profile.department || "").trim();
}

export function canApproveL2(role) {
  const r = normalizeRole(role);
  return r === "top_manager" || r === "admin";
}

export function normalizeApprovalPath(path) {
  return path === APPROVAL_PATH.MANAGER_ONLY
    ? APPROVAL_PATH.MANAGER_ONLY
    : APPROVAL_PATH.TOP_MANAGER;
}

export function getRecordDept(record) {
  return String(record?.dept || record?.department || "").trim();
}

export function isOwnKaizen(record, profile) {
  return !!record && !!profile && record.uid === profile.uid;
}

export function isPendingApprovalFor(profile, record) {
  if (!profile || !record) return false;
  const role = normalizeRole(profile.role);
  const status = normalizeKaizenStatus(record.status);
  const path = normalizeApprovalPath(record.approvalPath);
  const dept = getRecordDept(record);
  const userDept = String(profile.department || "").trim();

  if (role === "admin") {
    if (status === KAIZEN_STATUS.SUBMITTED) return true;
    if (status === KAIZEN_STATUS.L1_APPROVED && path === APPROVAL_PATH.TOP_MANAGER) return true;
    return false;
  }

  if (role === "manager" &&
      status === KAIZEN_STATUS.SUBMITTED &&
      dept === userDept) {
    return true;
  }
  if (role === "top_manager" &&
      status === KAIZEN_STATUS.L1_APPROVED &&
      path === APPROVAL_PATH.TOP_MANAGER) {
    return true;
  }
  return false;
}

export function isApprovedByMe(profile, record) {
  if (!profile || !record) return false;
  const uid = profile.uid;
  return record.l1ApprovedBy === uid || record.l2ApprovedBy === uid;
}

export function canUseApprovalLists(role) {
  const r = normalizeRole(role);
  return r === "manager" || r === "top_manager" || r === "admin";
}

export function getWorkflowStepsForRecord(record) {
  const path = normalizeApprovalPath(record?.approvalPath);
  if (path === APPROVAL_PATH.MANAGER_ONLY) {
    return WORKFLOW_STEPS.filter((step) => step.key !== "l2_approval");
  }
  return WORKFLOW_STEPS;
}

export function filterKaizenForListView(records, profile, listViewMode, statusFilter) {
  if (!Array.isArray(records) || !profile) return [];

  if (listViewMode === "pending_approval") {
    return records.filter((record) => isPendingApprovalFor(profile, record));
  }
  if (listViewMode === "approved_by_me") {
    return records.filter((record) => isApprovedByMe(profile, record));
  }

  let list = records.filter((record) => isOwnKaizen(record, profile));
  if (statusFilter && statusFilter !== "all") {
    list = list.filter((record) => statusMatchesListFilter(record.status, statusFilter));
  }
  return list;
}

export function filterKaizenForDashboard(records, profile) {
  if (!profile) return [];
  const role = normalizeRole(profile.role);
  if (role === "admin") return records;
  return records.filter((record) => isOwnKaizen(record, profile));
}

export function normalizeKaizenStatus(status) {
  if (status === "idea_new") return KAIZEN_STATUS.SUBMITTED;
  if (status === "report_done") return KAIZEN_STATUS.COMPLETED;
  if (status === KAIZEN_STATUS.L1_APPROVED) return KAIZEN_STATUS.L1_APPROVED;
  if (LIST_STATUS_FILTERS.includes(status)) return status;
  return KAIZEN_STATUS.SUBMITTED;
}

/** Ánh xạ trạng thái chi tiết sang bộ lọc danh sách sidebar. */
export function statusMatchesListFilter(status, filter) {
  const normalized = normalizeKaizenStatus(status);
  if (!filter || filter === "all") return true;
  if (filter === "submitted") return normalized === KAIZEN_STATUS.SUBMITTED || normalized === KAIZEN_STATUS.L1_APPROVED;
  if (filter === "approved") return normalized === KAIZEN_STATUS.APPROVED;
  if (filter === "in_progress") return normalized === KAIZEN_STATUS.IN_PROGRESS;
  if (filter === "completed") return normalized === KAIZEN_STATUS.COMPLETED;
  return normalized === filter;
}

export function getWorkflowStepIndex(status, approvalPath) {
  const path = normalizeApprovalPath(approvalPath);
  const s = normalizeKaizenStatus(status);

  if (path === APPROVAL_PATH.MANAGER_ONLY) {
    if (s === KAIZEN_STATUS.SUBMITTED) return 2;
    if (s === KAIZEN_STATUS.APPROVED || s === KAIZEN_STATUS.IN_PROGRESS) return 3;
    if (s === KAIZEN_STATUS.COMPLETED) return 4;
    return 2;
  }

  if (s === KAIZEN_STATUS.SUBMITTED) return 2;
  if (s === KAIZEN_STATUS.L1_APPROVED) return 3;
  if (s === KAIZEN_STATUS.APPROVED || s === KAIZEN_STATUS.IN_PROGRESS) return 4;
  if (s === KAIZEN_STATUS.COMPLETED) return 5;
  return 2;
}
