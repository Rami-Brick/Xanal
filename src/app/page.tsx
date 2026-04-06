import { redirect } from 'next/navigation'

export default function RootPage() {
  // Phase 3 will add a Supabase session check here and redirect to /login if unauthenticated.
  // For now, redirect directly to /dashboard for development convenience.
  redirect('/dashboard')
}
