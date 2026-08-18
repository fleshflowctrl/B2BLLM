import { UsersClient } from "@/components/admin/users-client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/services/auth/session";

export default async function UsersPage() {
  const admin = await requireAdminPage();
  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: admin.companyId },
      include: { departments: { include: { department: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({
      where: { companyId: admin.companyId },
      orderBy: { name: "asc" },
    }),
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
        departments: user.departments.map((row) => ({
          id: row.department.id,
          name: row.department.name,
        })),
      }))}
    />
  );
}
