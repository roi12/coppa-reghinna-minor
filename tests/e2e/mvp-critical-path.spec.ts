import { expect, test, type Locator, type Page } from "@playwright/test";

const TOURNAMENT_SLUG = "coppa-reghinna-minor-2026";
const OWNER_EMAIL = "owner@sports-platform.local";
const OWNER_PASSWORD = "owner-demo-pass";
const VIEWER_EMAIL = "viewer@sports-platform.local";
const VIEWER_PASSWORD = "viewer-demo-pass";

const TEAM_TO_APPROVE = "QA Five FC";
const TEAM_TO_REJECT = "QA Eleven FC";
const DUPLICATE_TEAM = "QA Duplicate FC";

test.describe.configure({ mode: "serial" });

function registerTeamPath(slug = TOURNAMENT_SLUG) {
  return `/tournaments/${slug}/register-team`;
}

function dashboardTournamentPath(slug = TOURNAMENT_SLUG) {
  return `/dashboard/tournaments/${slug}`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function fillCaptainFields(page: Page, teamName: string, captainEmail: string) {
  await page.getByLabel("Captain first name").fill("Captain");
  await page.getByLabel("Captain last name").fill("Tester");
  await page.getByLabel("Captain email").fill(captainEmail);
  await page.getByLabel("Captain phone").fill("+39 347 555 0101");
  await page.getByLabel("Team name").fill(teamName);
  await page.getByLabel("Notes").fill(`Automated QA registration for ${teamName}.`);
}

async function fillPlayerRow(
  page: Page,
  index: number,
  values: { firstName: string; lastName: string; jerseyNumber: string; role?: string },
) {
  const form = page.getByTestId("team-registration-form");
  const row = form.getByTestId("player-row").nth(index);

  await row.getByTestId("player-first-name").fill(values.firstName);
  await row.getByTestId("player-last-name").fill(values.lastName);
  await row.getByTestId("player-jersey-number").fill(values.jerseyNumber);
  await row.getByTestId("player-role").fill(values.role ?? "");
}

async function addPlayerRowWithRetry(page: Page, expectedCount: number) {
  const form = page.getByTestId("team-registration-form");
  const addPlayerButton = form.getByTestId("add-player-button");
  const playerRows = form.getByTestId("player-row");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await addPlayerButton.scrollIntoViewIfNeeded();
    await addPlayerButton.click();

    try {
      await expect
        .poll(async () => playerRows.count(), {
          timeout: 600,
          intervals: [100, 150, 250],
          message: `Expected player row count to reach ${expectedCount} after clicking Add player`,
        })
        .toBe(expectedCount);

      return;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          `Add player did not increase the player row count to ${expectedCount} after 3 attempts.`,
          { cause: error },
        );
      }

      await page.waitForTimeout(150);
    }
  }
}

async function fillPlayers(page: Page, count: number, prefix: string) {
  const form = page.getByTestId("team-registration-form");
  const addPlayerButton = form.getByTestId("add-player-button");
  const playerRows = form.getByTestId("player-row");

  await expect(form).toBeVisible();
  await expect(playerRows).toHaveCount(5);
  await expect(addPlayerButton).toBeVisible();
  await expect(addPlayerButton).toBeEnabled();
  await expect(addPlayerButton).toHaveText("Add player");
  await page.waitForTimeout(100);

  let currentCount = await playerRows.count();

  while (currentCount < count) {
    currentCount += 1;
    await addPlayerRowWithRetry(page, currentCount);
  }

  await expect(playerRows).toHaveCount(count);

  for (let index = 0; index < count; index += 1) {
    await fillPlayerRow(page, index, {
      firstName: `${prefix}First${index + 1}`,
      lastName: `${prefix}Last${index + 1}`,
      jerseyNumber: String(index + 1),
      role: index === 0 ? "Goalkeeper" : index === count - 1 ? "Pivot" : "Wing",
    });
  }
}

async function submitRegistration(
  page: Page,
  options: { teamName: string; captainEmail: string; playerCount: number; prefix: string },
) {
  await page.goto(registerTeamPath());
  await fillCaptainFields(page, options.teamName, options.captainEmail);
  await fillPlayers(page, options.playerCount, options.prefix);
  await page.getByRole("button", { name: "Submit registration" }).click();
}

async function openRegistrationCard(page: Page, teamName: string) {
  const registrationsHeading = page.getByRole("heading", { name: "Team registrations" });
  await expect(registrationsHeading).toBeVisible();

  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: teamName }) });
  await expect(card).toBeVisible();

  return card.first();
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth <= window.innerWidth + 1;
  });
}

function standingsDesktopRow(page: Page, teamName: string): Locator {
  return page.locator("tbody tr").filter({ has: page.getByText(teamName, { exact: true }) }).first();
}

