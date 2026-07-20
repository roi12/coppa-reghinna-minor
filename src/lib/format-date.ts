import { parseOptionalDate } from "@/lib/parse-date";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  hour12: false,
  timeZone: "UTC",
});

const localizedDateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  hour12: false,
  timeZone: "UTC",
});

const compactDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const compactTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function getValidDate(date: Date | string | null | undefined) {
  return parseOptionalDate(date);
}

export function formatDateLabel(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);
  return validDate ? dateFormatter.format(validDate) : "Data da definire";
}

export function formatDateTimeLabel(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);
  return validDate ? `${dateTimeFormatter.format(validDate)} UTC` : "Data da definire";
}

export function formatLocalizedDateTimeLabel(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);
  return validDate ? localizedDateTimeFormatter.format(validDate) : "Data da definire";
}

export function formatCompactDateTimeLabel(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);

  if (!validDate) {
    return "Data da definire";
  }

  return `${compactDateFormatter.format(validDate)} · ${compactTimeFormatter.format(validDate)}`;
}

export function formatDateRangeLabel(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
) {
  const validStartDate = getValidDate(startDate);
  const validEndDate = getValidDate(endDate);

  if (!validStartDate && !validEndDate) {
    return "Date da definire";
  }

  if (validStartDate && validEndDate) {
    return `${formatDateLabel(validStartDate)} - ${formatDateLabel(validEndDate)}`;
  }

  return validStartDate ? formatDateLabel(validStartDate) : formatDateLabel(validEndDate);
}

export function formatDateInputValue(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);

  if (!validDate) {
    return "";
  }

  return validDate.toISOString().slice(0, 10);
}

export function formatDateTimeInputValue(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);

  if (!validDate) {
    return "";
  }

  return validDate.toISOString().slice(0, 16);
}

export function formatTimeInputValue(date: Date | string | null | undefined) {
  const validDate = getValidDate(date);

  if (!validDate) {
    return "";
  }

  return validDate.toISOString().slice(11, 16);
}
