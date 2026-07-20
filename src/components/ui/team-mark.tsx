"use client";

import Image from "next/image";
import { useState } from "react";

import { getTeamLogoUrl } from "@/lib/team-logos";

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
  const logoUrl = getTeamLogoUrl(name);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const imageAvailable = Boolean(logoUrl) && failedLogoUrl !== logoUrl;

  const sizeClassName = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white font-semibold text-slate-700 shadow-sm ${sizeClassName}`}
    >
      {imageAvailable && logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes={size === "sm" ? "36px" : "48px"}
          className="object-cover"
          onError={() => setFailedLogoUrl(logoUrl)}
          unoptimized
        />
      ) : (
        buildInitials(name)
      )}
    </span>
  );
}
