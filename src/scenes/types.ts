import type { PreparedCodeStep } from "../lib/prepare-code";
import type { SceneOf, SceneType } from "../spec/schema";

export type SceneProps<T extends SceneType> = {
  scene: SceneOf<T>;
  durationInFrames: number;
  reserveCaptions: boolean;
  /** Highlighted code, only for code scenes. */
  codeSteps?: PreparedCodeStep[];
};
