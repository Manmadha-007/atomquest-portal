import { CycleDef, QS } from "./types";

export const cycles: CycleDef[] = [
  {
    key: "q4_25", idx: 101,
    name: "Q4 2025 Annual Execution Review",
    year: 2025, quarter: 4,
    status: QS.COMPLETED,
    start: "2025-10-01", end: "2025-12-31",
    subDeadline: "2025-12-20", lockDate: "2026-01-05",
    active: false,
  },
  {
    key: "q1_26", idx: 102,
    name: "Q1 2026 Strategic Planning Cycle",
    year: 2026, quarter: 1,
    status: QS.COMPLETED,
    start: "2026-01-01", end: "2026-03-31",
    subDeadline: "2026-03-20", lockDate: "2026-04-05",
    active: false,
  },
  {
    key: "q2_26", idx: 103,
    name: "Q2 2026 Strategic Execution Cycle",
    year: 2026, quarter: 2,
    status: QS.ON_TRACK,
    start: "2026-04-01", end: "2026-06-30",
    subDeadline: "2026-06-25", lockDate: "2026-07-05",
    active: true,
  },
];
