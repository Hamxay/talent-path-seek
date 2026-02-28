import { createContext, useContext, useState, ReactNode } from "react";

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  resumeName: string;
  coverLetter?: string;
  appliedDate: string;
  status: "Pending" | "Shortlisted" | "Rejected";
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyId: string;
  description: string;
  location: string;
  salaryRange: string;
  experience: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  postedDate: string;
}

interface JobContextType {
  jobs: Job[];
  applications: Application[];
  addJob: (job: Omit<Job, "id" | "postedDate">) => void;
  applyToJob: (app: Omit<Application, "id" | "appliedDate" | "status">) => void;
  getJobApplications: (jobId: string) => Application[];
  getCandidateApplications: (candidateId: string) => (Application & { jobTitle: string; companyName: string })[];
  getCompanyJobs: (companyId: string) => Job[];
  getJobApplicantCount: (jobId: string) => number;
  updateApplicationStatus: (appId: string, status: Application["status"]) => void;
}

const MOCK_JOBS: Job[] = [
  {
    id: "j1", title: "Senior Frontend Developer", company: "TechCorp", companyId: "c1",
    description: "We're looking for a Senior Frontend Developer to join our team. You'll be working on cutting-edge web applications using React, TypeScript, and modern CSS. The ideal candidate has 5+ years of experience building responsive, accessible web interfaces.\n\nResponsibilities:\n• Lead frontend architecture decisions\n• Mentor junior developers\n• Collaborate with designers and backend engineers\n• Write clean, tested, maintainable code",
    location: "San Francisco, CA", salaryRange: "$140,000 - $180,000", experience: "5+ years", type: "Full-time", postedDate: "2026-02-25"
  },
  {
    id: "j2", title: "Product Designer", company: "TechCorp", companyId: "c1",
    description: "Join our design team to create beautiful, intuitive user experiences. You'll work closely with product managers and engineers to design features used by millions.\n\nRequirements:\n• Strong portfolio demonstrating UX/UI skills\n• Experience with Figma and design systems\n• Understanding of accessibility standards\n• Excellent communication skills",
    location: "Remote", salaryRange: "$120,000 - $155,000", experience: "3+ years", type: "Remote", postedDate: "2026-02-20"
  },
  {
    id: "j3", title: "Backend Engineer", company: "InnovateLab", companyId: "c2",
    description: "Build scalable backend services that power our platform. Work with Node.js, PostgreSQL, and cloud infrastructure to deliver reliable APIs.\n\nWhat we offer:\n• Competitive salary and equity\n• Flexible working hours\n• Learning budget\n• Health insurance",
    location: "New York, NY", salaryRange: "$130,000 - $170,000", experience: "4+ years", type: "Full-time", postedDate: "2026-02-22"
  },
  {
    id: "j4", title: "DevOps Engineer", company: "InnovateLab", companyId: "c2",
    description: "Manage and improve our cloud infrastructure. Experience with AWS, Docker, Kubernetes, and CI/CD pipelines required.\n\nYou will:\n• Automate deployment processes\n• Monitor system performance\n• Implement security best practices\n• Collaborate with development teams",
    location: "Austin, TX", salaryRange: "$125,000 - $160,000", experience: "3+ years", type: "Full-time", postedDate: "2026-02-18"
  },
];

const MOCK_APPLICATIONS: Application[] = [
  { id: "a1", jobId: "j1", candidateId: "u1", candidateName: "John Doe", candidateEmail: "john@test.com", resumeName: "john_doe_resume.pdf", appliedDate: "2026-02-26", status: "Pending" },
  { id: "a2", jobId: "j3", candidateId: "u2", candidateName: "Jane Smith", candidateEmail: "jane@test.com", resumeName: "jane_smith_cv.pdf", coverLetter: "I'm excited about this opportunity...", appliedDate: "2026-02-24", status: "Shortlisted" },
];

const JobContext = createContext<JobContextType | null>(null);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);

  const addJob = (job: Omit<Job, "id" | "postedDate">) => {
    setJobs((prev) => [...prev, { ...job, id: `j-${Date.now()}`, postedDate: new Date().toISOString().split("T")[0] }]);
  };

  const applyToJob = (app: Omit<Application, "id" | "appliedDate" | "status">) => {
    const exists = applications.find((a) => a.jobId === app.jobId && a.candidateId === app.candidateId);
    if (exists) return;
    setApplications((prev) => [...prev, { ...app, id: `a-${Date.now()}`, appliedDate: new Date().toISOString().split("T")[0], status: "Pending" }]);
  };

  const getJobApplications = (jobId: string) => applications.filter((a) => a.jobId === jobId);
  
  const getCandidateApplications = (candidateId: string) =>
    applications.filter((a) => a.candidateId === candidateId).map((a) => {
      const job = jobs.find((j) => j.id === a.jobId);
      return { ...a, jobTitle: job?.title || "", companyName: job?.company || "" };
    });

  const getCompanyJobs = (companyId: string) => jobs.filter((j) => j.companyId === companyId);
  const getJobApplicantCount = (jobId: string) => applications.filter((a) => a.jobId === jobId).length;

  const updateApplicationStatus = (appId: string, status: Application["status"]) => {
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
  };

  return (
    <JobContext.Provider value={{ jobs, applications, addJob, applyToJob, getJobApplications, getCandidateApplications, getCompanyJobs, getJobApplicantCount, updateApplicationStatus }}>
      {children}
    </JobContext.Provider>
  );
}

export const useJobs = () => {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobs must be used within JobProvider");
  return ctx;
};
