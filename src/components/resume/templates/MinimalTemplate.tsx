import type { ResumeJSON } from "@/components/resume/types";
import { joinNonEmpty, nonEmpty, normalizeSkills } from "@/components/resume/templates/shared";

export function MinimalTemplate({ resume }: { resume: ResumeJSON }) {
  const p = resume.personal;
  const contact = joinNonEmpty([p.email, p.phone, p.location], " • ");
  const links = joinNonEmpty([p.linkedin, p.github, p.website], " • ");
  const skillsGroups = normalizeSkills(resume.skills);

  const SmallTitle = ({ children }: { children: string }) => (
    <h2 className="text-[11px] font-semibold tracking-[0.22em] text-slate-600">{children}</h2>
  );

  return (
    <div className="resume-page resume-print-no-shadow bg-white text-slate-900">
      <div className="px-10 py-10">
        <header className="resume-section">
          <h1 className="font-display text-2xl font-bold">{p.full_name || "Your Name"}</h1>
          {(contact || links) && (
            <div className="mt-2 text-xs text-slate-700 space-y-1">
              {contact && <div>{contact}</div>}
              {links && <div className="break-words">{links}</div>}
            </div>
          )}
        </header>

        {nonEmpty(resume.summary) && (
          <section className="resume-section mt-6">
            <SmallTitle>SUMMARY</SmallTitle>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{resume.summary}</p>
          </section>
        )}

        {resume.experience.length > 0 && (
          <section className="resume-section mt-6">
            <SmallTitle>EXPERIENCE</SmallTitle>
            <div className="mt-3 space-y-4">
              {resume.experience.map((e, idx) => (
                <div key={idx} className="resume-avoid-break">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-sm text-slate-700">{e.company}{nonEmpty(e.location) ? ` • ${e.location}` : ""}</div>
                    </div>
                    <div className="text-xs text-slate-600">{joinNonEmpty([e.start_date, e.end_date], " — ")}</div>
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

        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-6 space-y-6">
            {resume.education.length > 0 && (
              <section className="resume-section">
                <SmallTitle>EDUCATION</SmallTitle>
                <div className="mt-3 space-y-3">
                  {resume.education.map((ed, idx) => (
                    <div key={idx} className="resume-avoid-break">
                      <div className="font-medium">{ed.institution}</div>
                      <div className="text-sm text-slate-700">
                        {joinNonEmpty([ed.degree, ed.field_of_study], " • ")}
                      </div>
                      <div className="text-xs text-slate-600">
                        {joinNonEmpty([ed.start_date, ed.end_date], " — ")}
                        {nonEmpty(ed.grade) ? ` • ${ed.grade}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {resume.certifications.length > 0 && (
              <section className="resume-section">
                <SmallTitle>CERTIFICATIONS</SmallTitle>
                <div className="mt-3 space-y-2">
                  {resume.certifications.map((c, idx) => (
                    <div key={idx} className="resume-avoid-break">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-slate-600">{joinNonEmpty([c.issuer, c.date], " • ")}</div>
                      {nonEmpty(c.credential_url) && <div className="text-xs text-slate-600 break-words">{c.credential_url}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="col-span-6 space-y-6">
            {resume.projects.length > 0 && (
              <section className="resume-section">
                <SmallTitle>PROJECTS</SmallTitle>
                <div className="mt-3 space-y-3">
                  {resume.projects.map((pr, idx) => (
                    <div key={idx} className="resume-avoid-break">
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="font-medium">{pr.name}</div>
                        {nonEmpty(pr.link) && <div className="text-xs text-slate-600 break-words">{pr.link}</div>}
                      </div>
                      {(pr.tech_stack || []).filter(nonEmpty).length > 0 && (
                        <div className="mt-1 text-xs text-slate-600">
                          {(pr.tech_stack || []).filter(nonEmpty).slice(0, 12).join(" • ")}
                        </div>
                      )}
                      {nonEmpty(pr.description) && <p className="mt-1 text-sm text-slate-700 leading-relaxed">{pr.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {skillsGroups.length > 0 && (
              <section className="resume-section">
                <SmallTitle>SKILLS</SmallTitle>
                <div className="mt-3 space-y-3">
                  {skillsGroups.map((g) => (
                    <div key={g.label} className="resume-avoid-break">
                      <div className="text-xs font-medium text-slate-700">{g.label}</div>
                      <div className="mt-1 text-sm text-slate-700">{g.items.join(" • ")}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MinimalTemplate;

