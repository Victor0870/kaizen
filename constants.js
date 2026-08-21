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
  IDEA: "idea_new",
  REPORT: "report_done"
};
