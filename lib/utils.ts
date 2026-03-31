import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a name into "First M. Last" format.
 * Accepts either separate parts or a combined full_name string to parse.
 * e.g., first="Juan", middle="Miguel", last="Cruz" → "Juan M. Cruz"
 * e.g., fullName="Juan Miguel Cruz" → "Juan M. Cruz"
 */
export function formatFullName(
  fullNameOrFirst: string | null | undefined,
  fallbackOrMiddle?: string,
  last?: string
): string {
  // If called with separate parts (3 args): formatFullName(first, middle, last)
  if (last !== undefined) {
    const first = fullNameOrFirst?.trim() || '';
    const middle = fallbackOrMiddle?.trim() || '';
    if (!first && !last) return '';
    let result = first;
    if (middle) result += ` ${middle.charAt(0).toUpperCase()}.`;
    if (last) result += result ? ` ${last}` : last;
    return result;
  }

  // Called with a full_name string: formatFullName(fullName, fallback?)
  const fullName = fullNameOrFirst;
  const fallback = fallbackOrMiddle;
  if (!fullName?.trim()) return fallback || '';

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return fullName.trim();

  // 3+ parts: First [Middle] Last
  const first = parts[0];
  const lastPart = parts[parts.length - 1];
  const middleInitial = parts[1].charAt(0).toUpperCase() + '.';
  return `${first} ${middleInitial} ${lastPart}`;
}

/**
 * Abbreviates an office name by taking the first letter of each significant word.
 * Handles " - " separators by abbreviating each part separately with a dash.
 * e.g., "Municipal Mayor's Office - Management Information System Section" → "MMO-MISS"
 * e.g., "Human Resource Management Office" → "HRMO"
 */
export function abbreviateOfficeName(officeName: string | null | undefined): string {
  if (!officeName?.trim()) return '';
  const noise = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an']);
  return officeName
    .split(/\s*-\s*/)
    .map(part =>
      part
        .replace(/['']/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0 && !noise.has(w.toLowerCase()))
        .map(w => w[0].toUpperCase())
        .join('')
    )
    .filter(Boolean)
    .join('-');
}
