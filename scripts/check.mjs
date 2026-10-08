// npm run check: is config.json valid, does scoring land in the right bands, and does the sign-up function
// work end to end (lead delivery is faked here, so nothing is sent anywhere). Run it before every deploy.
import { loadConfig, problems, maxScore, resultFor, deliver } from "../api/_lib.js";
import handler from "../api/submit.js";

const c = loadConfig();
const issues = problems(c);
if (issues.length) {
  console.error("config.json isn't ready:\n- " + issues.join("\n- "));
  process.exit(1);
}
const max = maxScore(c);
console.log(`config.json OK: ${c.questions.length} questions, scores 0 to ${max}, ${c.results.length} results`);
for (const s of [0, Math.floor(max / 2), max]) console.log(`  score ${s} -> ${resultFor(c, s).headline}`);

// The sign-up function, called the way Vercel calls it.
const call = (body) =>
  new Promise((done) => {
    const res = { code: 200, status(n) { this.code = n; return this; }, json(v) { done({ code: this.code, body: v }); } };
    handler({ method: "POST", body }, res);
  });
const best = c.questions.map((q) => q.answers.reduce((bi, a, i, all) => (a.points > all[bi].points ? i : bi), 0));
const ok = await call({ first: "Test", email: "test@example.com", answers: best });
if (ok.code !== 200 || ok.body.score !== max) throw new Error(`sign-up failed: ${JSON.stringify(ok)}`);
const bad = await call({ first: "", email: "nope", answers: [] });
if (bad.code !== 400) throw new Error("a bad sign-up was accepted");
console.log(`sign-up OK: a perfect score gets "${ok.body.result.headline}"; bad input is refused`);

// Lead delivery with a fake internet: every provider's requests are well formed and tagged with the result.
const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url, init });
  return { ok: true, status: 200, json: async () => ({ tag: { id: 1 } }) };
};
const env = { KIT_API_KEY: "k", MAILCHIMP_API_KEY: "m-us1", MAILCHIMP_AUDIENCE_ID: "a", SHEET_WEBHOOK_URL: "https://script.google.com/x" };
const r = resultFor(c, max);
const d = await deliver({ at: "now", first: "Test", email: "test@example.com", score: max, max }, c, r, env, fakeFetch);
if (d.failed.length || d.sent.join() !== "kit,mailchimp,sheet") throw new Error(`delivery: ${JSON.stringify(d)}`);
if (!calls.some((x) => String(x.init.body).includes(`scorecard-${r.id}`))) throw new Error("the result tag wasn't sent");
console.log(`lead delivery OK: Kit, Mailchimp and Google Sheet requests built, tagged scorecard-${r.id}`);
