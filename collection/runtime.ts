import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedCard } from "../graders/model.ts";
import { selectRepository } from "./factory.ts";
import { LocalStorageCollectionRepository } from "./local-storage-repository.ts";

export function createBrowserRepositories(options: {
  fallback?: NormalizedCard[]; client?: SupabaseClient | null; userId?: string | null;
}) {
  const local = new LocalStorageCollectionRepository(globalThis.localStorage, options.fallback);
  const active = selectRepository({
    storage: globalThis.localStorage,
    fallback: options.fallback,
    client: options.client,
    userId: options.userId,
  });
  return { local, active };
}
