import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/services/auth/password";
import { writeAuditLog } from "@/services/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
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

        let matches;
        try {
          matches = await prisma.user.findMany({
            where: { email },
            include: { company: true },
          });
        } catch (error) {
          console.error("Login database lookup failed. Did you run migrations and seed?", error);
          return null;
        }
        if (matches.length !== 1) return null;

        const user = matches[0];
        if (user.status !== "ACTIVE") return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

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
          companyName: user.company.name,
        };
      },
    }),
    // Microsoft Entra ID can be added here later:
    // MicrosoftEntraID({ clientId, clientSecret, issuer })
  ],
});
