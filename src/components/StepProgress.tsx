import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type StepProgressProps = {
  current: number;
  total: number;
};

/** "Step 2 / 4" with one bar per step. `current` is 0-based. */
export const StepProgress: React.FC<StepProgressProps> = ({
  current,
  total,
}) => {
  const { unit } = useLayout();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 * unit }}>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 24 * unit,
          color: theme.colors.textMuted,
        }}
      >
        Step {current + 1} / {total}
      </div>
      <div style={{ display: "flex", gap: 8 * unit }}>
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            style={{
              width: 36 * unit,
              height: 8 * unit,
              borderRadius: theme.radius.pill,
              backgroundColor:
                index <= current
                  ? theme.colors.accent
                  : theme.colors.surfaceBorder,
            }}
          />
        ))}
      </div>
    </div>
  );
};
