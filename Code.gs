/**
 * Family Wallet — Google Sheets server (set up ONCE by the admin only)
 *
 * Families never touch this code. They create a Google Sheet, share it with
 * the admin's email as Editor, and paste the sheet link into the app.
 *
 * Admin setup (one time):
 *  1. Go to https://script.google.com → New project. Rename it "Family Wallet".
 *  2. Delete the starter code and paste ALL of this code. Click Save.
 *  3. Choose the function "authorize" in the toolbar → Run.
 *     Click "Review permissions" → pick your account → Advanced →
 *     "Go to Family Wallet (unsafe)" → Allow.
 *     (If nothing pops up, allow pop-ups for script.google.com and Run again.)
 *  4. Deploy → New deployment → gear icon → Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Click Deploy and copy the Web app URL (ends with /exec).
 *  5. Paste that URL into the line  const API_URL = "";  in index.html,
 *     then upload index.html to GitHub.
 *
 * After editing this code later: Deploy → Manage deployments → pencil icon →
 * Version: New version → Deploy. The URL stays the same.
 */

const RECORDS = 'Records';
const SETTINGS = 'Settings';
const SUMMARY = 'Summary';
const HEAD = ['ID', 'Month', 'Type', 'Category', 'Item', 'Who', 'Amount (RM)', 'Payment Status', 'Updated'];
const SET_KEYS = { husband: 'Husband name', wife: 'Wife name', emergency: 'Emergency fund (RM)' };

/** Run once to grant permissions. */
function authorize() {
  Logger.log('Ready. Admin account: ' + Session.getEffectiveUser().getEmail());
  Logger.log('Connected families: ' + listFamilies_().length);
}

/** Lists every connected family sheet in the Execution log. */
function listFamilySheets() {
  listFamilies_().forEach(id => {
    try { const ss = SpreadsheetApp.openById(id); Logger.log(ss.getName() + '  →  ' + ss.getUrl()); }
    catch (e) { Logger.log(id + '  (no longer accessible)'); }
  });
}

/* ---------------- API ---------------- */
function doGet() {
  return out_({ ok: true, app: 'family-wallet', admin: Session.getEffectiveUser().getEmail() });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_request' }); }

  if (req.action === 'info') return out_({ ok: true, admin: Session.getEffectiveUser().getEmail() });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out_({ ok: false, error: 'busy' });
  try {
    if (req.action === 'connect') return out_(connect_(req));

    const ss = openRegistered_(req.sheetId);
    if (!ss) return out_({ ok: false, error: 'not_registered' });
    ensure_(ss);
    switch (req.action) {
      case 'load':     return out_({ ok: true, items: loadItems_(ss), settings: loadSettings_(ss), url: ss.getUrl(), name: ss.getName() });
      case 'upsert':   upsert_(ss, req.items || []); return out_({ ok: true });
      case 'delete':   remove_(ss, String(req.id || '')); return out_({ ok: true });
      case 'settings': saveSettings_(ss, req.settings || {}); return out_({ ok: true });
      default:         return out_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return out_({ ok: false, error: 'server', detail: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- connected sheets ---------------- */
function register_(id) { PropertiesService.getScriptProperties().setProperty('s_' + id, String(Date.now())); }
function isRegistered_(id) { return !!PropertiesService.getScriptProperties().getProperty('s_' + id); }
function listFamilies_() {
  return Object.keys(PropertiesService.getScriptProperties().getProperties())
    .filter(k => k.indexOf('s_') === 0).map(k => k.slice(2));
}
function openRegistered_(id) {
  id = String(id || '');
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id) || !isRegistered_(id)) return null;
  try { return SpreadsheetApp.openById(id); } catch (e) { return null; }
}

function connect_(req) {
  const s = String(req.sheet || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/) || s.match(/^([A-Za-z0-9_-]{20,})$/);
  if (!m) return { ok: false, error: 'bad_link' };
  let ss;
  try { ss = SpreadsheetApp.openById(m[1]); }
  catch (e) { return { ok: false, error: 'no_access', admin: Session.getEffectiveUser().getEmail() }; }

  // Only accept a brand-new empty sheet, or one already set up by this app.
  // This stops the server from being used to read the admin's other spreadsheets.
  if (!isRegistered_(ss.getId())) {
    const rec = ss.getSheetByName(RECORDS);
    const isOurs = rec && String(rec.getRange(1, 1).getValue()) === 'ID' && String(rec.getRange(1, 2).getValue()) === 'Month';
    const isEmpty = ss.getSheets().every(sh => sh.getLastRow() === 0);
    if (!isOurs && !isEmpty) return { ok: false, error: 'not_empty' };
  }
  ensure_(ss);
  register_(ss.getId());
  return { ok: true, sheetId: ss.getId(), url: ss.getUrl(), name: ss.getName(), items: loadItems_(ss) };
}

/* ---------------- sheet layout ---------------- */
function ensure_(ss) { if (!ss.getSheetByName(RECORDS)) setupSheet_(ss); }

function setupSheet_(ss) {
  const first = ss.getSheets()[0];
  const sh = ss.getSheetByName(RECORDS) || ss.insertSheet(RECORDS, 0);
  sh.getRange('A:B').setNumberFormat('@');
  sh.getRange('G:G').setNumberFormat('#,##0.00');
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD])
    .setFontWeight('bold').setBackground('#0d6e63').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110); sh.setColumnWidth(4, 180); sh.setColumnWidth(5, 220);
  const rule = (list) => SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  sh.getRange('C2:C').setDataValidation(rule(['Income', 'Commitment', 'Savings']));
  sh.getRange('F2:F').setDataValidation(rule(['Husband', 'Wife', 'Joint']));
  sh.getRange('H2:H').setDataValidation(rule(['Paid', 'Unpaid']));

  if (!ss.getSheetByName(SETTINGS)) {
    const st = ss.insertSheet(SETTINGS);
    st.getRange(1, 1, 1, 2).setValues([['Setting', 'Value']]).setFontWeight('bold');
    st.getRange(2, 1, 3, 2).setValues(Object.keys(SET_KEYS).map(k => [SET_KEYS[k], '']));
    st.setColumnWidth(1, 200);
  }
  if (!ss.getSheetByName(SUMMARY)) buildSummary_(ss);

  // remove the default empty "Sheet1"
  if (first && first.getName() !== RECORDS && [SETTINGS, SUMMARY].indexOf(first.getName()) < 0
      && first.getLastRow() === 0 && first.getLastColumn() === 0) {
    try { ss.deleteSheet(first); } catch (e) {}
  }
}

