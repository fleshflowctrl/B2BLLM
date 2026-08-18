export function SetupRequired({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-zinc-500">PrivateAI</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Database not connected</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The app is connected to Supabase on the client, but Prisma still needs the database
          connection string. Copy it from Supabase → Project Settings → Database, then add it in
          Vercel and redeploy.
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>Supabase → Project Settings → Database → URI</li>
          <li>
            Vercel → Settings → Environment Variables → set{" "}
            <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code>
          </li>
          <li>
            Also set <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
          </li>
          <li>Redeploy</li>
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
