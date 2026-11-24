/**
 * Bajet Rumah Kita — penyambung Google Sheets
 *
 * Cara pasang (sekali sahaja untuk setiap keluarga):
 *  1. Buka Google Sheet baharu → Extensions → Apps Script.
 *  2. Padam kod asal, tampal SEMUA kod ini, tekan Save.
 *  3. (Pilihan) Isi PIN di bawah supaya orang lain tak boleh baca rekod walaupun dapat URL.
 *  4. Pilih fungsi "setup" di bar atas, tekan Run, dan benarkan akses.
 *  5. Deploy → New deployment → jenis "Web app"
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Tekan Deploy dan salin URL Web app (berakhir dengan /exec).
 *  6. Buka laman Bajet Rumah Kita → Tetapan → tampal URL dan PIN → Sambung & uji.
 *
 * Jika ubah kod ini kemudian: Deploy → Manage deployments → ikon pensel →
 * Version: New version → Deploy. URL kekal sama.
 */

const PIN = '';   // contoh: const PIN = '2580';  Kosongkan jika tak mahu PIN.

const REKOD = 'Rekod';
const TETAPAN = 'Tetapan';
const RINGKASAN = 'Ringkasan';
const HEAD = ['ID', 'Bulan', 'Jenis', 'Kategori', 'Perkara', 'Siapa', 'Jumlah (RM)', 'Status Bayar', 'Dikemaskini'];
const SET_KEYS = { husband: 'Nama suami', wife: 'Nama isteri', emergency: 'Dana kecemasan (RM)' };

/* ---------------- Sediakan spreadsheet ---------------- */
function setup() {
  const ss = SpreadsheetApp.getActive();

  const sh = ss.getSheetByName(REKOD) || ss.insertSheet(REKOD, 0);
  sh.getRange('A:B').setNumberFormat('@');
  sh.getRange('G:G').setNumberFormat('#,##0.00');
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD])
    .setFontWeight('bold').setBackground('#0d6e63').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110); sh.setColumnWidth(4, 180); sh.setColumnWidth(5, 220);
  const rule = (list) => SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  sh.getRange('C2:C').setDataValidation(rule(['Pendapatan', 'Komitmen', 'Simpanan']));
  sh.getRange('F2:F').setDataValidation(rule(['Suami', 'Isteri', 'Bersama']));
  sh.getRange('H2:H').setDataValidation(rule(['Sudah bayar', 'Belum']));

  const st = ss.getSheetByName(TETAPAN) || ss.insertSheet(TETAPAN);
  if (st.getLastRow() === 0) {
    st.getRange(1, 1, 1, 2).setValues([['Tetapan', 'Nilai']]).setFontWeight('bold');
    st.getRange(2, 1, 3, 2).setValues(Object.keys(SET_KEYS).map(k => [SET_KEYS[k], '']));
    st.setColumnWidth(1, 200);
  }

  buildRingkasan_(ss, new Date().getFullYear());

  ['Sheet1', 'Helaian1', 'Lembaran1'].forEach(n => {
    const d = ss.getSheetByName(n);
    if (d && d.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(d);
  });
  ss.setActiveSheet(sh);
}

/** Menu "Bajet Rumah" dalam spreadsheet */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bajet Rumah')
    .addItem('Tukar tahun Ringkasan…', 'promptRingkasan')
    .addItem('Sediakan semula format', 'setup')
    .addToUi();
}

function promptRingkasan() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Ringkasan tahun', 'Masukkan tahun (cth. 2027):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const y = parseInt(res.getResponseText(), 10);
  if (!(y > 2000 && y < 2200)) { ui.alert('Tahun tidak sah.'); return; }
  buildRingkasan_(SpreadsheetApp.getActive(), y);
}

