import { CourseClass, CourseExam } from "../types/courseTypes";

export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startDate: string | Date; // ISO string, date string (e.g. 2026-08-20 or 2026-08-20T20:00:00), or Date
  durationMinutes: number;
  url?: string;
  organizer?: string;
}

/**
 * Parses various date formats (e.g. "2026-08-20", "2026-08-20 20:00", "2026-08-20T20:00:00Z")
 * into valid start and end Date objects.
 */
export function parseEventDates(startDateInput: string | Date, durationMinutes: number = 60): { start: Date; end: Date } {
  let start: Date;

  if (startDateInput instanceof Date) {
    start = new Date(startDateInput.getTime());
  } else {
    // If only date provided (e.g. "2026-08-20"), default to 8:00 PM (20:00) Bangladesh Time (typical batch live class time)
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDateInput.trim())) {
      start = new Date(`${startDateInput.trim()}T20:00:00+06:00`);
      if (isNaN(start.getTime())) {
        start = new Date(`${startDateInput.trim()}T20:00:00`);
      }
    } else {
      start = new Date(startDateInput);
      if (isNaN(start.getTime())) {
        start = new Date();
      }
    }
  }

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

/**
 * Format a Date to UTC string format required by Google/Outlook/iCal (YYYYMMDDTHHmmssZ)
 */
