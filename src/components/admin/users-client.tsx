"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

type Department = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  status: "ACTIVE" | "DEACTIVATED";
  departments: Department[];
};

export function UsersClient({
  users,
  departments,
  currentUserId,
}: {
  users: UserRow[];
  departments: Department[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
    departmentIds: [] as string[],
  });

  async function createUser() {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || "Could not create user");
      return;
    }
    toast.success("User created");
    setOpen(false);
    router.refresh();
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json();
      toast.error(payload.error || "Update failed");
      return;
    }
    router.refresh();
  }

  async function createDepartment() {
    const response = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptName }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || "Could not create department");
      return;
    }
    setDeptName("");
    toast.success("Department created");
    router.refresh();
  }

  return (
    <div className="h-full overflow-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-zinc-500">Roles, departments, and account status.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create user</Button>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium">Departments</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {departments.map((department) => (
            <span key={department.id} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
              {department.name}
            </span>
          ))}
        </div>
        <div className="flex max-w-md gap-2">
          <Input
            value={deptName}
            onChange={(event) => setDeptName(event.target.value)}
            placeholder="New department"
          />
          <Button variant="outline" onClick={() => void createDepartment()}>
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role === "ADMIN" ? "Admin" : "Employee"}</TableCell>
                <TableCell className="text-zinc-500">
                  {user.departments.map((item) => item.name).join(", ") || "—"}
                </TableCell>
                <TableCell>{user.status === "ACTIVE" ? "Active" : "Deactivated"}</TableCell>
                <TableCell className="text-right">
                  {user.id !== currentUserId ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        void patchUser(user.id, {
                          status: user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE",
                        })
                      }
                    >
                      {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              placeholder="Temporary password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value as "ADMIN" | "EMPLOYEE" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              {departments.map((department) => (
                <label key={department.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.departmentIds.includes(department.id)}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        departmentIds: checked
                          ? [...form.departmentIds, department.id]
                          : form.departmentIds.filter((id) => id !== department.id),
                      })
                    }
                  />
                  {department.name}
                </label>
              ))}
            </div>
            <Button onClick={() => void createUser()}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
