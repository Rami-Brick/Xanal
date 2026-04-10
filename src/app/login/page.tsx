"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Identifiants incorrects.",
  "Email not confirmed": "Adresse e-mail non confirmée.",
  "Too many requests": "Trop de tentatives. Réessayez plus tard.",
};

function translateError(raw: string): string {
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (raw.includes(key)) return msg;
  }
  return "Une erreur est survenue. Réessayez.";
}

// Hoisted static SVGs — no re-creation on render (rendering-hoist-jsx)
const IconEmail = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path
      d="M1.5 3.5A1 1 0 0 1 2.5 2.5h8a1 1 0 0 1 1 1v.46L6.5 7.25 1.5 3.96V3.5Z"
      fill="currentColor"
      opacity=".55"
    />
    <path
      d="M1.5 5.04v4.96a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.04L6.5 8.75 1.5 5.04Z"
      fill="currentColor"
    />
  </svg>
);

const IconLock = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <rect x="2.5" y="6" width="8" height="6" rx="1.25" fill="currentColor" />
    <path
      d="M4.5 6V4.5a2 2 0 1 1 4 0V6"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      fill="none"
      opacity=".5"
    />
  </svg>
);

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // useTransition for non-urgent loading state (rerender-usetransition-loading)
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Renseignez votre adresse e-mail et votre mot de passe.");
      return;
    }

    startTransition(async () => {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(translateError(authError.message));
        return;
      }

      window.location.href = "/dashboard";
    });
  }

  return (
    <>
      {/* Font loading — resource hints for preloading (rendering-resource-hints) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div
        className="relative flex min-h-screen items-center justify-center px-4"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          backgroundColor: "#f6f6f6",
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.13) 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
        }}
      >
        {/* Soft radial glow behind card — makes it feel placed */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            style={{
              width: 560,
              height: 480,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.07) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Card */}
        <div
          className="relative w-full max-w-[380px]"
          style={{
            borderRadius: 16,
            background: "#141414",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header section */}
          <div
            className="px-8 pt-8 pb-7"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#000",
                  textTransform: "uppercase",
                }}
              >
                XA
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                Xanal
              </span>
            </div>

            {/* Title — Fraunces for authority */}
            <h1
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 30,
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "#fff",
                marginTop: 20,
              }}
            >
              Connexion
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.3)",
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              Accès opérateur
            </p>
          </div>

          {/* Form section */}
          <form onSubmit={handleSubmit} noValidate className="px-8 pt-6 pb-8">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.38)",
                    marginBottom: 6,
                  }}
                >
                  Adresse e-mail
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.22)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {IconEmail}
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="vous@xpand.tn"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 8,
                      paddingLeft: 34,
                      paddingRight: 14,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 13,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 400,
                      color: "#fff",
                      outline: "none",
                      transition: "border-color 0.15s, background 0.15s",
                      WebkitFontSmoothing: "antialiased",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.065)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.38)",
                    marginBottom: 6,
                  }}
                >
                  Mot de passe
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.22)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {IconLock}
                  </span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 8,
                      paddingLeft: 34,
                      paddingRight: 14,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 13,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 400,
                      color: "#fff",
                      outline: "none",
                      transition: "border-color 0.15s, background 0.15s",
                      WebkitFontSmoothing: "antialiased",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.065)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                  />
                </div>
              </div>

              {/* Error */}
              {error !== null ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    aria-hidden="true"
                    style={{ marginTop: 1, flexShrink: 0, color: "rgba(239,68,68,0.85)" }}
                  >
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1" />
                    <path
                      d="M6.5 4v3M6.5 9h.01"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "rgba(239,68,68,0.85)",
                      fontWeight: 400,
                    }}
                  >
                    {error}
                  </span>
                </div>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                style={{
                  marginTop: 4,
                  width: "100%",
                  background: isPending ? "rgba(255,255,255,0.85)" : "#fff",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 16px",
                  fontSize: 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                  transition: "opacity 0.15s, background 0.15s, transform 0.1s",
                  WebkitFontSmoothing: "antialiased",
                }}
                onMouseEnter={(e) => {
                  if (!isPending) e.currentTarget.style.background = "#e8e8e8";
                }}
                onMouseLeave={(e) => {
                  if (!isPending) e.currentTarget.style.background = "#fff";
                }}
                onMouseDown={(e) => {
                  if (!isPending) e.currentTarget.style.transform = "scale(0.99)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {isPending ? "Connexion…" : "Se connecter"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p
          className="absolute bottom-6"
          style={{
            fontSize: 11,
            color: "rgba(0,0,0,0.22)",
            letterSpacing: "0.02em",
          }}
        >
          Xpand Solutions · usage interne
        </p>
      </div>
    </>
  );
}
