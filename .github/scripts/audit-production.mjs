import { spawnSync } from "node:child_process";

const severityRank = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4],
]);

// Every exception is narrow, documented, and expires so CI cannot silently
// normalize a permanent vulnerability waiver.
const allowlist = new Map([
  [
    "GHSA-67mh-4wv8-2f99",
    {
      expires: "2026-10-01",
      maximumSeverity: "moderate",
      module: "esbuild",
      pathPattern:
        /^apps__cms>@payloadcms\/db-postgres>drizzle-kit>@esbuild-kit\//,
      reason:
        "Only the Payload/Drizzle development tooling path is affected; no development server runs in production.",
    },
  ],
  [
    "GHSA-jg8r-5jh2-v2xj",
    {
      expires: "2026-10-01",
      maximumSeverity: "moderate",
      module: "payload",
      pathPattern: /^apps__cms>/,
      reason:
        "CmsUsers.unlock is explicitly restricted to authenticated company super administrators pending Payload 3.88.1 adoption.",
    },
  ],
]);

const windows = process.platform === "win32";
const executable = windows ? process.env.ComSpec || "cmd.exe" : "pnpm";
const arguments_ = windows
  ? ["/d", "/s", "/c", "pnpm audit --prod --json"]
  : ["audit", "--prod", "--json"];
const result = spawnSync(executable, arguments_, {
  encoding: "utf8",
  shell: false,
});

if (result.error || !result.stdout?.trim()) {
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.stderr.write(
    result.stderr || "pnpm audit returned no JSON output.\n",
  );
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stderr.write("pnpm audit returned invalid JSON.\n");
  process.stderr.write(result.stderr);
  process.exit(2);
}

if (
  report.error ||
  !report.advisories ||
  typeof report.advisories !== "object"
) {
  process.stderr.write(
    `pnpm audit could not produce a usable advisory report: ${JSON.stringify(report.error ?? report)}\n`,
  );
  process.exit(2);
}

const currentDate = new Date().toISOString().slice(0, 10);
const failures = [];
const observed = new Set();

for (const advisory of Object.values(report.advisories)) {
  const id = advisory.github_advisory_id;
  const severity = String(advisory.severity ?? "").toLowerCase();
  if (!id || !severityRank.has(severity)) {
    failures.push(`Malformed audit advisory: ${JSON.stringify(advisory)}`);
    continue;
  }

  observed.add(id);
  const exception = allowlist.get(id);
  if (!exception) {
    if ((severityRank.get(severity) ?? 99) >= severityRank.get("moderate")) {
      failures.push(
        `${id} (${advisory.module_name}, ${severity}) is not allowlisted.`,
      );
    }
    continue;
  }

  if (advisory.module_name !== exception.module) {
    failures.push(
      `${id} now affects unexpected module ${advisory.module_name}.`,
    );
    continue;
  }
  const affectedPaths = (advisory.findings ?? []).flatMap(
    (finding) => finding.paths ?? [],
  );
  if (
    affectedPaths.length === 0 ||
    affectedPaths.some((path) => !exception.pathPattern.test(path))
  ) {
    failures.push(`${id} now affects an unexpected dependency path.`);
    continue;
  }
  if (
    (severityRank.get(severity) ?? 99) >
    (severityRank.get(exception.maximumSeverity) ?? -1)
  ) {
    failures.push(
      `${id} severity increased from the accepted ${exception.maximumSeverity} to ${severity}.`,
    );
    continue;
  }
  if (currentDate > exception.expires) {
    failures.push(
      `${id} exception expired on ${exception.expires}. Upgrade or renew it through security review.`,
    );
    continue;
  }

  process.stdout.write(
    `Accepted temporary exception ${id} through ${exception.expires}: ${exception.reason}\n`,
  );
}

for (const [id, exception] of allowlist) {
  if (!observed.has(id)) {
    process.stdout.write(
      `NOTICE: ${id} is no longer reported; remove its ${exception.expires} exception.\n`,
    );
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Production dependency policy failed:\n- ${failures.join("\n- ")}\n`,
  );
  process.exit(1);
}

process.stdout.write("Production dependency advisory policy passed.\n");
