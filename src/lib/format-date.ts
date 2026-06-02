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

export function formatDateLabel(date: Date | null) {
  return date ? dateFormatter.format(date) : "Data da definire";
}

export function formatDateTimeLabel(date: Date | null) {
  return date ? `${dateTimeFormatter.format(date)} UTC` : "Data da definire";
}

export function formatDateRangeLabel(startDate: Date | null, endDate: Date | null) {
  if (!startDate && !endDate) {
    return "Date da definire";
  }

  if (startDate && endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }

  return startDate ? formatDateLabel(startDate) : formatDateLabel(endDate);
}

export function formatDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatDateTimeInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

export function formatTimeInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(11, 16);
}
