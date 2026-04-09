export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const BATCH_YEARS = ["2021-25", "2022-26", "2023-27", "2024-28", "2025-29"];

export const SEMESTER_OPTIONS = [
  { value: "1", label: "1-1 SEMESTER-I" },
  { value: "2", label: "1-2 SEMESTER-II" },
  { value: "3", label: "2-1 SEMESTER-III" },
  { value: "4", label: "2-2 SEMESTER-IV" },
  { value: "5", label: "3-1 SEMESTER-V" },
  { value: "6", label: "3-2 SEMESTER-VI" },
  { value: "7", label: "4-1 SEMESTER-VII" },
  { value: "8", label: "4-2 SEMESTER-VIII" },
];

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const GRADE_ORDER = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];