test("public captain submits a valid team registration with 5 players", async ({ page }) => {
  await submitRegistration(page, {
    teamName: TEAM_TO_APPROVE,
    captainEmail: "qa-five@example.com",
    playerCount: 5,
    prefix: "Five",
  });

  await expect(page.getByText("Registration received. The organizer will review your squad before it appears publicly.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/tournaments/${TOURNAMENT_SLUG}/register-team`));
});

test("public captain submits a valid team registration with 11 players", async ({ page }) => {
  await submitRegistration(page, {
    teamName: TEAM_TO_REJECT,
    captainEmail: "qa-eleven@example.com",
    playerCount: 11,
    prefix: "Eleven",
  });

  await expect(page.getByText("Registration received. The organizer will review your squad before it appears publicly.")).toBeVisible();
});

test("public captain submission with duplicate jersey numbers shows validation error", async ({
  page,
}) => {
  await page.goto(registerTeamPath());
  await fillCaptainFields(page, DUPLICATE_TEAM, "qa-duplicate@example.com");
  await fillPlayers(page, 5, "Duplicate");
  await page
    .getByTestId("team-registration-form")
    .getByTestId("player-row")
    .nth(1)
    .getByTestId("player-jersey-number")
    .fill("1");
  await page.getByRole("button", { name: "Submit registration" }).click();

  await expect(page.getByText("Player 2: Jersey numbers must be unique within a registration.")).toBeVisible();
});

test("owner logs in and sees pending registrations", async ({ page }) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(dashboardTournamentPath());
  await expect(page.getByText(TEAM_TO_APPROVE)).toBeVisible();
  await expect(page.getByText(TEAM_TO_REJECT)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending" })).toBeVisible();
});

test("owner approves a registration and the approved team appears in dashboard and public teams", async ({
  page,
}) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.goto(dashboardTournamentPath());

  const registrationCard = await openRegistrationCard(page, TEAM_TO_APPROVE);
  await registrationCard.getByRole("button", { name: "Approve registration" }).click();

  await expect(page.getByText("Registration approved and team created.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approved" })).toBeVisible();

  const tournamentTeamsSection = page
    .getByRole("heading", { name: "Tournament teams" })
    .locator("xpath=ancestor::article[1]");
  await expect(tournamentTeamsSection.getByText(TEAM_TO_APPROVE)).toBeVisible();

  await page.goto(`/tournaments/${TOURNAMENT_SLUG}/teams`);
  await expect(page.getByRole("heading", { name: TEAM_TO_APPROVE })).toBeVisible();
});

test("owner rejects another registration and the rejected registration does not create a public team", async ({
  page,
}) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.goto(dashboardTournamentPath());

  const registrationCard = await openRegistrationCard(page, TEAM_TO_REJECT);
  await registrationCard.getByRole("button", { name: "Reject registration" }).click();

  await expect(page.getByText("Registration rejected.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rejected" })).toBeVisible();

  await page.goto(`/tournaments/${TOURNAMENT_SLUG}/teams`);
  await expect(page.getByText(TEAM_TO_REJECT)).not.toBeVisible();
});

test("owner generates a round-robin calendar", async ({ page }) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.goto(dashboardTournamentPath());

  await page.getByLabel("Existing match handling").selectOption("PRESERVE_EXISTING");
  await page.getByRole("button", { name: "Generate calendar" }).click();

  await expect(page.getByText(/Generated .*matches|Round-robin calendar generated|preserved .*existing pairing/i)).toBeVisible();
});

test("owner enters match results and public standings update correctly", async ({ page }) => {
  await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.goto(dashboardTournamentPath());

  const resultsSection = page
    .getByRole("heading", { name: "Match results" })
    .locator("xpath=ancestor::article[1]");
  const matchCard = resultsSection
    .locator("section")
    .filter({ hasText: "Dockside United" })
    .filter({ hasText: "Rivergate FC" })
    .first();

  await expect(matchCard).toBeVisible();
  await matchCard.getByLabel("Match status").selectOption("FINAL");
  await matchCard.getByLabel("Home score").fill("2");
  await matchCard.getByLabel("Away score").fill("0");
  await matchCard.getByRole("button", { name: "Save result" }).click();

  await expect(page.getByText("Match result saved.")).toBeVisible();

  await page.goto(`/tournaments/${TOURNAMENT_SLUG}/standings`);
  await expect(page.getByText("Current leader")).toBeVisible();

  const docksideRow = standingsDesktopRow(page, "Dockside United");
  await expect(docksideRow).toContainText(/Dockside United\s+2\s+1\s+0\s+1\s+3\s+2\s+1\s+3/);

  const rivergateRow = standingsDesktopRow(page, "Rivergate FC");
  await expect(rivergateRow).toContainText(/Rivergate FC\s+2\s+0\s+1\s+1\s+1\s+3\s+-2\s+1/);
});

test("viewer login cannot access /dashboard", async ({ page }) => {
  await signIn(page, VIEWER_EMAIL, VIEWER_PASSWORD);
  await expect(page).toHaveURL("/tournaments");

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/tournaments");
  await expect(page.getByText("Public Tournaments")).toBeVisible();
});

test("mobile viewport sanity check for key public pages", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`/tournaments/${TOURNAMENT_SLUG}`);
  await expect(page.getByRole("heading", { name: /Follow the latest fixtures/i })).toBeVisible();
  await expect(await noHorizontalOverflow(page)).toBeTruthy();

  await page.goto(registerTeamPath());
  await expect(page.getByRole("heading", { name: "Register a new team" })).toBeVisible();
  await expect(await noHorizontalOverflow(page)).toBeTruthy();

  await page.goto(`/tournaments/${TOURNAMENT_SLUG}/standings`);
  await expect(page.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(await noHorizontalOverflow(page)).toBeTruthy();
});
