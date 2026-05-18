const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function hasReachedThresholdDate(input: {
  from: Date;
  thresholdDays: number;
  now: Date;
}) {
  return input.now.getTime() >= addDays(input.from, input.thresholdDays).getTime();
}

export function daysBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}
