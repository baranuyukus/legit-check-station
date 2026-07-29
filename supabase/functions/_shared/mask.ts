/** Masks an email address for public display: "meezy@gmail.com" -> "m***y@g***l.com" */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [rawLocal, rawDomain] = email.trim().toLowerCase().split("@");
  if (!rawLocal || !rawDomain) return null;

  const maskPart = (value: string) => {
    if (value.length <= 2) return `${value[0] ?? "*"}***`;
    return `${value[0]}***${value[value.length - 1]}`;
  };

  const dot = rawDomain.lastIndexOf(".");
  const domainName = dot > 0 ? rawDomain.slice(0, dot) : rawDomain;
  const tld = dot > 0 ? rawDomain.slice(dot) : "";

  return `${maskPart(rawLocal)}@${maskPart(domainName)}${tld}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
