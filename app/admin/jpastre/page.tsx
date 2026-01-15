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
    return <div className="p-8 text-red-500">Error loading submissions</div>
  }

  return <AdminDashboard initialSubmissions={submissions || []} />
}
