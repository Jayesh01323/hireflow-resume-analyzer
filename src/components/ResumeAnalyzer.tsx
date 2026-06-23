"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, ArrowLeft, Download, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import {
  extractContactInfo,
  detectSections,
  scoreATS,
  findMissingSkills,
  generateSuggestions,
  type ATSAnalysis,
  type Skill,
} from "@/lib/analyzer";

// Set up PDF.js worker from public folder (no CDN dependency, works offline)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  links: string[];
  skills: Skill[];
  education: string[];
  projects: string[];
  experience: string[];
  summary: string[];
  certifications: string[];
  missingSkills: string[];
}

export default function ResumeAnalyzer({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const analyzeResume = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Extract text from PDF
      const text = await extractTextFromPDF(file);
      // Real rule-based analysis powered by src/lib/analyzer.ts
      const contact = extractContactInfo(text);
      const sections = detectSections(text);
      const { present, missing } = findMissingSkills(text);
      const ats = scoreATS(text);

      const parsed: ParsedResume = {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        links: contact.links,
        skills: present,
        education: sections.education,
        projects: sections.projects,
        experience: sections.experience,
        summary: sections.summary,
        certifications: sections.certifications,
        missingSkills: missing,
      };
      setParsedResume(parsed);
      setAtsAnalysis(ats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    console.log("[PDF Extraction] Starting extraction for file:", file.name);
    console.log("[PDF Extraction] File size:", file.size, "bytes");
    console.log("[PDF Extraction] File type:", file.type);

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log("[PDF Extraction] ArrayBuffer created, size:", arrayBuffer.byteLength);

      console.log("[PDF Extraction] Loading PDF document...");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log("[PDF Extraction] PDF loaded successfully, pages:", pdf.numPages);

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`[PDF Extraction] Processing page ${i}/${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str: string }) => item.str)
          .join(" ");
        fullText += pageText + "\n";
        console.log(`[PDF Extraction] Page ${i} extracted, text length:`, pageText.length);
      }

      console.log("[PDF Extraction] Extraction complete, total text length:", fullText.length);

      if (fullText.trim().length === 0) {
        throw new Error("PDF parser returned empty text - the PDF may be image-based or password-protected");
      }

      return fullText;
    } catch (error) {
      console.error("[PDF Extraction] Error occurred:", error);
      if (error instanceof Error) {
        console.error("[PDF Extraction] Error message:", error.message);
        console.error("[PDF Extraction] Error stack:", error.stack);
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
      throw new Error("Failed to extract text from PDF. Please ensure it's a valid PDF file.");
    }
  };

  const _unused_parseResumeText = (text: string): ParsedResume => {
    void text;
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);

    // Extract email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const email = lines.find(line => emailRegex.test(line)) || null;

    // Extract phone
    const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/;
    const phone = lines.find(line => phoneRegex.test(line)) || null;

    // Extract name (first line that's not email/phone and looks like a name)
    const name = lines.find(line => {
      if (emailRegex.test(line) || phoneRegex.test(line)) return false;
      if (line.length > 50) return false;
      if (line.includes("@") || line.includes("http")) return false;
      // Check if it looks like a name (2-4 words, each starting with capital)
      const words = line.split(" ");
      if (words.length < 2 || words.length > 4) return false;
      return words.every(word => /^[A-Z][a-z]+$/.test(word));
    }) || null;

    // Extract skills
    const techSkills = [
      "Python", "JavaScript", "Java", "C++", "C#", "React", "Angular", "Vue", "Node.js",
      "TypeScript", "SQL", "MongoDB", "PostgreSQL", "AWS", "Azure", "Docker", "Kubernetes",
      "Git", "Linux", "HTML", "CSS", "Tailwind", "Next.js", "Express", "Flask", "Django",
      "TensorFlow", "PyTorch", "Machine Learning", "AI", "Data Science", "REST API", "GraphQL",
      "Firebase", "Redux", "Jest", "Webpack", "Babel", "SASS", "LESS", "jQuery", "Bootstrap"
    ];

    const foundSkills: Array<{ name: string; level?: string | null }> = [];
    const skillKeywords = ["skill", "technologies", "tech stack", "proficient", "experience with"];

    let inSkillsSection = false;
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (skillKeywords.some(keyword => lowerLine.includes(keyword))) {
        inSkillsSection = true;
        continue;
      }

      if (inSkillsSection) {
        if (line.length < 3) continue;
        for (const skill of techSkills) {
          if (lowerLine.includes(skill.toLowerCase()) && !foundSkills.find(s => s.name === skill)) {
            foundSkills.push({ name: skill, level: null });
          }
        }
      }

      // Also search entire text for skills
      for (const skill of techSkills) {
        if (lowerLine.includes(skill.toLowerCase()) && !foundSkills.find(s => s.name === skill)) {
          foundSkills.push({ name: skill, level: null });
        }
      }
    }

    // Extract education
    const educationKeywords = ["education", "university", "college", "school", "degree", "bachelor", "master", "phd"];
    const education: string[] = [];
    let inEducationSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
        inEducationSection = true;
        continue;
      }

      if (inEducationSection && line.length > 10 && line.length < 200) {
        if (!educationKeywords.some(k => lowerLine.includes(k)) &&
            !lowerLine.includes("experience") &&
            !lowerLine.includes("project")) {
          education.push(line);
        }
      }
    }

    // Extract projects
    const projectKeywords = ["project", "portfolio", "built", "developed", "created"];
    const projects: string[] = [];
    let inProjectSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (projectKeywords.some(keyword => lowerLine.includes(keyword))) {
        inProjectSection = true;
        if (line.length > 10 && line.length < 200) {
          projects.push(line);
        }
        continue;
      }

      if (inProjectSection && line.length > 10 && line.length < 200) {
        if (!lowerLine.includes("experience") && !lowerLine.includes("education")) {
          projects.push(line);
        }
      }
    }

    // Extract experience
    const experienceKeywords = ["experience", "work", "job", "intern", "position", "role"];
    const experience: string[] = [];
    let inExperienceSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (experienceKeywords.some(keyword => lowerLine.includes(keyword))) {
        inExperienceSection = true;
        if (line.length > 10 && line.length < 200) {
          experience.push(line);
        }
        continue;
      }

      if (inExperienceSection && line.length > 10 && line.length < 200) {
        if (!lowerLine.includes("education") && !lowerLine.includes("project")) {
          experience.push(line);
        }
      }
    }

    return {
      name,
      email,
      phone,
      skills: foundSkills.length > 0 ? foundSkills : [{ name: "No specific skills detected", level: null }],
      education: education.length > 0 ? education.slice(0, 5) : ["No education information detected"],
      projects: projects.length > 0 ? projects.slice(0, 5) : ["No projects detected"],
      experience: experience.length > 0 ? experience.slice(0, 5) : ["No experience detected"],
    };
  };

  const generateATSAnalysis = (resume: ParsedResume): ATSAnalysis => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const missingSections: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check contact information (20 points)
    if (resume.email) {
      score += 7;
      strengths.push("Email address provided");
    } else {
      missingSections.push("Email Address");
      weaknesses.push("No email address found");
      suggestions.push("Add a professional email address");
    }

    if (resume.phone) {
      score += 7;
      strengths.push("Phone number provided");
    } else {
      missingSections.push("Phone Number");
      weaknesses.push("No phone number found");
      suggestions.push("Add a contact phone number");
    }

    if (resume.name) {
      score += 6;
      strengths.push("Name clearly identified");
    } else {
      missingSections.push("Name");
      weaknesses.push("Name not clearly identified");
      suggestions.push("Ensure your name is prominently displayed");
    }

    // Check skills (25 points)
    if (resume.skills.length > 0 && !resume.skills[0].name.includes("No specific")) {
      score += Math.min(25, resume.skills.length * 5);
      strengths.push(`Technical skills identified (${resume.skills.length} skills)`);
    } else {
      weaknesses.push("No technical skills detected");
      suggestions.push("Add a dedicated skills section with relevant technologies");
    }

    // Check education (20 points)
    if (resume.education.length > 0 && !resume.education[0].includes("No education")) {
      score += 20;
      strengths.push("Education information provided");
    } else {
      missingSections.push("Education");
      weaknesses.push("No education information detected");
      suggestions.push("Add your educational background and qualifications");
    }

    // Check experience (20 points)
    if (resume.experience.length > 0 && !resume.experience[0].includes("No experience")) {
      score += 20;
      strengths.push("Work experience listed");

      // Check for metrics in experience
      const hasMetrics = resume.experience.some(exp =>
        /\d+%|\d+ percent|\d+ increased|\d+ improved|\d+ reduced/i.test(exp)
      );
      if (hasMetrics) {
        strengths.push("Quantifiable achievements included");
      } else {
        weaknesses.push("Experience lacks specific metrics");
        suggestions.push("Add quantifiable achievements (e.g., 'Improved performance by 30%')");
      }
    } else {
      missingSections.push("Work Experience");
      weaknesses.push("No work experience detected");
      suggestions.push("Add your work experience with details about roles and responsibilities");
    }

    // Check projects (15 points)
    if (resume.projects.length > 0 && !resume.projects[0].includes("No projects")) {
      score += 15;
      strengths.push("Project experience included");
    } else {
      missingSections.push("Projects");
      weaknesses.push("No projects detected");
      suggestions.push("Add relevant projects to showcase your skills");
    }

    // Check for common missing sections
    const text = resume.education.join(" ") + resume.experience.join(" ") + resume.projects.join(" ");
    const lowerText = text.toLowerCase();

    if (!lowerText.includes("summary") && !lowerText.includes("objective")) {
      missingSections.push("Professional Summary");
      suggestions.push("Add a professional summary at the top highlighting your key strengths");
    }

    if (!lowerText.includes("certification") && !lowerText.includes("certified")) {
      missingSections.push("Certifications");
      suggestions.push("List relevant certifications (AWS, Google Cloud, etc.)");
    }

    if (!lowerText.includes("github") && !lowerText.includes("linkedin") && !lowerText.includes("portfolio")) {
      suggestions.push("Include links to GitHub, LinkedIn, or portfolio");
    }

    // Cap score at 100
    score = Math.min(100, score);

    // Ensure minimum score
    if (score < 30) score = 30;

    // Add general suggestions based on score
    if (score < 50) {
      suggestions.push("Your resume needs significant improvement for ATS systems");
    } else if (score < 70) {
      suggestions.push("Your resume has room for improvement in several areas");
    } else if (score < 85) {
      suggestions.push("Your resume is good but could be optimized further");
    } else {
      strengths.push("Well-optimized resume for ATS systems");
    }

    return {
      score,
      strengths,
      weaknesses,
      missingSections,
      suggestions,
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resume Analyzer
          </h1>
          <p className="text-gray-600">
            Upload your PDF resume to get instant ATS analysis and improvement suggestions
          </p>
        </div>

        {!parsedResume ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                file ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  file ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  {file ? (
                    <FileText className="w-8 h-8 text-blue-600" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                {file ? (
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">
                      Drag and drop your resume here
                    </p>
                    <p className="text-gray-600 mb-4">or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Browse Files
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                      Only PDF files are supported
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {file && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={analyzeResume}
                  disabled={isAnalyzing}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Analyze Resume
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null);
                  }}
                  className="px-6 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Results Section */
          <div className="max-w-6xl mx-auto space-y-6">
            {/* ATS Score Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">ATS Analysis Results</h2>
              <div className="flex items-center gap-8 mb-8">
                <div className={`w-32 h-32 rounded-full ${getScoreBackground(atsAnalysis!.score)} flex items-center justify-center`}>
                  <span className={`text-4xl font-bold ${getScoreColor(atsAnalysis!.score)}`}>
                    {atsAnalysis!.score}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Overall ATS Score
                  </h3>
                  <p className="text-gray-600">
                    {atsAnalysis!.score >= 80
                      ? "Your resume is well-optimized for ATS systems!"
                      : atsAnalysis!.score >= 60
                      ? "Your resume has good ATS compatibility with room for improvement."
                      : "Your resume needs significant optimization for ATS systems."}
                  </p>
                </div>
              </div>
            </div>

            {/* Parsed Resume */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Extracted Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2 text-gray-700">
                    <p><span className="font-medium">Name:</span> {parsedResume.name || "Not found"}</p>
                    <p><span className="font-medium">Email:</span> {parsedResume.email || "Not found"}</p>
                    <p><span className="font-medium">Phone:</span> {parsedResume.phone || "Not found"}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedResume.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill.name} {skill.level && `(${skill.level})`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Education</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {parsedResume.education.map((edu, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {edu}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Projects</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {parsedResume.projects.map((project, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {project}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Experience</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {parsedResume.experience.map((exp, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {exp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Strengths
                </h2>
                <ul className="space-y-3">
                  {atsAnalysis!.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  Areas for Improvement
                </h2>
                <ul className="space-y-3">
                  {atsAnalysis!.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Missing Sections */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-600" />
                Missing Sections
              </h2>
              <div className="flex flex-wrap gap-3">
                {atsAnalysis!.missingSections.map((section, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Download className="w-6 h-6 text-blue-600" />
                Improvement Suggestions
              </h2>
              <ul className="space-y-3">
                {atsAnalysis!.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-700">
                    <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Analyze Another Button */}
            <div className="text-center pb-8">
              <button
                onClick={() => {
                  setFile(null);
                  setParsedResume(null);
                  setAtsAnalysis(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Upload className="w-5 h-5" />
                Analyze Another Resume
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 mt-16">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-4">
              <a
                href="https://digitalheroesco.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Built for Digital Heroes
              </a>
            </div>
            <div className="text-gray-400 text-sm mb-2">
              <p className="font-semibold text-white">Jayesh Patil</p>
              <p>jayesh.patil@example.com</p>
            </div>
            <p className="text-gray-500 text-xs">
              Built with ❤️ using HireFlow AI Resume Analyzer
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
