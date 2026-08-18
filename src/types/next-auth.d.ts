import type { Role } from "@/types/auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    companyId: string;
    companyName: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string;
      companyName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    companyId: string;
    companyName: string;
  }
}
