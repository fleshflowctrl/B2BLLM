"use client";

import { SetupRequired } from "@/components/setup-required";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  return <SetupRequired detail={error.message} />;
}
