const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_TOURNAMENT_SLUG = "coppa-reghinna-minor-2026";

function getBaseUrl() {
  return (process.env.SMOKE_TEST_BASE_URL || process.env.APP_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
}

async function run() {
  const baseUrl = getBaseUrl();
  const tournamentSlug = process.env.SMOKE_TEST_TOURNAMENT_SLUG || DEFAULT_TOURNAMENT_SLUG;

  const routes = [
    "/",
    "/login",
    "/tournaments",
    `/tournaments/${tournamentSlug}`,
    `/tournaments/${tournamentSlug}/teams`,
    `/tournaments/${tournamentSlug}/calendar`,
    `/tournaments/${tournamentSlug}/standings`,
  ];

  let failed = false;

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`FAIL ${route} -> ${response.status}`);
      failed = true;
      continue;
    }

    console.log(`OK   ${route} -> ${response.status}`);
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log("Smoke test completed successfully.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
