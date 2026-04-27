import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

import { useJobs, type Application, type ApplicationStatus } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, Clock, Briefcase, Copy, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CompanyJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, getJobApplications, updateApplicationStatus } = useJobs();

  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const job = jobs.find((j) => j.id === id);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const list = await getJobApplications(id);
      setApplicants(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const statusColor = (s: string) =>
    s === "Shortlisted" ? "default" : s === "Rejected" ? "destructive" : "secondary";

  const handleStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(appId, status);
      toast.success(`Marked ${status}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const copyJobId = async () => {
    await navigator.clipboard.writeText(job.id);
    toast.success("Job ID copied — paste into Screening to rank applicants");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">{job.title}</CardTitle>
          <CardDescription>{job.company}</CardDescription>
          <div className="flex flex-wrap gap-3 mt-2">
            <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{job.location}</Badge>
            <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />{job.salaryRange}</Badge>
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{job.experience}</Badge>
            <Badge variant="outline" className="gap-1"><Briefcase className="h-3 w-3" />{job.type}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">Job ID: {job.id}</code>
            <Button type="button" size="sm" variant="outline" onClick={copyJobId}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Job ID
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate(`/recruiter/screening?job_id=${encodeURIComponent(job.id)}`)}
            >
              <Trophy className="h-3.5 w-3.5 mr-1" /> Screen Applicants
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Posted {job.postedDate}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Applicants ({applicants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Loading applicants...</p>
          ) : applicants.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No applications yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.candidateName || "—"}</TableCell>
                    <TableCell>{a.candidateEmail || "—"}</TableCell>
                    <TableCell>{a.appliedDate}</TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => handleStatus(a.id, v as ApplicationStatus)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedApp(a)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Candidate Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <CandidateProfileView app={selectedApp} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function ExternalLinkRow({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" /> {label}
    </a>
  );
}

function CandidateProfileView({ app }: { app: Application }) {
  const profile = (app.profileJson || {}) as Record<string, any>;
  const links = (profile.links || {}) as Record<string, string | null | undefined>;
  const skills: string[] = Array.isArray(profile.skills) ? profile.skills : [];
  const education: any[] = Array.isArray(profile.education) ? profile.education : [];
  const experience: any[] = Array.isArray(profile.experience) ? profile.experience : [];
  const projects: any[] = Array.isArray(profile.projects) ? profile.projects : [];
  const certifications: any[] = Array.isArray(profile.certifications) ? profile.certifications : [];

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-1">
        <p className="text-lg font-semibold font-display">{app.candidateName || profile.name || "—"}</p>
        <p className="text-muted-foreground">{app.candidateEmail || profile.email || "—"}</p>
        {profile.phone && <p className="text-muted-foreground">{profile.phone}</p>}
        <p className="text-xs text-muted-foreground">Applied {app.appliedDate}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <ExternalLinkRow label="LinkedIn" url={links.linkedin} />
          <ExternalLinkRow label="GitHub" url={links.github} />
          <ExternalLinkRow label="Website" url={links.website} />
          {profile.uploaded_filename && (
            <span className="text-xs text-muted-foreground">Uploaded: {profile.uploaded_filename}</span>
          )}
        </div>
      </div>

      {profile.summary && (
        <Section title="Summary">
          <p className="whitespace-pre-line leading-relaxed">{profile.summary}</p>
        </Section>
      )}

      {app.coverLetter && (
        <Section title="Cover Letter">
          <p className="whitespace-pre-line leading-relaxed">{app.coverLetter}</p>
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <Badge key={i} variant="secondary">{String(s)}</Badge>
            ))}
          </div>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-3">
            {experience.map((e: any, i: number) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="font-medium">{e.title || "—"}{e.company ? ` · ${e.company}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {[e.start_date, e.end_date].filter(Boolean).join(" — ")}
                  </p>
                </div>
                {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                {e.description && <p className="mt-1 whitespace-pre-line">{e.description}</p>}
                {Array.isArray(e.bullets) && e.bullets.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    {e.bullets.map((b: string, j: number) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {education.map((ed: any, i: number) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="font-medium">{ed.institution || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[ed.start_date, ed.end_date].filter(Boolean).join(" — ")}
                  </p>
                </div>
                <p className="text-sm">
                  {[ed.degree, ed.field_of_study].filter(Boolean).join(" · ")}
                  {ed.grade ? `  (${ed.grade})` : ""}
                </p>
                {ed.description && <p className="mt-1 text-muted-foreground">{ed.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-2">
            {projects.map((p: any, i: number) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="font-medium">{p.name || "—"}</p>
                  {p.link && <ExternalLinkRow label="link" url={p.link} />}
                </div>
                {Array.isArray(p.tech_stack) && p.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.tech_stack.map((t: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {p.description && <p className="mt-1">{p.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="space-y-1">
            {certifications.map((c: any, i: number) => (
              <li key={i}>
                <span className="font-medium">{c.name || "—"}</span>
                {c.issuer ? `, ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
                {c.credential_url && (
                  <span className="ml-2"><ExternalLinkRow label="credential" url={c.credential_url} /></span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
