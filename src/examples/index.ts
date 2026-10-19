import type { VideoSpecInput } from "../spec/schema";
import { howPlantsMakeFood } from "./how-plants-make-food";
import { reactUseState } from "./react-use-state";
import { whyIsTheSkyBlue } from "./why-is-the-sky-blue";

/** Example videos shown in Remotion Studio. The id must use letters, numbers, and hyphens. */
export const examples: { id: string; spec: VideoSpecInput }[] = [
  { id: "why-is-the-sky-blue", spec: whyIsTheSkyBlue },
  { id: "react-use-state", spec: reactUseState },
  { id: "how-plants-make-food", spec: howPlantsMakeFood },
];
