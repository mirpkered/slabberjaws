import type { NormalizedCard } from "../graders/model.ts";

export interface CollectionRepository {
  getCards(): Promise<NormalizedCard[]>;
  getCard(id: string): Promise<NormalizedCard | null>;
  addCard(card: NormalizedCard): Promise<void>;
  updateCard(card: NormalizedCard): Promise<void>;
  deleteCard(id: string): Promise<void>;
  hasCard(grader: string, certNumber: string): Promise<boolean>;
}

export class DuplicateCardError extends Error {
  constructor() {
    super("This certification is already in your collection.");
    this.name = "DuplicateCardError";
  }
}

export const cardIdentity = (grader: string, certNumber: string) =>
  `${grader.trim().toLowerCase()}::${certNumber.replace(/\s/g, "").toLowerCase()}`;
