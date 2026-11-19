/**
 * Frontend Isolated Seed Data
 * Mirrors backend mock fixtures to enable instant client-side rendering.
 */

export interface DemoProject {
  id: string;
  name: string;
  language: string;
  description: string;
  status: "uploaded" | "scanning" | "ready" | "failed";
  bugCount: number;
  verificationLevel: string;
}

export const SEEDED_PROJECTS: DemoProject[] = [
  {
    id: "demo-proj-001",
    name: "Python Marks Calculator",
    language: "Python",
    description: "Student marks percentage calculator with unvalidated input bounds.",
    status: "ready",
    bugCount: 1,
    verificationLevel: "V4 Proven"
  },
  {
    id: "demo-proj-002",
    name: "JavaScript User Directory",
    language: "JavaScript",
    description: "User profile lookup with undefined property crash on empty records.",
    status: "ready",
    bugCount: 1,
    verificationLevel: "V3 Verified"
  },
  {
    id: "demo-proj-003",
    name: "C Memory Buffer Utility",
    language: "C",
    description: "Safe string copy utility with missing null-terminator byte.",
    status: "ready",
    bugCount: 1,
    verificationLevel: "V2 Executed"
  },
  {
    id: "demo-proj-004",
    name: "Student Assessment Dataset",
    language: "Dataset (CSV)",
    description: "Messy CSV with negative scores, missing values, and corrupted date formats.",
    status: "ready",
    bugCount: 3,
    verificationLevel: "V4 Proven"
  }
];
