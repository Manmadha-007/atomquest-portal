import { UserDef, UserRole } from "./types";

const R = UserRole;

// Admins: idx 1-2, Managers: idx 3-8, Employees: idx 9-38
export const users: UserDef[] = [
  // ─── ADMINS ───
  { idx: 1, empNo: "AQ-0001", email: "admin@atomquest.io", first: "Vikram", last: "Sharma", title: "Chief of Staff & Platform Administrator", dept: "Executive", role: R.ADMIN },
  { idx: 2, empNo: "AQ-0002", email: "governance@atomquest.io", first: "Nadia", last: "Al-Rashid", title: "Director of Governance & Compliance", dept: "Executive", role: R.ADMIN },

  // ─── MANAGERS ───
  { idx: 3, empNo: "AQ-0100", email: "sarah.chen@atomquest.io", first: "Sarah", last: "Chen", title: "VP, Product Engineering", dept: "Product Engineering", role: R.MANAGER, mgrIdx: 1 },
  { idx: 4, empNo: "AQ-0101", email: "michael.torres@atomquest.io", first: "Michael", last: "Torres", title: "Director, Infrastructure & Reliability", dept: "Infrastructure", role: R.MANAGER, mgrIdx: 1 },
  { idx: 5, empNo: "AQ-0102", email: "priya.raman@atomquest.io", first: "Priya", last: "Raman", title: "Head of AI Research", dept: "AI Research", role: R.MANAGER, mgrIdx: 1 },
  { idx: 6, empNo: "AQ-0103", email: "daniel.brooks@atomquest.io", first: "Daniel", last: "Brooks", title: "Director, Security & Compliance", dept: "Security & Compliance", role: R.MANAGER, mgrIdx: 2 },
  { idx: 7, empNo: "AQ-0104", email: "olivia.carter@atomquest.io", first: "Olivia", last: "Carter", title: "VP, Revenue Operations", dept: "Revenue Operations", role: R.MANAGER, mgrIdx: 2 },
  { idx: 8, empNo: "AQ-0105", email: "ethan.walker@atomquest.io", first: "Ethan", last: "Walker", title: "Director, Customer Success", dept: "Customer Success", role: R.MANAGER, mgrIdx: 2 },

  // ─── PRODUCT ENGINEERING (manager: Sarah Chen, idx 3) ───
  { idx: 9, empNo: "AQ-1001", email: "arjun.patel@atomquest.io", first: "Arjun", last: "Patel", title: "Senior Platform Engineer", dept: "Product Engineering", role: R.EMPLOYEE, mgrIdx: 3 },
  { idx: 10, empNo: "AQ-1002", email: "sophia.kim@atomquest.io", first: "Sophia", last: "Kim", title: "Full-Stack Developer", dept: "Product Engineering", role: R.EMPLOYEE, mgrIdx: 3 },
  { idx: 11, empNo: "AQ-1003", email: "liam.anderson@atomquest.io", first: "Liam", last: "Anderson", title: "Backend Engineer", dept: "Product Engineering", role: R.EMPLOYEE, mgrIdx: 3 },
  { idx: 12, empNo: "AQ-1004", email: "emma.rodriguez@atomquest.io", first: "Emma", last: "Rodriguez", title: "Frontend Engineer", dept: "Product Engineering", role: R.EMPLOYEE, mgrIdx: 3 },
  { idx: 13, empNo: "AQ-1005", email: "noah.bennett@atomquest.io", first: "Noah", last: "Bennett", title: "DevOps Engineer", dept: "Product Engineering", role: R.EMPLOYEE, mgrIdx: 3 },

  // ─── INFRASTRUCTURE (manager: Michael Torres, idx 4) ───
  { idx: 14, empNo: "AQ-1006", email: "rohan.mehta@atomquest.io", first: "Rohan", last: "Mehta", title: "Site Reliability Engineer", dept: "Infrastructure", role: R.EMPLOYEE, mgrIdx: 4 },
  { idx: 15, empNo: "AQ-1007", email: "grace.thompson@atomquest.io", first: "Grace", last: "Thompson", title: "Cloud Infrastructure Engineer", dept: "Infrastructure", role: R.EMPLOYEE, mgrIdx: 4 },
  { idx: 16, empNo: "AQ-1008", email: "lucas.hall@atomquest.io", first: "Lucas", last: "Hall", title: "Systems Engineer", dept: "Infrastructure", role: R.EMPLOYEE, mgrIdx: 4 },
  { idx: 17, empNo: "AQ-1009", email: "mia.johnson@atomquest.io", first: "Mia", last: "Johnson", title: "Infrastructure Automation Lead", dept: "Infrastructure", role: R.EMPLOYEE, mgrIdx: 4 },
  { idx: 18, empNo: "AQ-1010", email: "james.rivera@atomquest.io", first: "James", last: "Rivera", title: "Network Operations Engineer", dept: "Infrastructure", role: R.EMPLOYEE, mgrIdx: 4 },

  // ─── AI RESEARCH (manager: Priya Raman, idx 5) ───
  { idx: 19, empNo: "AQ-1011", email: "ava.wilson@atomquest.io", first: "Ava", last: "Wilson", title: "ML Research Engineer", dept: "AI Research", role: R.EMPLOYEE, mgrIdx: 5 },
  { idx: 20, empNo: "AQ-1012", email: "david.chang@atomquest.io", first: "David", last: "Chang", title: "NLP Research Scientist", dept: "AI Research", role: R.EMPLOYEE, mgrIdx: 5 },
  { idx: 21, empNo: "AQ-1013", email: "isabella.nguyen@atomquest.io", first: "Isabella", last: "Nguyen", title: "Data Scientist", dept: "AI Research", role: R.EMPLOYEE, mgrIdx: 5 },
  { idx: 22, empNo: "AQ-1014", email: "ryan.foster@atomquest.io", first: "Ryan", last: "Foster", title: "ML Platform Engineer", dept: "AI Research", role: R.EMPLOYEE, mgrIdx: 5 },
  { idx: 23, empNo: "AQ-1015", email: "chloe.martinez@atomquest.io", first: "Chloe", last: "Martinez", title: "AI Evaluation Specialist", dept: "AI Research", role: R.EMPLOYEE, mgrIdx: 5 },

  // ─── SECURITY & COMPLIANCE (manager: Daniel Brooks, idx 6) ───
  { idx: 24, empNo: "AQ-1016", email: "aiden.cooper@atomquest.io", first: "Aiden", last: "Cooper", title: "Security Engineer", dept: "Security & Compliance", role: R.EMPLOYEE, mgrIdx: 6 },
  { idx: 25, empNo: "AQ-1017", email: "hannah.lee@atomquest.io", first: "Hannah", last: "Lee", title: "Compliance Analyst", dept: "Security & Compliance", role: R.EMPLOYEE, mgrIdx: 6 },
  { idx: 26, empNo: "AQ-1018", email: "nathan.scott@atomquest.io", first: "Nathan", last: "Scott", title: "Penetration Testing Lead", dept: "Security & Compliance", role: R.EMPLOYEE, mgrIdx: 6 },
  { idx: 27, empNo: "AQ-1019", email: "zara.ahmed@atomquest.io", first: "Zara", last: "Ahmed", title: "GRC Specialist", dept: "Security & Compliance", role: R.EMPLOYEE, mgrIdx: 6 },
  { idx: 28, empNo: "AQ-1020", email: "marcus.williams@atomquest.io", first: "Marcus", last: "Williams", title: "Security Operations Analyst", dept: "Security & Compliance", role: R.EMPLOYEE, mgrIdx: 6 },

  // ─── REVENUE OPERATIONS (manager: Olivia Carter, idx 7) ───
  { idx: 29, empNo: "AQ-1021", email: "taylor.morrison@atomquest.io", first: "Taylor", last: "Morrison", title: "Sales Operations Analyst", dept: "Revenue Operations", role: R.EMPLOYEE, mgrIdx: 7 },
  { idx: 30, empNo: "AQ-1022", email: "jasmine.patel@atomquest.io", first: "Jasmine", last: "Patel", title: "Revenue Analyst", dept: "Revenue Operations", role: R.EMPLOYEE, mgrIdx: 7 },
  { idx: 31, empNo: "AQ-1023", email: "brandon.cruz@atomquest.io", first: "Brandon", last: "Cruz", title: "Forecasting Specialist", dept: "Revenue Operations", role: R.EMPLOYEE, mgrIdx: 7 },
  { idx: 32, empNo: "AQ-1024", email: "rachel.kim@atomquest.io", first: "Rachel", last: "Kim", title: "Deal Desk Manager", dept: "Revenue Operations", role: R.EMPLOYEE, mgrIdx: 7 },
  { idx: 33, empNo: "AQ-1025", email: "derek.chen@atomquest.io", first: "Derek", last: "Chen", title: "Business Intelligence Analyst", dept: "Revenue Operations", role: R.EMPLOYEE, mgrIdx: 7 },

  // ─── CUSTOMER SUCCESS (manager: Ethan Walker, idx 8) ───
  { idx: 34, empNo: "AQ-1026", email: "samantha.brooks@atomquest.io", first: "Samantha", last: "Brooks", title: "Enterprise Customer Success Manager", dept: "Customer Success", role: R.EMPLOYEE, mgrIdx: 8 },
  { idx: 35, empNo: "AQ-1027", email: "kevin.tran@atomquest.io", first: "Kevin", last: "Tran", title: "Onboarding Specialist", dept: "Customer Success", role: R.EMPLOYEE, mgrIdx: 8 },
  { idx: 36, empNo: "AQ-1028", email: "diana.flores@atomquest.io", first: "Diana", last: "Flores", title: "Renewal Manager", dept: "Customer Success", role: R.EMPLOYEE, mgrIdx: 8 },
  { idx: 37, empNo: "AQ-1029", email: "chris.anderson@atomquest.io", first: "Chris", last: "Anderson", title: "Technical Account Manager", dept: "Customer Success", role: R.EMPLOYEE, mgrIdx: 8 },
  { idx: 38, empNo: "AQ-1030", email: "priya.singh@atomquest.io", first: "Priya", last: "Singh", title: "Customer Insights Analyst", dept: "Customer Success", role: R.EMPLOYEE, mgrIdx: 8 },
];
