import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiDelete, apiGet, API_BASE_URL, getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Shortlist = {
  id: string;
  name: string;
  created_at: string;
};

type ShortlistItem = {
  id: string;
  upload_item_id: string;
  score: number;
  rationale: string;
  profile_json: { name?: string; email?: string; phone?: string; skills?: string[] };
  note?: string | null;
};

type ShortlistDetails = {
  shortlist: Shortlist;
  items: ShortlistItem[];
};

export default function RecruiterShortlistsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<ShortlistDetails | null>(null);

  const loadShortlists = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await apiGet<Shortlist[]>("/api/v1/recruiter/shortlists");
      setShortlists(list);
      if (list.length === 0) {
        setSelectedId(null);
        setDetails(null);
      } else {
        const target = selectedId && list.some((s) => s.id === selectedId) ? selectedId : list[0].id;
        setSelectedId(target);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load shortlists");
    } finally {
      setLoading(false);
    }
  };

  const loadShortlistDetails = async (id: string) => {
    try {
      const d = await apiGet<ShortlistDetails>(`/api/v1/recruiter/shortlists/${id}`);
      setDetails(d);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load shortlist details");
    }
  };

  useEffect(() => {
    loadShortlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadShortlistDetails(selectedId);
  }, [selectedId]);

  const removeItem = async (itemId: string) => {
    if (!selectedId) return;
    try {
      await apiDelete(`/api/v1/recruiter/shortlists/${selectedId}/items/${itemId}`);
      toast.success("Removed from shortlist");
      await loadShortlistDetails(selectedId);
      await loadShortlists();
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove item");
    }
  };

  const exportCsv = async () => {
    if (!selectedId) return;
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/recruiter/shortlists/${selectedId}/export-csv`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shortlist-${selectedId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "CSV export failed");
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading shortlists...</div>;
  if (error) return <div className="text-destructive">{error}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-display text-lg">Shortlists</CardTitle>
          <CardDescription>Your saved recruiter shortlists</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {shortlists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shortlists yet.</p>
          ) : (
            shortlists.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant={selectedId === s.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedId(s.id)}
              >
                {s.name}
              </Button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">{details?.shortlist?.name || "Select a shortlist"}</CardTitle>
              <CardDescription>{details ? `${details.items.length} candidates` : ""}</CardDescription>
            </div>
            <Button type="button" onClick={exportCsv} disabled={!selectedId}>
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!details ? (
            <p className="text-sm text-muted-foreground">Select a shortlist to view details.</p>
          ) : details.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">This shortlist is empty.</p>
          ) : (
            details.items.map((it, idx) => (
              <Card key={it.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        #{idx + 1} {it.profile_json?.name || "Unknown Candidate"}
                      </p>
                      <p className="text-sm text-muted-foreground">Score: {it.score}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeItem(it.id)}>
                      Remove
                    </Button>
                  </div>
                  <p className="text-sm">Email: {it.profile_json?.email || "-"}</p>
                  <p className="text-sm">Phone: {it.profile_json?.phone || "-"}</p>
                  <p className="text-sm">Skills: {(it.profile_json?.skills || []).join(", ") || "-"}</p>
                  <p className="text-sm">Rationale: {it.rationale || "-"}</p>
                  {it.note && <p className="text-sm">Note: {it.note}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

