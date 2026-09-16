export type PhotoFields = {
  certNumber: string;
  grade: string;
  year: string;
  brand: string;
  set: string;
  subject: string;
  cardNumber: string;
};

export const emptyPhotoFields = (): PhotoFields => ({
  certNumber: "", grade: "", year: "", brand: "", set: "", subject: "", cardNumber: "",
});

function labelled(text: string, labels: string[]) {
  const label = labels.map((value) => value.replace(/\s/g, "\\s+")).join("|");
  return new RegExp(`(?:${label})\\s*[:#-]\\s*([^\\n\\r]{1,80})`, "i").exec(text)?.[1]?.trim() ?? "";
}

/**
 * Deliberately conservative: only extract values with an explicit label.
 * A date, number, or word elsewhere on a slab can easily be unrelated card data.
 */
export function extractPhotoFields(...texts: string[]): PhotoFields {
  const text = texts.filter(Boolean).join("\n");
  const cert = labelled(text, ["certification number", "cert number", "cert no", "certificate number", "serial number", "serial no"])
    .match(/^[A-Za-z0-9][A-Za-z0-9 -]{2,40}/)?.[0]?.trim() ?? "";
  const gradeText = labelled(text, ["grade", "final grade", "overall grade"]) || /\b(?:gem mint|mint|near mint|nm-mt|excellent|good)\s+(10(?:\.0)?|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/i.exec(text)?.[1] || "";
  const grade = gradeText.match(/^(?:10(?:\.0)?|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/)?.[0] ?? "";
  const year = labelled(text, ["year", "release year"]).match(/^(?:19|20)\d{2}\b/)?.[0] ?? "";
  const cardNumber = /\b(?:card\s*(?:number|no\.?|#)|number)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9#/-]{0,30})/i.exec(text)?.[1] ?? "";
  return {
    certNumber: cert,
    grade,
    year,
    brand: labelled(text, ["brand", "manufacturer"]),
    set: labelled(text, ["set"]),
    subject: labelled(text, ["player", "subject", "card name"]),
    cardNumber,
  };
}
