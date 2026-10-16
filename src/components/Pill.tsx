import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type PillProps = {
  children: React.ReactNode;
  variant?: "accent" | "subtle";
};

export const Pill: React.FC<PillProps> = ({ children, variant = "subtle" }) => {
  const { unit } = useLayout();
  const isAccent = variant === "accent";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${10 * unit}px ${24 * unit}px`,
        borderRadius: theme.radius.pill,
        fontFamily: theme.fonts.mono,
        fontWeight: 600,
        fontSize: 26 * unit,
        color: isAccent ? theme.colors.accentText : theme.colors.text,
        backgroundColor: isAccent ? theme.colors.accent : theme.colors.surface,
        border: `${2 * unit}px solid ${isAccent ? theme.colors.accent : theme.colors.surfaceBorder}`,
      }}
    >
      {children}
    </div>
  );
};