/** Summary tab: change the year in cell B1 to see another year. */
function buildSummary_(ss) {
  const rs = ss.insertSheet(SUMMARY);
  rs.getRange('A1:B1').setValues([['Year', new Date().getFullYear()]]).setFontWeight('bold');
  rs.getRange('B1').setBackground('#fff4cc').setNote('Change the year here');
  rs.getRange(3, 1, 1, 6).setValues([['Month', 'Income', 'Commitments', 'Savings', 'Balance', 'Savings %']])
    .setFontWeight('bold').setBackground('#0d6e63').setFontColor('#ffffff');
  const R = "'" + RECORDS + "'";
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const r = m + 3;
    const sum = (t) => `=SUMIFS(${R}!G:G,${R}!B:B,$A${r},${R}!C:C,"${t}")`;
    rows.push([`=$B$1&"-"&TEXT(${m},"00")`, sum('Income'), sum('Commitment'), sum('Savings'), `=B${r}-C${r}-D${r}`, `=IF(B${r}>0,D${r}/B${r},"")`]);
  }
  rs.getRange(4, 1, 12, 6).setValues(rows);
  rs.getRange(16, 1, 1, 6).setValues([['="Total "&$B$1', '=SUM(B4:B15)', '=SUM(C4:C15)', '=SUM(D4:D15)', '=SUM(E4:E15)', '=IF(B16>0,D16/B16,"")']])
    .setFontWeight('bold');
  rs.getRange('B4:E16').setNumberFormat('#,##0.00');
  rs.getRange('F4:F16').setNumberFormat('0.0%');
  rs.setFrozenRows(3);
}

/* ---------------- read / write records ---------------- */
function monthText_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (m) return m[2] + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function loadItems_(ss) {
  const sh = ss.getSheetByName(RECORDS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = ss.getSpreadsheetTimeZone();
  const vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  const items = [];
  vals.forEach((r, i) => {
    if (!r[4] && r[6] === '') return;
    let id = String(r[0] || '').trim();
    if (!id) {                                   // row typed directly in the sheet: give it an ID
      id = 's' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
      sh.getRange(i + 2, 1).setValue(id);
    }
    items.push({ id: id, month: monthText_(r[1], tz), type: r[2], category: r[3], item: r[4],
                 who: r[5], amount: Number(r[6]) || 0, status: r[7] });
  });
  return items;
}

function rowOf_(it) {
  return [String(it.id), String(it.month), it.type || '', it.category || '', it.item || '',
          it.who || 'Joint', Number(it.amount) || 0, it.status || '', new Date()];
}

function upsert_(ss, list) {
  if (!list.length) return;
  const sh = ss.getSheetByName(RECORDS);
  const last = sh.getLastRow();
  const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  let next = last + 1;
  list.slice(0, 300).forEach(it => {
    if (!it || !it.id) return;
    const idx = ids.indexOf(String(it.id));
    const row = idx >= 0 ? idx + 2 : next++;
    if (idx < 0) ids.push(String(it.id));
    sh.getRange(row, 1, 1, 2).setNumberFormat('@');
    sh.getRange(row, 1, 1, HEAD.length).setValues([rowOf_(it)]);
  });
}

function remove_(ss, id) {
  if (!id) return;
  const sh = ss.getSheetByName(RECORDS);
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
}

function loadSettings_(ss) {
  const st = ss.getSheetByName(SETTINGS);
  const res = { husband: '', wife: '', emergency: 0 };
  if (!st || st.getLastRow() < 2) return res;
  const vals = st.getRange(2, 1, st.getLastRow() - 1, 2).getValues();
  Object.keys(SET_KEYS).forEach(k => {
    const r = vals.find(v => String(v[0]).trim() === SET_KEYS[k]);
    if (r) res[k] = k === 'emergency' ? (Number(r[1]) || 0) : String(r[1] || '');
  });
  return res;
}

function saveSettings_(ss, s) {
  const st = ss.getSheetByName(SETTINGS) || ss.insertSheet(SETTINGS);
  if (st.getLastRow() === 0) st.getRange(1, 1, 1, 2).setValues([['Setting', 'Value']]).setFontWeight('bold');
  Object.keys(SET_KEYS).forEach(k => {
    if (!(k in s)) return;
    const last = st.getLastRow();
    const labels = last >= 2 ? st.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
    const idx = labels.indexOf(SET_KEYS[k]);
    const row = idx >= 0 ? idx + 2 : last + 1;
    st.getRange(row, 1, 1, 2).setValues([[SET_KEYS[k], k === 'emergency' ? (Number(s[k]) || 0) : String(s[k] || '')]]);
  });
}
