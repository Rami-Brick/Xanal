import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ConnectionStatus {
  storeId: string | null;
  connected: boolean;
}

/**
 * Lightweight connection check — used by the sidebar to know whether to show
 * "Connecter Converty" vs "Reconnecter Converty". One-row query, cheap.
 */
export const getConnectionStatus = cache(
  async (): Promise<ConnectionStatus> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("converty_tokens")
      .select("store_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const storeId = data?.store_id ?? null;
    return { storeId, connected: storeId !== null };
  }
);
