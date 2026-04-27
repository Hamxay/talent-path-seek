export type ResumePersonal = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
};

export type ResumeEducationItem = {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  grade?: string | null;
  description?: string | null;
};

export type ResumeExperienceItem = {
  company: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  description?: string | null;
  bullets?: string[];
};

export type ResumeProjectItem = {
  name: string;
  link?: string | null;
  tech_stack?: string[];
  description?: string | null;
};

export type ResumeCertificationItem = {
  name: string;
  issuer?: string | null;
  date?: string | null;
  credential_url?: string | null;
};

export type ResumeSkills = {
  // Backend schema: { items: string[] }
  items: string[];
  // Frontend editor may provide categories later; templates should handle both shapes.
  categories?: Record<string, string[]>;
};

export type ResumeJSON = {
  personal: ResumePersonal;
  summary?: string | null;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkills;
  certifications: ResumeCertificationItem[];
};

