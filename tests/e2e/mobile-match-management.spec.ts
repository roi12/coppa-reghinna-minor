import assert from "node:assert/strict";

import { expect, test, type Page } from "@playwright/test";

const TOURNAMENT_SLUG = "coppa-reghinna-minor-2026";
const OWNER_EMAIL = "owner@sports-platform.local";
const OWNER_PASSWORD = "owner-demo-pass";

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 390, height: 844 } });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function openResultsMatchCard(page: Page) {
  await signIn(page);
  await page.goto(`/dashboard/tournaments/${TOURNAMENT_SLUG}`);

  const resultsSection = page
    .getByRole("heading", { name: "5. Gestione risultati" })
    .locator("xpath=ancestor::article[1]");
  const matchCard = resultsSection
    .locator("section")
    .filter({ hasText: "Dockside United" })
    .filter({ hasText: "Rivergate FC" })
    .first();

  await expect(matchCard).toBeVisible();

  const startButton = matchCard.getByRole("button", { name: "Avvia partita" });
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  await expect(matchCard.getByRole("button", { name: "+ Evento giocatore" })).toBeVisible();
  return matchCard;
}

async function openPlayerEventSheet(page: Page) {
  const matchCard = await openResultsMatchCard(page);

  const contextResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      /\/api\/dashboard\/matches\/[^/]+\/events$/.test(response.url())
    );
  });

  await matchCard.getByRole("button", { name: "+ Evento giocatore" }).click();
  const eventContextResponse = await contextResponsePromise;
  const eventContext = (await eventContextResponse.json()) as {
    match: { homeTeamId: string };
    homePlayers: Array<{ id: string; displayName: string | null; firstName: string; lastName: string }>;
  };

  const sheet = page.getByRole("dialog", { name: "Evento giocatore" });
  await expect(sheet).toBeVisible();

  return {
    eventContext,
    matchCard,
    sheet,
  };
}

