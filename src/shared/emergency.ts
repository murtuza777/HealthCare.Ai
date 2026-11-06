// Emergency numbers by country (ISO 3166-1 alpha-2). 112 works on most mobile networks worldwide.
const NUMBERS: Record<string, string> = {
  IN: "112",
  US: "911",
  CA: "911",
  MX: "911",
  GB: "999",
  IE: "112",
  AU: "000",
  NZ: "111",
  ZA: "112",
  AE: "999",
  SA: "997",
  PK: "1122",
  BD: "999",
  SG: "995",
  MY: "999",
  JP: "119",
  CN: "120",
  BR: "192",
};

export function emergencyNumber(country?: string | null): string {
  return (country && NUMBERS[country.toUpperCase()]) || "112";
}

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "ZA", name: "South Africa" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "CN", name: "China" },
];
