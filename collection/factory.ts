import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedCard } from "../graders/model.ts";
import { LocalStorageCollectionRepository, type StorageLike } from "./local-storage-repository.ts";
import type { CollectionRepository } from "./repository.ts";
import { SupabaseCollectionRepository } from "./supabase-repository.ts";

export function selectRepository(options: {
  storage: StorageLike; fallback?: NormalizedCard[]; client?: SupabaseClient | null; userId?: string | null;
}): CollectionRepository {
  if (options.client && options.userId) return new SupabaseCollectionRepository(options.client, options.userId);
  return new LocalStorageCollectionRepository(options.storage, options.fallback);
}
