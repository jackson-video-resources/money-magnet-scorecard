// POST /api/submit {first, email, answers: [answer index per question]} -> {score, max, result}
// Scores on the server (so results can't be faked), sends the lead to the email tool and/or Google Sheet,
// and returns the result to show. If no lead destination is set up it still shows the result, and says so in
// the response (the setup check uses that).
import {
  loadConfig,
  score,
  maxScore,
  resultFor,
  deliver,
  providers,
} from "./_lib.js";

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });
  const b =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};
  const c = loadConfig();
  const first = String(b.first || "")
    .trim()
    .slice(0, 60);
  const email = String(b.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  const total = score(c, b.answers);
  if (!first || !isEmail(email) || total == null)
    return res
      .status(400)
      .json({
        error: "Add your first name and email, and answer every question.",
      });
  const r = resultFor(c, total);
  const lead = {
    at: new Date().toISOString(),
    first,
    email,
    score: total,
    max: maxScore(c),
  };
  const d = await deliver(lead, c, r);
  if (d.failed.length)
    console.error("lead delivery failed:", d.failed.join("; "));
  res.status(200).json({
    score: total,
    max: lead.max,
    result: { id: r.id, headline: r.headline, text: r.text, cta: r.cta, video: r.video || "" },
    leads: {
      sent: d.sent,
      failed: d.failed.length,
      setUp: providers().length > 0,
    },
  });
}
