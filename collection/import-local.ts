import type { CollectionRepository } from "./repository.ts";
import { normalizeCard, withCloudId } from "./normalize.ts";

export type ImportResult = { imported: number; duplicates: number; failed: number };

export async function importLocalCards(values: unknown, destination: CollectionRepository): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, duplicates: 0, failed: 0 };
  if (!Array.isArray(values)) return { ...result, failed: 1 };
  for (const value of values) {
    const normalized = normalizeCard(value);
    if (!normalized) { result.failed += 1; continue; }
    const card = withCloudId(normalized);
    try {
      if (await destination.hasCard(card.grader, card.certNumber)) {
        result.duplicates += 1;
      } else {
        await destination.addCard(card);
        result.imported += 1;
      }
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
