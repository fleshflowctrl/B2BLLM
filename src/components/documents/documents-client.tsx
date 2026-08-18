"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatDate } from "@/lib/format";

type Department = { id: string; name: string };
type Doc = {
  id: string;
  originalFilename: string;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  visibility: "ALL_EMPLOYEES" | "DEPARTMENTS";
  fileSize: number;
  createdAt: string;
  uploadedByName: string;
  errorMessage: string | null;
  departments: Department[];
};

const statusLabel: Record<Doc["status"], string> = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

export function DocumentsClient({
  isAdmin,
  documents,
  departments,
}: {
  isAdmin: boolean;
  documents: Doc[];
  departments: Department[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"ALL_EMPLOYEES" | "DEPARTMENTS">("DEPARTMENTS");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Doc | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("visibility", visibility);
      for (const id of departmentIds) form.append("departmentIds", id);
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Upload failed");
      toast.success("Document uploaded");
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Document deleted");
    router.refresh();
  }

  async function retry(id: string) {
    const response = await fetch(`/api/documents/${id}/retry`, { method: "POST" });
    if (!response.ok) {
      toast.error("Retry failed");
      return;
    }
    toast.success("Processing queued");
    router.refresh();
  }

  async function savePermissions() {
    if (!edit) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/documents/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility,
          departmentIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed");
      toast.success("Permissions updated");
      setEdit(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-zinc-500">Company files used as AI context.</p>
        </div>
        {isAdmin ? <Button onClick={() => setOpen(true)}>Upload</Button> : null}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>Date</TableHead>
              {isAdmin ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <a className="font-medium hover:underline" href={`/documents/${document.id}`}>
                    {document.originalFilename}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={document.status === "FAILED" ? "destructive" : "secondary"}>
                    {statusLabel[document.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {document.visibility === "ALL_EMPLOYEES"
                    ? "All employees"
                    : document.departments.map((item) => item.name).join(", ") || "—"}
                </TableCell>
                <TableCell>{formatBytes(document.fileSize)}</TableCell>
                <TableCell>{document.uploadedByName}</TableCell>
                <TableCell>{formatDate(document.createdAt)}</TableCell>
                {isAdmin ? (
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setEdit(document);
                        setVisibility(document.visibility);
                        setDepartmentIds(document.departments.map((item) => item.id));
                      }}
                    >
                      Permissions
                    </Button>
                    {document.status === "FAILED" ? (
                      <Button size="xs" variant="ghost" onClick={() => void retry(document.id)}>
                        Retry
                      </Button>
                    ) : null}
                    <Button size="xs" variant="ghost" onClick={() => void remove(document.id)}>
                      Delete
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
          </DialogHeader>
          <div
            className={`rounded-lg border border-dashed p-8 text-center text-sm ${drag ? "border-zinc-900 bg-zinc-50" : "border-zinc-300"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              const next = event.dataTransfer.files[0];
              if (next) setFile(next);
            }}
          >
            {file ? file.name : "Drop a PDF, TXT, Markdown, or DOCX file here"}
            <div className="mt-3">
              <input
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as typeof visibility)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPARTMENTS">Selected departments</SelectItem>
                <SelectItem value="ALL_EMPLOYEES">All employees</SelectItem>
              </SelectContent>
            </Select>
            {visibility === "DEPARTMENTS" ? (
              <div className="space-y-2">
                {departments.map((department) => (
                  <label key={department.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={departmentIds.includes(department.id)}
                      onCheckedChange={(checked) => {
                        setDepartmentIds((current) =>
                          checked
                            ? [...current, department.id]
                            : current.filter((id) => id !== department.id),
                        );
                      }}
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            ) : null}
            <Button disabled={!file || busy} onClick={() => void upload()}>
              {busy ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(value) => !value && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department access</DialogTitle>
          </DialogHeader>
          <Select value={visibility} onValueChange={(value) => setVisibility(value as typeof visibility)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEPARTMENTS">Selected departments</SelectItem>
              <SelectItem value="ALL_EMPLOYEES">All employees</SelectItem>
            </SelectContent>
          </Select>
          {visibility === "DEPARTMENTS" ? (
            <div className="space-y-2">
              {departments.map((department) => (
                <label key={department.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={departmentIds.includes(department.id)}
                    onCheckedChange={(checked) => {
                      setDepartmentIds((current) =>
                        checked
                          ? [...current, department.id]
                          : current.filter((id) => id !== department.id),
                      );
                    }}
                  />
                  {department.name}
                </label>
              ))}
            </div>
          ) : null}
          <Button disabled={busy} onClick={() => void savePermissions()}>
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
