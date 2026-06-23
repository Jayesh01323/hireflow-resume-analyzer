// Framework-agnostic, pure functions for resume analysis.
// All functions are deterministic, side-effect free, and unit-testable.

export type SkillLevel = "beginner" | "intermediate" | "advanced" | null;

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  links: string[];
}

export interface SectionMap {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  projects: string[];
  certifications: string[];
  other: string[];
}

export interface ATSBreakdown {
  contact: number;     // 0-20
  skills: number;      // 0-25
  education: number;   // 0-15
  experience: number;  // 0-20
  projects: number;    // 0-10
  structure: number;   // 0-10
}

export interface ATSAnalysis {
  score: number;                       // 0-100
  breakdown: ATSBreakdown;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  suggestions: string[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)]+/gi;
const METRIC_RE = /\b\d+(?:\.\d+)?\s*%|\b(?:increased|improved|reduced|decreased|grew|saved|generated)\b[^.\n]{0,40}\b\d+/i;

const SKILL_DICTIONARY: string[] = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "React", "Next.js", "Angular", "Vue", "Svelte", "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI",
  "Spring", "Rails", "Laravel", "ASP.NET",
  "HTML", "CSS", "SASS", "LESS", "Tailwind", "Bootstrap", "Material UI",
  "SQL", "NoSQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Elasticsearch",
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "CI/CD",
  "Git", "GitHub", "GitLab", "Bitbucket", "Linux", "Bash",
  "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy", "Machine Learning", "Deep Learning",
  "Natural Language Processing", "Computer Vision", "Data Science", "Data Analysis",
  "REST API", "GraphQL", "gRPC", "WebSockets",
  "Firebase", "Supabase", "Redux", "MobX", "Zustand", "Jest", "Vitest", "Cypress", "Playwright",
  "Webpack", "Vite", "Babel", "ESLint", "Prettier", "Figma", "Adobe XD"
];

const SECTION_HEADERS: Record<keyof SectionMap, RegExp[]> = {
  summary: [
    /^\s*(professional\s+)?summary\b/i,
    /^\s*(career\s+)?objective\b/i,
    /^\s*profile\b/i,
  ],
  experience: [
    /^\s*(work\s+)?experience\b/i,
    /^\s*employment(\s+history)?\b/i,
    /^\s*professional\s+experience\b/i,
  ],
  education: [
    /^\s*education(al)?(\s+background)?\b/i,
    /^\s*academic(\s+background)?\b/i,
  ],
  skills: [
    /^\s*(technical\s+)?skills\b/i,
    /^\s*technologies\b/i,
    /^\s*tech(\s+stack)?\b/i,
    /^\s*core\s+competencies\b/i,
  ],
  projects: [
    /^\s*(personal\s+)?projects\b/i,
    /^\s*portfolio\b/i,
    /^\s*key\s+projects\b/i,
  ],
  certifications: [
    /^\s*certifications?\b/i,
    /^\s*licenses?\s*(and|&)\s*certifications?\b/i,
    /^\s*awards?\b/i,
  ],
  other: [],
};

