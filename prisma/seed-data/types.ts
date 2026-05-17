import {
  GoalMeasurementType as M,
  GoalStatus as S,
  QuarterlyStatus as QS,
  UserRole,
} from "@prisma/client";

export { M, S, QS, UserRole };

export const uuid = (v: number) =>
  `00000000-0000-4000-8000-${v.toString().padStart(12, "0")}`;

export const dt = (v: string) => new Date(`${v}T09:00:00.000Z`);

export type CycleKey = "q4_25" | "q1_26" | "q2_26";

export type UserDef = {
  idx: number;
  empNo: string;
  email: string;
  first: string;
  last: string;
  title: string;
  dept: string;
  role: UserRole;
  mgrIdx?: number;
  active?: boolean;
};

export type GoalDef = {
  idx: number;
  ownerIdx: number;
  creatorIdx: number;
  cycle: CycleKey;
  shared?: boolean;
  sharedGroup?: string;
  parentIdx?: number;
  title: string;
  desc: string;
  thrust: string;
  meas: M;
  unit?: string;
  start?: string;
  target?: string;
  current?: string;
  timeline?: string;
  weight: number;
  pri: number;
  status: S;
  subAt?: string;
  appAt?: string;
  rejAt?: string;
  lockAt?: string;
};

export type CycleDef = {
  key: CycleKey;
  idx: number;
  name: string;
  year: number;
  quarter: number;
  status: QS;
  start: string;
  end: string;
  subDeadline: string;
  lockDate: string;
  active: boolean;
};
