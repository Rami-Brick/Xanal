/**
 * Central dictionary of metric explanations shown in the `/store` tooltips.
 * Content is derived from:
 *   - zResources/STORE-METRICS-MANUAL.md
 *   - zResources/financial_metrics_final.MD (CEO spec)
 *   - Actual formulas in src/lib/finance/margins.ts + src/lib/data/*.ts
 */

export interface MetricDef {
  meaning: string;
  formula?: string;
  notes?: string;
}

export const METRICS: Record<string, MetricDef> = {
  // ─── Page 1: /store (Aujourd'hui) ────────────────────────────────────────

  pipelineToday: {
    meaning:
      "Répartition des commandes créées aujourd'hui par statut. Le statut « Déposées » marque le début des frais Cosmos.",
    formula: `Pour chaque statut:
  count = COUNT(orders
    WHERE created_today
      AND is_test = false
      AND status != 'deleted')`,
    notes: "Commandes test et supprimées exclues partout.",
  },

  deltaVsYesterday: {
    meaning:
      "Variation du nombre total de commandes par rapport à hier à la même heure, en pourcentage.",
    formula: `delta = (total_aujourdhui - total_hier)
        / total_hier × 100`,
    notes: "Ton : ≥ 0 % vert · ≥ -20 % ambre · < -20 % rouge. Si hier = 0 → « +nouv. ».",
  },

  returnRate7d: {
    meaning:
      "Taux de retour glissant sur les 7 derniers jours. L'indicateur le plus sensible du quotidien : une hausse durable détruit la marge.",
    formula: `num   = COUNT(status IN ('returned','to be returned'))
denom = COUNT(status IN ('deposit','in transit',
                         'delivered','returned',
                         'to be returned'))

rr_7j = num / denom × 100`,
    notes: "Cible < 15 %. Alerte ≥ 15 %. Critique ≥ 20 %. Dénominateur = commandes expédiées uniquement.",
  },

  adSpendToday: {
    meaning:
      "Dépenses publicitaires saisies pour aujourd'hui (depuis /settings > Campagnes). Pas de connexion automatique Meta.",
    formula: `depenses = SUM(campaign_spend.amount
           WHERE spend_date = today)`,
    notes: "Saisie manuelle par campagne. Le « vs hier » compare à la même saisie la veille.",
  },

  roasToday: {
    meaning:
      "Retour sur dépense publicitaire par campagne pour aujourd'hui. Mesure combien de revenu livré chaque TND dépensé a généré.",
    formula: `revenu_produit_livre_jour =
  SUM(qty × price_per_unit)
  FROM order_items
  WHERE parent.status = 'delivered'
    AND parent.delivered_today
    AND product_id = campaign.product_id

roas = revenu_produit_livre_jour / depense_campagne_jour`,
    notes: "Cible ≥ 3.5×. Pause si < 2.5× sur 3 jours. Critique < 2.0× (on paye pour livrer).",
  },

  // ─── Page 2: /store/performance ──────────────────────────────────────────

  revenueDelivered: {
    meaning:
      "Revenu réellement encaissé sur toutes les commandes livrées depuis le début. Cash COD déjà collecté par le livreur.",
    formula: `revenu_livre = SUM(total_price)
  WHERE status = 'delivered'
    AND is_test = false
    AND status != 'deleted'`,
  },

  averageBasket: {
    meaning:
      "Panier moyen : revenu livré divisé par le nombre de livraisons réussies. Base de référence pour calculer le plafond CAC.",
    formula: `panier_moyen = revenu_livre
             / COUNT(orders delivered)`,
    notes: "Règle CAC : CAC < AOV / 3. À 50 TND, plafond CAC ≈ 17 TND.",
  },

  activeOrders: {
    meaning:
      "Commandes en mouvement, pas encore arrivées à leur état final. Une commande rejected reste active pendant 24 h pour laisser un agent la récupérer.",
    formula: `actives = COUNT(orders WHERE NOT is_terminal)

is_terminal =
  status = 'delivered'
  OR status = 'returned'
  OR (status = 'rejected' AND rejected_depuis_24h)`,
    notes: "Si actives > MAX(livrées, 1) → alerte « Backlog actif conséquent ».",
  },

  returnRateLifetime: {
    meaning:
      "Taux de retour cumulé depuis le début (lifetime). Photo globale de la santé opérationnelle.",
    formula: `retours   = COUNT(status IN ('returned',
                              'to be returned'))
expediees = COUNT(status IN ('deposit','in transit',
                             'delivered','returned',
                             'to be returned'))

rr = retours / expediees × 100`,
    notes: "Seuils : < 15 % stable · 15–20 % surveillance · ≥ 20 % critique. Découper par produit · wilaya · agent.",
  },

  confirmationRate: {
    meaning:
      "Efficacité des agents à convertir les leads en commandes confirmées. Ne regarde que les leads ayant reçu une décision finale.",
    formula: `traitees   = total
             - COUNT(status IN ('pending','attempt*'))
confirmees = traitees
             - COUNT(status = 'rejected')

cr = confirmees / traitees × 100`,
    notes: "Cible ≥ 80 %. Alerte < 78 %. Critique < 72 %. Pending et attempt* = leads non résolus, exclus du dénominateur.",
  },

  deliveredOrders: {
    meaning:
      "Nombre total de commandes livrées depuis le début. Le « % des valides » indique la part des commandes non-test non-supprimées qui ont été livrées.",
    formula: `livrees = COUNT(status = 'delivered')
pct     = livrees / COUNT(valides) × 100`,
  },

  trend: {
    meaning:
      "Commandes créées et revenu livré jour par jour sur les 7 / 14 / 30 derniers jours. Grouper par `converty_created_at` (date UTC).",
    formula: `Par jour:
  commandes   = COUNT(orders valides)
  livrees     = COUNT(status = 'delivered')
  revenu      = SUM(total_price) WHERE delivered`,
  },

  // Rentabilité

  grossProfit: {
    meaning:
      "Revenu livré moins le coût fournisseur des produits vendus (COGS). Uniquement sur produits avec un COGS configuré.",
    formula: `profit_brut = SUM(qty × (price_per_unit - unit_cogs))
  FROM order_items
  WHERE parent.status = 'delivered'
    AND product HAS unit_cogs > 0`,
    notes: "Les produits sans COGS sont exclus. Leur revenu apparaît dans l'alerte « Produits non configurés ».",
  },

  grossMargin: {
    meaning:
      "Marge brute (GPM %) : part du revenu qui survit après avoir payé le fournisseur. Avant logistique et pub.",
    formula: `revenu_configure = SUM(qty × price_per_unit)
  pour les items avec COGS

marge_brute = profit_brut
            / revenu_configure × 100`,
    notes: "Cible > 35 %. Alerte < 30 %. Critique < 22 %. Si ça baisse, c'est COGS ou prix — pas logistique ni pub.",
  },

  cpo: {
    meaning:
      "Coût par commande livrée (CPO) : coût variable tout compris divisé par les livraisons réussies. Les retours gonflent volontairement ce chiffre — c'est la vérité du coût all-in.",
    formula: `couts_var = COGS + livraison_cosmos
          + retours + emballage
          + commission_converty

cpo = couts_var / COUNT(delivered)`,
    notes: "Cible < 30 TND. Alerte > 35 TND. Critique > 42 TND. Si rouge, la cause est souvent le taux de retour.",
  },

  productsMissingCogs: {
    meaning:
      "Nombre de produits livrés mais sans COGS renseigné dans /settings. Tant que ce chiffre est > 0, le profit brut et la marge brute sous-estiment la réalité.",
    formula: `non_configures =
  COUNT(produits livrés)
  - COUNT(produits livrés WITH unit_cogs > 0)`,
    notes: "Action : renseigner le COGS unitaire dans /settings > Coûts produits.",
  },

  contributionMargin: {
    meaning:
      "Marge de contribution (CM) : profit brut moins tous les coûts variables directs (livraison, retours, emballage, commission). C'est la viabilité structurelle avant pub et frais fixes.",
    formula: `couts_variables = livraison_cosmos
                + retours
                + emballage
                + commission_converty

cm = profit_brut - couts_variables`,
    notes: "Si CM < 0 sur un produit, aucune scale ne sauvera. Reprice ou kill.",
  },

  contributionMarginPct: {
    meaning:
      "Marge de contribution en pourcentage du revenu configuré. Seuil de décision kill/keep.",
    formula: `cm_pct = cm / revenu_configure × 100`,
    notes: "Stable ≥ 20 %. Surveillance 10–20 %. Critique 0–10 %. Kill si < 0 % sur 2 semaines.",
  },

  costCosmos: {
    meaning:
      "Coût total des livraisons Cosmos réussies. Le frais de livraison (7 TND par défaut) ne s'applique qu'aux livraisons livrées — pas aux déposées non livrées.",
    formula: `livraison_cosmos =
  COUNT(delivered) × cosmos_delivery_fee`,
    notes: "Taux configurable dans /settings > Paramètres opérationnels.",
  },

  costReturns: {
    meaning:
      "Coût des retours : sur chaque retour, on paye deux fois — le frais de livraison aller (perdu) + le frais de retour. C'est le coût caché qui tue les marges.",
    formula: `retours =
  COUNT(returned + to_be_returned)
  × (cosmos_delivery_fee + cosmos_return_fee)`,
    notes: "Le COGS du produit retourné n'est PAS compté en perte — il retourne en stock.",
  },

  costPacking: {
    meaning:
      "Coût d'emballage : s'applique à tout colis emballé et expédié, qu'il soit livré ou retourné.",
    formula: `emballage =
  (COUNT(delivered) + COUNT(returned))
  × packing_cost_per_package`,
    notes: "Si packing_cost = 0 dans /settings → affiché « Non configuré ».",
  },

  costConverty: {
    meaning:
      "Commission Converty prélevée sur le total de toutes les commandes non-test, tous statuts confondus (même abandonnées si Converty les facture).",
    formula: `commission_converty =
  SUM(total_price) × converty_fee_rate

rate par défaut = 0.003 (0,3 %)`,
  },

  pnlProduct: {
    meaning:
      "Profit & Loss par produit — table kill/keep. Chaque ligne donne la viabilité réelle du produit après allocation des coûts logistiques au prorata des unités livrées.",
    formula: `Par produit:
  unites       = SUM(qty) items livrés
  revenu       = SUM(qty × price) items livrés
  profit_brut  = SUM(qty × (price - cogs))
  cm           = profit_brut
               - couts_ops_totaux
                 × (unites / unites_totales)
  cm_pct       = cm / revenu × 100`,
    notes: "Uniquement produits avec COGS configuré. Kill si CM % < 0 sur 2 semaines consécutives.",
  },

  // ─── Page 3: /store/finance ──────────────────────────────────────────────

  netProfitMonth: {
    meaning:
      "Profit net du mois (NPM) : ce qui reste après TOUS les coûts — variables + pub + frais fixes. Le chiffre CEO. Si on ne regarde qu'un nombre par mois, c'est celui-ci.",
    formula: `profit_net = revenu_livre
           - cogs
           - livraison_cosmos - retours
           - emballage - commission_converty
           - depenses_publicitaires
           - charges_fixes_mensuelles

npm = profit_net / revenu_livre × 100`,
    notes: "Cible > 5 %. Alerte < 3 %. Critique négatif (perte exacte en rouge).",
  },

  adSpendPeriod: {
    meaning:
      "Dépenses publicitaires saisies sur la période sélectionnée (Du → Au). Le sous-label signale les dépenses non rattachées à un produit.",
    formula: `depense_pub_periode =
  SUM(campaign_spend.amount)
  WHERE spend_date ∈ [from, to]`,
  },

  roasGlobal: {
    meaning:
      "ROAS global sur la période sélectionnée : revenu livré total divisé par les dépenses pub totales. Vue agrégée de l'efficacité publicitaire.",
    formula: `roas = revenu_livre_periode
     / depense_pub_periode`,
    notes: "Cible ≥ 3.5×. Surveillance 2.0–3.5×. Pause < 2.0×.",
  },

  cac: {
    meaning:
      "Customer Acquisition Cost : dépense publicitaire par nouveau client payant. Un client est « nouveau » si sa PREMIÈRE livraison (tous temps confondus) tombe dans la période sélectionnée.",
    formula: `nouveaux = COUNT(DISTINCT customer_phone)
  WHERE premiere_livraison ∈ [from, to]

cac = depense_pub_periode / nouveaux`,
    notes: "Règle dure : CAC < AOV / 3. Au-dessus, on acquiert à perte.",
  },

  deliveredCustomers: {
    meaning:
      "Clients uniques ayant reçu au moins une livraison sur la période sélectionnée. Un fort % de récurrents = le produit fidélise (bon signe).",
    formula: `clients_livres = COUNT(DISTINCT customer_phone)
  sur livraisons de la periode

nouveaux   = 1re livraison ever ∈ [from, to]
recurrents = clients_livres - nouveaux`,
  },

  // Cash / Tresorerie

  cashCollected: {
    meaning:
      "Cash réellement reçu de Cosmos via virements bancaires depuis le début. Somme des règlements enregistrés dans /settings > Cosmos.",
    formula: `cash_encaisse = SUM(actual_amount)
  FROM cosmos_settlements`,
  },

  cashInTransit: {
    meaning:
      "Cash que Cosmos te doit : montant net attendu sur les commandes terminées après la date de fin du dernier règlement.",
    formula: `Par commande terminale après dernier règlement:
  Si delivered:
    attendu = total_price - cosmos_delivery_fee
  Si returned:
    attendu = -(delivery_fee + return_fee)

cash_en_transit = SUM(attendu)`,
  },

  settlementGap: {
    meaning:
      "Écart entre le montant attendu et le montant reçu pour le dernier règlement Cosmos. Un écart significatif signale soit un statut commande non à jour, soit une erreur Cosmos à réconcilier.",
    formula: `attendu = SUM(attendu sur la période)
ecart   = attendu - actual_amount
gap_pct = |ecart| / attendu × 100`,
    notes: "Vert si |écart| < 0,5 TND. Rouge si |gap_pct| > 5 % — réconcilier immédiatement.",
  },

  // Investisseurs

  investorCapitalDeployed: {
    meaning:
      "Capital total mis en place par les investisseurs sur l'ensemble des deals actifs, depuis leur date de début.",
    formula: `capital_deploye =
  SUM(capital_deployed)
  WHERE deal actif`,
  },

  investorCapitalOwing: {
    meaning:
      "Capital restant dû aux investisseurs : ce qu'il faut rembourser AVANT tout partage de profit. Règle : capital first.",
    formula: `capital_restant =
  SUM(MAX(capital_deployed
          - capital_returned, 0))`,
  },

  investorProfitOwing: {
    meaning:
      "Part de profit accumulée à verser aux investisseurs, une fois leur capital entièrement remboursé. Uniquement sur les deals avec profit net positif.",
    formula: `Si scope_net_profit ≥ 0:
  accrued = scope_net_profit
          × profit_share_pct / 100
  owing   = MAX(accrued - already_paid, 0)`,
  },

  investorTotalOwed: {
    meaning:
      "Somme totale due aux investisseurs à date : capital restant + part de profit accumulée non encore versée.",
    formula: `total_du = capital_restant + profit_a_verser`,
  },

  // ─── Page 4: /store/operations ───────────────────────────────────────────

  pipelineBreakdown: {
    meaning:
      "Répartition lifetime de toutes les commandes par statut. Photo globale du pipeline opérationnel.",
    formula: `Par statut:
  count = COUNT(orders valides WHERE status = X)`,
  },

  activeTerminalSplit: {
    meaning:
      "Part des commandes encore en mouvement vs celles déjà arrivées à leur état final. Les rejetées récentes (< 24 h) comptent comme actives.",
    formula: `actives    = COUNT(NOT is_terminal)
terminales = COUNT(is_terminal)
pct_actif  = actives / total × 100`,
  },

  terminalOutcomes: {
    meaning:
      "Parmi les commandes arrivées à leur état final, la répartition entre livrées, retournées et rejetées. Mesure le taux de succès brut.",
    formula: `base = COUNT(delivered + returned + rejected_24h)

pct_livrees    = livrees / base × 100
pct_retournees = retournees / base × 100
pct_rejetees   = rejetees / base × 100`,
  },

  topByRevenue: {
    meaning:
      "Top 6 produits par revenu livré. La colonne marge brute % à droite montre vite si un best-seller rapporte vraiment ou vend à perte.",
    formula: `Par produit:
  revenu = SUM(qty × price_per_unit)
           sur items livrés
Trier desc · limite 6`,
  },

  topByOrders: {
    meaning:
      "Top 6 produits par volume de commandes brut (tous statuts non-test non-supprimés). Mesure l'intérêt commercial indépendamment du succès de livraison.",
    formula: `Par produit:
  total = COUNT(orders contenant le produit)
Trier desc · limite 6`,
  },

  topByDeliveries: {
    meaning:
      "Top 6 produits par nombre de livraisons réussies. L'écart avec « Top volume » révèle les produits à forte demande mais à faible taux de conversion (souvent RR élevé ou CR faible).",
    formula: `Par produit:
  livraisons = COUNT(orders delivered
               contenant le produit)
Trier desc · limite 6`,
  },
};
