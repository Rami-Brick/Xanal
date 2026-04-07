"use client"

import { useEffect, useState } from 'react'

const LAST_DAILY_REFRESH_KEY = 'xanal-last-daily-refresh'

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function DashboardPage() {
  const [status, setStatus] = useState<'idle' | 'refreshing' | 'done' | 'failed'>('idle')
  const [message, setMessage] = useState('Chargement...')

  useEffect(() => {
    const lastRefresh = localStorage.getItem(LAST_DAILY_REFRESH_KEY)
    const now = new Date()

    if (lastRefresh) {
      const parsed = new Date(lastRefresh)
      if (!Number.isNaN(parsed.getTime()) && isSameLocalDay(parsed, now)) {
        setStatus('done')
        setMessage('Les données ont déjà été rafraîchies aujourd’hui.')
        return
      }
    }

    const refreshOnce = async () => {
      setStatus('refreshing')
      setMessage('Rafraîchissement des données...')

      try {
        const response = await fetch('/api/cron/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        const result = await response.json()

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Erreur de rafraîchissement')
        }

        localStorage.setItem(LAST_DAILY_REFRESH_KEY, now.toISOString())
        setStatus('done')
        setMessage('Données rafraîchies avec succès.')
      } catch (error) {
        console.error('Daily refresh failed', error)
        setStatus('failed')
        setMessage(
          'Impossible de rafraîchir les données pour le moment. Réessayez plus tard.'
        )
      }
    }

    refreshOnce()
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Tableau de bord</h1>
          <p className="mt-2 text-sm text-slate-600">
            Les données sont rafraîchies automatiquement une fois par jour lors de l’ouverture de l’application.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6">
          <p className="text-sm font-medium text-slate-700">Statut du rafraîchissement</p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={
                'inline-flex h-3.5 w-3.5 rounded-full ' +
                (status === 'refreshing'
                  ? 'bg-amber-400'
                  : status === 'done'
                  ? 'bg-emerald-500'
                  : status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-slate-400')
              }
            />
            <span className="text-base text-slate-800">{message}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p>Rafraîchissement unique par jour enregistré localement dans le navigateur.</p>
          <p className="mt-2">
            Si vous ouvrez l’application plusieurs fois dans la même journée, la synchronisation ne sera
            lancée qu’une seule fois.
          </p>
        </div>
      </div>
    </main>
  )
}
