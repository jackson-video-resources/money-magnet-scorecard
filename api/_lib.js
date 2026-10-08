// Scoring and lead delivery. Shared by api/submit.js (Vercel) and scripts/check.mjs (local test).
// Files starting with _ in api/ are not routes on Vercel.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const loadConfig = () =>
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "config.json"), "utf8"),
  );

export const maxScore = (c) =>
  c.questions.reduce(
    (n, q) => n + Math.max(0, ...q.answers.map((a) => a.points)),
    0,
  );

// The highest band whose starting score this score reaches.
export const resultFor = (c, score) =>
  [...c.results].sort((a, b) => b.min - a.min).find((r) => score >= r.min) ||
  c.results[0];

export function score(c, picks) {
  if (!Array.isArray(picks) || picks.length !== c.questions.length) return null;
  let total = 0;
  for (let i = 0; i < picks.length; i++) {
    const a = c.questions[i].answers[Number(picks[i])];
    if (!a) return null;
    total += a.points;
  }
  return total;
}

// What's wrong with a config, in plain words (empty = fine).
export function problems(c) {
  const out = [];
  if (!c.title || !c.brand?.name)
    out.push("config.json needs a title and brand.name.");
  if (!Array.isArray(c.questions) || c.questions.length < 3)
    out.push("config.json needs at least 3 questions.");
  for (const [i, q] of (c.questions || []).entries())
    if (
      !q.q ||
      !Array.isArray(q.answers) ||
      q.answers.length < 2 ||
      q.answers.some((a) => !a.label || typeof a.points !== "number")
    )
      out.push(
        `Question ${i + 1} needs its wording and at least 2 answers, each with a label and points.`,
      );
  if (!Array.isArray(c.results) || !c.results.length)
    out.push("config.json needs at least one result.");
  else {
    if (!c.results.some((r) => r.min === 0))
      out.push("One result has to start at 0.");
    for (const r of c.results) {
      if (
        !r.id ||
        !r.headline ||
        !r.text ||
        !r.cta?.label ||
        !/^https?:\/\/\S+\.\S+/.test(r.cta?.url || "")
      )
        out.push(
          `Result "${r.headline || r.id || "?"}" needs an id, headline, text and a next step with a full https link.`,
        );
      if (r.min > maxScore(c))
        out.push(
          `Result "${r.headline}" starts at ${r.min}, above the highest possible score (${maxScore(c)}).`,
        );
    }
  }
  if (JSON.stringify(c).match(/\[[a-z][^\]]*\]/i))
    out.push("Something in config.json is still in [square brackets].");
  return out;
}

// ---------- where leads go ----------
// Set in Vercel's environment variables. Whichever are set are used; the Google Sheet can sit alongside an email tool.
//   KIT_API_KEY                          Kit (ConvertKit) v4 API key
//   MAILCHIMP_API_KEY, MAILCHIMP_AUDIENCE_ID
//   SHEET_WEBHOOK_URL                    the Google Sheet's Apps Script web app URL (google-sheet/README.md)
export function providers(env = process.env) {
  const p = [];
  if (env.KIT_API_KEY) p.push("kit");
  if (env.MAILCHIMP_API_KEY && env.MAILCHIMP_AUDIENCE_ID) p.push("mailchimp");
  if (env.SHEET_WEBHOOK_URL) p.push("sheet");
  return p;
}

const tagNames = (c, r) => ["scorecard", `scorecard-${r.id}`];

async function toKit(lead, c, r, env, fetchFn) {
  const H = {
    "X-Kit-Api-Key": env.KIT_API_KEY,
    "content-type": "application/json",
    accept: "application/json",
  };
  const api = (p, init = {}) =>
    fetchFn(`https://api.kit.com/v4${p}`, { ...init, headers: H });
  const sub = await api("/subscribers", {
    method: "POST",
    body: JSON.stringify({ email_address: lead.email, first_name: lead.first }),
  });
  if (!sub.ok) throw new Error(`kit subscriber ${sub.status}`);
  for (const name of tagNames(c, r)) {
    // Creating a tag that exists returns the existing one.
    const t = await api("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const id = (await t.json()).tag?.id;
    if (!id) throw new Error(`kit tag ${name} ${t.status}`);
    const add = await api(`/tags/${id}/subscribers`, {
      method: "POST",
      body: JSON.stringify({ email_address: lead.email }),
    });
    if (!add.ok) throw new Error(`kit tagging ${add.status}`);
  }
}

async function toMailchimp(lead, c, r, env, fetchFn) {
  const dc = env.MAILCHIMP_API_KEY.split("-").pop();
  const hash = crypto.createHash("md5").update(lead.email).digest("hex");
  const base = `https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_AUDIENCE_ID}/members/${hash}`;
  const H = {
    authorization: `Basic ${Buffer.from(`any:${env.MAILCHIMP_API_KEY}`).toString("base64")}`,
    "content-type": "application/json",
  };
  const put = await fetchFn(base, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({
      email_address: lead.email,
      status_if_new: "subscribed",
      merge_fields: { FNAME: lead.first },
    }),
  });
  if (!put.ok) throw new Error(`mailchimp member ${put.status}`);
  const tags = await fetchFn(`${base}/tags`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      tags: tagNames(c, r).map((name) => ({ name, status: "active" })),
    }),
  });
  if (!tags.ok) throw new Error(`mailchimp tags ${tags.status}`);
}

async function toSheet(lead, c, r, env, fetchFn) {
  const res = await fetchFn(env.SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "text/plain" }, // Apps Script accepts this without a CORS preflight
    body: JSON.stringify({
      date: lead.at,
      first: lead.first,
      email: lead.email,
      score: lead.score,
      max: lead.max,
      result: r.headline,
    }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
}

const SENDERS = { kit: toKit, mailchimp: toMailchimp, sheet: toSheet };

// Send the lead everywhere that's set up. Returns {sent: [...], failed: [...]}; one failure doesn't stop the rest.
export async function deliver(lead, c, r, env = process.env, fetchFn = fetch) {
  const out = { sent: [], failed: [] };
  for (const p of providers(env)) {
    try {
      await SENDERS[p](lead, c, r, env, fetchFn);
      out.sent.push(p);
    } catch (e) {
      out.failed.push(`${p}: ${e.message}`);
    }
  }
  return out;
}
