import { useState } from "react";
import { useJobs } from "@/contexts/JobContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Search } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

export default function BrowseJobsPage() {
  const { jobs } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  );

  const isStandalone = !user; // show nav if not in dashboard layout

  return (
    <div className={isStandalone ? "min-h-screen" : ""}>
      {isStandalone && (
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
      <div className={isStandalone ? "container mx-auto px-4 py-8" : ""}>
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Browse Jobs</h1>
              <p className="text-muted-foreground">{filtered.length} opportunities available</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4">
            {filtered.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-lg">{job.title}</CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{job.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium text-accent">{job.salaryRange}</span>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
