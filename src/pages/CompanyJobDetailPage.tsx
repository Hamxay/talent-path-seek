import { useParams } from "react-router-dom";
import { useJobs, Application } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, Clock, Briefcase, Download } from "lucide-react";
import { useState } from "react";

export default function CompanyJobDetailPage() {
  const { id } = useParams();
  const { jobs, getJobApplications, updateApplicationStatus } = useJobs();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const job = jobs.find((j) => j.id === id);
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const applicants = getJobApplications(job.id);

  const statusColor = (s: string) => s === "Shortlisted" ? "default" : s === "Rejected" ? "destructive" : "secondary";

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
        <CardContent>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          <p className="text-xs text-muted-foreground mt-4">Posted {job.postedDate}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Applicants ({applicants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {applicants.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No applications yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Resume</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.candidateName}</TableCell>
                    <TableCell>{a.candidateEmail}</TableCell>
                    <TableCell><span className="text-accent text-sm">{a.resumeName}</span></TableCell>
                    <TableCell>{a.appliedDate}</TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => updateApplicationStatus(a.id, v as Application["status"])}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedApp(a)}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Candidate Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-3">
              <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{selectedApp.candidateName}</p></div>
              <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{selectedApp.candidateEmail}</p></div>
              <div><span className="text-sm text-muted-foreground">Applied</span><p className="font-medium">{selectedApp.appliedDate}</p></div>
              {selectedApp.coverLetter && <div><span className="text-sm text-muted-foreground">Cover Letter</span><p className="text-sm mt-1">{selectedApp.coverLetter}</p></div>}
              <Button variant="outline" className="w-full gap-2"><Download className="h-4 w-4" />Download {selectedApp.resumeName}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
