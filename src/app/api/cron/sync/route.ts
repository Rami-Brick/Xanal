import { NextResponse } from 'next/server'

export async function GET() {
  return await runDailySync()
}

export async function POST() {
  return await runDailySync()
}

async function runDailySync() {
  // TODO: replace this placeholder with the real Converty/Supabase sync logic.
  // This route is the hook that runs once per day when the user opens the app.

  return NextResponse.json({
    success: true,
    message: 'Refresh endpoint reached. Replace with actual sync logic.',
  })
}
