# Money Magnet: scorecard template

A scorecard Money Magnet: a short quiz under your YouTube videos that scores your viewer, collects their name and email, and sends each result to a different next step (a free video, a workbook, a call).

- `public/config.json` holds every word, question, score and result. The Money Magnets workshop editor writes it for you.
- `api/submit.js` scores answers on the server and sends each sign-up to Kit, Mailchimp and/or a Google Sheet, tagged `scorecard` and `scorecard-<result id>`.
- `npm run check` tests the config, the scoring and the sign-up function without sending anything.
- Hosting: Vercel (free). `AGENTS.md` is the step-by-step that Claude Code or Codex follows to put it live.
