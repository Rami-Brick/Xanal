import { Metadata } from "next";
import { DashboardSyncActions } from "@/components/dashboard/DashboardSyncActions";
import {
  type DashboardAlert,
  type DashboardHeroMetric,
  type DashboardPipelineMetric,
  type DashboardStoreSync,
  type DashboardTopProduct,
  type DashboardTrendPoint,
  getOpsDashboardData,
} from "@/lib/dashboard/ops-overview";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard | Xanal",
  description: "Vue opérationnelle des commandes, produits et synchronisations.",
};

export const dynamic = "force-dynamic";

const TONE_CLASSES = {
  stable: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-900",
  risk: "border-rose-200 bg-rose-50 text-rose-900",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SectionShell({
  eyebrow,
  title,
  body,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[2rem] border border-black/8 bg-white/75 p-6 shadow-[0_24px_80px_rgba(36,30,22,0.08)] backdrop-blur-sm lg:p-8",
        className
      )}
    >
      <div className="mb-6 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">
          {eyebrow}
        </p>
        <h2
          className="mt-3 text-3xl leading-none text-stone-900"
          style={{
            fontFamily:
              '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
          }}
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
      </div>
      {children}
    </section>
  );
}

function HeroMetricCard({ metric }: { metric: DashboardHeroMetric }) {
  return (
    <article className="rounded-[1.75rem] border border-black/8 bg-[#fffdf8] p-5 shadow-[0_18px_40px_rgba(36,30,22,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
            {metric.label}
          </p>
          <p
            className="mt-4 text-4xl leading-none text-stone-950"
            style={{
              fontFamily:
                '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
            }}
          >
            {metric.value}
          </p>
        </div>
        {metric.tone ? (
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
              TONE_CLASSES[metric.tone]
            )}
          >
            {metric.tone === "stable"
              ? "Stable"
              : metric.tone === "watch"
                ? "À suivre"
                : "Alerte"}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-600">{metric.hint}</p>
    </article>
  );
}

