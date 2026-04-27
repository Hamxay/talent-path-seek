import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Upload as UploadIcon } from "lucide-react";

import { API_BASE_URL, apiGet, apiPost, getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UploadBatch = {
  id: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  status: string;
  created_at: string;
};

type UploadItem = {
  id: string;
  filename: string;
  size_bytes: number;
  status: "pending" | "text_extracted" | "parsed_ok" | "parsed_failed";
  error_message?: string | null;
};

const POLL_INTERVAL_MS = 2500;

function statusVariant(s: UploadItem["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (s === "parsed_ok") return "default";
  if (s === "parsed_failed") return "destructive";
  if (s === "text_extracted") return "secondary";
  return "outline";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RecruiterUploadsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [batch, setBatch] = useState<UploadBatch | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState("");
  const [reparsingId, setReparsingId] = useState<string | null>(null);

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles(arr);
  };

  const startUpload = async () => {
    if (files.length === 0) {
      toast.error("Pick at least one PDF first");
      return;
    }
    setUploading(true);
    setError("");
    setBatch(null);
    setItems([]);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);

      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/recruiter/uploads/batches`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || "Upload failed");
      }
      const data = await res.json();
      setBatch(data.batch);
      setItems(data.items || []);
      toast.success(`Uploaded ${data.items?.length || 0} file(s). Parsing in background...`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFiles([]);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!batch?.id) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const [b, list] = await Promise.all([
          apiGet<UploadBatch>(`/api/v1/recruiter/uploads/batches/${batch.id}`),
          apiGet<UploadItem[]>(`/api/v1/recruiter/uploads/batches/${batch.id}/items`),
        ]);
        if (cancelled) return;
        setBatch(b);
        setItems(list);
        if (b.status !== "completed") {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to refresh batch status");
      }
    };

    timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [batch?.id]);

  const copyBatchId = async () => {
    if (!batch?.id) return;
    await navigator.clipboard.writeText(batch.id);
    toast.success("Batch ID copied");
  };

  const reparseItem = async (itemId: string) => {
    setReparsingId(itemId);
    try {
      await apiPost(`/api/v1/recruiter/uploads/items/${itemId}/reparse`);
      toast.success("Re-parsed");
      if (batch?.id) {
        const list = await apiGet<UploadItem[]>(`/api/v1/recruiter/uploads/batches/${batch.id}/items`);
        setItems(list);
      }
    } catch (e: any) {
      toast.error(e?.message || "Re-parse failed");
    } finally {
      setReparsingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Upload CV PDFs</CardTitle>
          <CardDescription>
            Upload one or more PDF resumes. Each file will be parsed in the background and turned into a structured profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handlePickFiles}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
          />
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
              {" • "}
              {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
            </p>
          )}
          <Button type="button" onClick={startUpload} disabled={uploading || files.length === 0}>
            <UploadIcon className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload & Parse"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {batch && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg">Batch Status</CardTitle>
                <CardDescription>
                  {batch.processed_items}/{batch.total_items} processed
                  {batch.failed_items > 0 ? ` • ${batch.failed_items} failed` : ""}
                  {" • "}status: {batch.status}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{batch.id}</code>
                <Button type="button" size="sm" variant="outline" onClick={copyBatchId}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Batch ID
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this batch yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const canReparse = it.status === "parsed_failed" || it.status === "text_extracted";
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.filename}</TableCell>
                        <TableCell>{formatBytes(it.size_bytes)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(it.status)}>{it.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={it.error_message || ""}>
                          {it.error_message || ""}
                        </TableCell>
                        <TableCell>
                          {canReparse && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={reparsingId === it.id}
                              onClick={() => reparseItem(it.id)}
                            >
                              {reparsingId === it.id ? "Re-parsing..." : "Re-parse"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Once parsing is complete, copy the Batch ID and use it in the Screening page to rank these candidates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
