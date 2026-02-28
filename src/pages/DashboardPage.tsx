import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Clock, TrendingUp } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const { getCompanyJobs, getCandidateApplications, applications } = useJobs();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "company") {
    const myJobs = getCompanyJobs(user.id);
    const totalApps = applications.filter((a) => myJobs.some((j) => j.id === a.jobId)).length;

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome, {user.name}</h1>
          <p className="text-muted-foreground">Here's your recruitment overview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Jobs Posted", value: myJobs.length, icon: Briefcase, color: "text-accent" },
            { label: "Total Applications", value: totalApps, icon: Users, color: "text-accent" },
            { label: "Active Listings", value: myJobs.length, icon: Clock, color: "text-accent" },
            { label: "Hire Rate", value: "24%", icon: TrendingUp, color: "text-accent" },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold font-display">{s.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Candidate dashboard
  const myApps = getCandidateApplications(user.id);
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Track your job search progress</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Applications Sent", value: myApps.length, icon: Briefcase },
          { label: "Shortlisted", value: myApps.filter((a) => a.status === "Shortlisted").length, icon: TrendingUp },
          { label: "Pending", value: myApps.filter((a) => a.status === "Pending").length, icon: Clock },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold font-display">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