test("public calendar team links jump to the roster card and browser back returns to the calendar", async ({
  page,
}) => {
  await page.goto(`/tournaments/${TOURNAMENT_SLUG}/calendar`);

  const teamLink = page.getByRole("link", { name: "Apri la squadra Northport Rovers" }).first();
  await teamLink.scrollIntoViewIfNeeded();

  const beforeClickScrollY = await page.evaluate(() => window.scrollY);
  await teamLink.click();

  await expect(page).toHaveURL(new RegExp(`/tournaments/${TOURNAMENT_SLUG}/teams\\?team=.*#team-`));

  const targetHash = await page.evaluate(() => window.location.hash.replace(/^#/, ""));
  const highlightedCard = page.locator(`#${targetHash}`);

  await expect(highlightedCard).toBeVisible();
  await expect(highlightedCard).toContainText("Luca Bianchi");
  await expect(highlightedCard).toContainText("Marco Rossi");
  await expect(highlightedCard).toHaveClass(/team-card-highlight/);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/tournaments/${TOURNAMENT_SLUG}/calendar$`));

  const afterBackScrollY = await page.evaluate(() => window.scrollY);
  expect(afterBackScrollY).toBeGreaterThan(0);
  expect(Math.abs(afterBackScrollY - beforeClickScrollY)).toBeLessThan(220);
});

test("mobile yellow-card flow keeps selections after an API error and closes only after a successful submit", async ({
  page,
}) => {
  const { eventContext, matchCard, sheet } = await openPlayerEventSheet(page);

  const selectedHomePlayer = eventContext.homePlayers.find((player) => {
    const label = player.displayName ?? `${player.firstName} ${player.lastName}`;
    return label === "Enzo Marini";
  });

  assert(selectedHomePlayer);

  await expect(sheet.getByRole("button", { name: "Dockside United" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Ammonizione" })).toBeVisible();
  await expect(sheet.getByText("Simone Villa")).not.toBeVisible();

  await sheet.getByRole("button", { name: "Ammonizione" }).click();
  await sheet.getByRole("button", { name: /\[10\] Enzo Marini|Enzo Marini/ }).click();

  const confirmButton = sheet.getByRole("button", { name: "Conferma cartellino giallo" });
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeEnabled();
  const confirmBox = await confirmButton.boundingBox();
  assert(confirmBox);
  expect(confirmBox.y + confirmBox.height).toBeLessThanOrEqual(844);

  let yellowCardRequestCount = 0;
  let firstPayload: Record<string, unknown> | null = null;

  await page.route("**/api/dashboard/matches/*/events", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    if (payload.type !== "YELLOW_CARD") {
      await route.continue();
      return;
    }

    yellowCardRequestCount += 1;

    if (yellowCardRequestCount === 1) {
      firstPayload = payload;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Errore test cartellino" }),
      });
      return;
    }

    await route.continue();
  });

  await confirmButton.click();

  assert(firstPayload);
  assert.equal(firstPayload["teamId"], eventContext.match.homeTeamId);
  assert.equal(firstPayload["playerId"], selectedHomePlayer.id);

  await expect(sheet.getByText("Errore test cartellino")).toBeVisible();
  await expect(sheet.getByText("Enzo Marini · Ammonizione")).toBeVisible();
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeEnabled();

  const successResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      /\/api\/dashboard\/matches\/[^/]+\/events$/.test(response.url()) &&
      response.status() === 200
    );
  });

  await Promise.all([confirmButton.click(), confirmButton.click()]);
  await successResponsePromise;

  expect(yellowCardRequestCount).toBe(2);
  await expect(sheet).toBeHidden();
  await expect(matchCard.getByText("Evento giocatore registrato.")).toBeVisible();
});

test("mobile quick-goal scorer assignment stays team-scoped and closes after choosing a scorer", async ({
  page,
}) => {
  const matchCard = await openResultsMatchCard(page);

  const scorerSheetResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      /\/api\/dashboard\/matches\/[^/]+\/events$/.test(response.url())
    );
  });

  await matchCard.getByRole("button", { name: "Aggiungi un gol a Dockside United" }).click();

  const scorerContextResponse = await scorerSheetResponsePromise;
  const scorerContext = (await scorerContextResponse.json()) as {
    homePlayers: Array<{ id: string; displayName: string | null; firstName: string; lastName: string }>;
  };

  const selectedHomePlayer = scorerContext.homePlayers.find((player) => {
    const label = player.displayName ?? `${player.firstName} ${player.lastName}`;
    return label === "Enzo Marini";
  });

  assert(selectedHomePlayer);

  const sheet = page.getByRole("dialog", { name: "Chi ha segnato?" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Dockside United")).toBeVisible();
  await expect(sheet.getByText("Simone Villa")).not.toBeVisible();

  const scorerButton = sheet.getByRole("button", { name: /\[10\] Enzo Marini|Enzo Marini/ });
  await expect(scorerButton).toBeVisible();
  await scorerButton.click();

  await expect(sheet).toBeHidden();
  await expect(matchCard.getByText("Marcatore aggiornato.")).toBeVisible();
});

test("latest player-event edit reopens the mobile sheet with the selected player and explicit update action", async ({
  page,
}) => {
  const matchCard = await openResultsMatchCard(page);

  const latestEventSection = matchCard
    .getByText("Ultimo evento")
    .locator("xpath=ancestor::div[1]");

  await expect(latestEventSection).toBeVisible();

  const contextResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      /\/api\/dashboard\/matches\/[^/]+\/events$/.test(response.url())
    );
  });

  await latestEventSection.getByRole("button", { name: "Modifica" }).click();
  await contextResponsePromise;

  const sheet = page.getByRole("dialog", { name: "Evento giocatore" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Giocatore selezionato")).toBeVisible();
  await expect(sheet.getByText("Enzo Marini")).toBeVisible();

  const updateButton = sheet.getByRole("button", { name: "Aggiorna cartellino giallo" });
  await expect(updateButton).toBeVisible();
  await expect(updateButton).toBeEnabled();

  const updateBox = await updateButton.boundingBox();
  assert(updateBox);
  expect(updateBox.y + updateBox.height).toBeLessThanOrEqual(844);
});
