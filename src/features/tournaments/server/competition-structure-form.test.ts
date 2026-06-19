import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DashboardTournamentGenerationForm } from "@/features/tournaments/components/dashboard-tournament-generation-form";
import { validateManageCompetitionStructure } from "@/features/tournaments/server/competition-structure-form";

function buildValidGenerationFormData() {
  const formData = new FormData();
  const tournamentId = "ck1234567890123456789012";

  formData.set("tournamentId", tournamentId);
  formData.set("tournamentSlug", "coppa-reghinna-minor-2026");
  formData.set("replacementMode", "BLOCK_ON_EXISTING");

  return formData;
}

test("generation parser accepts valid FormData with tournament identifier", () => {
  const parsed = validateManageCompetitionStructure(buildValidGenerationFormData());

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.equal(parsed.data.tournamentId, "ck1234567890123456789012");
  assert.equal(parsed.data.tournamentSlug, "coppa-reghinna-minor-2026");
  assert.equal(parsed.data.replacementMode, "BLOCK_ON_EXISTING");
});

test("generation parser rejects missing tournament identifier", () => {
  const formData = buildValidGenerationFormData();
  formData.delete("tournamentId");

  const parsed = validateManageCompetitionStructure(formData);

  assert.equal(parsed.success, false);
});

test("dashboard generation form includes the required hidden tournament identifier fields", () => {
  const markup = renderToStaticMarkup(
    createElement(DashboardTournamentGenerationForm, {
      action: async () => {},
      tournamentId: "ck1234567890123456789012",
      tournamentSlug: "coppa-reghinna-minor-2026",
      isReady: true,
    }),
  );

  assert.match(markup, /name="tournamentId" value="ck1234567890123456789012"/);
  assert.match(markup, /name="tournamentSlug" value="coppa-reghinna-minor-2026"/);
});
