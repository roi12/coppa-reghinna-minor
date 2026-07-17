import prismaClientModule from "../src/lib/prisma-client.mjs";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    slug: null,
    mode: "GLOBAL",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--slug") {
      args.slug = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === "--mode") {
      args.mode = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }
  }

  return args;
}

function parseConfiguration(configuration) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }

  return configuration;
}

const args = parseArgs(process.argv.slice(2));

if (!args.slug) {
  fail("Missing required --slug argument.");
}

if (args.mode !== "GLOBAL" && args.mode !== "GROUPS") {
  fail("Invalid --mode value. Use GLOBAL or GROUPS.");
}

const { prisma, getDatabaseUrl } = prismaClientModule;

async function main() {
  const databaseUrl = getDatabaseUrl();
  const tournament = await prisma.tournament.findUnique({
    where: { slug: args.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          name: true,
          configuration: true,
        },
      },
    },
  });

  if (!tournament) {
    fail(`Tournament not found for slug "${args.slug}".`);
  }

  const preliminaryStage = tournament.stages.find((stage) => stage.type === "GROUP_STAGE");

  if (!preliminaryStage) {
    fail(`Tournament "${tournament.slug}" has no preliminary group stage.`);
  }

  const currentConfiguration = parseConfiguration(preliminaryStage.configuration);
  const nextConfiguration = {
    ...currentConfiguration,
    standingsScope: args.mode,
  };

  console.log(`Database: ${new URL(databaseUrl).host}${new URL(databaseUrl).pathname}`);
  console.log(`Tournament: ${tournament.name} (${tournament.slug})`);
  console.log(`Stage: ${preliminaryStage.name} [${preliminaryStage.id}]`);
  console.log(`Current configuration: ${JSON.stringify(currentConfiguration)}`);
  console.log(`Next configuration: ${JSON.stringify(nextConfiguration)}`);

  if (args.dryRun) {
    console.log("Dry run only. No changes were written.");
    return;
  }

  await prisma.tournamentStage.update({
    where: { id: preliminaryStage.id },
    data: {
      configuration: nextConfiguration,
    },
  });

  console.log(`Updated standingsScope to "${args.mode}".`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
