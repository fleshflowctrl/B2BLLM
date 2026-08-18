import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { findUsersByEmail, getCompany, updateUser } from "@/lib/db";
import { verifyPassword } from "@/services/auth/password";
import { writeAuditLog } from "@/services/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret:
    process.env.AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "temporary-dev-secret-change-me-at-least-32-chars",
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const matches = await findUsersByEmail(email);
        if (matches.length !== 1) return null;
        const user = matches[0];
        if (user.status !== "ACTIVE") return null;
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;
        await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
        const company = await getCompany(user.companyId);
        await writeAuditLog({
          companyId: user.companyId,
          userId: user.id,
          event: "USER_LOGIN",
          metadata: { email: user.email },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: company?.name ?? "",
        };
      },
    }),
  ],
});
