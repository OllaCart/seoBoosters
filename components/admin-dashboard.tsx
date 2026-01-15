"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Submission {
  id: string
  email: string
  message: string | null
  image_url: string | null
  created_at: string
}

interface AdminDashboardProps {
  initialSubmissions: Submission[]
}

export function AdminDashboard({ initialSubmissions }: AdminDashboardProps) {
  const [submissions] = useState<Submission[]>(initialSubmissions)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.message?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const exportToCSV = () => {
    const headers = ["Email", "Message", "Image URL", "Created At"]
    const rows = submissions.map((sub) => [
      sub.email,
      sub.message || "",
      sub.image_url || "",
      new Date(sub.created_at).toLocaleString(),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stybl-waitlist-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">
              STYBL <span className="text-yellow-400">Admin</span>
            </h1>
            <p className="mt-2 text-slate-400">Waitlist Submissions Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Total Submissions</p>
              <p className="text-3xl font-bold text-yellow-400">{submissions.length}</p>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-950 hover:from-yellow-500 hover:to-yellow-700"
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search by email or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id} className="border-slate-800 bg-slate-900 p-6">
              <div className="flex items-start gap-4">
                {submission.image_url ? (
                  <img
                    src={submission.image_url || "/placeholder.svg"}
                    alt="Coin"
                    className="h-16 w-16 flex-shrink-0 rounded-full border-2 border-yellow-400 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-yellow-400 bg-gradient-to-br from-yellow-300 to-yellow-600 text-2xl font-bold text-yellow-900">
                    $
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{submission.email}</p>
                  {submission.message && <p className="mt-2 text-sm text-slate-300">{submission.message}</p>}
                  <p className="mt-2 text-xs text-slate-500">{new Date(submission.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-slate-500">
              {searchQuery ? "No submissions match your search." : "No submissions yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
