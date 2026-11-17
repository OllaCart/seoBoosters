import { getSupabaseServerClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin-dashboard"

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient()

  const { data: submissions, error } = await supabase
    .from("waitlist_submissions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching submissions:", error)
    const permissionDenied =
      error.code === "42501" || /permission denied/i.test(error.message || "")
    return (
      <div className="space-y-2 p-8 text-red-500">
        <p>Error loading submissions</p>
        {permissionDenied ? (
          <p className="text-sm text-red-300">
            Database role cannot access waitlist_submissions. Run{" "}
            <code className="rounded bg-slate-900 px-1">scripts/004_fix_waitlist_permissions.sql</code>{" "}
            in the Supabase SQL Editor, then reload.
          </p>
        ) : (
          <p className="text-sm text-red-300">{error.message}</p>
        )}
      </div>
    )
  }

  return <AdminDashboard initialSubmissions={submissions || []} />
}
