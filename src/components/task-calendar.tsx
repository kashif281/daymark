"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { formatWorkDate, localDateInput } from "@/lib/task-notes";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type TaskCalendarProps = {
  selectedDate: string;
  taskDates: Set<string>;
  onSelect: (date: string) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
};

export function TaskCalendar({
  selectedDate,
  taskDates,
  onSelect,
  month,
  onMonthChange,
}: TaskCalendarProps) {
  const today = localDateInput();
  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const items: Array<{ key: string; date: string | null; day: number | null }> =
      [];

    for (let index = 0; index < firstDay; index += 1) {
      items.push({ key: `pad-${index}`, date: null, day: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = localDateInput(new Date(year, monthIndex, day));
      items.push({ key: date, date, day });
    }
    return items;
  }, [month]);

  const label = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <section className="rounded-2xl border border-[#e6e5e0] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label="Previous month"
          className="rounded-lg p-1.5 text-[#777671] hover:bg-[#f3f3f0]"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">{label}</p>
          <p className="mt-0.5 text-[11px] text-[#999893]">
            Selected {formatWorkDate(selectedDate, true)}
          </p>
        </div>
        <button
          aria-label="Next month"
          className="rounded-lg p-1.5 text-[#777671] hover:bg-[#f3f3f0]"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="py-1 text-[10px] font-bold uppercase tracking-wider text-[#9a9994]"
          >
            {day}
          </span>
        ))}
        {cells.map((cell) => {
          if (!cell.date || cell.day == null) {
            return <span key={cell.key} className="aspect-square" />;
          }
          const selected = cell.date === selectedDate;
          const isToday = cell.date === today;
          const hasTasks = taskDates.has(cell.date);
          return (
            <button
              key={cell.key}
              type="button"
              className={`relative aspect-square rounded-xl text-[12px] font-semibold transition ${
                selected
                  ? "bg-[#6d5bd0] text-white"
                  : isToday
                    ? "bg-[#eeecfa] text-[#5f4db9]"
                    : "text-[#3f3e3a] hover:bg-[#f3f3f0]"
              }`}
              onClick={() => onSelect(cell.date!)}
            >
              {cell.day}
              {hasTasks ? (
                <span
                  className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                    selected ? "bg-white" : "bg-[#6d5bd0]"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-[#e2e1dc] py-2 text-[11px] font-semibold text-[#666560] hover:bg-[#f8f8f6]"
        onClick={() => {
          onSelect(today);
          const now = new Date();
          onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
        }}
      >
        Jump to today
      </button>
    </section>
  );
}
