"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/?auth=missing-supabase")
  }

  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/")
  redirect("/dashboard/chat")
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/?auth=missing-supabase")
  }

  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")
  const fullName = getFormValue(formData, "full_name")

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000"}/dashboard/chat`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName || null,
    })
  }

  revalidatePath("/")
  redirect("/login?notice=check-email")
}

export async function signOut() {
  const supabase = await createClient()

  if (supabase) {
    await supabase.auth.signOut()
  }

  revalidatePath("/")
  redirect("/")
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/profile?error=missing-supabase")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const fullName = getFormValue(formData, "full_name")
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName || null,
  })

  if (error) {
    redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/dashboard/profile")
  redirect("/dashboard/profile?notice=saved")
}
