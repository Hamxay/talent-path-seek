import { Button } from "@/components/ui/button";

export type ResumeTemplateKey = "modern" | "classic" | "tech" | "minimal";

const templates: Array<{ key: ResumeTemplateKey; label: string }> = [
  { key: "modern", label: "Modern" },
  { key: "classic", label: "Classic" },
  { key: "tech", label: "Tech" },
  { key: "minimal", label: "Minimal" },
];

export function TemplateSelector({
  value,
  onChange,
}: {
  value: ResumeTemplateKey;
  onChange: (v: ResumeTemplateKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <Button
          key={t.key}
          type="button"
          variant={value === t.key ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}

export default TemplateSelector;

