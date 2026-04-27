import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, ArrowRight, Building2, UserCheck, Search } from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display font-bold text-xl text-primary flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-accent" />
            HireHub
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/jobs">Browse Jobs</Link></Button>
            {user ? (
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="outline" asChild><Link to="/login">Login</Link></Button>
                <Button asChild><Link to="/register">Register</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="max-w-3xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Search className="h-4 w-4" /> Your next opportunity awaits
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground">
            Find Your{" "}
            <span className="text-gradient">Dream Job</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect top talent with leading companies. Whether you're hiring or looking for your next role, HireHub makes it seamless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8" onClick={() => navigate(user ? "/jobs" : "/register")}>
              Apply Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" onClick={() => navigate(user?.role === "recruiter" ? "/recruiter/post-job" : "/register")}>
              <Building2 className="mr-2 h-4 w-4" /> Post a Job
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-card border-t">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { icon: Briefcase, label: "Jobs Posted", value: "500+" },
            { icon: Users, label: "Active Candidates", value: "10,000+" },
            { icon: UserCheck, label: "Successful Hires", value: "1,200+" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 animate-fade-in">
              <s.icon className="h-8 w-8 text-accent" />
              <span className="font-display text-3xl font-bold text-foreground">{s.value}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t text-center text-sm text-muted-foreground">
        © 2026 HireHub. All rights reserved.
      </footer>
    </div>
  );
}
