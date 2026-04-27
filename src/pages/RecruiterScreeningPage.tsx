import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type CandidateResult = {
  id: string;
  upload_item_id: string;
  score: number;
  rationale: string;
  matched_skills?: string[];
  highlights?: Record<string, unknown>;
  profile_json: {
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
  };
};

type ScreeningRunResponse = {
  run: { id: string; status: string; candidate_count: number };
  candidates: CandidateResult[];
};

type PastRun = {
  id: string;
  status: string;
  candidate_count: number;
  batch_id?: string | null;
  job_id?: string | null;
  job_title?: string | null;
  instruction_prompt: string;
  error_message?: string | null;
  created_at: string;
};

export default function RecruiterScreeningPage() {
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ScreeningRunResponse | null>(null);

  // Screening run creation
  const [searchParams] = useSearchParams();
  const [sourceMode, setSourceMode] = useState<"job" | "batch">(
    searchParams.get("job_id") ? "job" : "batch",
  );
  const [batchId, setBatchId] = useState("");
  const [jobId, setJobId] = useState(searchParams.get("job_id") || "");
  const [instructionPrompt, setInstructionPrompt] = useState("");
  const [minYears, setMinYears] = useState("");
  const [requiredSkillsText, setRequiredSkillsText] = useState("");
  const [creatingRun, setCreatingRun] = useState(false);

  useEffect(() => {
    const incoming = searchParams.get("job_id");
    if (incoming) {
      setSourceMode("job");
      setJobId(incoming);
    }
  }, [searchParams]);

  const [shortlistName, setShortlistName] = useState("");
  const [savingShortlist, setSavingShortlist] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [notesByUpload, setNotesByUpload] = useState<Record<string, string>>({});

  // Past runs panel
  const [pastRuns, setPastRuns] = useState<PastRun[]>([]);
  const [pastRunsLoading, setPastRunsLoading] = useState(false);

  const refreshPastRuns = async () => {
    setPastRunsLoading(true);
    try {
      const list = await apiGet<PastRun[]>("/api/v1/recruiter/screening/runs");
      setPastRuns(list);
    } catch {
      setPastRuns([]);
    } finally {
      setPastRunsLoading(false);
    }
  };

  useEffect(() => {
    void refreshPastRuns();
  }, []);

  const allSelectedUploadIds = useMemo(
    () => Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k),
    [selectedIds],
  );

  const populateFromRun = (res: ScreeningRunResponse) => {
    setData(res);
    const initial: Record<string, boolean> = {};
    for (const c of res.candidates) initial[c.upload_item_id] = true;
    setSelectedIds(initial);
    setNotesByUpload({});
  };

  const loadRunById = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<ScreeningRunResponse>(`/api/v1/recruiter/screening/runs/${id}`);
      populateFromRun(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load screening run");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRun = async () => {
    if (!runId.trim()) return;
    await loadRunById(runId.trim());
  };

  const createRun = async () => {
    const sourceId = sourceMode === "job" ? jobId.trim() : batchId.trim();
    if (!sourceId) {
      toast.error(`${sourceMode === "job" ? "Job ID" : "Batch ID"} is required`);
      return;
    }
    // Recruiter notes are required only in batch mode (no JD context for the AI).
    if (sourceMode === "batch" && !instructionPrompt.trim()) {
      toast.error("Instruction prompt is required when screening a PDF batch");
      return;
    }
    setCreatingRun(true);
    setError("");
    try {
      const filters: Record<string, unknown> = {};
      const minYearsVal = parseFloat(minYears);
      if (!Number.isNaN(minYearsVal)) filters.min_years_experience = minYearsVal;
      const reqSkills = requiredSkillsText.split(",").map((s) => s.trim()).filter(Boolean);
      if (reqSkills.length > 0) filters.required_skills = reqSkills;

      const body: Record<string, unknown> = {
        instruction_prompt: instructionPrompt.trim(),
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };
      if (sourceMode === "job") body.job_id = sourceId;
      else body.batch_id = sourceId;

      const res = await apiPost<ScreeningRunResponse>("/api/v1/recruiter/screening/runs", body);
      setRunId(res.run.id);
      populateFromRun(res);
      toast.success(`Screening run completed: ${res.candidates.length} candidates ranked`);
      void refreshPastRuns();
    } catch (e: any) {
      setError(e?.message || "Failed to create screening run");
      toast.error(e?.message || "Failed to create screening run");
    } finally {
      setCreatingRun(false);
    }
  };

  const saveToShortlist = async () => {
    if (!data?.run?.id) return;
    if (allSelectedUploadIds.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }
    setSavingShortlist(true);
    try {
      const notesPayload: Record<string, string> = {};
      for (const uid of allSelectedUploadIds) {
        const n = (notesByUpload[uid] || "").trim();
        if (n) notesPayload[uid] = n;
      }
      const res = await apiPost<{ shortlist: { id: string; name: string } }>(
        "/api/v1/recruiter/shortlists",
        {
          run_id: data.run.id,
          name: shortlistName || undefined,
          selected_upload_item_ids: allSelectedUploadIds,
          notes: Object.keys(notesPayload).length > 0 ? notesPayload : undefined,
        },
      );
      toast.success(`Saved shortlist: ${res.shortlist.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save shortlist");
    } finally {
      setSavingShortlist(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Run New Screening</CardTitle>
          <CardDescription>
            Score candidates against your instruction. Pick a source: applicants of one of your posted Jobs, or a recruiter-uploaded PDF Batch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Source</Label>
            <RadioGroup
              value={sourceMode}
              onValueChange={(v) => setSourceMode(v as "job" | "batch")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="src-job" value="job" />
                <Label htmlFor="src-job" className="cursor-pointer">Job applicants</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="src-batch" value="batch" />
                <Label htmlFor="src-batch" className="cursor-pointer">Uploaded PDF batch</Label>
              </div>
            </RadioGroup>
          </div>

          {sourceMode === "job" ? (
            <div className="space-y-2">
              <Label>Job ID</Label>
              <Input
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="paste from My Jobs → Job Detail page"
              />
              <p className="text-xs text-muted-foreground">Only candidates who applied to this job will be screened.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Batch ID</Label>
              <Input
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="paste from Upload CVs page"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Instruction Prompt
              {sourceMode === "job" && <span className="text-muted-foreground font-normal"> (optional — the job description drives the match)</span>}
            </Label>
            <Textarea
              value={instructionPrompt}
              onChange={(e) => setInstructionPrompt(e.target.value)}
              placeholder={
                sourceMode === "job"
                  ? "Optional extra notes (e.g. prioritise candidates with React + Tailwind)."
                  : "e.g. Looking for a React + FastAPI engineer with at least 2 years backend experience."
              }
              rows={3}
            />
            {sourceMode === "job" && (
              <p className="text-xs text-muted-foreground">
                In job mode, candidates are ranked by how well their resume matches this job's <span className="font-medium">title</span> + <span className="font-medium">description</span>. Anything you type here is appended as extra recruiter notes.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min Years Experience (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={minYears}
                onChange={(e) => setMinYears(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Required Skills (comma-separated, optional)</Label>
              <Input
                value={requiredSkillsText}
                onChange={(e) => setRequiredSkillsText(e.target.value)}
                placeholder="React, FastAPI"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={createRun}
            disabled={
              creatingRun ||
              (sourceMode === "job"
                ? !jobId.trim()
                : !batchId.trim() || !instructionPrompt.trim())
            }
          >
            {creatingRun ? "Running screening..." : "Run Screening"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">Past Screening Runs</CardTitle>
              <CardDescription>Every screening you've run. Click one to load its ranked candidates.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={refreshPastRuns} disabled={pastRunsLoading}>
              {pastRunsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pastRunsLoading && pastRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : pastRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No screening runs yet. Run one above to see it listed here.
            </p>
          ) : (
            <div className="space-y-2">
              {pastRuns.map((r) => {
                const isActive = r.id === runId;
                const sourceLabel = r.job_id
                  ? `Job: ${r.job_title || `#${r.job_id}`}`
                  : r.batch_id
                  ? `Batch #${r.batch_id}`
                  : "Unknown source";
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleString() : "";
                const promptPreview = (r.instruction_prompt || "").slice(0, 140);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRunId(r.id);
                      void loadRunById(r.id);
                    }}
                    className={`w-full text-left rounded-lg border p-3 transition hover:bg-muted/50 ${
                      isActive ? "border-accent bg-muted/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          Run #{r.id} — {sourceLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateStr} • {r.candidate_count} candidate{r.candidate_count === 1 ? "" : "s"} •{" "}
                          status: <span className="font-medium">{r.status}</span>
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {r.id}
                      </span>
                    </div>
                    {promptPreview && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {promptPreview}
                        {r.instruction_prompt.length > 140 ? "…" : ""}
                      </p>
                    )}
                    {r.error_message && (
                      <p className="mt-1 text-xs text-destructive">{r.error_message}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Or Load Existing Run by ID</CardTitle>
          <CardDescription>If you have a Run ID from elsewhere, paste it here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="Enter screening run ID..."
            />
            <Button type="button" onClick={loadRun} disabled={loading || !runId.trim()}>
              {loading ? "Loading..." : "Load"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Save to Shortlist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Shortlist name (optional)</Label>
                <Input
                  value={shortlistName}
                  onChange={(e) => setShortlistName(e.target.value)}
                  placeholder="e.g. React Developer - Top 10"
                />
              </div>
              <Button type="button" onClick={saveToShortlist} disabled={savingShortlist || allSelectedUploadIds.length === 0}>
                {savingShortlist ? "Saving..." : `Save ${allSelectedUploadIds.length} to Shortlist`}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {data.candidates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No candidates found in this run.
                </CardContent>
              </Card>
            ) : (
              data.candidates.map((c, idx) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          #{idx + 1} {c.profile_json?.name || "Unknown Candidate"}
                        </CardTitle>
                        <CardDescription>
                          Score: <span className="font-medium">{c.score}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!selectedIds[c.upload_item_id]}
                          onCheckedChange={(v) =>
                            setSelectedIds((prev) => ({ ...prev, [c.upload_item_id]: Boolean(v) }))
                          }
                        />
                        <span className="text-sm">Select</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Email:</span> {c.profile_json?.email || "-"}</p>
                    <p><span className="font-medium">Phone:</span> {c.profile_json?.phone || "-"}</p>
                    <p><span className="font-medium">Skills:</span> {(c.profile_json?.skills || []).join(", ") || "-"}</p>
                    <p><span className="font-medium">Rationale:</span> {c.rationale || "-"}</p>
                    {(c.matched_skills || []).length > 0 && (
                      <p><span className="font-medium">Matched Skills:</span> {(c.matched_skills || []).join(", ")}</p>
                    )}
                    <div className="space-y-1 pt-1">
                      <Label htmlFor={`note-${c.upload_item_id}`} className="text-xs text-muted-foreground">
                        Note (optional, saved with shortlist)
                      </Label>
                      <Textarea
                        id={`note-${c.upload_item_id}`}
                        value={notesByUpload[c.upload_item_id] || ""}
                        onChange={(e) =>
                          setNotesByUpload((prev) => ({ ...prev, [c.upload_item_id]: e.target.value }))
                        }
                        placeholder="Add a note for this candidate..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

