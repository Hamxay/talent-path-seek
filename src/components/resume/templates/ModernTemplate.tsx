import type { ResumeJSON } from "@/components/resume/types";
import { joinNonEmpty, nonEmpty, normalizeSkills } from "@/components/resume/templates/shared";

export function ModernTemplate({ resume }: { resume: ResumeJSON }) {
  const p = resume.personal;
  const contactLine = joinNonEmpty([p.email, p.phone, p.location]);
  const linksLine = joinNonEmpty([p.linkedin, p.github, p.website], " | ");
  const skillsGroups = normalizeSkills(resume.skills);

  return (
    <div className="resume-page resume-print-no-shadow bg-white text-slate-900">
      <div className="px-10 py-10">
        <header className="resume-section">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold tracking-tight truncate">{p.full_name || "Your Name"}</h1>
              {nonEmpty(resume.summary) && (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{resume.summary}</p>
              )}
            </div>
            <div className="text-right text-xs text-slate-700 max-w-[240px]">
              {contactLine && <div className="whitespace-pre-wrap">{contactLine}</div>}
              {linksLine && <div className="mt-1 break-words">{linksLine}</div>}
            </div>
          </div>
          <div className="mt-6 h-px bg-slate-200" />
        </header>

        {resume.experience.length > 0 && (
          <section className="resume-section mt-6">
            <h2 className="text-xs font-bold tracking-[0.18em] text-slate-600">EXPERIENCE</h2>
            <div className="mt-3 space-y-4">
              {resume.experience.map((e, idx) => (
                <div key={idx} className="resume-avoid-break">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm text-slate-700">{e.company}{nonEmpty(e.location) ? ` • ${e.location}` : ""}</div>
                    </div>
                    <div className="shrink-0 text-xs text-slate-600">
                      {joinNonEmpty([e.start_date, e.end_date], " — ")}
                    </div>
                  </div>
                  {nonEmpty(e.description) && <p className="mt-2 text-sm text-slate-700 leading-relaxed">{e.description}</p>}
                  {(e.bullets || []).filter(nonEmpty).length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {(e.bullets || []).filter(nonEmpty).slice(0, 8).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(resume.projects.length > 0 || resume.education.length > 0 || skillsGroups.length > 0 || resume.certifications.length > 0) && (
          <div className="mt-6 grid grid-cols-12 gap-6">
            <div className="col-span-7">
              {resume.projects.length > 0 && (
                <section className="resume-section">
                  <h2 className="text-xs font-bold tracking-[0.18em] text-slate-600">PROJECTS</h2>
                  <div className="mt-3 space-y-4">
                    {resume.projects.map((pr, idx) => (
                      <div key={idx} className="resume-avoid-break">
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="font-semibold">{pr.name}</div>
                          {nonEmpty(pr.link) && <div className="text-xs text-slate-600 break-words">{pr.link}</div>}
                        </div>
                        {(pr.tech_stack || []).length > 0 && (
                          <div className="mt-1 text-xs text-slate-600">
                            {(pr.tech_stack || []).filter(nonEmpty).slice(0, 10).join(" • ")}
                          </div>
                        )}
                        {nonEmpty(pr.description) && <p className="mt-2 text-sm text-slate-700 leading-relaxed">{pr.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="col-span-5 space-y-6">
              {resume.education.length > 0 && (
                <section className="resume-section">
                  <h2 className="text-xs font-bold tracking-[0.18em] text-slate-600">EDUCATION</h2>
                  <div className="mt-3 space-y-3">
                    {resume.education.map((ed, idx) => (
                      <div key={idx} className="resume-avoid-break">
                        <div className="font-semibold">{ed.institution}</div>
                        <div className="text-sm text-slate-700">
                          {joinNonEmpty([ed.degree, ed.field_of_study], " • ")}
                        </div>
                        <div className="text-xs text-slate-600">
                          {joinNonEmpty([ed.start_date, ed.end_date], " — ")}
                          {nonEmpty(ed.grade) ? ` • ${ed.grade}` : ""}
                        </div>
                        {nonEmpty(ed.description) && <div className="mt-1 text-sm text-slate-700">{ed.description}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {skillsGroups.length > 0 && (
                <section className="resume-section">
                  <h2 className="text-xs font-bold tracking-[0.18em] text-slate-600">SKILLS</h2>
                  <div className="mt-3 space-y-3">
                    {skillsGroups.map((g) => (
                      <div key={g.label} className="resume-avoid-break">
                        <div className="text-xs font-semibold text-slate-700">{g.label}</div>
                        <div className="mt-1 text-sm text-slate-700">{g.items.join(" • ")}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {resume.certifications.length > 0 && (
                <section className="resume-section">
                  <h2 className="text-xs font-bold tracking-[0.18em] text-slate-600">CERTIFICATIONS</h2>
                  <div className="mt-3 space-y-2">
                    {resume.certifications.map((c, idx) => (
                      <div key={idx} className="resume-avoid-break">
                        <div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-xs text-slate-600">
                          {joinNonEmpty([c.issuer, c.date], " • ")}
                        </div>
                        {nonEmpty(c.credential_url) && (
                          <div className="text-xs text-slate-600 break-words">{c.credential_url}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModernTemplate;

