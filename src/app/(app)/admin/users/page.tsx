import { UsersClient } from "@/components/admin/users-client";
import { attachUsers, listDepartments, listUsers } from "@/lib/db";
import { requireAdminPage } from "@/services/auth/session";

export default async function UsersPage() {
  const admin = await requireAdminPage();
  const [users, departments] = await Promise.all([
    listUsers(admin.companyId).then(attachUsers),
    listDepartments(admin.companyId),
  ]);

  return (
    <UsersClient
      currentUserId={admin.id}
      departments={departments}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        departments: user.departments
          .map((row) => row.department)
          .filter(Boolean)
          .map((department) => ({ id: department!.id, name: department!.name })),
      }))}
    />
  );
}
