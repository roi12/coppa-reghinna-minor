function buildInitials(name: string) {
  const segments = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length === 0) {
    return "TM";
  }

  return segments.map((segment) => segment[0]?.toUpperCase() ?? "").join("");
}

type TeamMarkProps = {
  name: string;
  size?: "sm" | "md";
};

export function TeamMark({ name, size = "md" }: TeamMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white font-semibold text-slate-700 shadow-sm ${
        size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm"
      }`}
    >
      {buildInitials(name)}
    </span>
  );
}
