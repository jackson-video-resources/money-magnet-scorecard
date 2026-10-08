// /q/<code> on the member's own site: a tracked link or QR code. Forwards to Lewis Jackson's link service,
// which counts the click on this site's dashboard key and sends the visitor back here with tracking added.
import { loadConfig } from "./_lib.js";

export default function handler(req, res) {
  const code = String(req.query.code || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const { siteKey } = loadConfig();
  if (!code || !siteKey) return res.redirect(302, "/");
  const qs = new URLSearchParams(req.query);
  qs.delete("code");
  const extra = qs.toString();
  res.setHeader("cache-control", "no-store");
  res.redirect(302, `https://lewiswjackson.com/l/${siteKey}/${code}${extra ? `?${extra}` : ""}`);
}
