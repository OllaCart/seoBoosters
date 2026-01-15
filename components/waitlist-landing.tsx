"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { submitWaitlist, getWaitlistCoins } from "@/app/actions/waitlist"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Coin {
  id: string
  imageUrl: string | null
  x: number
  y: number
  rotation: number
  velocityY: number
  velocityX: number
  velocityRotation: number
  settled: boolean
}

type AnimationPhase = "idle" | "pressing" | "revealing" | "sliding" | "falling"

export function WaitlistLanding() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coins, setCoins] = useState<Coin[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number | null>(null)

  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle")
  const [pressProgress, setPressProgress] = useState(0)
  const [newCoinData, setNewCoinData] = useState<{ imageUrl: string | null } | null>(null)

  const COIN_SIZE = 80
  const COIN_RADIUS = COIN_SIZE / 2
  const SIDE_PADDING = 24
  const FLOOR_PADDING = 32

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
  const getBounds = () => ({
    left: SIDE_PADDING + COIN_RADIUS,
    right: window.innerWidth - SIDE_PADDING - COIN_RADIUS,
    bottom: window.innerHeight - FLOOR_PADDING - COIN_RADIUS,
  })

  useEffect(() => {
    const loadCoins = async () => {
      const { coins: existingCoins } = await getWaitlistCoins()
      const bounds = getBounds()
      const loadedCoins: Coin[] = existingCoins.map((coin: any) => ({
        id: coin.id,
        imageUrl: coin.image_url,
        x: clamp(
          coin.coin_x ?? Math.random() * (window.innerWidth - 200) + 100,
          bounds.left,
          bounds.right
        ),
        y: clamp(coin.coin_y ?? bounds.bottom, COIN_RADIUS + 40, bounds.bottom),
        rotation: coin.coin_rotation || Math.random() * 360,
        velocityY: 0,
        velocityX: 0,
        velocityRotation: 0,
        settled: true,
      }))
      setCoins(loadedCoins)
    }
    loadCoins()
  }, [])

  useEffect(() => {
    const animate = (time: number) => {
      const lastTime = lastFrameTimeRef.current ?? time
      const delta = Math.min(2, (time - lastTime) / 16.67)
      lastFrameTimeRef.current = time

      setCoins((prevCoins) => {
        const bounds = getBounds()
        const boxBottom = bounds.bottom
        const boxLeft = bounds.left
        const boxRight = bounds.right
        const updatedCoins: Coin[] = prevCoins.map((coin) => ({ ...coin }))

        for (let i = 0; i < updatedCoins.length; i += 1) {
          const coin = updatedCoins[i]
          if (coin.settled) {
            continue
          }

          let velocityY = coin.velocityY + 0.95 * delta // gravity
          let velocityX = coin.velocityX * Math.pow(0.985, delta) // air drag
          let velocityRotation = coin.velocityRotation * Math.pow(0.96, delta)
          let nextX = coin.x + velocityX * delta
          let nextY = coin.y + velocityY * delta
          let nextRotation = coin.rotation + velocityRotation * delta
          let settled = coin.settled

          // Bottom collision
          if (nextY >= boxBottom) {
            nextY = boxBottom
            velocityY = -velocityY * 0.28
            velocityX = velocityX * 0.7
            velocityRotation += velocityX * 0.25

            if (Math.abs(velocityY) < 0.2) {
              velocityY = 0
            }
          }

          // Side collisions
          if (nextX < boxLeft || nextX > boxRight) {
            velocityX = -velocityX * 0.6
            nextX = nextX < boxLeft ? boxLeft : boxRight
            velocityRotation += velocityX * 0.4
          }

          // Coin-to-coin collisions
          for (let j = 0; j < updatedCoins.length; j += 1) {
            if (i === j) continue
            const other = updatedCoins[j]
            const dx = nextX - other.x
            const dy = nextY - other.y
            const distance = Math.hypot(dx, dy)
            const minDistance = COIN_RADIUS * 2

            if (distance > 0 && distance < minDistance) {
              const overlap = minDistance - distance
              const nx = dx / distance
              const ny = dy / distance

              // Separate the coins
              nextX += nx * overlap
              nextY += ny * overlap

              // Simple collision response along the normal
              const relativeVelocity = velocityX * nx + velocityY * ny
              if (relativeVelocity < 0) {
                const restitution = other.settled ? 0.1 : 0.22
                velocityX -= (1 + restitution) * relativeVelocity * nx
                velocityY -= (1 + restitution) * relativeVelocity * ny
              }
            }
          }

          if (
            Math.abs(velocityY) < 0.2 &&
            Math.abs(velocityX) < 0.12 &&
            Math.abs(velocityRotation) < 0.18 &&
            (nextY >= boxBottom ||
              updatedCoins.some(
                (other, index) =>
                  index !== i &&
                  other.settled &&
                  Math.hypot(nextX - other.x, nextY - other.y) <= COIN_RADIUS * 2 + 0.5
              ))
          ) {
            velocityY = 0
            velocityX = 0
            velocityRotation = 0
            settled = true
          }

          updatedCoins[i] = {
            ...coin,
            x: nextX,
            y: nextY,
            rotation: nextRotation,
            velocityY,
            velocityX,
            velocityRotation,
            settled,
          }
        }

        return updatedCoins
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      lastFrameTimeRef.current = null
    }
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const startCoinAnimation = (imageUrl: string | null) => {
    setNewCoinData({ imageUrl })
    setAnimationPhase("pressing")
    setPressProgress(0)

    // Pressing down
    const pressInterval = setInterval(() => {
      setPressProgress((prev) => {
        if (prev >= 100) {
          clearInterval(pressInterval)
          // Reveal coin
          setTimeout(() => {
            setAnimationPhase("revealing")
            // Start falling
            setTimeout(() => {
              setAnimationPhase("falling")
              createCoin(imageUrl)
              // Reset
              setTimeout(() => {
                setAnimationPhase("idle")
                setNewCoinData(null)
              }, 500)
            }, 600)
          }, 400)
          return 100
        }
        return prev + 5
      })
    }, 20)
  }

  const createCoin = (imageUrl: string | null) => {
    const bounds = getBounds()
    const newCoin: Coin = {
      id: Math.random().toString(36).substr(2, 9),
      imageUrl,
      x: clamp(window.innerWidth / 2, bounds.left, bounds.right),
      y: Math.max(90, COIN_RADIUS + 20),
      rotation: Math.random() * 360,
      velocityY: 1.8,
      velocityX: (Math.random() - 0.5) * 2.5,
      velocityRotation: (Math.random() - 0.5) * 8,
      settled: false,
    }

    setCoins((prev) => [...prev, newCoin])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const supabase = getSupabaseBrowserClient()
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `coins/${fileName}`

        const { error: uploadError } = await supabase.storage.from("waitlist-images").upload(filePath, imageFile)

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("waitlist-images").getPublicUrl(filePath)
          imageUrl = publicUrl
        }
      }

      const bounds = getBounds()
      const finalX = clamp(window.innerWidth / 2, bounds.left, bounds.right)
      const finalY = bounds.bottom
      const finalRotation = Math.random() * 360

      const formData = new FormData()
      formData.append("email", email)
      formData.append("message", message)
      if (imageUrl) {
        formData.append("imageUrl", imageUrl)
      }
      formData.append("coinX", finalX.toString())
      formData.append("coinY", finalY.toString())
      formData.append("coinRotation", finalRotation.toString())

      const result = await submitWaitlist(formData)

      if (result.error) {
        alert(result.error)
      } else {
        startCoinAnimation(imageUrl || imagePreview)
        setShowSuccess(true)
        setEmail("")
        setMessage("")
        setImageFile(null)
        setImagePreview(null)

        setTimeout(() => {
          setShowSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error("[v0] Error submitting waitlist:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {animationPhase !== "idle" && (
        <div
          className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2"
          style={{
            top: `${-200 + pressProgress * 2.5}px`,
            transition: animationPhase === "revealing" ? "top 0.4s ease-out" : "none",
          }}
        >
          <div className="relative">
            <div className="mx-auto h-32 w-8 bg-gradient-to-b from-slate-600 to-slate-700 shadow-lg">
              <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-cyan-400 opacity-50"></div>
            </div>

            <div className="relative h-24 w-48 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-2xl">
              <div className="absolute inset-2 border border-cyan-500/30">
                <div className="flex h-full items-center justify-center gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-1 w-1 animate-pulse rounded-full bg-cyan-400"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <div className="absolute left-2 top-2 text-[8px] font-mono text-cyan-400">STYBL-AI</div>
            </div>
          </div>
        </div>
      )}

      {(animationPhase === "revealing" || animationPhase === "falling") && newCoinData && (
        <div
          className="pointer-events-none fixed z-40"
          style={{
            left: "50%",
            top: "68px",
            transform: `translateX(-50%) scale(${animationPhase === "revealing" ? 0.8 : 1})`,
            transition: "transform 0.4s ease-out",
          }}
        >
          <div className="relative h-24 w-24 rounded-full border-4 border-yellow-500 bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 shadow-2xl">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200/50 to-transparent"></div>
            {newCoinData.imageUrl ? (
              <img
                src={newCoinData.imageUrl || "/placeholder.svg"}
                alt="New Coin"
                className="h-full w-full rounded-full object-cover p-3"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-3xl font-bold text-yellow-900">$</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full shadow-inner"></div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed left-1/2 top-8 z-30 -translate-x-1/2">
        <div className="relative mx-auto h-8 w-32 rounded-lg border-4 border-yellow-500/50 bg-slate-800/80 backdrop-blur-sm shadow-lg shadow-yellow-500/20">
          <div className="absolute inset-x-4 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-950 shadow-inner"></div>
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-400/50"></div>
          <div className="absolute -bottom-2 left-1/2 text-[10px] -translate-x-1/2 font-mono text-cyan-400 whitespace-nowrap">
            COIN SLOT
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-10">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute"
            style={{
              left: `${coin.x}px`,
              top: `${coin.y}px`,
              transform: `translate(-50%, -50%) rotate(${coin.rotation}deg)`,
              transition: coin.settled ? "none" : "none",
            }}
          >
            <div className="relative h-20 w-20 rounded-full border-4 border-yellow-500 bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 shadow-xl">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200/50 to-transparent"></div>
              {coin.imageUrl ? (
                <img
                  src={coin.imageUrl || "/placeholder.svg"}
                  alt="Coin"
                  className="h-full w-full rounded-full object-cover p-3"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-2xl font-bold text-yellow-900">$</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full shadow-inner"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-40 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-4 text-6xl font-bold tracking-tight text-white md:text-8xl">
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              STYBL
            </span>
          </h1>

          <div className="mb-8 space-y-2">
            <p className="text-pretty text-xl font-semibold text-blue-200 md:text-2xl">
              Your trusted source for stablecoin news
            </p>
            <p className="text-balance text-lg text-slate-300">Coming Soon</p>
          </div>

          <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
            <h2 className="mb-6 text-2xl font-bold text-white">Join the Waitlist</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-slate-600 bg-slate-800 text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <Textarea
                  placeholder="Leave a message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] border-slate-600 bg-slate-800 text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  {imagePreview ? "Change Image" : "Upload Image for Your Coin (Optional)"}
                </Button>
                {imagePreview && (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="h-20 w-20 rounded-full border-2 border-yellow-400 object-cover"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || animationPhase !== "idle"}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 font-semibold text-yellow-950 hover:from-yellow-500 hover:to-yellow-700"
              >
                {isSubmitting ? "Creating Your Coin..." : "Drop Your Coin"}
              </Button>

              {showSuccess && (
                <p className="text-center text-sm font-medium text-green-400">
                  Thanks for joining! Watch your coin drop!
                </p>
              )}
            </form>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            Be the first to know when STYBL launches. Stay stable, stay informed.
          </p>

          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-950/30 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm text-blue-300">
              Check out a link from our Sponsor:{" "}
              <a
                href="https://swiftfi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-yellow-400 hover:text-yellow-300 underline decoration-yellow-400/50 hover:decoration-yellow-300"
              >
                SwiftFi.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
    </div>
  )
}
