"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BRAND } from "@/lib/brand";

const baseLinkClassName =
  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors";

type PublicTournamentNavProps = {
  slug: string;
};

const sections = [
  { href: "", label: "Panoramica" },
  { href: "/register-team", label: "Iscrivi la tua squadra" },
  { href: "/teams", label: "Squadre" },
  { href: "/calendar", label: "Calendario" },
  { href: "/standings", label: "Classifica" },
  { href: "/scorers", label: "Marcatori" },
];

export function PublicTournamentNav({ slug }: PublicTournamentNavProps) {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-2">
        {sections.map((section) => {
          const href = `/tournaments/${slug}${section.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`${baseLinkClassName} ${
                isActive
                  ? `${BRAND.classes.primaryButton}`
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
