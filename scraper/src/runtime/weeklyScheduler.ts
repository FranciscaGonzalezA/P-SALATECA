export interface WeeklySchedule {
  day: string;
  time: string;
  timezone: string;
}

function scheduleParts(date: Date, timezone: string): { day: string; date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return {
    day: (values.weekday ?? '').toLocaleLowerCase('en'),
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export function scheduledRunKey(date: Date, schedule: WeeklySchedule): string | undefined {
  const parts = scheduleParts(date, schedule.timezone);
  return parts.day === schedule.day && parts.time === schedule.time ? `${parts.date}T${parts.time}` : undefined;
}

export function startWeeklyScheduler(
  schedule: WeeklySchedule,
  run: () => Promise<void>,
  options: { intervalMs?: number; now?: () => Date } = {},
): () => void {
  const now = options.now ?? (() => new Date());
  let lastRunKey: string | undefined;
  let running = false;
  const check = async () => {
    const key = scheduledRunKey(now(), schedule);
    if (!key || key === lastRunKey || running) return;
    lastRunKey = key;
    running = true;
    try {
      await run();
    } catch (error) {
      console.error('[scraper:scheduler] La ejecución semanal falló:', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void check(), options.intervalMs ?? 30_000);
  void check();
  return () => clearInterval(timer);
}