function buildRingkasan_(ss, year) {
  const rs = ss.getSheetByName(RINGKASAN) || ss.insertSheet(RINGKASAN);
  rs.clear();
  rs.getRange('A:A').setNumberFormat('@');
  rs.getRange(1, 1, 1, 6).setValues([['Bulan', 'Pendapatan', 'Komitmen', 'Simpanan', 'Baki', '% Simpanan']])
    .setFontWeight('bold').setBackground('#0d6e63').setFontColor('#ffffff');
  const R = "'" + REKOD + "'";
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const r = m + 1, k = year + '-' + ('0' + m).slice(-2);
    const sum = (t) => `=SUMIFS(${R}!G:G,${R}!B:B,$A${r},${R}!C:C,"${t}")`;
    rows.push([k, sum('Pendapatan'), sum('Komitmen'), sum('Simpanan'), `=B${r}-C${r}-D${r}`, `=IF(B${r}>0,D${r}/B${r},"")`]);
  }
  rs.getRange(2, 1, 12, 6).setValues(rows);
  rs.getRange(14, 1, 1, 6).setValues([['Jumlah ' + year, '=SUM(B2:B13)', '=SUM(C2:C13)', '=SUM(D2:D13)', '=SUM(E2:E13)', '=IF(B14>0,D14/B14,"")']])
    .setFontWeight('bold');
  rs.getRange('B2:E14').setNumberFormat('#,##0.00');
  rs.getRange('F2:F14').setNumberFormat('0.0%');
  rs.setFrozenRows(1);
}

/* ---------------- API untuk laman web ---------------- */
function doGet() {
  return out_({ ok: true, app: 'bajet-rumah', msg: 'Web App Bajet Rumah aktif. Tampal URL ini di laman Bajet Rumah Kita.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_request' }); }
  if (PIN && String(req.pin || '') !== String(PIN)) return out_({ ok: false, error: 'pin' });

  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return out_({ ok: false, error: 'busy' }); }
  try {
    const ss = SpreadsheetApp.getActive();
    if (!ss.getSheetByName(REKOD)) setup();
    switch (req.action) {
      case 'load':     return out_({ ok: true, items: loadItems_(ss), settings: loadSettings_(ss) });
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

function monthText_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{1,2})[\/-](\d{4})$/);           // 11/2026
  if (m) return m[2] + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function loadItems_(ss) {
  const sh = ss.getSheetByName(REKOD);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = ss.getSpreadsheetTimeZone();
  const vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  const items = [];
  vals.forEach((r, i) => {
    if (!r[4] && r[6] === '') return;               // baris kosong
    let id = String(r[0] || '').trim();
    if (!id) {                                      // baris ditaip terus dalam sheet: beri ID
      id = 's' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
      sh.getRange(i + 2, 1).setValue(id);
    }
    items.push({
      id: id, bulan: monthText_(r[1], tz), jenis: r[2], kategori: r[3], perkara: r[4],
      siapa: r[5], jumlah: Number(r[6]) || 0, status: r[7]
    });
  });
  return items;
}

function rowOf_(it) {
  return [String(it.id), String(it.bulan), it.jenis || '', it.kategori || '', it.perkara || '',
          it.siapa || 'Bersama', Number(it.jumlah) || 0, it.status || '', new Date()];
}

function upsert_(ss, list) {
  if (!list.length) return;
  const sh = ss.getSheetByName(REKOD);
  const last = sh.getLastRow();
  const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  let next = last + 1;
  list.forEach(it => {
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
  const sh = ss.getSheetByName(REKOD);
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
}

function loadSettings_(ss) {
  const st = ss.getSheetByName(TETAPAN);
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
  const st = ss.getSheetByName(TETAPAN) || ss.insertSheet(TETAPAN);
  if (st.getLastRow() === 0) st.getRange(1, 1, 1, 2).setValues([['Tetapan', 'Nilai']]).setFontWeight('bold');
  Object.keys(SET_KEYS).forEach(k => {
    if (!(k in s)) return;
    const last = st.getLastRow();
    const labels = last >= 2 ? st.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
    const idx = labels.indexOf(SET_KEYS[k]);
    const row = idx >= 0 ? idx + 2 : last + 1;
    st.getRange(row, 1, 1, 2).setValues([[SET_KEYS[k], k === 'emergency' ? (Number(s[k]) || 0) : String(s[k] || '')]]);
  });
}
