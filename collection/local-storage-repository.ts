import type { NormalizedCard } from "../graders/model.ts";
import { normalizeCards } from "./normalize.ts";
import { cardIdentity, DuplicateCardError, type CollectionRepository } from "./repository.ts";

export const CURRENT_STORAGE_KEY = "slabberjaws.cards.v1";
export const LEGACY_STORAGE_KEY = "slabvault.cards.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStorageCollectionRepository implements CollectionRepository {
  private storage: StorageLike;
  private fallback: NormalizedCard[];
  constructor(storage: StorageLike, fallback: NormalizedCard[] = []) {
    this.storage = storage;
    this.fallback = fallback;
  }

  hasStoredCollection(): boolean {
    return this.storage.getItem(CURRENT_STORAGE_KEY) !== null || this.storage.getItem(LEGACY_STORAGE_KEY) !== null;
  }

  async getCards(): Promise<NormalizedCard[]> {
    const current = this.storage.getItem(CURRENT_STORAGE_KEY);
    const raw = current ?? this.storage.getItem(LEGACY_STORAGE_KEY);
    if (raw === null) return [...this.fallback];
    try {
      const cards = normalizeCards(JSON.parse(raw));
      if (current === null) this.write(cards);
      return cards;
    } catch {
      return [];
    }
  }

  async getCard(id: string) { return (await this.getCards()).find((card) => card.id === id) ?? null; }
  async hasCard(grader: string, certNumber: string) {
    const identity = cardIdentity(grader, certNumber);
    return (await this.getCards()).some((card) => cardIdentity(card.grader, card.certNumber) === identity);
  }

  async addCard(card: NormalizedCard) {
    if (await this.hasCard(card.grader, card.certNumber)) throw new DuplicateCardError();
    this.write([card, ...(await this.getCards())]);
  }

  async updateCard(card: NormalizedCard) {
    const cards = await this.getCards();
    const conflict = cards.some((existing) => existing.id !== card.id && cardIdentity(existing.grader, existing.certNumber) === cardIdentity(card.grader, card.certNumber));
    if (conflict) throw new DuplicateCardError();
    this.write(cards.map((existing) => existing.id === card.id ? card : existing));
  }

  async deleteCard(id: string) { this.write((await this.getCards()).filter((card) => card.id !== id)); }
  private write(cards: NormalizedCard[]) { this.storage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(cards)); }
}
