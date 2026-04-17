import { useMemo, useState } from 'react';
import { computeP95, getIntensityLevel, type HeatmapGrid, type HeatmapDay } from '../utils/heatmap';

interface HeatmapCalendarProps {
  grid: HeatmapGrid;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format a date string (YYYY-MM-DD) for display in the tooltip.
 * E.g., "2026-01-15" → "Wed, Jan 15"
 */
function formatTooltipDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_OF_WEEK[date.getDay()];
  const monthName = MONTHS[date.getMonth()];
  const day = date.getDate();
  return `${dayName}, ${monthName} ${day}`;
}

/**
 * Get the month label for a given date (or empty string if same as previous week).
 * Returns the abbreviated month name when the month changes.
 */
function getMonthLabel(grid: HeatmapGrid, weekIndex: number): string {
  const firstDayOfWeek = weekIndex * 7;
  if (firstDayOfWeek >= grid.length) return '';

  const currentMonth = new Date(grid[firstDayOfWeek].date + 'T00:00:00').getMonth();

  // Check previous week's month
  if (weekIndex > 0) {
    const prevFirstDay = (weekIndex - 1) * 7;
    const prevMonth = new Date(grid[prevFirstDay].date + 'T00:00:00').getMonth();
    if (currentMonth === prevMonth) return '';
  }

  return MONTHS[currentMonth];
}

interface TooltipState {
  day: HeatmapDay;
  x: number;
  y: number;
}

export default function HeatmapCalendar({ grid }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // grid.length is always a multiple of 7 (complete weeks)
  const numWeeks = grid.length / 7;

  // Compute p95 for color normalization
  const p95 = useMemo(() => computeP95(grid), [grid]);

  // Pre-compute intensity levels for all days
  const intensityLevels = useMemo(
    () => grid.map((day) => getIntensityLevel(day.totalSeconds, p95)),
    [grid, p95]
  );

  const handleCellMouseEnter = (e: React.MouseEvent, day: (typeof grid)[0]) => {
    setTooltip({
      day,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

  return (
    // --hm-weeks drives repeat() in both the month-labels and heatmap-grid CSS
    <div className="heatmap-container" style={{ '--hm-weeks': numWeeks } as React.CSSProperties}>
      {/*
        Single outer grid: 2 columns (day-labels col + data col).
        Both the month-labels row and the heatmap-grid row live in column 2,
        so they share the exact same computed width — no alignment drift possible.
      */}
      <div className="heatmap-outer">
        {/* Row 1, col 1: spacer */}
        <div />
        {/* Row 1, col 2: month labels */}
        <div className="heatmap-month-labels">
          {Array.from({ length: numWeeks }).map((_, weekIndex) => (
            <div key={`month-${weekIndex}`} className="heatmap-month-label">
              {getMonthLabel(grid, weekIndex)}
            </div>
          ))}
        </div>

        {/* Row 2, col 1: day labels — 7-row grid matching heatmap rows */}
        <div className="heatmap-day-labels">
          <div /> {/* Sun */}
          <div className="heatmap-day-label">Mon</div>
          <div /> {/* Tue */}
          <div className="heatmap-day-label">Wed</div>
          <div /> {/* Thu */}
          <div className="heatmap-day-label">Fri</div>
          <div /> {/* Sat */}
        </div>

        {/* Row 2, col 2: heatmap grid */}
        <div className="heatmap-grid">
          {grid.map((day, index) => (
            <div
              key={`${day.date}-${index}`}
              className="heatmap-cell"
              data-level={intensityLevels[index]}
              onMouseEnter={(e) => handleCellMouseEnter(e, day)}
              onMouseLeave={handleCellMouseLeave}
              title={day.activities.length > 0 ? day.activities.join(', ') : 'No activities'}
            />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            left: `${tooltip.x + 12}px`,
            top: `${tooltip.y - 8}px`,
          }}
          role="tooltip"
        >
          <div className="heatmap-tooltip-date">{formatTooltipDate(tooltip.day.date)}</div>
          {tooltip.day.activities.length === 0 ? (
            <div className="heatmap-tooltip-empty">No activities</div>
          ) : (
            <ul className="heatmap-tooltip-list">
              {tooltip.day.activities.map((name: string, i: number) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
