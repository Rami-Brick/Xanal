"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  variant?: "default" | "nav";
}

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    });
  }

  if (variant === "nav") {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        style={{
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 5,
          padding: "4px 10px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "color 0.12s, border-color 0.12s",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {isPending ? "…" : "Déconnexion"}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.22em] text-stone-600 transition hover:border-black/20 hover:text-stone-900 disabled:opacity-50"
    >
      {isPending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
