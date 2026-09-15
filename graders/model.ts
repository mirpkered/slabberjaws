export type NormalizedCard = {
  id: string; grader: string;
  certNumber: string; grade: string; year: string; brand: string; set: string;
  subject: string; cardNumber: string; variant: string; frontImageUrl: string;
  backImageUrl: string; certUrl: string; population: number|null;
  graderSpecific: Record<string, unknown>; addedAt: string; manual?: boolean;
};
