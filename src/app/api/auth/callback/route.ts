import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth denial from provider
  if (error) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/settings?error=missing_code`)
  }

  const clientId = process.env.CONVERTY_CLIENT_ID
  const clientSecret = process.env.CONVERTY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/settings?error=oauth_not_configured`
    )
  }

  // Exchange the authorization code for tokens
  let tokenData: {
    access_token: string
    refresh_token: string
    expires_in?: number
    store_id?: string
  }

  try {
    const res = await fetch('https://partner.converty.shop/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      console.error('[oauth/callback] Token exchange failed:', await res.text())
      return NextResponse.redirect(
        `${origin}/settings?error=token_exchange_failed`
      )
    }

    tokenData = await res.json()
  } catch (err) {
    console.error('[oauth/callback] Network error:', err)
    return NextResponse.redirect(`${origin}/settings?error=network_error`)
  }

  // Store tokens in Supabase using service role (bypasses RLS)
  const supabase = getAdminClient()

  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/settings?error=supabase_not_configured`
    )
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  // store_id may or may not be in the token response — fall back to clientId
  const storeId = tokenData.store_id ?? clientId

  const { error: dbError } = await supabase.from('converty_tokens').upsert(
    {
      store_id: storeId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'store_id' }
  )

  if (dbError) {
    console.error('[oauth/callback] Failed to store tokens:', dbError)
    return NextResponse.redirect(
      `${origin}/settings?error=token_storage_failed`
    )
  }

  return NextResponse.redirect(`${origin}/dashboard?connected=true`)
}
