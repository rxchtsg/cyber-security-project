import { Incident } from "@/types/incident";
import { startOfISOWeek, endOfISOWeek, subWeeks, isWithinInterval, parseISO } from "date-fns";

export interface WeekComparisonResult {
  currentCount: number;
  previousCount: number;
  percentChange: number;
  shouldShow: boolean;
}

/**
 * Get the last complete ISO week (not including partial current week)
 */
export const getLastCompleteWeek = (): { start: Date; end: Date } => {
  const now = new Date();
  const lastWeekStart = startOfISOWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfISOWeek(subWeeks(now, 1));
  return { start: lastWeekStart, end: lastWeekEnd };
};

/**
 * Get the previous ISO week (two weeks ago)
 */
export const getPreviousWeek = (): { start: Date; end: Date } => {
  const now = new Date();
  const prevWeekStart = startOfISOWeek(subWeeks(now, 2));
  const prevWeekEnd = endOfISOWeek(subWeeks(now, 2));
  return { start: prevWeekStart, end: prevWeekEnd };
};

/**
 * Compare incident counts for a specific type between last week and previous week
 */
export const compareWeekOverWeek = (
  incidents: Incident[],
  type: string
): WeekComparisonResult => {
  const lastWeek = getLastCompleteWeek();
  const prevWeek = getPreviousWeek();

  // Filter incidents by type and date range
  const lastWeekIncidents = incidents.filter(inc => {
    if (inc.type !== type || !inc.date) return false;
    const incDate = parseISO(inc.date);
    return isWithinInterval(incDate, { start: lastWeek.start, end: lastWeek.end });
  });

  const prevWeekIncidents = incidents.filter(inc => {
    if (inc.type !== type || !inc.date) return false;
    const incDate = parseISO(inc.date);
    return isWithinInterval(incDate, { start: prevWeek.start, end: prevWeek.end });
  });

  const currentCount = lastWeekIncidents.length;
  const previousCount = prevWeekIncidents.length;

  // Calculate percent change
  let percentChange = 0;
  if (previousCount > 0) {
    percentChange = ((currentCount - previousCount) / previousCount) * 100;
  } else if (currentCount > 0) {
    percentChange = 100; // If prev was 0 and current > 0, show 100% increase
  }

  // Only show if max(prev, curr) >= 10 and |percent change| >= 10%
  const maxCount = Math.max(currentCount, previousCount);
  const shouldShow = maxCount >= 10 && Math.abs(percentChange) >= 10;

  return {
    currentCount,
    previousCount,
    percentChange,
    shouldShow
  };
};
