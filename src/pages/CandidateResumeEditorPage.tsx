import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Eraser } from "lucide-react";

import { apiGet, apiPost, apiPut } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import ResumePreview from "@/components/resume/ResumePreview";
import type {
  ResumeJSON,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeCertificationItem,
} from "@/components/resume/types";

type ResumeDoc = {
  id: string;
  title: string;
  is_primary: boolean;
  resume_json: ResumeJSON;
};

function emptyResume(): ResumeJSON {
  return {
    personal: { full_name: "" },
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: { items: [] },
    certifications: [],
  };
}

function sampleResume(): ResumeJSON {
  return {
    personal: {
      full_name: "Ali Raza",
      email: "ali.raza@example.com",
      phone: "+92 300 1234567",
      location: "Jhang, Pakistan",
      linkedin: "https://linkedin.com/in/ali-raza",
      github: "https://github.com/aliraza",
      website: "https://aliraza.dev",
    },
    summary:
      "Final-year BSCS student and full-stack developer focused on React, FastAPI, and PostgreSQL. " +
      "I enjoy turning real problems into clean, well-tested products and have shipped a recruitment platform end-to-end as my FYP.",
    education: [
      {
        institution: "Government Graduate College Jhang",
        degree: "BS",
        field_of_study: "Computer Science",
        start_date: "2022",
        end_date: "2026",
        grade: "3.7 GPA",
        description: "Coursework: Data Structures, Databases, Software Engineering, Operating Systems, AI.",
      },
      {
        institution: "Punjab Group of Colleges",
        degree: "FSc",
        field_of_study: "Pre-Engineering",
        start_date: "2020",
        end_date: "2022",
        grade: "A+",
        description: "",
      },
    ],
    experience: [
      {
        company: "Acme Tech",
        title: "Software Engineering Intern",
        start_date: "Jun 2024",
        end_date: "Sep 2024",
        location: "Remote",
        description: "Backend internship on the customer-data platform team.",
        bullets: [
          "Built a FastAPI microservice handling ~50k events/day with PostgreSQL and Celery.",
          "Reduced API p95 latency by 38% by adding indexes and request-level caching.",
          "Wrote integration tests covering 90% of the new endpoints.",
        ],
      },
      {
        company: "Freelance",
        title: "Full-Stack Developer",
        start_date: "2023",
        end_date: "Present",
        location: "Remote",
        description: "Independent React + FastAPI projects for small businesses.",
        bullets: [
          "Delivered 4 production web apps for clients in retail and education.",
          "Owned features end-to-end: design, backend, frontend, deployment to Vercel/Render.",
        ],
      },
    ],
    projects: [
      {
        name: "AI-Powered Recruitment System (FYP)",
        link: "https://github.com/aliraza/talent-path-seek",
        tech_stack: ["React", "TypeScript", "FastAPI", "PostgreSQL", "Gemini API"],
        description:
          "Multi-template CV builder + recruiter screening platform. Candidates write resumes once and the AI ranks them against recruiter prompts. Includes shortlist management and CSV export.",
      },
      {
        name: "ClassroomQuiz",
        link: "https://github.com/aliraza/classroom-quiz",
        tech_stack: ["React", "Node.js", "Socket.IO"],
        description: "Realtime quiz tool used by ~120 students at my college during exam revision sessions.",
      },
    ],
    skills: {
      items: [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "FastAPI",
        "Python",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "Git",
        "REST APIs",
        "Pydantic",
        "SQLAlchemy",
      ],
    },
    certifications: [
      {
        name: "Meta Front-End Developer Professional Certificate",
        issuer: "Coursera / Meta",
        date: "2024",
        credential_url: "https://coursera.org/verify/example",
      },
      {
        name: "AWS Cloud Practitioner",
        issuer: "Amazon Web Services",
        date: "2025",
        credential_url: "",
      },
    ],
  };
}

function emptyEducation(): ResumeEducationItem {
  return { institution: "", degree: "", field_of_study: "", start_date: "", end_date: "", grade: "", description: "" };
}

function emptyExperience(): ResumeExperienceItem {
  return { company: "", title: "", start_date: "", end_date: "", location: "", description: "", bullets: [] };
}

function emptyProject(): ResumeProjectItem {
  return { name: "", link: "", tech_stack: [], description: "" };
}

