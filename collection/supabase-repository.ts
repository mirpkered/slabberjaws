import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedCard } from "../graders/model.ts";
import { normalizeCard } from "./normalize.ts";
import { DuplicateCardError, type CollectionRepository } from "./repository.ts";

type CardRow = {
  id: string; user_id: string; grader: NormalizedCard["grader"]; cert_number: string;
  grade: string; year: string; brand: string; set_name: string; subject: string;
  card_number: string; variant: string; front_image_url: string; back_image_url: string;
  cert_url: string; population: number | null; grader_specific: Record<string, unknown>;
  added_at: string; manual: boolean;
};

export function cardFromRow(row: CardRow): NormalizedCard {
  return normalizeCard({
    id: row.id, grader: row.grader, certNumber: row.cert_number, grade: row.grade,
    year: row.year, brand: row.brand, set: row.set_name, subject: row.subject,
    cardNumber: row.card_number, variant: row.variant, frontImageUrl: row.front_image_url,
    backImageUrl: row.back_image_url, certUrl: row.cert_url, population: row.population,
    graderSpecific: row.grader_specific, addedAt: row.added_at, manual: row.manual,
  })!;
}

export function cardToRow(card: NormalizedCard, userId: string): CardRow {
  return {
    id: card.id, user_id: userId, grader: card.grader, cert_number: card.certNumber.replace(/\s/g, ""),
    grade: card.grade, year: card.year, brand: card.brand, set_name: card.set,
    subject: card.subject, card_number: card.cardNumber, variant: card.variant,
    front_image_url: card.frontImageUrl, back_image_url: card.backImageUrl,
    cert_url: card.certUrl, population: card.population, grader_specific: card.graderSpecific,
    added_at: card.addedAt, manual: Boolean(card.manual),
  };
}

export class SupabaseCollectionRepository implements CollectionRepository {
  private client: SupabaseClient;
  private userId: string;
  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }
  async getCards() {
    const { data, error } = await this.client.from("cards").select("*").order("added_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as CardRow[]).map(cardFromRow);
  }
  async getCard(id: string) {
    const { data, error } = await this.client.from("cards").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? cardFromRow(data as CardRow) : null;
  }
  async hasCard(grader: string, certNumber: string) {
    const { count, error } = await this.client.from("cards").select("id", { count: "exact", head: true })
      .eq("grader", grader).eq("cert_number", certNumber.replace(/\s/g, ""));
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
  async addCard(card: NormalizedCard) {
    const { error } = await this.client.from("cards").insert(cardToRow(card, this.userId));
    if (error?.code === "23505") throw new DuplicateCardError();
    if (error) throw new Error(error.message);
  }
  async updateCard(card: NormalizedCard) {
    const { error } = await this.client.from("cards").update(cardToRow(card, this.userId)).eq("id", card.id);
    if (error?.code === "23505") throw new DuplicateCardError();
    if (error) throw new Error(error.message);
  }
  async deleteCard(id: string) {
    const { error } = await this.client.from("cards").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
