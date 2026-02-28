import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CompanyJobsPage() {
  const { user } = useAuth();
  const { getCompanyJobs, getJobApplicantCount } = useJobs();
  const navigate = useNavigate();

  if (!user) return null;
  const jobs = getCompanyJobs(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? "s" : ""} posted</p>
        </div>
        <Button onClick={() => navigate("/company/post-job")}>Post New Job</Button>
      </div>
      {jobs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No jobs posted yet. Create your first listing!</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/company/jobs/${job.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-display text-lg">{job.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                      <Badge variant="secondary">{job.type}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{getJobApplicantCount(job.id)} applicants</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Posted {job.postedDate}</span>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
