export type Role = "ADMIN" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "DEACTIVATED";

export type AccessContext = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  companyId: string;
  companyName: string;
  departmentIds: string[];
};

export function isAdmin(user: Pick<AccessContext, "role">) {
  return user.role === "ADMIN";
}
