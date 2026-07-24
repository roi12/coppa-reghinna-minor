const TEAM_LOGOS_BUCKET = "team-logos";

const TEAM_LOGO_FILES: Record<string, string> = {
  beerschot: "beerschot.png",
  birra_ravello: "birra_ravello.png",
  birra_ravello_fuoco_di_amalfi: "birra_ravello.png",
  bubu_team_4: "bubu_team_4.png",
  f_c_bubu_team_4_0: "bubu_team_4.png",
  della_valle_fight_club: "Della Valle Fight Club.jpg",
  bardellavalle_fc: "Della Valle Fight Club.jpg",
  drink_team: "drink_team.png",
  drinkteam: "drink_team.png",
  futsal_amalfi_2: "futsal_amalfi_2.png",
  futsal_amalfi_2_0: "futsal_amalfi_2.png",
  futsal_fughezze: "futsal_fughezze.png",
  intrepidi: "intrepidi.png",
  le_bluez: "le_bluez.png",
  leffe_team: "leffe_team.png",
  maiori_music_and_sun: "maiori_music_and_sun.png",
  f_c_intrepidi: "intrepidi.png",
  vin_ca_percoc: "vin_ca_percoc.png",
  f_c_vin_ca_percoc: "vin_ca_percoc.png",
};

function normalizeTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export function getTeamLogoUrl(teamName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  const normalizedTeamName = normalizeTeamName(teamName);
  const fileName = TEAM_LOGO_FILES[normalizedTeamName];

  if (!fileName) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${TEAM_LOGOS_BUCKET}/${encodeURIComponent(fileName)}`;
}
