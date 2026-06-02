import { revalidatePath } from "next/cache";

export function revalidateTournamentPaths(slug: string, previousSlug?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tournaments/new");
  revalidatePath(`/dashboard/tournaments/${slug}`);
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${slug}`);
  revalidatePath(`/tournaments/${slug}/register-team`);
  revalidatePath(`/tournaments/${slug}/teams`);
  revalidatePath(`/tournaments/${slug}/calendar`);
  revalidatePath(`/tournaments/${slug}/standings`);

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/dashboard/tournaments/${previousSlug}`);
    revalidatePath(`/tournaments/${previousSlug}`);
    revalidatePath(`/tournaments/${previousSlug}/register-team`);
    revalidatePath(`/tournaments/${previousSlug}/teams`);
    revalidatePath(`/tournaments/${previousSlug}/calendar`);
    revalidatePath(`/tournaments/${previousSlug}/standings`);
  }
}
