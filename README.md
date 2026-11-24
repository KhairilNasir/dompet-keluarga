# Bajet Rumah Kita

Bajet bulanan untuk suami isteri. Ia merekod gaji, komitmen dan simpanan, kemudian memaparkan:

- carta pai yang tunjuk ke mana duit pergi
- tahap kewangan (Sihat / Okay / Berwaspada / Kritikal) bersama nasihat
- ringkasan setahun

Laman ini boleh dibuka di phone dan laptop.

Satu link GitHub boleh dikongsi dengan seluruh keluarga. **Setiap keluarga simpan rekod dalam Google Sheet mereka sendiri**, jadi rekod tidak bercampur antara keluarga.

---

## Bahagian A: Letak laman di GitHub (sekali sahaja, oleh awak)

1. Cipta repo baharu di GitHub, contohnya `bajet-rumah`, dan tetapkan sebagai **Public**.
2. Upload fail `index.html` ke repo tersebut.
3. Pergi ke **Settings → Pages**.
4. Di bahagian *Build and deployment*, tetapkan:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**

   Kemudian tekan **Save**.
5. Tunggu 1–2 minit. Link laman akan jadi begini: `https://NAMA-GITHUB-KAU.github.io/bajet-rumah/`

Kongsi link ini dengan family. Fail `Code.gs` juga perlu diberi kepada mereka, atau letak dalam repo yang sama supaya senang dicapai.

## Bahagian B: Sediakan Google Sheet (setiap keluarga buat sendiri)

1. Buka [Google Sheets](https://sheets.new) dan cipta spreadsheet baharu. Namakan, contohnya, "Bajet Rumah".
2. Pergi ke menu **Extensions → Apps Script**.
3. Padam semua kod yang sedia ada, kemudian tampal **semua** isi fail `Code.gs`.
4. *(Disyorkan)* Isi PIN pada baris `const PIN = '';`, contohnya `const PIN = '2580';`.
5. Tekan ikon **Save** (disket).
6. Di bar atas, pilih fungsi **setup** dan tekan **Run**. Bila diminta, benarkan akses:
   1. Pilih akaun Google awak.
   2. Tekan **Advanced → Go to … (unsafe)**. Amaran ini normal, kerana skrip ini milik awak sendiri.
   3. Tekan **Allow**.
7. Tekan **Deploy → New deployment**. Klik ikon gear dan pilih **Web app**, kemudian tetapkan:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Tekan **Deploy** dan salin **Web app URL** (ia berakhir dengan `/exec`).

Selepas `setup`, spreadsheet akan ada tiga tab:

| Tab | Isi |
|---|---|
| **Rekod** | Semua rekod. Boleh juga ditaip terus di sini, dan ID akan diisi sendiri. |
| **Ringkasan** | Jumlah bulanan dan tahunan, dikira dengan formula. |
| **Tetapan** | Nama suami dan isteri, serta baki dana kecemasan. |

## Bahagian C: Sambung laman ke Google Sheet

1. Buka link GitHub tadi dan pergi ke tab **Tetapan**.
2. Tampal URL Web App dan PIN, kemudian tekan **Sambung & uji**.
3. Untuk pasangan, tekan **Salin link untuk pasangan** dan hantar link itu kepada isteri atau suami. Bila dia buka link itu, peranti dia terus disambung ke sheet yang sama.

> Link pasangan mengandungi URL dan PIN sheet awak. Hantar kepada pasangan sahaja, jangan dikongsi dalam group.

---

## Soalan lazim

**Ada orang lain boleh nampak rekod saya?**
Tidak, kecuali dia ada URL Web App awak dan PIN. Link GitHub hanya laman kosong. Data berada dalam Google Sheet awak sendiri.

**Kalau tak sambung Google Sheets?**
Laman tetap boleh digunakan, tetapi rekod hanya disimpan dalam browser peranti itu. Rekod akan hilang jika data browser dipadam.

**Saya ubah kod `Code.gs`, kenapa tak berubah?**
Pergi ke **Deploy → Manage deployments**, tekan ikon pensel, pilih **Version: New version**, dan tekan **Deploy**. URL kekal sama.

**Nak ringkasan tahun lain dalam sheet?**
Dalam spreadsheet, buka menu **Bajet Rumah → Tukar tahun Ringkasan…** dan masukkan tahun yang dikehendaki.

**Bagaimana tahap kewangan dikira?**

| Petunjuk | Panduan |
|---|---|
| Nisbah hutang (DSR) = jumlah bayaran hutang ÷ pendapatan | ≤30% sihat, >40% berwaspada, >60% kritikal |
| Kadar simpanan | sasaran 20%, kurang 5% berwaspada |
| Pecahan 50/30/20 | keperluan / kehendak / simpanan |
| Baki | defisit = kritikal |

Ini panduan umum, bukan nasihat kewangan profesional.
