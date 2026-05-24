import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextPath = searchParams.get("next") || "/dashboard"
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options })
      },
    },
  })

  await supabase.auth.exchangeCodeForSession(code)

  return NextResponse.redirect(`${origin}${safeNextPath}`)
}