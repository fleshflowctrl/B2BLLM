export function SetupRequired({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-zinc-500">PrivateAI</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Database setup required</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Run the Phase 2 SQL in Supabase, then set the public Supabase URL and key in Vercel.
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            SQL Editor → run <code className="rounded bg-zinc-100 px-1">supabase/migrations/20260818_phase2.sql</code>
          </li>
          <li>
            Then run <code className="rounded bg-zinc-100 px-1">supabase/fix-rls.sql</code> if older tables still block writes
          </li>
          <li>
            Vercel env: <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
        </ol>
        {detail ? (
          <pre className="mt-5 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700">
            {detail}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
