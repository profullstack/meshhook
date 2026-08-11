#!/usr/bin/env node

/**
 * Regenerate TODO.md from the GitHub issue tracker.
 *
 * Every issue on profullstack/meshhook carries a generated PRD body with a
 * consistent shape ("**Milestone:** …", then "## 1. Overview"), so the summary
 * line for each entry is pulled straight from its Overview rather than being
 * hand-written and going stale.
 *
 * Usage:
 *   gh issue list -R profullstack/meshhook --state all --limit 300 \
 *     --json number,title,state,labels,url,body > issues.json
 *   node scripts/generate-todo.mjs issues.json > TODO.md
 *
 * With no argument it shells out to `gh` itself.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "profullstack/meshhook";

/**
 * Sort key for a milestone. Parses the phase number so "Phase 10" sorts after
 * "Phase 9" — a plain string comparison, or prefix matching against a list,
 * puts "Phase 10" first because it starts with "Phase 1".
 * Anything without a phase number sorts to the end.
 */
function phaseRank(milestone) {
  const n = /^Phase\s+(\d+)/i.exec(milestone)?.[1];
  return n === undefined ? Number.MAX_SAFE_INTEGER : Number(n);
}

/**
 * Reproduce GitHub's heading-anchor rules: lowercase, drop punctuation, then
 * turn each remaining space into a hyphen. Note the spaces are not collapsed
 * first — "Polish & Launch" loses the "&" and keeps both surrounding spaces,
 * yielding "polish--launch".
 */
function anchorFor(heading) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s/g, "-");
}

function loadIssues(path) {
  if (path) return JSON.parse(readFileSync(path, "utf8"));

  const out = execFileSync(
    "gh",
    [
      "issue", "list", "-R", REPO, "--state", "all", "--limit", "300",
      "--json", "number,title,state,labels,url,body",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

/** Pull "Phase 3: Execution Engine" out of the PRD header. */
function milestoneOf(body) {
  const m = /\*\*Milestone:\*\*\s*(.+)/.exec(body ?? "");
  return m ? m[1].trim() : "Unscheduled";
}

/**
 * Condense the PRD's Overview section into one sentence.
 *
 * Falls back through the document if the Overview heading is missing, so an
 * issue written by hand still gets a usable line.
 */
function summarize(body) {
  if (!body?.trim()) return "No description provided.";

  const text = body
    // Drop the generated PRD header block, which is metadata, not content.
    .replace(/^#\s*📋[\s\S]*?---\n/, "")
    .replace(/```[\s\S]*?```/g, " ");

  const overview =
    /##\s*\d*\.?\s*Overview\s*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/i.exec(text)?.[1] ??
    text.replace(/^#.*$/gm, "");

  const cleaned = overview
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "No description provided.";

  // First sentence, capped so the table stays readable.
  const sentence = /^(.+?[.!?])(\s|$)/.exec(cleaned)?.[1] ?? cleaned;
  const summary = sentence.length > 240 ? `${sentence.slice(0, 237).trimEnd()}…` : sentence;
  return summary;
}

/** Topic labels only — every issue also carries "hacktoberfest", which says nothing. */
function topicLabels(issue) {
  return issue.labels.map((l) => l.name).filter((n) => n !== "hacktoberfest");
}

const issues = loadIssues(process.argv[2]);
const open = issues.filter((i) => i.state === "OPEN");
const closed = issues.filter((i) => i.state === "CLOSED");

const byMilestone = new Map();
for (const issue of open) {
  const ms = milestoneOf(issue.body);
  if (!byMilestone.has(ms)) byMilestone.set(ms, []);
  byMilestone.get(ms).push(issue);
}

const milestones = [...byMilestone.keys()].sort(
  (a, b) => phaseRank(a) - phaseRank(b) || a.localeCompare(b),
);

const lines = [];

lines.push("# MeshHook TODO");
lines.push("");
lines.push(
  `Every open issue on [${REPO}](https://github.com/${REPO}/issues), grouped by milestone. ` +
    `**${open.length} open**, ${closed.length} closed, ${issues.length} total.`,
);
lines.push("");
lines.push(
  "Summaries are extracted from each issue's PRD overview. Regenerate with " +
    "`node scripts/generate-todo.mjs > TODO.md`.",
);
lines.push("");

lines.push("## Contents");
lines.push("");
for (const ms of milestones) {
  lines.push(`- [${ms}](#${anchorFor(ms)}) — ${byMilestone.get(ms).length} open`);
}
lines.push("");

for (const ms of milestones) {
  const group = byMilestone.get(ms).sort((a, b) => a.number - b.number);
  lines.push(`## ${ms}`);
  lines.push("");

  for (const issue of group) {
    const labels = topicLabels(issue);
    const tag = labels.length ? ` \`${labels.join("` `")}\`` : "";
    lines.push(`- [ ] **[#${issue.number}](${issue.url}) ${issue.title}**${tag}`);
    lines.push(`      ${summarize(issue.body)}`);
  }
  lines.push("");
}

lines.push("---");
lines.push("");
lines.push(
  `<sub>Generated from the GitHub issue tracker. ${open.length} open issues across ` +
    `${milestones.length} milestones.</sub>`,
);

process.stdout.write(lines.join("\n") + "\n");
