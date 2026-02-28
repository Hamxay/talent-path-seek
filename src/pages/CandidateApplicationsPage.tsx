import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CandidateApplicationsPage() {
  const { user } = useAuth();
  const { getCandidateApplications } = useJobs();
  const navigate = useNavigate();

  if (!user) return null;
  const apps = getCandidateApplications(user.id);

  const statusVariant = (s: string) => s === "Shortlisted" ? "default" : s === "Rejected" ? "destructive" : "secondary";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">My Applications</h1>
        <p className="text-muted-foreground">{apps.length} application{apps.length !== 1 ? "s" : ""} submitted</p>
      </div>
      {apps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No applications yet. Start browsing jobs!</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {apps.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/jobs/${a.jobId}`)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold">{a.jobTitle}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{a.companyName}</span>
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
