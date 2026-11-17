import nodemailer from "nodemailer"

const DEFAULT_NOTIFY_TO = "john@jpastre.com"

type WaitlistNotifyPayload = {
  email: string
  message: string | null
  imageUrl: string | null
}

type SendResult =
  | { sent: true }
  | { sent: false; reason: "missing_gmail_credentials" | "smtp_error" }

function getGmailConfig() {
  const user = process.env.GMAIL_USER || process.env.WAITLIST_GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.WAITLIST_GMAIL_APP_PASSWORD
  const to = process.env.WAITLIST_NOTIFY_TO || DEFAULT_NOTIFY_TO
  const from = process.env.WAITLIST_NOTIFY_FROM || (user ? `STYBL Waitlist <${user}>` : null)
  return { user, pass, to, from }
}

async function sendMail(subject: string, text: string): Promise<SendResult> {
  const { user, pass, to, from } = getGmailConfig()
  if (!user || !pass || !from) {
    console.error(
      "[stybl] GMAIL_USER / GMAIL_APP_PASSWORD not set; email not sent to",
      to,
    )
    return { sent: false, reason: "missing_gmail_credentials" }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    })

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    })

    return { sent: true }
  } catch (error) {
    console.error("[stybl] Gmail SMTP send failed:", error)
    return { sent: false, reason: "smtp_error" }
  }
}

/**
 * Emails a waitlist signup to John via Gmail app password SMTP.
 * Failures are logged and do not block the waitlist insert.
 */
export async function notifyWaitlistSignup(payload: WaitlistNotifyPayload) {
  const lines = [
    "New STYBL waitlist signup",
    "",
    `Email: ${payload.email}`,
    `Message: ${payload.message || "(none)"}`,
    `Image: ${payload.imageUrl || "(none)"}`,
    `Time: ${new Date().toISOString()}`,
  ]

  return sendMail(`STYBL waitlist: ${payload.email}`, lines.join("\n"))
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

  return sendMail(`STYBL waitlist digest (${rows.length})`, text)
}
