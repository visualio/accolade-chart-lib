import {Cols, RGB, RGBA, RowValues, SortDirection, SortType} from './types';

export function isNumeric(n: string|number): boolean {
  if (typeof n === "number") return true;
  return !isNaN(parseFloat(n)) && isFinite(n as unknown as number);
}

export function findLongestConsecutive(numbers: number[]): number[] {
  const chunks: Array<number[]> = [[]];
  let previousValue: number = 0;

  numbers.forEach((currentValue) => {
    // To decide where to put the current number,
    // we compare it to the previous number.
    // If the difference is exactly 1, then they're consecutive,
    // so we'll add the current number to the last available chunk.
    if (previousValue + 1 === currentValue) {
      chunks[chunks.length - 1].push(currentValue);
    } else {
      // Otherwise, we'll create a new chunk to store the current number.
      chunks.push([currentValue]);
    }
    // And now we're moving to the next number, so the current number will become the previous number:
    previousValue = currentValue;
  });

  // Now we can sort the list of chunks by their length:
  chunks.sort((a, b) => b.length - a.length);

  // And finally, we can find our longest consecutive set of numbers by looking at the first chunk!
  return chunks[0];
}

export function getLastItemFromObject(
  obj: RowValues
): string | number {
  return obj[Object.keys(obj)[Object.keys(obj).length - 1]];
}

export function getMaxLength(
  data: Array<{ values: Array<string | number> }>
): number {
  return Object.values(data).reduce((maxLength, { values }) => {
    const currentMax = Math.max(
      ...Object.values(values).map((i) =>
        typeof i === 'string' ? i.length : i.toString().length
      )
    );
    return currentMax > maxLength ? currentMax : maxLength;
  }, 0);
}

export function rgbaToRgb({ r, g, b, a }: RGBA): RGB {
  return {
    r: Math.round((1 - a) * 255 + a * r),
    g: Math.round((1 - a) * 255 + a * g),
    b: Math.round((1 - a) * 255 + a * b),
  };
}

export function rgbaToString({ r, g, b }: RGBA): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function getRGBAOpacity({ a }: RGBA): number {
  return a;
}

export function uniqueString(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function isDefined(value: unknown): boolean {
  return value !== undefined && value !== null;
}

export function parseToNumber(value: number | string) {
  return typeof value === 'string' ? parseFloat(value) : value;
}

export function sortData(
  sortType: SortType,
  sortDirection: SortDirection,
  cols: Cols
) {
  const isDesc = sortDirection === SortDirection.DESC;
  return (
    [keyA, valA]: [number | string, number | string],
    [keyB, valB]: [number | string, number | string]
  ) => {
    if (sortType === SortType.ORIGINAL) return isDesc ? -1 : 1;
    if (sortType === SortType.VALUE) {
      return (parseToNumber(valA) - parseToNumber(valB)) * (isDesc ? -1 : 1);
    }
    if (sortType === SortType.KEY) {
      return (cols[keyA].value > cols[keyB].value ? 1 : -1) * (isDesc ? -1 : 1);
    }
    return -1; // reverse the order by default
  };
}