function normalize(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function splitLines(text: string): string[] {
  return normalize(text)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function extractContactInfo(rawText: string): ContactInfo {
  const text = normalize(rawText);
  const emailMatch = text.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0] : null;

  // Find a phone anywhere in the text; prefer the first match with at least 10 digits.
  const phoneMatches = Array.from(text.matchAll(new RegExp(PHONE_RE.source, "g")));
  let phone: string | null = null;
  for (const m of phoneMatches) {
    const digits = (m[0].match(/\d/g) || []).length;
    if (digits >= 10) { phone = m[0].trim(); break; }
  }
  if (!phone && phoneMatches.length > 0) phone = phoneMatches[0][0].trim();

  const links = Array.from(new Set((text.match(URL_RE) || []).map((l) => l.replace(/[),.]+$/, ""))));

  // Name heuristic: first non-empty, short line that looks like a personal name,
  // is not an email/URL, and is composed of 2-4 capitalized words.
  const lines = splitLines(text);
  let name: string | null = null;
  for (const line of lines.slice(0, 12)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (line.length > 60) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (words.every((w) => /^[A-Z][a-zA-Z'.-]+$/.test(w))) {
      name = words.join(" ");
      break;
    }
  }

  // Fallback: If name not found in lines, try to extract from the beginning of text
  // by looking for 2-4 capitalized words before the first email/phone/URL
  if (!name) {
    const firstEmailIndex = emailMatch ? text.indexOf(emailMatch[0]) : -1;
    const firstPhoneIndex = phoneMatches.length > 0 ? text.indexOf(phoneMatches[0][0]) : -1;
    const urlMatch = text.match(URL_RE);
    const firstUrlIndex = urlMatch ? text.indexOf(urlMatch[0]) : -1;
    
    const firstContactIndex = Math.min(
      firstEmailIndex !== -1 ? firstEmailIndex : Infinity,
      firstPhoneIndex !== -1 ? firstPhoneIndex : Infinity,
      firstUrlIndex !== -1 ? firstUrlIndex : Infinity
    );
    
    if (firstContactIndex !== Infinity && firstContactIndex > 0) {
      const beforeContact = text.substring(0, firstContactIndex).trim();
      const words = beforeContact.split(/\s+/);
      // Try to find 2-4 consecutive capitalized words at the start
      // Stop if we encounter common job title words
      const jobTitleWords = ["Engineer", "Developer", "Manager", "Director", "Specialist", "Analyst", "Consultant", "Architect", "Lead", "Senior", "Junior", "Principal", "VP", "Vice", "President", "CEO", "CTO", "CFO"];
      
      for (let i = 0; i < words.length; i++) {
        const potentialName = [];
        for (let j = i; j < Math.min(i + 4, words.length); j++) {
          const word = words[j];
          if (/^[A-Z][a-zA-Z'.-]+$/.test(word)) {
            // Stop if we hit a job title word
            if (jobTitleWords.some(jt => word.includes(jt))) {
              break;
            }
            potentialName.push(word);
          } else {
            break;
          }
        }
        if (potentialName.length >= 2 && potentialName.length <= 4) {
          name = potentialName.join(" ");
          break;
        }
      }
    }
  }

  return { name, email, phone, links };
}

function classifyHeader(line: string): keyof SectionMap | null {
  for (const key of Object.keys(SECTION_HEADERS) as (keyof SectionMap)[]) {
    if (key === "other") continue;
    for (const re of SECTION_HEADERS[key]) {
      if (re.test(line)) return key;
    }
  }
  return null;
}

export function detectSections(rawText: string): SectionMap {
  // First try line-by-line detection (for properly formatted text)
  const lines = splitLines(rawText);
  const out: SectionMap = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: [],
  };

  let current: keyof SectionMap = "other";
  for (const line of lines) {
    // Header lines are typically short and may be ALL CAPS or end with a colon.
    const stripped = line.replace(/[:\s]+$/g, "");
    const header = classifyHeader(stripped) || classifyHeader(line);
    if (header) {
      current = header;
      continue;
    }
    out[current].push(line);
  }

  // If most sections are empty, try regex-based section extraction
  // This handles cases where PDF extraction produces single-line text
  const nonEmptySections = Object.keys(out).filter(k => k !== "other" && out[k as keyof SectionMap].length > 0).length;
  if (nonEmptySections < 3) {
    return detectSectionsByRegex(rawText);
  }

  return out;
}

function detectSectionsByRegex(rawText: string): SectionMap {
  const out: SectionMap = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: [],
  };

  const text = normalize(rawText);
  
  // Define section patterns in order (longer patterns first to avoid partial matches)
  // Use word boundaries to avoid matching section headers within content
  const sectionPatterns = [
    { key: "summary" as keyof SectionMap, patterns: [/\bprofessional\s+summary\b/gi, /\bcareer\s+objective\b/gi, /\bobjective\b/gi, /\bprofile\b/gi, /\bsummary\b/gi] },
    { key: "skills" as keyof SectionMap, patterns: [/\btechnical\s+skills\b/gi, /\btech\s+stack\b/gi, /\bcore\s+competencies\b/gi, /\btechnologies\b/gi, /\bskills\b/gi] },
    { key: "experience" as keyof SectionMap, patterns: [/\bwork\s+experience\b/gi, /\bprofessional\s+experience\b/gi, /\bemployment\b/gi, /\bexperience\b/gi] },
    { key: "education" as keyof SectionMap, patterns: [/\beducational\s+background\b/gi, /\bacademic\s+background\b/gi, /\beducation\b/gi] },
    { key: "projects" as keyof SectionMap, patterns: [/\bpersonal\s+projects\b/gi, /\bkey\s+projects\b/gi, /\bportfolio\b/gi, /\bprojects\b/gi] },
    { key: "certifications" as keyof SectionMap, patterns: [/\bcertifications\b/gi, /\blicenses\b/gi, /\bawards\b/gi] },
  ];

  // Find all section header positions
  const sectionPositions: Array<{ key: keyof SectionMap; position: number; matchLength: number }> = [];
  
  for (const section of sectionPatterns) {
    for (const pattern of section.patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        sectionPositions.push({ key: section.key, position: match.index, matchLength: match[0].length });
      }
    }
  }

  // Sort by position
  sectionPositions.sort((a, b) => a.position - b.position);

  // Deduplicate: keep only the first occurrence of each section type
  const seenKeys = new Set<keyof SectionMap>();
  const uniqueSectionPositions: Array<{ key: keyof SectionMap; position: number; matchLength: number }> = [];
  for (const section of sectionPositions) {
    if (!seenKeys.has(section.key)) {
      seenKeys.add(section.key);
      uniqueSectionPositions.push(section);
    }
  }

  // Extract content between sections
  for (let i = 0; i < uniqueSectionPositions.length; i++) {
    const currentSection = uniqueSectionPositions[i];
    const nextSection = uniqueSectionPositions[i + 1];
    
    // Skip the entire matched header text
    const headerEnd = currentSection.position + currentSection.matchLength;
    const endPos = nextSection ? nextSection.position : text.length;
    
    const sectionText = text.substring(headerEnd, endPos).trim();
    const lines = splitLines(sectionText);
    
    // Filter out lines that look like section headers
    const filteredLines = lines.filter(line => {
      const stripped = line.replace(/[:\s]+$/g, "");
      return !classifyHeader(stripped) && !classifyHeader(line);
    });
    
    out[currentSection.key] = filteredLines;
  }

  // Any text before the first section goes to "other"
  if (sectionPositions.length > 0) {
    const beforeFirstSection = text.substring(0, sectionPositions[0].position).trim();
    if (beforeFirstSection) {
      out.other = splitLines(beforeFirstSection);
    }
  } else {
    out.other = splitLines(text);
  }

  return out;
}

