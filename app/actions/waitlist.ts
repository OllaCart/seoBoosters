"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

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

  const supabase = await getSupabaseServerClient()

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

  return { success: true }
}

export async function getWaitlistCoins() {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("waitlist_submissions")
    .select("id, image_url, coin_x, coin_y, coin_rotation")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[v0] Error loading coins:", error)
    return { coins: [] }
  }

  return { coins: data || [] }
}
