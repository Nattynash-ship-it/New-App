/**
 * Degree-plan starter templates. These are editable starting points, NOT an
 * authoritative catalog — WGU revises course names, codes, and CU counts over
 * time, so the UI always frames this as "confirm against your official Degree
 * Plan." Codes use subject prefixes as placeholders you can replace.
 */

export interface TemplateCourse {
  code: string;
  name: string;
  credits: number; // WGU competency units
}

export interface DegreeTemplate {
  id: string;
  label: string;
  programName: string;
  totalCredits: number;
  courses: TemplateCourse[];
}

/** WGU Bachelor of Science, Computer Science — ~120 CUs. A representative
 *  starter set; reconcile against your live Degree Plan in the WGU portal. */
export const WGU_BSCS: DegreeTemplate = {
  id: "wgu_bscs",
  label: "WGU B.S. Computer Science",
  programName: "B.S. Computer Science",
  totalCredits: 120,
  courses: [
    // General education & math
    { code: "GEN", name: "Composition: Successful Self-Expression", credits: 3 },
    { code: "GEN", name: "Introduction to Communication", credits: 3 },
    { code: "GEN", name: "American Politics and the U.S. Constitution", credits: 3 },
    { code: "GEN", name: "Global Arts and Humanities", credits: 3 },
    { code: "MATH", name: "Applied Algebra", credits: 3 },
    { code: "MATH", name: "Applied Probability and Statistics", credits: 3 },
    { code: "MATH", name: "Calculus I", credits: 4 },
    { code: "MATH", name: "Discrete Mathematics I", credits: 4 },
    { code: "MATH", name: "Discrete Mathematics II", credits: 4 },
    { code: "SCI", name: "Natural Science Lab", credits: 4 },
    { code: "TECH", name: "Ethics in Technology", credits: 2 },
    // Core computer science
    { code: "CS", name: "Version Control", credits: 1 },
    { code: "CS", name: "Network and Security – Foundations", credits: 3 },
    { code: "CS", name: "Scripting and Programming – Foundations", credits: 3 },
    { code: "CS", name: "Scripting and Programming – Applications", credits: 4 },
    { code: "CS", name: "Data Management – Foundations", credits: 3 },
    { code: "CS", name: "Data Management – Applications", credits: 4 },
    { code: "CS", name: "Java Fundamentals", credits: 3 },
    { code: "CS", name: "Java Frameworks", credits: 3 },
    { code: "CS", name: "Advanced Java", credits: 3 },
    { code: "CS", name: "Data Structures and Algorithms I", credits: 4 },
    { code: "CS", name: "Data Structures and Algorithms II", credits: 4 },
    { code: "CS", name: "Computer Architecture", credits: 3 },
    { code: "CS", name: "Operating Systems for Programmers", credits: 3 },
    { code: "CS", name: "Software Engineering", credits: 3 },
    { code: "CS", name: "Software Design and Quality Assurance", credits: 3 },
    { code: "CS", name: "Secure Software Design", credits: 3 },
    { code: "CS", name: "Introduction to Artificial Intelligence", credits: 3 },
    { code: "CS", name: "Fundamentals of Information Security", credits: 3 },
    { code: "IT", name: "Business of IT – Applications", credits: 4 },
    { code: "CS", name: "Computer Science Capstone", credits: 4 },
  ],
};

export const DEGREE_TEMPLATES: DegreeTemplate[] = [WGU_BSCS];
