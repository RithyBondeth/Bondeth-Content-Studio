import { interpolate, useCurrentFrame } from "remotion";
import { useEnter } from "../lib/animation";
import { useLayout } from "../lib/use-layout";

type EmojiProps = {
  emoji: string;
  size?: number;
  delay?: number;
};

/** A large emoji that pops in and then floats gently. */
export const Emoji: React.FC<EmojiProps> = ({
  emoji,
  size = 150,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const pop = useEnter(delay, 12);
  const float = Math.sin((frame - delay) / 18) * 6 * unit;

  return (
    <div
      style={{
        fontSize: size * unit,
        lineHeight: 1,
        transform: `translateY(${float}px) scale(${pop}) rotate(${interpolate(pop, [0, 1], [-15, 0])}deg)`,
        transformOrigin: "center bottom",
      }}
    >
      {emoji}
    </div>
  );
};
