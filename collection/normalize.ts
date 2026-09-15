import type { NormalizedCard } from "../graders/model.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeCard(value: unknown): NormalizedCard | null {
  if (!isRecord(value) || typeof value.grader !== "string" || !value.grader.trim()) return null;
  const certNumber = String(value.certNumber ?? "").replace(/\s/g, "");
  if (!certNumber) return null;
  const populationValue = value.population;
  const population = populationValue === null || populationValue === undefined || populationValue === ""
    ? null
    : Number(populationValue);

  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    grader: value.grader.trim(),
    certNumber,
    grade: String(value.grade ?? ""),
    year: String(value.year ?? ""),
    brand: String(value.brand ?? ""),
    set: String(value.set ?? ""),
    subject: String(value.subject ?? ""),
    cardNumber: String(value.cardNumber ?? ""),
    variant: String(value.variant ?? ""),
    frontImageUrl: String(value.frontImageUrl ?? ""),
    backImageUrl: String(value.backImageUrl ?? ""),
    certUrl: String(value.certUrl ?? ""),
    population: Number.isFinite(population) ? population : null,
    graderSpecific: isRecord(value.graderSpecific) ? value.graderSpecific : {},
    addedAt: typeof value.addedAt === "string" && value.addedAt ? value.addedAt : new Date().toISOString(),
    manual: Boolean(value.manual),
  };
}

export function normalizeCards(value: unknown): NormalizedCard[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeCard).filter((card): card is NormalizedCard => card !== null);
}

export function withCloudId(card: NormalizedCard): NormalizedCard {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(card.id) ? card : { ...card, id: crypto.randomUUID() };
}
