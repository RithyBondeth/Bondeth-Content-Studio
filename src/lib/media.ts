import { staticFile } from "remotion";

/** Files in public/ are referenced by relative path; anything with a scheme is used as-is. */
export const resolveMedia = (src: string) =>
  /^[a-z]+:/i.test(src) ? src : staticFile(src);
