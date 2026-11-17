"use server"

import { notifyWaitlistSignup } from "@/lib/notify-waitlist"
import { getSupabaseServiceClient } from "@/lib/supabase/admin"
import { getSupabaseServerClient } from "@/lib/supabase/server"

async function getWaitlistWriteClient() {
  // Prefer service role so inserts work even before anon GRANTs are applied.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      return getSupabaseServiceClient()
    } catch (error) {
      console.error("[stybl] Service role client unavailable, falling back to anon:", error)
    }
  }
  return getSupabaseServerClient()
}

export async function submitWaitlist(formData: FormData) {
  const email = formData.get("email") as string
  const message = formData.get("message") as string
  const imageUrl = formData.get("imageUrl") as string | null
  const coinX = formData.get("coinX") as string | null
  const coinY = formData.get("coinY") as string | null
  const coinRotation = formData.get("coinRotation") as string | null

  if (!email) {
    return { error: "Email is required" }
  }

  const supabase = await getWaitlistWriteClient()

  const { error } = await supabase.from("waitlist_submissions").insert({
    email,
    message: message || null,
    image_url: imageUrl || null,
    coin_x: coinX ? Number.parseFloat(coinX) : null,
    coin_y: coinY ? Number.parseFloat(coinY) : null,
    coin_rotation: coinRotation ? Number.parseFloat(coinRotation) : null,
  })

  if (error) {
    console.error("[v0] Error submitting to waitlist:", error)
    return { error: "Failed to submit. Please try again." }
  }

  try {
    await notifyWaitlistSignup({
      email,
      message: message || null,
      imageUrl: imageUrl || null,
    })
  } catch (notifyError) {
    console.error("[stybl] Waitlist notify failed:", notifyError)
  }

  return { success: true }
}

export async function getWaitlistCoins() {
  const supabase = await getSupabaseServerClient()

  // Public view exposes coin visuals only — not email/message PII.
  const { data, error } = await supabase
    .from("waitlist_coins")
    .select("id, image_url, coin_x, coin_y, coin_rotation")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[v0] Error loading coins:", error)
    return { coins: [] }
  }

  return { coins: data || [] }
}