function detectSkillLevel(contextLine: string, skillName: string): SkillLevel {
  const lower = contextLine.toLowerCase();
  const around = lower.split(skillName.toLowerCase());
  const window = (around[0]?.slice(-30) || "") + " " + (around[1]?.slice(0, 30) || "");
  if (/(expert|advanced|senior|lead|principal)/.test(window)) return "advanced";
  if (/(intermediate|proficient|strong|solid|experienced)/.test(window)) return "intermediate";
  if (/(beginner|basic|familiar|exposure|learning)/.test(window)) return "beginner";
  return null;
}

function extractSkillsFromSection(skillsLines: string[], allText: string): Skill[] {
  const found = new Map<string, Skill>();
  const lowerAll = allText.toLowerCase();

  // First pass: skills that appear in the skills section with possible levels.
  for (const line of skillsLines) {
    for (const skill of SKILL_DICTIONARY) {
      const re = new RegExp(`\\b${skill.replace(/[.+]/g, "\\$&")}\\b`, "i");
      if (re.test(line) && !found.has(skill)) {
        found.set(skill, { name: skill, level: detectSkillLevel(line, skill) });
      }
    }
  }

  // Second pass: skills found anywhere else.
  for (const skill of SKILL_DICTIONARY) {
    if (found.has(skill)) continue;
    const re = new RegExp(`\\b${skill.replace(/[.+]/g, "\\$&")}\\b`, "i");
    if (re.test(lowerAll)) {
      found.set(skill, { name: skill, level: null });
    }
  }

  return Array.from(found.values());
}

export function findMissingSkills(
  rawText: string,
  roleKeywords: string[] = DEFAULT_ROLE_KEYWORDS
): { present: Skill[]; missing: string[] } {
  const sections = detectSections(rawText);
  const present = extractSkillsFromSection(sections.skills, rawText);
  const lower = rawText.toLowerCase();
  const missing = roleKeywords.filter((kw) => !new RegExp(`\\b${kw}\\b`, "i").test(lower));
  return { present, missing };
}

export const DEFAULT_ROLE_KEYWORDS: string[] = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL",
  "Git", "Docker", "AWS", "REST API", "Testing", "Agile",
];

