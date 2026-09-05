import { DEFAULT_PALETTE_ID, PALETTE_STORAGE_KEY } from "./constants";
import { rooftop } from "./themes/rooftop";
import { azure } from "./themes/azure";
import { slate } from "./themes/slate";
import { emerald } from "./themes/emerald";
import { violet } from "./themes/violet";
import { rose } from "./themes/rose";
import { sand } from "./themes/sand";
import { graphite } from "./themes/graphite";

/** Named palettes. Add entries here; do not branch on palette ids in pages. */
export const palettes = {
  [rooftop.id]: rooftop,
  [azure.id]: azure,
  [slate.id]: slate,
  [emerald.id]: emerald,
  [violet.id]: violet,
  [rose.id]: rose,
  [sand.id]: sand,
  [graphite.id]: graphite,
};

export function isPaletteId(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(palettes, id);
}

export function getPalette(id) {
  return palettes[id] || palettes[DEFAULT_PALETTE_ID];
}

export function listPalettes() {
  return Object.values(palettes).map((palette) => ({
    id: palette.id,
    label: palette.label,
    preview: palette.preview,
  }));
}

export function resolveTokens(paletteId, scheme) {
  const palette = getPalette(paletteId);
  if (scheme === "dark") {
    return { ...palette.light, ...palette.dark };
  }
  return { ...palette.light };
}

/** Light print/email hex. PDFs and mail clients cannot use CSS variables. */
export function resolvePrintTheme(paletteId) {
  const palette = getPalette(paletteId);
  return palette.print || getPalette(DEFAULT_PALETTE_ID).print;
}

/** Static PWA/manifest hex from the light scheme (runtime theme-color still follows `--bg`). */
export function resolvePwaTheme(paletteId = DEFAULT_PALETTE_ID) {
  const light = resolveTokens(paletteId, "light");
  return {
    themeColor: light["--bg"],
    backgroundColor: light["--bg"],
    accent: light["--accent"],
    onAccent: light["--on-accent"],
  };
}

export function readStoredPaletteId() {
  if (typeof window === "undefined") return DEFAULT_PALETTE_ID;
  try {
    const id = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    return isPaletteId(id) ? id : DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}

function decls(tokens) {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

/** CSS keyed by data-palette so DevTools / a future picker can switch looks. */
export function buildAllPalettesCss() {
  const fallbackPalette = getPalette(DEFAULT_PALETTE_ID);
  const fallback = [
    `:root { ${decls(fallbackPalette.light)} }`,
    `.dark:not([data-palette]) { ${decls(fallbackPalette.dark)} }`,
  ].join("\n");

  const paletteRules = Object.values(palettes)
    .map((palette) => {
      const light = `[data-palette="${palette.id}"] { ${decls(palette.light)} }`;
      const dark = `.dark[data-palette="${palette.id}"] { ${decls(palette.dark)} }`;
      return `${light}\n${dark}`;
    })
    .join("\n");

  return `${fallback}\n${paletteRules}`;
}

export function getPaletteBootstrapScript() {
  const known = JSON.stringify(Object.keys(palettes));
  const key = JSON.stringify(PALETTE_STORAGE_KEY);
  const fallback = JSON.stringify(DEFAULT_PALETTE_ID);
  return `(function(){try{var known=${known};var id=localStorage.getItem(${key})||${fallback};if(known.indexOf(id)<0)id=${fallback};document.documentElement.setAttribute("data-palette",id);}catch(e){document.documentElement.setAttribute("data-palette",${fallback});}})();`;
}

export { DEFAULT_PALETTE_ID, PALETTE_STORAGE_KEY };
