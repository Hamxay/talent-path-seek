import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, DollarSign, Clock, Briefcase, Building2, ArrowLeft } from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams();
  const { jobs, applications, applyToJob, refreshApplications } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const job = jobs.find((j) => j.id === id);

  useEffect(() => {
    if (user?.role === "candidate") void refreshApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const alreadyApplied = !!user && applications.some((a) => a.jobId === job.id);

  const handleApply = () => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "candidate") { toast.error("Only candidates can apply"); return; }
    setShowApply(true);
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (resumeFile) {
      const isPdf = resumeFile.type === "application/pdf" || resumeFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error("Resume must be a PDF");
        return;
      }
      if (resumeFile.size > 10 * 1024 * 1024) {
        toast.error("PDF too large (max 10MB)");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await applyToJob(job.id, { coverLetter, file: resumeFile });
      if (res.ok) {
        toast.success(
          resumeFile
            ? "Application submitted with your uploaded resume!"
            : "Application submitted! Your saved resume (if any) was attached.",
        );
        setShowApply(false);
        setCoverLetter("");
        setResumeFile(null);
      } else {
        toast.error(res.error || "Could not apply.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStandalone = !user || user.role === "recruiter";

  return (
    <div className={isStandalone ? "min-h-screen" : ""}>
      {isStandalone && !user && (
        <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <Link to="/" className="font-display font-bold text-xl text-primary flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-accent" /> HireHub
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild><Link to="/login">Login</Link></Button>
              <Button asChild><Link to="/register">Register</Link></Button>
            </div>
          </div>
        </nav>
      )}
      <div className={isStandalone && !user ? "container mx-auto px-4 py-8" : ""}>
        <div className="space-y-6 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="font-display text-2xl">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4" />{job.company}
                  </CardDescription>
                </div>
                {user?.role === "candidate" && (
                  <Button onClick={handleApply} disabled={alreadyApplied} size="lg">
                    {alreadyApplied ? "Already Applied" : "Apply Now"}
                  </Button>
                )}
                {!user && <Button onClick={handleApply} size="lg">Apply Now</Button>}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{job.location}</Badge>
                <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />{job.salaryRange}</Badge>
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{job.experience}</Badge>
                <Badge variant="outline" className="gap-1"><Briefcase className="h-3 w-3" />{job.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-display font-semibold mb-2">Job Description</h3>
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{job.description}</p>
              <p className="text-xs text-muted-foreground mt-6">Posted {job.postedDate}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Apply for {job.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitApplication} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Resume (optional)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload a PDF to attach a different resume. If you leave this empty, your saved primary resume on
                this site will be used. If you don't have one yet, your account name and email will be sent and
                you can apply anyway.
              </p>
              {resumeFile && (
                <p className="text-xs">
                  Selected: <span className="font-medium">{resumeFile.name}</span> (
                  {(resumeFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cover Letter (Optional)</Label>
              <Textarea placeholder="Why are you a great fit?" rows={3} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
