export function SetupRequired({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-zinc-500">PrivateAI</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Database not connected</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The app deployed, but it cannot reach Postgres. Vercel has no local database. Add a hosted
          Postgres URL in the Vercel project, then redeploy.
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>Vercel project → Settings → Environment Variables</li>
          <li>
            Set <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code> to a cloud Postgres
            connection string (Neon, Supabase, or Railway)
          </li>
          <li>
            Set <code className="rounded bg-zinc-100 px-1">AUTH_SECRET</code> to a long random string
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