export function scoreATS(rawText: string): ATSAnalysis {
  const contact = extractContactInfo(rawText);
  const sections = detectSections(rawText);
  const skills = extractSkillsFromSection(sections.skills, rawText);
  const allSectionText =
    sections.summary.join(" ") + " " +
    sections.experience.join(" ") + " " +
    sections.education.join(" ") + " " +
    sections.projects.join(" ") + " " +
    sections.certifications.join(" ");

  const breakdown: ATSBreakdown = {
    contact: 0,
    skills: 0,
    education: 0,
    experience: 0,
    projects: 0,
    structure: 0,
  };

  // Contact (0-20)
  if (contact.email) breakdown.contact += 8;
  if (contact.phone) breakdown.contact += 6;
  if (contact.name) breakdown.contact += 6;

  // Skills (0-25)
  if (skills.length >= 8) breakdown.skills = 25;
  else if (skills.length >= 5) breakdown.skills = 20;
  else if (skills.length >= 3) breakdown.skills = 15;
  else if (skills.length >= 1) breakdown.skills = 8;

  // Education (0-15)
  if (sections.education.length > 0) breakdown.education = 15;

  // Experience (0-20)
  if (sections.experience.length > 0) {
    breakdown.experience = 14;
    if (METRIC_RE.test(allSectionText)) breakdown.experience += 6;
  }

  // Projects (0-10)
  if (sections.projects.length > 0) breakdown.projects = 10;

  // Structure (0-10): summary, certifications, links, and recognisable section headers.
  let structure = 0;
  if (sections.summary.length > 0) structure += 3;
  if (sections.certifications.length > 0) structure += 3;
  if (contact.links.length > 0) structure += 2;
  const headerHits = (Object.keys(sections) as (keyof SectionMap)[])
    .filter((k) => k !== "other" && sections[k].length > 0).length;
  if (headerHits >= 4) structure += 2;
  breakdown.structure = Math.min(10, structure);

  const score = Math.min(100,
    breakdown.contact + breakdown.skills + breakdown.education +
    breakdown.experience + breakdown.projects + breakdown.structure
  );

  return {
    score,
    breakdown,
    ...buildNarrative({ contact, sections, skills, allSectionText, score }),
  };
}

interface NarrativeInput {
  contact: ContactInfo;
  sections: SectionMap;
  skills: Skill[];
  allSectionText: string;
  score: number;
}

function buildNarrative(input: NarrativeInput): {
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  suggestions: string[];
} {
  const { contact, sections, skills, allSectionText, score } = input;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingSections: string[] = [];
  const suggestions: string[] = [];

  if (contact.email) strengths.push("Email address provided");
  else { missingSections.push("Email Address"); suggestions.push("Add a professional email address at the top of your resume."); }

  if (contact.phone) strengths.push("Phone number provided");
  else { missingSections.push("Phone Number"); suggestions.push("Add a contact phone number."); }

  if (contact.name) strengths.push("Name clearly identified");
  else { missingSections.push("Name"); suggestions.push("Place your full name prominently in the header."); }

  if (skills.length > 0) {
    strengths.push(`${skills.length} relevant skill${skills.length === 1 ? "" : "s"} detected`);
  } else {
    weaknesses.push("No technical skills detected");
    suggestions.push("Add a dedicated skills section with specific technologies.");
  }

  if (sections.education.length > 0) {
    strengths.push("Education information present");
  } else {
    missingSections.push("Education");
    suggestions.push("Add your educational background (degree, institution, year).");
  }

  if (sections.experience.length > 0) {
    strengths.push("Work experience listed");
    if (METRIC_RE.test(allSectionText)) {
      strengths.push("Quantifiable achievements included");
    } else {
      weaknesses.push("Experience lacks measurable impact");
      suggestions.push("Add metrics (e.g., \"Improved load time by 35%\") to your experience bullets.");
    }
  } else {
    missingSections.push("Work Experience");
    suggestions.push("Add relevant work experience with bullet points describing impact.");
  }

  if (sections.projects.length === 0) {
    missingSections.push("Projects");
    suggestions.push("Showcase 2-4 projects with tech stack and outcomes.");
  } else {
    strengths.push("Project experience included");
  }

  if (sections.summary.length === 0) {
    missingSections.push("Professional Summary");
    suggestions.push("Open with a 2-3 line professional summary tailored to the role.");
  }

  if (sections.certifications.length === 0) {
    suggestions.push("List relevant certifications (AWS, Google Cloud, etc.) to boost credibility.");
  }

  if (contact.links.length === 0) {
    suggestions.push("Include links to GitHub, LinkedIn, or a portfolio site.");
  }

  if (score >= 85) strengths.push("Well-optimized resume for ATS systems");
  else if (score >= 70) suggestions.push("Your resume is good but could be tightened further.");
  else if (score >= 50) suggestions.push("Your resume has room for improvement in several areas.");
  else suggestions.push("Your resume needs significant improvement for ATS systems.");

  return { strengths, weaknesses, missingSections, suggestions };
}

export function generateSuggestions(rawText: string): string[] {
  return scoreATS(rawText).suggestions;
}

// Convenience aggregator for UI consumers that want everything in one call.
export function analyzeResume(rawText: string) {
  const contact = extractContactInfo(rawText);
  const sections = detectSections(rawText);
  const skills = extractSkillsFromSection(sections.skills, rawText);
  const ats = scoreATS(rawText);
  const { present, missing } = findMissingSkills(rawText);
  return { contact, sections, skills, ats, present, missing };
}
