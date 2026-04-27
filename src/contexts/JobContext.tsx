import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

import { apiGet, apiPost, apiPut, API_BASE_URL, getAccessToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type ApplicationStatus = "Pending" | "Shortlisted" | "Rejected";

export interface Application {
  id: string;
  jobId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  resumeId?: string | null;
  coverLetter?: string | null;
  appliedDate: string;
  status: ApplicationStatus;
  profileJson?: Record<string, unknown>;
  // Convenience for candidate-side listing
  jobTitle?: string;
  companyName?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyId: string; // recruiter_user_id
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
  loadingJobs: boolean;
  refreshJobs: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  addJob: (job: Omit<Job, "id" | "postedDate" | "company" | "companyId">) => Promise<Job | null>;
  applyToJob: (
    jobId: string,
    payload?: { coverLetter?: string; resumeId?: string; file?: File | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  getJobApplications: (jobId: string) => Promise<Application[]>;
  getCandidateApplications: () => Application[];
  getCompanyJobs: (recruiterUserId: string) => Job[];
  getJobApplicantCount: (jobId: string) => number;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
}

const JobContext = createContext<JobContextType | null>(null);

type ApiJob = {
  id: string;
  recruiter_user_id: string;
  company_name: string;
  title: string;
  description: string;
  location?: string | null;
  salary_range?: string | null;
  experience?: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
};

type ApiApplication = {
  id: string;
  job_id: string;
  candidate_user_id: string;
  resume_id?: string | null;
  cover_letter?: string | null;
  status: string;
  profile_json?: Record<string, unknown>;
  created_at: string;
  job_title?: string;
  company_name?: string;
};

function jobFromApi(j: ApiJob): Job {
  return {
    id: j.id,
    title: j.title,
    company: j.company_name,
    companyId: j.recruiter_user_id,
    description: j.description || "",
    location: j.location || "",
    salaryRange: j.salary_range || "",
    experience: j.experience || "",
    type: (j.type as Job["type"]) || "Full-time",
    postedDate: (j.created_at || "").split("T")[0] || "",
  };
}

function applicationFromApi(a: ApiApplication): Application {
  const profile = (a.profile_json || {}) as Record<string, any>;
  return {
    id: a.id,
    jobId: a.job_id,
    candidateUserId: a.candidate_user_id,
    candidateName: (profile.name as string) || "",
    candidateEmail: (profile.email as string) || "",
    resumeId: a.resume_id || null,
    coverLetter: a.cover_letter || null,
    appliedDate: (a.created_at || "").split("T")[0] || "",
    status: ((a.status as ApplicationStatus) || "Pending") as ApplicationStatus,
    profileJson: a.profile_json,
    jobTitle: a.job_title,
    companyName: a.company_name,
  };
}

export function JobProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const refreshJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const list = await apiGet<ApiJob[]>("/api/v1/jobs");
      setJobs(list.map(jobFromApi));
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const refreshApplications = useCallback(async () => {
    if (!user || user.role !== "candidate") {
      setApplications([]);
      return;
    }
    try {
      const list = await apiGet<ApiApplication[]>("/api/v1/applications/me");
      setApplications(list.map(applicationFromApi));
    } catch {
      setApplications([]);
    }
  }, [user]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    void refreshApplications();
  }, [refreshApplications]);

  const addJob: JobContextType["addJob"] = async (input) => {
    try {
      const created = await apiPost<ApiJob>("/api/v1/recruiter/jobs", {
        title: input.title,
        description: input.description,
        location: input.location,
        salary_range: input.salaryRange,
        experience: input.experience,
        type: input.type,
      });
      const j = jobFromApi(created);
      setJobs((prev) => [j, ...prev]);
      return j;
    } catch {
      return null;
    }
  };

  const applyToJob: JobContextType["applyToJob"] = async (jobId, payload) => {
    try {
      const fd = new FormData();
      if (payload?.coverLetter) fd.append("cover_letter", payload.coverLetter);
      if (payload?.resumeId) fd.append("resume_id", payload.resumeId);
      if (payload?.file) fd.append("file", payload.file);

      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}/apply`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body?.detail || `Apply failed (${res.status})` };
      }
      await refreshApplications();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Apply failed" };
    }
  };

  const getJobApplications: JobContextType["getJobApplications"] = async (jobId) => {
    try {
      const list = await apiGet<ApiApplication[]>(`/api/v1/recruiter/jobs/${jobId}/applications`);
      return list.map(applicationFromApi);
    } catch {
      return [];
    }
  };

  const getCandidateApplications = () => applications;

  const getCompanyJobs = (recruiterUserId: string) =>
    jobs.filter((j) => j.companyId === recruiterUserId);

  // Best-effort cached count: real count requires a recruiter call to /applications.
  const getJobApplicantCount = (_jobId: string) => 0;

  const updateApplicationStatus: JobContextType["updateApplicationStatus"] = async (
    applicationId,
    status,
  ) => {
    await apiPut(`/api/v1/recruiter/applications/${applicationId}/status`, { status });
  };

  const value = useMemo<JobContextType>(
    () => ({
      jobs,
      applications,
      loadingJobs,
      refreshJobs,
      refreshApplications,
      addJob,
      applyToJob,
      getJobApplications,
      getCandidateApplications,
      getCompanyJobs,
      getJobApplicantCount,
      updateApplicationStatus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs, applications, loadingJobs],
  );

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export const useJobs = () => {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobs must be used within JobProvider");
  return ctx;
};
