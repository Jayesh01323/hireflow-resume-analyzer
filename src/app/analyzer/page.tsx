"use client";

import dynamic from "next/dynamic";

// Load the analyzer only on the client; pdfjs-dist must not run on the server.
const ResumeAnalyzer = dynamic(
  () => import("@/components/ResumeAnalyzer"),
  {
    ssr: false,
    loading: () => (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-gray-600 text-lg">Loading analyzer…</div>
      </main>
    ),
  }
);

export default function AnalyzerPage() {
  return <ResumeAnalyzer onBack={() => (window.location.href = "/")} />;
}
