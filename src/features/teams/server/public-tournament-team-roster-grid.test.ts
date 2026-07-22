import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicTournamentTeamRosterGrid } from "@/features/teams/components/public-tournament-team-roster-grid";

test("team roster cards expose stable anchors and selected highlight state", () => {
  const markup = renderToStaticMarkup(
    createElement(PublicTournamentTeamRosterGrid, {
      highlightedTeamId: "team-1",
      rosters: [
        {
          team: {
            id: "team-1",
            organizationId: "org-1",
            name: "Maiori Music and Sun",
            slug: "maiori-music-and-sun",
            seed: 1,
            playerCount: 2,
          },
          players: [
            {
              id: "player-1",
              organizationId: "org-1",
              teamId: "team-1",
              firstName: "Luigi",
              lastName: "Calabrese",
              displayName: "Luigi Calabrese",
              jerseyNumber: "9",
              role: null,
            },
          ],
        },
      ],
    }),
  );

  assert.match(markup, /id="team-team-1"/);
  assert.match(markup, /scroll-mt-28/);
  assert.match(markup, /team-card-highlight/);
  assert.match(markup, /Luigi Calabrese/);
});
