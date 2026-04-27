import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CandidateApplicationsPage() {
  const { user } = useAuth();
  const { applications, refreshApplications } = useJobs();
  const navigate = useNavigate();

  useEffect(() => {
    void refreshApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const statusVariant = (s: string) => (s === "Shortlisted" ? "default" : s === "Rejected" ? "destructive" : "secondary");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">My Applications</h1>
        <p className="text-muted-foreground">{applications.length} application{applications.length !== 1 ? "s" : ""} submitted</p>
      </div>
      {applications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No applications yet. Start browsing jobs!</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((a) => (
            <Card
              key={a.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/jobs/${a.jobId}`)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold">{a.jobTitle || "Job"}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{a.companyName || ""}</span>
                    <span>Applied {a.appliedDate}</span>
                  </div>
                </div>
                <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
