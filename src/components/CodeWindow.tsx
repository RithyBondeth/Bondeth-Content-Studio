import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type CodeWindowProps = {
  fileName?: string;
  children: React.ReactNode;
};

/** Editor-style frame with window controls and a file name tab. */
export const CodeWindow: React.FC<CodeWindowProps> = ({
  fileName,
  children,
}) => {
  const { unit } = useLayout();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: theme.radius.lg * unit,
        backgroundColor: theme.colors.surface,
        border: `${2 * unit}px solid ${theme.colors.surfaceBorder}`,
        boxShadow: `0 ${30 * unit}px ${80 * unit}px rgba(0, 0, 0, 0.45)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12 * unit,
          padding: `${20 * unit}px ${28 * unit}px`,
          borderBottom: `${2 * unit}px solid ${theme.colors.surfaceBorder}`,
        }}
      >
        {theme.colors.windowDots.map((color) => (
          <div
            key={color}
            style={{
              width: 18 * unit,
              height: 18 * unit,
              borderRadius: theme.radius.pill,
              backgroundColor: color,
            }}
          />
        ))}
        {fileName ? (
          <div
            style={{
              marginLeft: 16 * unit,
              fontFamily: theme.fonts.mono,
              fontSize: 24 * unit,
              color: theme.colors.textMuted,
            }}
          >
            {fileName}
          </div>
        ) : null}
      </div>
      <div style={{ padding: `${28 * unit}px 0` }}>{children}</div>
    </div>
  );
};
