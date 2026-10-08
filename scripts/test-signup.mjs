// npm run test-signup -- <live link> <email>
// Sends one real test sign-up to the live scorecard and says plainly whether it reached their email tool.
// Plain Node, so it works the same on Mac and Windows (no curl, no shell quoting).
const [url, email] = process.argv.slice(2);
if (!url || !email) {
  console.error("Usage: npm run test-signup -- https://your-scorecard.vercel.app you@example.com");
  process.exit(1);
}
const base = url.replace(/\/$/, "");
const config = await (await fetch(`${base}/config.json`)).json();
const answers = config.questions.map(() => 0);
const res = await fetch(`${base}/api/submit`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ first: "Test", email, answers }),
});
const r = await res.json();
if (!res.ok) {
  console.error(`The sign-up was refused (${res.status}): ${r.error}`);
  process.exit(1);
}
console.log(`Scored ${r.score} out of ${r.max}: "${r.result.headline}"`);
if (!r.leads.setUp) console.log("No email tool is connected yet, so this test contact wasn't saved anywhere.");
else if (r.leads.failed) {
  console.error(`Sending to the email tool failed (${r.leads.failed}). Check the key, add it again and deploy again.`);
  process.exit(1);
} else console.log(`Sent to: ${r.leads.sent.join(", ")}. Check the test contact is there, with both labels.`);
