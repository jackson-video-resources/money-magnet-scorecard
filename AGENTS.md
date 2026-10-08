# Building and launching this Money Magnet

You are helping a coach or creator put their scorecard Money Magnet live. They built the content in the Money Magnets workshop editor, which gave them their `config.json`. Your job is to get this exact template live on Vercel with their content, with sign-ups reaching them, and to check it works. Don't redesign it, rewrite it or add features: the template is tested as it is.

Talk to them in plain words, one step at a time. They may never have used a terminal. Never ask them to paste a password into the chat; API keys go straight into Vercel with the commands below.

## First: which computer is this?
Check before running anything (`node -p "process.platform"` prints `win32` on Windows, `darwin` on a Mac). On Windows, run every command in PowerShell and translate anything written for Mac or Linux into its PowerShell form before running it (`&&` becomes `;`, `mkdir -p` becomes `New-Item -ItemType Directory -Force`, no `export`, use `curl.exe` not `curl`). The `npm run` and `npx` commands below work the same on both. If PowerShell refuses to run `npx` or `npm` scripts, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Steps

1. **Their content.** Replace `public/config.json` with the config they pasted (it's in the prompt they gave you). Run `npm run check`. If it lists problems, fix only what the problem says (usually a missing https:// link) and tell them what you changed.
2. **Vercel.** Run `npx vercel --version` to check it works (Node 20+ needed; if Node is missing, help them install it from nodejs.org). Run `npx vercel login` and let them finish it in the browser. Then `npx vercel link --yes` to create the project.
3. **Where the sign-ups go: their own tool, their own labels.** This is their system, not a demo: wire it into whatever they already use.
   - Ask which email tool or CRM they use (Kit, Mailchimp, HubSpot, ActiveCampaign, Beehiiv, GoHighLevel, Systeme.io, Flodesk, a Google Sheet, or more than one).
   - Ask how they organise contacts there (tags, lists, segments, groups, custom fields) and suggest two labels: one for everyone who takes the scorecard, one per result. Base them on the scorecard's title and their own naming, and agree them before you create anything. Put them in `public/config.json` as `"tags": {"all": "<everyone label>", "byResult": {"<result id>": "<label>"}}`. Don't create labels they didn't agree to.
   - **Kit:** Settings > Developer > API keys (a v4 key). `npx vercel env add KIT_API_KEY production`, and they paste it when asked.
   - **Mailchimp:** Profile > Extras > API keys for `MAILCHIMP_API_KEY`, and the audience ID (Audience > Settings > Audience name and defaults) as `MAILCHIMP_AUDIENCE_ID`. Tags work as above.
   - **Google Sheet:** walk them through `google-sheet/Code.gs` (steps at the top of the file), then add the web app URL as `SHEET_WEBHOOK_URL`.
   - **Any other tool:** add a sender to `api/_lib.js` like `toKit`: create or update the contact (first name, email) and apply the two labels the way that tool does it (tags, list membership, a segment or a property), using the tool's official API documentation. Read its key from a new environment variable, add it to `providers()` and `SENDERS`, and add the key with `npx vercel env add`. Then run `npm run check`.
   - **Their logo (optional):** if they give you a logo file, save it as `public/logo.png` (or .svg/.jpg) and set `brand.logo` in `public/config.json` to `/logo.png`. Colours and font are already in the config from the editor.
4. **Deploy.** `npx vercel --prod --yes`. Note the production URL it prints.
5. **Test it for real.** Send one test sign-up with their own email: `npm run test-signup -- <live link> <their email>`. It has to say "Sent to: ..." with no failures (unless they chose no email tool yet). If it says sending failed, the key is wrong: fix it with `npx vercel env rm <NAME> production`, add it again, deploy again and re-run the test. Then ask them to check the test contact is in their tool with both labels.
6. **Hand back.** Tell them their live link and ask them to paste it into the workshop editor's "My live link" box, which checks everything on its side and switches on their dashboard and their links and QR tool.

## Result videos (any time, including after launch)
They give you a video file and say which result it's for (match it to a result's `headline` or `id` in `public/config.json`; ask if it's unclear).
1. If `ffmpeg` is installed, shrink it for the web: `ffmpeg -i "<their file>" -vf "scale=-2:720" -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k -movflags +faststart public/videos/<result id>.mp4`. Without ffmpeg, copy the file to `public/videos/<result id>.mp4` as it is.
2. If the file is still over 40 MB, don't add it: ask them to upload it to YouTube as unlisted and give you the link instead.
3. Set that result's `"video"` in `public/config.json` to `/videos/<result id>.mp4` (or the YouTube link).
4. `npm run check`, then `npx vercel --prod --yes`. Ask them to take the scorecard through to that result and check the video plays.
Their script guide is `VIDEO-SCRIPT.md` (30 to 45 seconds: name the result, the one thing, what changes, the next step).

## Don't
- Change the page structure or the scoring. The only code you add is a sender for their tool (step 3). If something else seems broken, say exactly what happened and stop.
- Commit API keys or put them in any file.
- Remove the dashboard script loading (`siteKey` in config.json); it's how their numbers reach their dashboard.
