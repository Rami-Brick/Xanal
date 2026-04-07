import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StatusBanner({
  status,
  message,
}: {
  status?: string;
  message?: string;
}) {
  if (!status) return null;

  const isSuccess = status === "success";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm shadow-sm",
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      )}
    >
      <p className="font-semibold">
        {isSuccess ? "Converty connecte" : "Erreur de connexion"}
      </p>
      <p className="mt-1 text-sm/6 opacity-90">
        {message ||
          (isSuccess
            ? "La boutique Converty est maintenant liee a Xanal."
            : "Une erreur est survenue pendant le flux OAuth.")}
      </p>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-950">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <div className="grid gap-10 rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur sm:p-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                Xanal Phase 1
              </p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Connectez Xanal a Converty avec un callback OAuth securise.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Cette page de lancement sert a enregistrer l'URL de callback,
                demarrer l'autorisation OAuth et verifier que les identifiants
                Converty peuvent etre stockes en toute securite dans Supabase.
              </p>
            </div>

            <StatusBanner status={params.status} message={params.message} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/api/auth/converty/start"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "justify-center rounded-full px-6"
                )}
              >
                Connecter Converty
              </a>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                URL de callback :{" "}
                <code className="font-mono text-slate-900">
                  /api/auth/callback
                </code>
              </div>
            </div>
          </section>

          <aside className="rounded-[24px] border border-slate-200 bg-slate-950 p-6 text-slate-100">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
              Ce Que Livre Cette Phase
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <li>Une route publique de demarrage OAuth avec protection state par cookie.</li>
              <li>Une route publique de callback qui echange les tokens et verifie la boutique.</li>
              <li>La persistence Supabase du token d'acces, du refresh token, des scopes et de l'expiration.</li>
              <li>Un retour clair apres succes ou echec de la connexion.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Livrable Pour Le Superviseur
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Partagez le callback deploye :
              </p>
              <code className="mt-3 block overflow-x-auto rounded-lg bg-black/30 px-3 py-2 text-xs text-sky-200">
                https://your-domain/api/auth/callback
              </code>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
