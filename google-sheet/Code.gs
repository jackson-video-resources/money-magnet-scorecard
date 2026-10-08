// Paste this into your Google Sheet: Extensions > Apps Script, replace everything, Save,
// then Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Copy the web app URL.
// Every scorecard sign-up becomes a new row.
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(["Date", "First name", "Email", "Score", "Out of", "Result"]);
  sheet.appendRow([d.date, d.first, d.email, d.score, d.max, d.result]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
