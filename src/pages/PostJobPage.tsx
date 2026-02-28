import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function PostJobPage() {
  const { user } = useAuth();
  const { addJob } = useJobs();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", location: "", salaryRange: "", experience: "", type: "Full-time" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    addJob({ ...form, company: user.company || user.name, companyId: user.id });
    toast.success("Job published successfully!");
    navigate("/company/jobs");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Post a New Job</CardTitle>
          <CardDescription>Fill in the details to publish a job listing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input placeholder="e.g. Software Engineer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Job description, responsibilities..." rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g. San Francisco, CA" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Salary Range</Label>
                <Input placeholder="e.g. $100k - $150k" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experience Required</Label>
                <Input placeholder="e.g. 3+ years" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Publish Job</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
