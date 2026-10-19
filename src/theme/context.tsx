import { createContext, useContext, useMemo } from "react";
import { brand as defaultBrand } from "../brand";
import type { Brand } from "../spec/schema";
import { loadThemeFonts } from "./fonts";
import { resolveTheme, type ResolvedTheme, type ThemeSetting } from "./resolve";

/** A resolved theme with its fonts loaded: what scenes style themselves with. */
export type Theme = Omit<ResolvedTheme, "font"> & {
  fonts: { sans: string; mono: string };
};

const withFonts = ({ font, ...theme }: ResolvedTheme): Theme => ({
  ...theme,
  fonts: loadThemeFonts(font),
});

// The original look, for anything rendered outside a ThemeProvider.
const ThemeContext = createContext<Theme | null>(null);
// Videos without a brand of their own use the one in src/brand.ts.
const BrandContext = createContext<Brand>(defaultBrand);

/** Gives every scene inside it the video's theme and creator identity. */
export const ThemeProvider: React.FC<{
  theme?: ThemeSetting;
  brand?: Brand;
  children: React.ReactNode;
}> = ({ theme, brand, children }) => {
  const value = useMemo(() => withFonts(resolveTheme(theme)), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <BrandContext.Provider value={brand ?? defaultBrand}>
        {children}
      </BrandContext.Provider>
    </ThemeContext.Provider>
  );
};

let fallback: Theme | null = null;

/** The current video's colors, fonts, and radii. */
export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (theme) return theme;
  fallback ??= withFonts(resolveTheme());
  return fallback;
};

/** The current video's creator name, handle, and website. */
export const useBrand = () => useContext(BrandContext);