export function formatToUtcCompact(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Generate a direct Google Calendar template URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = parseEventDates(event.startDate, event.durationMinutes);
  const dates = `${formatToUtcCompact(start)}/${formatToUtcCompact(end)}`;
  
  let fullDetails = event.description || "";
  if (event.url) {
    fullDetails += `\n\nLive Class Meeting Link: ${event.url}`;
  }
  if (event.organizer) {
    fullDetails += `\nInstructor: ${event.organizer}`;
  }
  fullDetails += "\n\nPlatform: Medical Admission Prep Portal";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: dates,
    details: fullDetails,
    location: event.location || event.url || "Online Live Class / Google Meet"
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook.com calendar web URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const { start, end } = parseEventDates(event.startDate, event.durationMinutes);
  
  let fullDetails = event.description || "";
  if (event.url) {
    fullDetails += `<br><br>Live Meeting: <a href="${event.url}">${event.url}</a>`;
  }

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: fullDetails,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    location: event.location || event.url || "Online Live Class"
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 calendar web URL
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
  const { start, end } = parseEventDates(event.startDate, event.durationMinutes);
  
  let fullDetails = event.description || "";
  if (event.url) {
    fullDetails += `<br><br>Live Meeting: <a href="${event.url}">${event.url}</a>`;
  }

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: fullDetails,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    location: event.location || event.url || "Online Live Class"
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const { start, end } = parseEventDates(event.startDate, event.durationMinutes);
  const durHours = Math.floor(event.durationMinutes / 60);
  const durMins = event.durationMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const durStr = `${pad(durHours)}${pad(durMins)}`;

  const params = new URLSearchParams({
    v: "60",
    view: "d",
    type: "20",
    title: event.title,
    st: formatToUtcCompact(start),
    dur: durStr,
    desc: event.description || "",
    in_loc: event.location || event.url || "Online Live Class"
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Escape text for standard RFC 5545 iCalendar format
 */
function escapeIcsText(str: string): string {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Generate standard .ics string for a single event with 15-minute popup reminder alarm
 */
export function generateSingleIcsContent(event: CalendarEvent): string {
  const { start, end } = parseEventDates(event.startDate, event.durationMinutes);
  const nowUtc = formatToUtcCompact(new Date());
  const uid = `med-class-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@medprep.academy`;

  let desc = event.description || "";
  if (event.url) {
    desc += `\\n\\nMeeting Link: ${event.url}`;
  }
  if (event.organizer) {
    desc += `\\nInstructor: ${event.organizer}`;
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Medical Admission Prep//Batch Live Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${formatToUtcCompact(start)}`,
    `DTEND:${formatToUtcCompact(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(desc)}`,
    `LOCATION:${escapeIcsText(event.location || event.url || "Online Live Class / Google Meet")}`,
    event.url ? `URL:${event.url}` : "",
    "STATUS:CONFIRMED",
    // Alarm reminder 15 minutes before the class
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeIcsText(event.title)} starts in 15 minutes!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean);

  return icsLines.join("\r\n");
}

/**
 * Trigger browser download for an .ics file
 */
export function downloadIcsFile(event: CalendarEvent, filename?: string): void {
  const icsContent = generateSingleIcsContent(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a composite .ics file for all batch classes
 */
export function downloadBatchScheduleIcs(
  batchName: string,
  courseTitle: string,
  classes: CourseClass[],
  filename?: string
): void {
  const nowUtc = formatToUtcCompact(new Date());

  const eventBlocks = classes.map((cls, idx) => {
    const { start, end } = parseEventDates(cls.date, cls.durationMinutes || 60);
    const uid = `batch-class-${cls.id || idx}-${Date.now()}@medprep.academy`;
    let desc = cls.description || `${courseTitle} - ${cls.subject} (${cls.chapter})`;
    if (cls.liveUrl) desc += `\\nMeeting Link: ${cls.liveUrl}`;
    if (cls.instructor) desc += `\\nInstructor: ${cls.instructor}`;

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${formatToUtcCompact(start)}`,
      `DTEND:${formatToUtcCompact(end)}`,
      `SUMMARY:${escapeIcsText(`[${cls.subject}] ${cls.title}`)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      `LOCATION:${escapeIcsText(cls.liveUrl || "Online Live Class / Google Meet")}`,
      cls.liveUrl ? `URL:${cls.liveUrl}` : "",
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Reminder: ${escapeIcsText(cls.title)} starts in 15 minutes!`,
      "END:VALARM",
      "END:VEVENT"
    ].filter(Boolean).join("\r\n");
  });

  const icsFull = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Medical Admission Prep//${escapeIcsText(batchName)} Routine//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`${batchName} - Class Routine`)}`,
    `X-WR-CALDESC:${escapeIcsText(`Live batch classes for ${courseTitle}`)}`,
    ...eventBlocks,
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsFull], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${batchName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Routine.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a composite .ics file for all batch Live Exams
 */
export function downloadBatchExamsIcs(
  batchName: string,
  courseTitle: string,
  exams: CourseExam[],
  filename?: string
): void {
  const nowUtc = formatToUtcCompact(new Date());

  const eventBlocks = exams.map((exam, idx) => {
    const startStr = exam.startTime || new Date().toISOString();
    const { start, end } = parseEventDates(startStr, exam.durationMinutes || 45);
    const uid = `batch-live-exam-${exam.id || idx}-${Date.now()}@medprep.academy`;
    const desc = `Live Exam: ${exam.title}\\nSubject: ${exam.subject}${exam.chapter ? ` (${exam.chapter})` : ""}\\nTotal Questions: ${exam.totalQuestions} MCQs\\nDuration: ${exam.durationMinutes} minutes\\nPass Marks: ${exam.passMarks}\\nCourse: ${courseTitle}\\nBatch: ${batchName}`;

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${formatToUtcCompact(start)}`,
      `DTEND:${formatToUtcCompact(end)}`,
      `SUMMARY:${escapeIcsText(`[Live Exam: ${exam.subject}] ${exam.title}`)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      `LOCATION:${escapeIcsText("Medical Admission Prep Portal - Live Exam Hall")}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Reminder: Live Exam [${escapeIcsText(exam.title)}] starts in 15 minutes!`,
      "END:VALARM",
      "END:VEVENT"
    ].filter(Boolean).join("\r\n");
  });

  const icsFull = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Medical Admission Prep//${escapeIcsText(batchName)} Live Exam Schedule//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`${batchName} - Live Exam Routine`)}`,
    `X-WR-CALDESC:${escapeIcsText(`Live batch exam schedule for ${courseTitle}`)}`,
    ...eventBlocks,
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsFull], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${batchName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Live_Exams_Schedule.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

