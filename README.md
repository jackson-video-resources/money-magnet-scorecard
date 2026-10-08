# Money Magnet: scorecard template

A scorecard Money Magnet: a short quiz under your YouTube videos that scores your viewer, collects their name and email, and sends each result to a different next step (a free video, a workbook, a call).

- `public/config.json` holds every word, question, score and result. The Money Magnets workshop editor writes it for you.
- `api/submit.js` scores answers on the server and sends each sign-up to the member's own tool (Kit, Mailchimp and a Google Sheet are built in; Claude or Codex adds any other), labelled once for everyone and once per result, with names the member chooses.
- `npm run check` tests the config, the scoring and the sign-up function without sending anything.
- Hosting: Vercel (free). `AGENTS.md` is the step-by-step that Claude Code or Codex follows to put it live.
- Each result can show its own 30 to 45 second video (`VIDEO-SCRIPT.md` has the script formula).
