"use server"

import { notifyWaitlistDigest } from "@/lib/notify-waitlist"
import { getSupabaseServiceClient } from "@/lib/supabase/admin"

export async function emailAllWaitlistEntries() {
  try {
    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from("waitlist_submissions")
      .select("email, message, image_url, created_at")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[stybl] Failed to load waitlist for digest:", error)
      return { error: "Failed to load submissions from the database." }
    }

    const rows = data || []
    if (rows.length === 0) {
      return { error: "No waitlist submissions to email." }
    }

    const result = await notifyWaitlistDigest(rows)
    if (!result.sent) {
      if (result.reason === "missing_resend_api_key") {
        return {
          error:
            "RESEND_API_KEY is not set in Vercel. Add it, redeploy, then try again.",
        }
      }
      return { error: "Failed to send email. Check Resend configuration." }
    }

    return { success: true, count: rows.length }
  } catch (error) {
    console.error("[stybl] emailAllWaitlistEntries error:", error)
    return {
      error:
        "Admin database access failed. Ensure SUPABASE_SERVICE_ROLE_KEY is set.",
    }
  }
}
