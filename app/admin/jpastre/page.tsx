import { getSupabaseServiceClient } from "@/lib/supabase/admin"
import { AdminDashboard } from "@/components/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  try {
    const supabase = getSupabaseServiceClient()

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
  } catch (error) {
    console.error("[v0] Admin supabase client error:", error)
    return (
      <div className="space-y-2 p-8 text-red-500">
        <p>Error loading submissions</p>
        <p className="text-sm text-red-300">
          Set <code className="rounded bg-slate-900 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel
          (server-only) so admin can read waitlist emails without exposing them to the public anon key.
        </p>
      </div>
    )
  }
}