function AlertCard({ alert }: { alert: DashboardAlert }) {
  return (
    <article
      className={cn(
        "rounded-[1.5rem] border p-5",
        TONE_CLASSES[alert.tone]
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.24em]">
        {alert.tone === "risk"
          ? "Priorité"
          : alert.tone === "watch"
            ? "À surveiller"
            : "Signal"}
      </p>
      <h3
        className="mt-3 text-2xl leading-none"
        style={{
          fontFamily:
            '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
        }}
      >
        {alert.title}
      </h3>
      <p className="mt-3 text-sm leading-6">{alert.body}</p>
    </article>
  );
}

function PipelineCard({
  metric,
  maxCount,
}: {
  metric: DashboardPipelineMetric;
  maxCount: number;
}) {
  const width = maxCount > 0 ? Math.max((metric.count / maxCount) * 100, 8) : 8;

  return (
    <article className="rounded-[1.5rem] border border-black/8 bg-[#fffdf8] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
            {metric.label}
          </p>
          <p
            className="mt-3 text-3xl leading-none text-stone-950"
            style={{
              fontFamily:
                '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
            }}
          >
            {metric.count}
          </p>
        </div>
        <span className="rounded-full border border-black/10 bg-stone-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          {metric.status}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7b6a54] to-[#bea06d]"
          style={{ width: `${width}%` }}
        />
      </div>
    </article>
  );
}

function TrendBars({ trend }: { trend: DashboardTrendPoint[] }) {
  const maxRevenue = Math.max(...trend.map((point) => point.deliveredRevenue), 1);

  return (
    <div className="grid grid-cols-7 gap-3 md:grid-cols-14">
      {trend.map((point) => {
        const barHeight = Math.max((point.deliveredRevenue / maxRevenue) * 160, 6);

        return (
          <div key={point.date} className="flex flex-col items-center gap-3">
            <div className="flex h-44 items-end">
              <div
                className="w-6 rounded-t-full bg-gradient-to-t from-stone-900 via-[#8d7450] to-[#d9c49f] shadow-[0_10px_24px_rgba(82,67,44,0.2)] sm:w-8"
                style={{ height: `${barHeight}px` }}
                title={`${point.label}: ${formatCurrency(point.deliveredRevenue)} / ${point.orders} commandes`}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
                {point.label}
              </p>
              <p className="mt-1 text-xs text-stone-600">{point.orders}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopProductCard({
  product,
  index,
}: {
  product: DashboardTopProduct;
  index: number;
}) {
  return (
    <article className="grid grid-cols-[auto,1fr,auto] items-center gap-4 rounded-[1.5rem] border border-black/8 bg-[#fffdf8] p-4">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-stone-100 text-xs uppercase tracking-[0.2em] text-stone-500">
        #{index + 1}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-stone-900">{product.name}</h3>
          {product.slug ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
              {product.slug}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-stone-600">
          {product.units} unité(s) livrées · {formatCurrency(product.revenue)}
        </p>
      </div>
      <div className="text-right">
        <p
          className="text-3xl leading-none text-stone-950"
          style={{
            fontFamily:
              '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
          }}
        >
          {product.share.toFixed(1)}%
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">
          du livré
        </p>
      </div>
    </article>
  );
}

function StoreSyncRow({ store }: { store: DashboardStoreSync }) {
  return (
    <article className="rounded-[1.5rem] border border-black/8 bg-[#fffdf8] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
            Boutique
          </p>
          <h3 className="mt-2 text-lg font-medium text-stone-900">
            {store.storeId}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
            TONE_CLASSES[store.tone]
          )}
        >
          {store.lastSyncStatus === "failed"
            ? "Échec"
            : store.tone === "watch"
              ? "À rafraîchir"
              : "Sain"}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm text-stone-600">
        <div className="flex items-center justify-between gap-3">
          <dt>Dernier sync</dt>
          <dd className="text-right text-stone-900">
            {formatDateTime(store.lastSyncAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Type</dt>
          <dd className="text-right text-stone-900">
            {store.lastSyncType ?? "Non disponible"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Scopes</dt>
          <dd className="max-w-[14rem] text-right text-stone-900">
            {store.scopes.length > 0 ? store.scopes.join(", ") : "Non renseigné"}
          </dd>
        </div>
      </dl>
      {store.errorMessage ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {store.errorMessage}
        </p>
      ) : null}
    </article>
  );
}

export default async function DashboardPage() {
  const data = await getOpsDashboardData();
  const maxPipelineCount = Math.max(...data.pipeline.map((metric) => metric.count), 1);

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-[2.5rem] border border-black/8 bg-[linear-gradient(135deg,#fffdf9_0%,#f0e7da_100%)] p-7 shadow-[0_30px_100px_rgba(36,30,22,0.12)] lg:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-stone-600">
              Vue opérationnelle
            </span>
            <span
              className={cn(
                "rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.24em]",
                TONE_CLASSES[data.freshnessTone]
              )}
            >
              {data.freshnessLabel}
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1
              className="text-5xl leading-[0.95] text-stone-950 md:text-6xl"
              style={{
                fontFamily:
                  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
              }}
            >
              Lire le business avant d’ouvrir les détails.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
              Ce dashboard s’appuie uniquement sur les données Supabase validées en
              phase 1. Il montre la santé du pipeline, la traction des produits et
              la fraîcheur des syncs, sans mélanger encore les coûts financiers à
              venir.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.heroMetrics.map((metric) => (
              <HeroMetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <SectionShell
            eyebrow="Confiance données"
            title="Fraîcheur"
            body="Le dashboard reste global côté business, mais la confiance sync reste visible par boutique afin de savoir si les métriques sont exploitables."
            className="h-full"
          >
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-black/8 bg-[#fffdf8] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">
                  Dernier sync réussi
                </p>
                <p
                  className="mt-3 text-3xl leading-none text-stone-950"
                  style={{
                    fontFamily:
                      '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
                  }}
                >
                  {formatDateTime(data.lastSuccessfulSyncAt)}
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {data.connectedStores} boutique(s) connectée(s) actuellement.
                </p>
              </div>

              <DashboardSyncActions />
            </div>
          </SectionShell>
        </aside>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SectionShell
          eyebrow="Pipeline"
          title="Lecture rapide du flux commandes"
          body="Les statuts clés donnent immédiatement la taille du backlog, la vitesse de progression et la tension retour."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.pipeline.map((metric) => (
              <PipelineCard
                key={metric.status}
                metric={metric}
                maxCount={maxPipelineCount}
              />
            ))}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Alertes"
          title="Ce qui mérite une réaction"
          body="Une lecture synthétique des signaux opérationnels sans attendre la future couche financière."
        >
          <div className="space-y-4">
            {data.alerts.map((alert) => (
              <AlertCard key={alert.title} alert={alert} />
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <SectionShell
          eyebrow="Rythme"
          title="Tendance des 14 derniers jours"
          body="Chaque barre représente le revenu livré du jour. Le chiffre sous la barre indique le nombre total de commandes créées sur cette journée."
        >
          <TrendBars trend={data.trend} />
        </SectionShell>

        <SectionShell
          eyebrow="Produits"
          title="Les locomotives du livré"
          body="Vue purement opérationnelle fondée sur les lignes de commandes livrées. Pas encore de marge, pas encore de COGS, seulement les volumes et le chiffre d'affaires livré."
        >
          {data.topProducts.length > 0 ? (
            <div className="space-y-4">
              {data.topProducts.map((product, index) => (
                <TopProductCard
                  key={`${product.name}-${index}`}
                  product={product}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[#fffdf8] px-5 py-8 text-sm text-stone-600">
              Aucun produit livré n’est encore exploitable pour cette vue.
            </div>
          )}
        </SectionShell>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionShell
          eyebrow="Boutiques"
          title="Confiance par source"
          body="Les tables business restent globales, mais le contrôle du flux amont reste lisible par boutique afin d’identifier immédiatement une source silencieuse ou défaillante."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {data.stores.map((store) => (
              <StoreSyncRow key={store.storeId} store={store} />
            ))}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Suite"
          title="Ce que ce dashboard n’essaie pas encore de faire"
          body="Cette version reste volontairement sobre sur la finance. Les couches coûts, COGS, ROAS, overhead, cash et investisseurs doivent arriver avec les futures tables de settings versionnées."
        >
          <ul className="space-y-4 text-sm leading-6 text-stone-600">
            <li className="rounded-[1.25rem] border border-black/8 bg-[#fffdf8] px-4 py-4">
              Les métriques affichées ici reposent uniquement sur Converty + Supabase
              et excluent les commandes de test.
            </li>
            <li className="rounded-[1.25rem] border border-black/8 bg-[#fffdf8] px-4 py-4">
              Le taux de confirmation ignore les abandonnées et se limite à
              confirmées vs rejetées.
            </li>
            <li className="rounded-[1.25rem] border border-black/8 bg-[#fffdf8] px-4 py-4">
              Les chiffres financiers avancés seront ajoutés seulement après la
              couche settings versionnée et les autres modules métier.
            </li>
          </ul>
        </SectionShell>
      </section>
    </div>
  );
}
