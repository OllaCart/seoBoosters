const DEFAULT_NOTIFY_TO = "john@jpastre.com"

type WaitlistNotifyPayload = {
  email: string
  message: string | null
  imageUrl: string | null
}

/**
 * Emails a waitlist signup to John. Uses Resend when RESEND_API_KEY is set.
 * Failures are logged and do not block the waitlist insert.
 */
export async function notifyWaitlistSignup(payload: WaitlistNotifyPayload) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error(
      "[stybl] RESEND_API_KEY is not set; waitlist stored but email not sent to",
      process.env.WAITLIST_NOTIFY_TO || DEFAULT_NOTIFY_TO,
    )
    return { sent: false as const, reason: "missing_resend_api_key" }
  }

  const to = process.env.WAITLIST_NOTIFY_TO || DEFAULT_NOTIFY_TO
  const from =
    process.env.WAITLIST_NOTIFY_FROM || "STYBL Waitlist <onboarding@resend.dev>"

  const lines = [
    "New STYBL waitlist signup",
    "",
    `Email: ${payload.email}`,
    `Message: ${payload.message || "(none)"}`,
    `Image: ${payload.imageUrl || "(none)"}`,
    `Time: ${new Date().toISOString()}`,
  ]

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `STYBL waitlist: ${payload.email}`,
      text: lines.join("\n"),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("[stybl] Resend email failed:", response.status, body)
    return { sent: false as const, reason: "resend_error" }
  }

  return { sent: true as const }
}

type WaitlistRow = {
  email: string
  message: string | null
  image_url: string | null
  created_at: string
}

/**
 * Emails a digest of all waitlist rows to John (admin export).
 */
export async function notifyWaitlistDigest(rows: WaitlistRow[]) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[stybl] RESEND_API_KEY is not set; cannot email waitlist digest")
    return { sent: false as const, reason: "missing_resend_api_key" as const }
  }

  const to = process.env.WAITLIST_NOTIFY_TO || DEFAULT_NOTIFY_TO
  const from =
    process.env.WAITLIST_NOTIFY_FROM || "STYBL Waitlist <onboarding@resend.dev>"

  const csvHeader = "email,message,image_url,created_at"
  const csvRows = rows.map((row) =>
    [row.email, row.message || "", row.image_url || "", row.created_at]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  )

  const text = [
    `STYBL waitlist digest (${rows.length} submissions)`,
    "",
    ...rows.map(
      (row, i) =>
        `${i + 1}. ${row.email} | ${row.message || "(no message)"} | ${row.created_at}`,
    ),
    "",
    "CSV:",
    csvHeader,
    ...csvRows,
  ].join("\n")

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `STYBL waitlist digest (${rows.length})`,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("[stybl] Resend digest failed:", response.status, body)
    return { sent: false as const, reason: "resend_error" as const }
  }

  return { sent: true as const }
}
