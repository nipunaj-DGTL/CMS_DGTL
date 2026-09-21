import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const workflowDirectory = fileURLToPath(
  new URL("../workflows/", import.meta.url),
);
const repositoryDirectory = fileURLToPath(new URL("../../", import.meta.url));
const failures = [];

for (const filename of readdirSync(workflowDirectory)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort()) {
  const path = join(workflowDirectory, filename);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let servicesIndent = null;
  lines.forEach((line, index) => {
    if (/^\s*runs-on:\s*ubuntu-latest(?:\s*#.*)?$/.test(line)) {
      failures.push(
        `${filename}:${index + 1} must select an explicit Ubuntu runner release instead of ubuntu-latest.`,
      );
    }

    const environmentImageMatch = line.match(
      /^\s*[A-Z][A-Z0-9_]*_IMAGE:\s*([^\s#]+)(?:\s+#.*)?$/,
    );
    if (
      environmentImageMatch &&
      !/@sha256:[0-9a-f]{64}$/.test(environmentImageMatch[1])
    ) {
      failures.push(
        `${filename}:${index + 1} must pin static image environment values to a lowercase sha256 digest.`,
      );
    }

    const servicesMatch = line.match(/^(\s*)services:\s*$/);
    if (servicesMatch) {
      servicesIndent = servicesMatch[1].length;
    } else if (
      servicesIndent !== null &&
      !/^\s*(?:#.*)?$/.test(line) &&
      (line.match(/^\s*/)?.[0].length ?? 0) <= servicesIndent
    ) {
      servicesIndent = null;
    }

    const imageMatch =
      servicesIndent === null
        ? null
        : line.match(/^\s*image:\s*([^\s#]+)(?:\s+#\s*(\S.*))?$/);
    if (imageMatch && !/@sha256:[0-9a-f]{64}$/.test(imageMatch[1])) {
      failures.push(
        `${filename}:${index + 1} must pin static container image ${imageMatch[1]} to a lowercase sha256 digest.`,
      );
    }
    if (imageMatch && !imageMatch[2]) {
      failures.push(
        `${filename}:${index + 1} must retain a concise reviewed container version comment.`,
      );
    }

    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#\s*(\S.*))?$/);
    if (!match) return;

    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) return;
    const separator = action.lastIndexOf("@");
    const ref = separator >= 0 ? action.slice(separator + 1) : "";
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      failures.push(
        `${filename}:${index + 1} must pin ${action} to a full lowercase commit SHA.`,
      );
    }
    if (!match[2]) {
      failures.push(
        `${filename}:${index + 1} must retain a concise reviewed version comment.`,
      );
    }
  });
}

const imageWorkflow = readFileSync(
  join(workflowDirectory, "images.yml"),
  "utf8",
).replace(/\r\n/g, "\n");
const deployWorkflow = readFileSync(
  join(workflowDirectory, "deploy.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

const requireWorkflowText = (contents, filename, needle, description) => {
  if (!contents.includes(needle)) {
    failures.push(`${filename} must ${description}.`);
  }
};

if (
  /\bactions\/attest(?:-build-provenance|-sbom)?@/i.test(
    imageWorkflow + deployWorkflow,
  )
) {
  failures.push(
    "Release workflows must use the private-repository-compatible pinned Cosign policy, not GitHub artifact-attestation Actions.",
  );
}

requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "CLIENT01_WEBSITE_KEY: client-01-main",
  "define the canonical Client 01 website identity",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "DGTL360_WEBSITE_KEY: client-02-main",
  "define the canonical DGTL360 website identity",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "BUILDX_LINUX_AMD64_SHA256: 48af8a397ebd60178778bf63611dbcebe5f5e7a9be90eb9147b24b9587455778",
  "pin the reviewed Buildx Linux binary checksum",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "BUILDX_URL: https://github.com/docker/buildx/releases/download/v0.36.1/buildx-v0.36.1.linux-amd64",
  "download the reviewed Buildx Linux release asset",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "sha256sum --check --strict -",
  "verify the Buildx executable before installation",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  '--driver-opt "image=$BUILDKIT_IMAGE"',
  "create its builder from the digest-pinned BuildKit image",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "builder: ${{ steps.buildx.outputs.name }}",
  "bind image builds to the verified builder",
);
if (/docker\/setup-buildx-action@/i.test(imageWorkflow)) {
  failures.push(
    "images.yml must not use setup-buildx-action's unchecked release-asset download path.",
  );
}
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  "-run-${{ github.run_id }}-${{ github.run_attempt }}",
  "publish only workflow-run-unique lookup tags",
);
if (/^\s*type=(?:sha|ref),/m.test(imageWorkflow)) {
  failures.push(
    "images.yml must not publish reusable source or Git-ref convenience tags for release images.",
  );
}
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  '"$CMS_PUBLIC_URL" "$CLIENT01_WEBSITE_KEY" "$CLIENT01_SITE_URL"',
  "feed the canonical Client 01 identity into the frontend build",
);
requireWorkflowText(
  imageWorkflow,
  "images.yml",
  '"$CMS_PUBLIC_URL" "$DGTL360_WEBSITE_KEY" "$DGTL360_SITE_URL"',
  "feed the canonical DGTL360 identity into the frontend build",
);
for (const [key, argument] of [
  ["CLIENT01_WEBSITE_KEY", "client01WebsiteKey"],
  ["DGTL360_WEBSITE_KEY", "dgtl360WebsiteKey"],
]) {
  requireWorkflowText(
    imageWorkflow,
    "images.yml",
    `--arg ${argument} "$${key}"`,
    `bind ${key} into the signed release policy`,
  );
  requireWorkflowText(
    deployWorkflow,
    "deploy.yml",
    `--arg ${argument} "\${${key}:-}"`,
    `verify ${key} from the release manifest against the signed policy`,
  );
}

for (const [contents, filename] of [
  [imageWorkflow, "images.yml"],
  [deployWorkflow, "deploy.yml"],
]) {
  requireWorkflowText(
    contents,
    filename,
    "sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2",
    "pin the reviewed Cosign installer commit",
  );
  requireWorkflowText(
    contents,
    filename,
    "cosign-release: v3.1.2",
    "select the reviewed Cosign release",
  );
}

requireWorkflowText(
  deployWorkflow,
  "deploy.yml",
  "  actions: read\n  contents: read\n  packages: read",
  "grant the exact-CI gate read access to workflow runs",
);

const scanIndex = imageWorkflow.indexOf(
  "- name: Scan the local image before publication",
);
const sbomIndex = imageWorkflow.indexOf(
  "- name: Generate the scanned image SBOM",
);
const loginIndex = imageWorkflow.indexOf(
  "- name: Authenticate only after local scanning and inventory complete",
);
const publishIndex = imageWorkflow.indexOf(
  "- id: publish\n        name: Publish only the scanned image as explicit release tags",
);
const signIndex = imageWorkflow.indexOf(
  "- name: Sign provenance, SBOM, and release policy with keyless Sigstore",
);
if (
  [scanIndex, sbomIndex, loginIndex, publishIndex, signIndex].some(
    (index) => index < 0,
  ) ||
  !(
    scanIndex < sbomIndex &&
    sbomIndex < loginIndex &&
    loginIndex < publishIndex &&
    publishIndex < signIndex
  )
) {
  failures.push(
    "images.yml must scan and inventory locally before registry login, publish only afterward, and sign the resulting digest.",
  );
}

for (const application of readdirSync(join(repositoryDirectory, "apps"), {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory())) {
  const filename = join(
    repositoryDirectory,
    "apps",
    application.name,
    "Dockerfile",
  );
  if (!existsSync(filename)) continue;

  const lines = readFileSync(filename, "utf8").split(/\r?\n/);
  const pinnedArguments = new Set();
  const stages = new Set();
  let hasPinnedSyntax = false;
  lines.forEach((line, index) => {
    const syntaxMatch = line.match(/^#\s*syntax=([^\s]+)$/);
    if (syntaxMatch) {
      if (!/@sha256:[0-9a-f]{64}$/.test(syntaxMatch[1])) {
        failures.push(
          `apps/${application.name}/Dockerfile:${index + 1} must pin the Dockerfile frontend to a lowercase sha256 digest.`,
        );
      } else {
        hasPinnedSyntax = true;
      }
    }

    const argumentMatch = line.match(
      /^ARG\s+([A-Z][A-Z0-9_]*_IMAGE)=([^\s#]+)\s*$/,
    );
    if (argumentMatch) {
      if (!/@sha256:[0-9a-f]{64}$/.test(argumentMatch[2])) {
        failures.push(
          `apps/${application.name}/Dockerfile:${index + 1} must pin ${argumentMatch[1]} to a lowercase sha256 digest.`,
        );
      } else {
        pinnedArguments.add(argumentMatch[1]);
      }
      if (
        !/^#\s*\S.*reviewed\s+\d{4}-\d{2}-\d{2}\.?$/i.test(
          lines[index - 1] ?? "",
        )
      ) {
        failures.push(
          `apps/${application.name}/Dockerfile:${index + 1} must have a preceding reviewed version/date comment.`,
        );
      }
    }

    const fromMatch = line.match(
      /^FROM\s+([^\s]+)(?:\s+AS\s+([A-Za-z0-9._-]+))?\s*$/i,
    );
    if (!fromMatch) return;

    const source = fromMatch[1];
    const variableMatch = source.match(/^\$\{([A-Z][A-Z0-9_]*)\}$/);
    if (variableMatch) {
      if (!pinnedArguments.has(variableMatch[1])) {
        failures.push(
          `apps/${application.name}/Dockerfile:${index + 1} uses unpinned image argument ${variableMatch[1]}.`,
        );
      }
    } else if (!stages.has(source) && !/@sha256:[0-9a-f]{64}$/.test(source)) {
      failures.push(
        `apps/${application.name}/Dockerfile:${index + 1} must pin external base image ${source} to a lowercase sha256 digest.`,
      );
    }
    if (fromMatch[2]) stages.add(fromMatch[2]);
  });
  if (!hasPinnedSyntax) {
    failures.push(
      `apps/${application.name}/Dockerfile must declare an immutable Dockerfile frontend digest.`,
    );
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `GitHub Action pin policy failed:\n- ${failures.join("\n- ")}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "All GitHub Actions, workflow containers, and Dockerfile bases are immutably pinned with review comments.\n",
);
