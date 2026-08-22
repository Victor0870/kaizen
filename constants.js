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

export const KAIZEN_STATUS = {
  SUBMITTED: "submitted",
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

export function normalizeKaizenStatus(status) {
  if (status === "idea_new") return KAIZEN_STATUS.SUBMITTED;
  if (status === "report_done") return KAIZEN_STATUS.COMPLETED;
  if (LIST_STATUS_FILTERS.includes(status)) return status;
  return KAIZEN_STATUS.SUBMITTED;
}
