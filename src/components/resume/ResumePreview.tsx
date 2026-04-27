import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ResumeJSON } from "@/components/resume/types";
import TemplateSelector, { type ResumeTemplateKey } from "@/components/resume/TemplateSelector";
import ModernTemplate from "@/components/resume/templates/ModernTemplate";
import ClassicTemplate from "@/components/resume/templates/ClassicTemplate";
import TechTemplate from "@/components/resume/templates/TechTemplate";
import MinimalTemplate from "@/components/resume/templates/MinimalTemplate";

function safeResume(resume: ResumeJSON): ResumeJSON {
  return {
    personal: resume.personal || { full_name: "" },
    summary: resume.summary || "",
    education: resume.education || [],
    experience: resume.experience || [],
    projects: resume.projects || [],
    skills: resume.skills || { items: [] },
    certifications: resume.certifications || [],
  };
}

export function ResumePreview({
  resume,
  initialTemplate = "modern",
  showToolbar = true,
}: {
  resume: ResumeJSON;
  initialTemplate?: ResumeTemplateKey;
  showToolbar?: boolean;
}) {
  const [template, setTemplate] = useState<ResumeTemplateKey>(initialTemplate);

  const normalized = useMemo(() => safeResume(resume), [resume]);

  const Template = useMemo(() => {
    switch (template) {
      case "classic":
        return ClassicTemplate;
      case "tech":
        return TechTemplate;
      case "minimal":
        return MinimalTemplate;
      case "modern":
      default:
        return ModernTemplate;
    }
  }, [template]);

  const downloadPdf = () => {
    // Browser-native print-to-PDF: best for preserving layout.
    window.print();
  };

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <TemplateSelector value={template} onChange={setTemplate} />
          <Button type="button" onClick={downloadPdf}>
            Download PDF
          </Button>
        </div>
      )}

      {/* Print root (CSS hides everything else on print) */}
      <div id="resume-print-root" className="w-full">
        {/* Screen preview chrome */}
        <div className="resume-print-no-shadow rounded-xl border bg-white overflow-hidden shadow-sm">
          {/* A4 canvas */}
          <div className="resume-page">
            <Template resume={normalized} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: the PDF is generated using your browser’s print-to-PDF. If margins look off, set margins to “Default” or “None” in the print dialog.
      </p>
    </div>
  );
}

export default ResumePreview;

