import type { ResumeJSON } from "@/components/resume/types";

export function nonEmpty(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

export function joinNonEmpty(values: Array<string | null | undefined>, sep = " • ") {
  return values.filter((v) => nonEmpty(v)).map((v) => v!.trim()).join(sep);
}

export function normalizeSkills(skills: ResumeJSON["skills"]): Array<{ label: string; items: string[] }> {
  if (!skills) return [];

  if (skills.categories && typeof skills.categories === "object") {
    const groups = Object.entries(skills.categories)
      .map(([label, items]) => ({
        label,
        items: (items || []).filter((s) => nonEmpty(s)).map((s) => s.trim()),
      }))
      .filter((g) => g.items.length > 0);
    if (groups.length > 0) return groups;
  }

  const flat = (skills.items || []).filter((s) => nonEmpty(s)).map((s) => s.trim());
  if (flat.length === 0) return [];
  return [{ label: "Skills", items: flat }];
}

