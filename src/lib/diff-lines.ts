/**
 * Marks which lines in `next` are new compared to `previous`, using a
 * longest-common-subsequence match. Unchanged lines keep their place;
 * everything else counts as added and gets an entrance animation.
 */
export const findAddedLines = (
  previous: string[],
  next: string[],
): boolean[] => {
  const rows = previous.length + 1;
  const cols = next.length + 1;
  const lcs: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );

  for (let i = previous.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        previous[i] === next[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const added = new Array<boolean>(next.length).fill(true);
  let i = 0;
  let j = 0;
  while (i < previous.length && j < next.length) {
    if (previous[i] === next[j]) {
      added[j] = false;
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  return added;
};
