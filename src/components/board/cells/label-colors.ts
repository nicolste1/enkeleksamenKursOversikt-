// Own palette with semantic anchors (green = done, …) — deliberately not
// Monday's colors (Krav.MD §5). Offered when users create custom labels (F6).

export const LABEL_COLORS = [
  "#2e7d32", // grønn
  "#f9a825", // gul
  "#c62828", // rød
  "#6a1b9a", // lilla
  "#1565c0", // blå
  "#00838f", // petrol
  "#ad1457", // rosa
  "#5e35b1", // indigo
  "#6d4c41", // brun
  "#ef6c00", // oransje
  "#90a4ae", // lys grå
  "#546e7a", // mørk grå
] as const;

/** Stable accent color derived from a name (course tiles, groups without a
 *  stored color). Skips the trailing grays — accents should have some life. */
export function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return LABEL_COLORS[Math.abs(hash) % (LABEL_COLORS.length - 2)];
}

/** Soft tinted background for tags/tiles (Notion-style). */
export function softBackground(color: string): string {
  return `color-mix(in srgb, ${color} 15%, transparent)`;
}

/** Readable text tint of the same hue: dark shade in light mode, light in dark. */
export function readableTint(color: string): string {
  return `light-dark(color-mix(in srgb, ${color} 55%, #1c1c1a), color-mix(in srgb, ${color} 60%, #ffffff))`;
}
