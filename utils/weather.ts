export function codeToText(code: number | null): string {
  if (code == null) return "-";
  if ([0].includes(code)) return "Cerah";
  if ([1, 2].includes(code)) return "Cerah berawan";
  if ([3].includes(code)) return "Berawan";
  if ([45, 48].includes(code)) return "Berkabut";
  if ([51, 53, 55].includes(code)) return "Gerimis";
  if ([61, 63, 65].includes(code)) return "Hujan";
  if ([66, 67].includes(code)) return "Hujan beku";
  if ([71, 73, 75, 77].includes(code)) return "Salju";
  if ([80, 81, 82].includes(code)) return "Hujan lebat";
  if ([85, 86].includes(code)) return "Salju lebat";
  if ([95, 96, 99].includes(code)) return "Badai petir";
  return "-";
}
