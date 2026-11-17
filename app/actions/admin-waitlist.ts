"use server"

import { timingSafeEqual } from "crypto"
import { notifyWaitlistDigest } from "@/lib/notify-waitlist"
import { getSupabaseServiceClient } from "@/lib/supabase/admin"

const PAGE_SIZE = 1000

function secretsEqual(provided: string, expected: string) {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

function assertAdminSecret(adminSecret: string) {
  const expected = process.env.STYBL_ADMIN_SECRET
  if (!expected) {
    return {
      error:
        "STYBL_ADMIN_SECRET is not set in Vercel. Add it, redeploy, then try again.",
    } as const
  }
  if (!adminSecret || !secretsEqual(adminSecret, expected)) {
    return { error: "Unauthorized." } as const
  }
  return null
}

export async function emailAllWaitlistEntries(adminSecret: string) {
  const authError = assertAdminSecret(adminSecret)
  if (authError) {
    return authError
  }

  try {
    const supabase = getSupabaseServiceClient()
    const rows: {
      email: string
      message: string | null
      image_url: string | null
      created_at: string
    }[] = []

    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from("waitlist_submissions")
        .select("email, message, image_url, created_at")
        .order("created_at", { ascending: true })
        .range(from, to)

      if (error) {
        console.error("[stybl] Failed to load waitlist for digest:", error)
        return { error: "Failed to load submissions from the database." }
      }

      const page = data || []
      rows.push(...page)
      if (page.length < PAGE_SIZE) {
        break
      }
    }

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
