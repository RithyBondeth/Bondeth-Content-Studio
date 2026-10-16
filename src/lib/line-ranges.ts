/** Parses "2,4-6" into [2, 4, 5, 6]. Line numbers are 1-based. */
export const parseLineRanges = (ranges: string | undefined): number[] => {
  if (!ranges) {
    return [];
  }

  const lines = new Set<number>();
  for (const part of ranges.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(trimmed);
    if (!match) {
      throw new Error(`Invalid line range "${trimmed}" in "${ranges}".`);
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    for (
      let line = Math.min(start, end);
      line <= Math.max(start, end);
      line++
    ) {
      lines.add(line);
    }
  }

  return [...lines].sort((a, b) => a - b);
};
