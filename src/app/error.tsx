"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SetupRequired } from "@/components/setup-required";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();
  const isRedirect =
    error.message === "NEXT_REDIRECT" || (error.digest?.startsWith("NEXT_REDIRECT") ?? false);

  useEffect(() => {
    if (isRedirect) router.replace("/login");
  }, [isRedirect, router]);

  if (isRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Redirecting to sign in...
      </div>
    );
  }

  return <SetupRequired detail={error.message} />;
}