function emptyCertification(): ResumeCertificationItem {
  return { name: "", issuer: "", date: "", credential_url: "" };
}

function deepMerge(base: any, patch: any): any {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch;
  if (typeof patch !== "object") return patch;
  if (typeof base !== "object" || base === null || Array.isArray(base)) base = {};
  const out: any = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = deepMerge((base as any)[k], v);
  }
  return out;
}

export default function CandidateResumeEditorPage() {
  const [loading, setLoading] = useState(true);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [title, setTitle] = useState("My Resume");
  const [resumeJson, setResumeJson] = useState<ResumeJSON>(emptyResume());

  const [prompt, setPrompt] = useState("");
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [suggestedPatch, setSuggestedPatch] = useState<any>(null);
  const [providerMeta, setProviderMeta] = useState<any>(null);

  const skillsText = useMemo(() => resumeJson.skills?.items?.join(", ") || "", [resumeJson.skills]);

  // If the user hasn't typed anything yet, render the right-hand preview with
  // sample data so a brand-new candidate immediately sees what a finished
  // resume looks like under each template.
  const isEffectivelyEmpty = useMemo(() => {
    const r = resumeJson;
    const hasPersonal = (r.personal?.full_name || "").trim().length > 0;
    const hasSummary = (r.summary || "").trim().length > 0;
    return (
      !hasPersonal &&
      !hasSummary &&
      r.education.length === 0 &&
      r.experience.length === 0 &&
      r.projects.length === 0 &&
      (r.skills?.items?.length || 0) === 0 &&
      r.certifications.length === 0
    );
  }, [resumeJson]);

  const previewResume = isEffectivelyEmpty ? sampleResume() : resumeJson;

  useEffect(() => {
    (async () => {
      try {
        const list = await apiGet<ResumeDoc[]>("/api/v1/resumes/me");
        const primary = list.find((r) => r.is_primary) || list[0];
        if (primary) {
          setResumeId(primary.id);
          setTitle(primary.title || "My Resume");
          setResumeJson(primary.resume_json || emptyResume());
        } else {
          setResumeId(null);
          setTitle("My Resume");
          setResumeJson(emptyResume());
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load resumes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveResume = async () => {
    try {
      if (!resumeId) {
        const created = await apiPost<ResumeDoc>("/api/v1/resumes", {
          title,
          is_primary: true,
          resume_json: resumeJson,
        });
        setResumeId(created.id);
        toast.success("Resume created");
        return;
      }
      await apiPut<ResumeDoc>(`/api/v1/resumes/${resumeId}`, { title, resume_json: resumeJson });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const runPrefill = async () => {
    if (!prompt.trim()) return;
    setPrefillLoading(true);
    setExtracted(null);
    setSuggestedPatch(null);
    setProviderMeta(null);
    try {
      let id = resumeId;
      if (!id) {
        const created = await apiPost<ResumeDoc>("/api/v1/resumes", {
          title,
          is_primary: true,
          resume_json: resumeJson,
        });
        id = created.id;
        setResumeId(created.id);
      }

      const res = await apiPost<{
        extracted_fields: any;
        suggested_resume_patch: any;
        provider_metadata: any;
      }>(`/api/v1/resumes/${id}/prefill-from-prompt`, { prompt });

      setExtracted(res.extracted_fields);
      setSuggestedPatch(res.suggested_resume_patch);
      setProviderMeta(res.provider_metadata);
      toast.success("Suggestions ready");
    } catch (e: any) {
      toast.error(e?.message || "Prefill failed");
    } finally {
      setPrefillLoading(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestedPatch) return;
    const next = deepMerge(resumeJson, suggestedPatch) as ResumeJSON;
    setResumeJson(next);
    toast.success("Suggestions applied (you can edit before saving)");
  };

  const loadSample = () => {
    setResumeJson(sampleResume());
    setTitle("Sample Resume");
    toast.success("Loaded sample data — edit any field, then Save");
  };

  const clearAll = () => {
    if (!confirm("Clear every field? This won't delete the resume on the server until you Save.")) return;
    setResumeJson(emptyResume());
    toast.success("All fields cleared");
  };

  // ---- list helpers (add/remove/update) ----
  const updateList = <T,>(key: keyof ResumeJSON, idx: number, patch: Partial<T>) => {
    setResumeJson((p) => {
      const arr = [...((p as any)[key] as T[])];
      arr[idx] = { ...(arr[idx] as any), ...patch };
      return { ...p, [key]: arr } as ResumeJSON;
    });
  };
  const addToList = <T,>(key: keyof ResumeJSON, item: T) => {
    setResumeJson((p) => ({ ...p, [key]: [...((p as any)[key] as T[]), item] } as ResumeJSON));
  };
  const removeFromList = (key: keyof ResumeJSON, idx: number) => {
    setResumeJson((p) => {
      const arr = [...((p as any)[key] as any[])];
      arr.splice(idx, 1);
      return { ...p, [key]: arr } as ResumeJSON;
    });
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Resume Editor</CardTitle>
            <CardDescription>Fill your details and keep everything up to date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Resume Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={resumeJson.personal.full_name}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, full_name: e.target.value } }))
                  }
                  placeholder="e.g. Ali Raza"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={resumeJson.personal.email || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, email: e.target.value } }))
                  }
                  placeholder="e.g. ali@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={resumeJson.personal.phone || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, phone: e.target.value } }))
                  }
                  placeholder="e.g. +92..."
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={resumeJson.personal.location || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, location: e.target.value } }))
                  }
                  placeholder="e.g. Jhang, PK"
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={resumeJson.personal.linkedin || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, linkedin: e.target.value } }))
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label>GitHub</Label>
                <Input
                  value={resumeJson.personal.github || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, github: e.target.value } }))
                  }
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Website</Label>
                <Input
                  value={resumeJson.personal.website || ""}
                  onChange={(e) =>
                    setResumeJson((p) => ({ ...p, personal: { ...p.personal, website: e.target.value } }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={resumeJson.summary || ""}
                onChange={(e) => setResumeJson((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Short professional summary..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills (comma-separated)</Label>
              <Input
                value={skillsText}
                onChange={(e) =>
                  setResumeJson((p) => ({
                    ...p,
                    skills: { ...(p.skills || { items: [] }), items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                  }))
                }
                placeholder="React, FastAPI, MongoDB..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Education</CardTitle>
              <CardDescription>Add your degrees and qualifications.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => addToList("education", emptyEducation())}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeJson.education.length === 0 && (
              <p className="text-sm text-muted-foreground">No education entries yet.</p>
            )}
            {resumeJson.education.map((edu, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entry #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFromList("education", idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { institution: e.target.value })}
                  />
                  <Input
                    placeholder="Degree"
                    value={edu.degree || ""}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { degree: e.target.value })}
                  />
                  <Input
                    placeholder="Field of Study"
                    value={edu.field_of_study || ""}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { field_of_study: e.target.value })}
                  />
                  <Input
                    placeholder="Grade / GPA"
                    value={edu.grade || ""}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { grade: e.target.value })}
                  />
                  <Input
                    placeholder="Start (e.g. 2022)"
                    value={edu.start_date || ""}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { start_date: e.target.value })}
                  />
                  <Input
                    placeholder="End (e.g. 2026 or Present)"
                    value={edu.end_date || ""}
                    onChange={(e) => updateList<ResumeEducationItem>("education", idx, { end_date: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Description (optional)"
                  rows={2}
                  value={edu.description || ""}
                  onChange={(e) => updateList<ResumeEducationItem>("education", idx, { description: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Experience</CardTitle>
              <CardDescription>Jobs and internships.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => addToList("experience", emptyExperience())}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeJson.experience.length === 0 && (
              <p className="text-sm text-muted-foreground">No experience entries yet.</p>
            )}
            {resumeJson.experience.map((exp, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entry #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFromList("experience", idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { company: e.target.value })}
                  />
                  <Input
                    placeholder="Title"
                    value={exp.title}
                    onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { title: e.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    value={exp.location || ""}
                    onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { location: e.target.value })}
                  />
                  <div />
                  <Input
                    placeholder="Start (e.g. Jan 2024)"
                    value={exp.start_date || ""}
                    onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { start_date: e.target.value })}
                  />
                  <Input
                    placeholder="End (or Present)"
                    value={exp.end_date || ""}
                    onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { end_date: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  rows={2}
                  value={exp.description || ""}
                  onChange={(e) => updateList<ResumeExperienceItem>("experience", idx, { description: e.target.value })}
                />
                <Textarea
                  placeholder="Bullets (one per line)"
                  rows={3}
                  value={(exp.bullets || []).join("\n")}
                  onChange={(e) =>
                    updateList<ResumeExperienceItem>("experience", idx, {
                      bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Projects</CardTitle>
              <CardDescription>FYP, side projects, anything you built.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => addToList("projects", emptyProject())}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeJson.projects.length === 0 && (
              <p className="text-sm text-muted-foreground">No project entries yet.</p>
            )}
            {resumeJson.projects.map((proj, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entry #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFromList("projects", idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Project Name"
                    value={proj.name}
                    onChange={(e) => updateList<ResumeProjectItem>("projects", idx, { name: e.target.value })}
                  />
                  <Input
                    placeholder="Link (optional)"
                    value={proj.link || ""}
                    onChange={(e) => updateList<ResumeProjectItem>("projects", idx, { link: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Tech stack (comma-separated)"
                  value={(proj.tech_stack || []).join(", ")}
                  onChange={(e) =>
                    updateList<ResumeProjectItem>("projects", idx, {
                      tech_stack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
                <Textarea
                  placeholder="Description"
                  rows={2}
                  value={proj.description || ""}
                  onChange={(e) => updateList<ResumeProjectItem>("projects", idx, { description: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Certifications</CardTitle>
              <CardDescription>Courses, badges, credentials.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => addToList("certifications", emptyCertification())}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeJson.certifications.length === 0 && (
              <p className="text-sm text-muted-foreground">No certifications yet.</p>
            )}
            {resumeJson.certifications.map((cert, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entry #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFromList("certifications", idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Name"
                    value={cert.name}
                    onChange={(e) => updateList<ResumeCertificationItem>("certifications", idx, { name: e.target.value })}
                  />
                  <Input
                    placeholder="Issuer"
                    value={cert.issuer || ""}
                    onChange={(e) => updateList<ResumeCertificationItem>("certifications", idx, { issuer: e.target.value })}
                  />
                  <Input
                    placeholder="Date"
                    value={cert.date || ""}
                    onChange={(e) => updateList<ResumeCertificationItem>("certifications", idx, { date: e.target.value })}
                  />
                  <Input
                    placeholder="Credential URL"
                    value={cert.credential_url || ""}
                    onChange={(e) => updateList<ResumeCertificationItem>("certifications", idx, { credential_url: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveResume}>Save Resume</Button>
          <Button type="button" variant="outline" onClick={loadSample}>
            <Sparkles className="h-4 w-4 mr-1" /> Load Sample
          </Button>
          <Button type="button" variant="outline" onClick={clearAll}>
            <Eraser className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </div>
        {isEffectivelyEmpty && (
          <p className="text-xs text-muted-foreground -mt-2">
            The preview on the right is showing sample data so you can see what each template looks like. Start typing or click <span className="font-medium">Load Sample</span> to fill the form.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Prompt-to-Prefill</CardTitle>
            <CardDescription>Describe yourself in plain English and get suggested resume fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "I am Ali, BSCS student, know React, FastAPI, MongoDB..."'
              rows={4}
            />
            <div className="flex gap-2">
              <Button type="button" onClick={runPrefill} disabled={prefillLoading || !prompt.trim()}>
                {prefillLoading ? "Thinking..." : "Get Suggestions"}
              </Button>
              <Button type="button" variant="outline" onClick={applySuggestions} disabled={!suggestedPatch}>
                Apply Suggestions
              </Button>
            </div>

            {(providerMeta || extracted || suggestedPatch) && (
              <div className="mt-2 space-y-3">
                {providerMeta && (
                  <div className="text-xs text-muted-foreground">
                    Provider: {providerMeta.provider} • Model: {providerMeta.model} • {providerMeta.latency_ms}ms
                  </div>
                )}
                {extracted && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-sm font-medium mb-2">Extracted fields</div>
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(extracted, null, 2)}</pre>
                  </div>
                )}
                {suggestedPatch && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-sm font-medium mb-2">Suggested patch (not applied yet)</div>
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(suggestedPatch, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <ResumePreview resume={previewResume} />
      </div>
    </div>
  );
}
