# Logistics Readiness · PMIS embed (DS v8)

Dashboard **Logistics Readiness** dengan gaya yang sama persis dengan embed PMIS (Resources · TIA · Schedule):
bar navigator di atas, dashboard di dalam frame, halaman Welcome, blok PENGATURAN + DATA CADANGAN berupa teks,
dan engine yang disimpan terkompresi agar kode tetap di bawah 1 MB. Isinya khusus logistik: setiap package dari
Final Packing List diikuti sampai siap dipakai konstruksi.

## 1. Tujuan bisnis

Menjawab tiap minggu: *material mana yang sudah bisa dikeluarkan ke konstruksi, mana yang tertahan, dan apa
tindakan berikutnya?* Satu package **Ready for Construction** bila lolos empat gate:

| Gate | Bobot | Lolos bila |
|---|---:|---|
| Packing List (PL) | 15 | Ada blok Detail Packing List yang terhubung dan tidak ada isu identitas yang memblokir |
| MDR | 35 | MDR Approved atau "MDR not required" (Resubmit = kredit 0,5) |
| Site | 15 | Ada bukti di site: catatan inspeksi, tag "onsite", atau remark lokasi (laydown, camp, …) |
| Inspection | 35 | No. RFS Material Receiving **dan** tanggal inspeksi (RFS saja = kredit 0,5) |

Status: **Ready** · **MDR pending** (sudah diinspeksi, MDR belum approved) · **Awaiting RFS** (ada di site, belum RFS /
inspeksi) · **In transit** (belum ada catatan di site) · **Blocked** (masalah packing list).

Posisi material (tombol "Position"): **Laydown / area** (Laydown 5, Laydown 4, Askara … dari kolom Remark U/T atau tag) ·
**On-site (no laydown)** (tag `onsite` di kolom V, atau sudah RFS + inspeksi, tapi belum ada laydown) · **Not on site**. Aturannya sama dengan ETL
(`config/readiness_rules.json`); dashboard menghitung ulang dari kolom mentah dan memberi tanda **Data check**
bila hasilnya berbeda dari kolom "Readiness Status (ETL)" (misalnya sheet sudah diedit setelah ETL dijalankan).

## 2. Isi dashboard

| Halaman | Isi | KPI utama |
|---|---|---|
| 01 Overview | **Tombol Quick view** di atas: *Position* (Laydown / area · Laydown 5 · Laydown 4 · Askara · On-site · Not on site) dan *Status* (Ready · MDR pending · Awaiting RFS · In transit · Blocked) — klik untuk membuka daftar package-nya. Panel *Site receiving* dan *Documentation · MDR*, **Material on site by location** (Laydown 4 / Laydown 5 / Askara …, klik baris → daftar package-nya), Key insights, Readiness checks | Received & inspected, On site, Ready, weekly pace, MDR approved %, MDR pending + umur, pre-arrival MDR risk, Readiness Index |
| 02 Receiving | Grafik mingguan / kumulatif (ISO week, per tanggal inspeksi), drill-down Batch › Category › System › Package | Received %, Ready %, On site tanpa RFS, Readiness Index per grup |
| 03 Packing List | Summary › Detail › Items: cari package/MDR/RFS/drawing, **tiga baris tombol filter**: Position (All · Laydown / area · Laydown 5 · Laydown 4 · Askara · On-site · Not on site), Status, MDR — angka di tiap tombol mengikuti filter lain; penanda lokasi di tiap baris, gate strip per package, blok split, baris material | Packages, detail blocks, material lines, open issues |
| 04 Exceptions | Register isu dari ETL (R01–R18) per tipe & severity, klik untuk membuka package | Open issues, HIGH, packages affected |

Basis **Packages / Tonnage** bisa diganti di setiap halaman. Tema terang/gelap, cetak laporan, umur data
("Batas Umur Data") dan tanda kritikal berasal dari lapisan viewer PMIS yang sama.

### Dari kolom mana "on site" dan lokasi dibaca

Semua dari sheet **Summary Packing List**. Kolom Remark tidak sama posisinya di tiap workbook:

| Workbook | RFS | Inspection Date | Remark = lokasi | Tag di kanan tabel |
|---|---|---|---|---|
| B4-P3 | R | S | T (tidak ada lokasi) | – |
| B4-P5 | R | S | **U**: Laydown 5 (258), Laydown 4 (70), Askara (7) | W–X = pivot "Delivery at Site" (tidak dibaca sebagai data) |
| B5-P3 | R | S | **U**: Laydown 4 (10) | **V**: `onsite` (19) · **W**: `Mechanical part at Camp HHI` (6) |
| B5-P5 | R | S | T (kosong) | – |

* **On site** = sudah RFS + tanggal inspeksi (R + S), **atau** ada lokasi di kolom Remark (U / T), **atau** ada tag `onsite`
  di baris yang sama (V / W). Kata kunci bisa diubah di pengaturan (`Lokasi`, `Tag Site`).
* **Lokasi** = kata kunci + nomornya dari kolom Remark (lalu dari tag): `Laydown 4`, `Laydown 5`, `Askara`, `Camp HHI`.
  On site tanpa lokasi = **On-site (no laydown)** (sekarang 16: B4-P3 6 sudah diinspeksi, B5-P3 10 bertag `onsite`).
* Status **Awaiting RFS** hanya bagian yang belum RFS / inspeksi. Total material di site = Ready + MDR pending +
  Awaiting RFS = **361 package** (Laydown 5: 258 · Laydown 4: 80 · Askara: 7 · tanpa lokasi: 16). Angka B4-P5 sama
  dengan pivot "Delivery at Site" di file aslinya (Askara 7 · Laydown 4 70 · Laydown 5 258 · blank 251).

## 3. Arsitektur

```
Data layer       4 workbook Final Packing List ─► ETL (etl/run_etl.py) ─► MASTER_LOGISTICS_DATABASE.sqlite
Semantic layer   PACKAGE_MASTER · DETAIL_PACKAGES · PACKAGE_DETAIL · MAPPING_ISSUES · PACKAGE_READINESS
                 ─► build_pmis_embed.py ─► 4 tab: Packages · Detail · Items · Issues (TSV di kode / Google Sheet)
Visualization    framework/ (DS v8, verbatim) + src/ (halaman, logika, gaya logistik) ─► LOGISTICS-PMIS-KODE.txt
Reporting        Weekly review: Overview + Receiving; Exceptions untuk follow-up shipper / QA-QC; cetak dari dashboard
```

## 4. Build

```bash
python3 -I etl/run_etl.py                         # 1. ETL (database)
python3 pmis_embed/build_pmis_embed.py            # 2. embed + sheet
python3 pmis_embed/tests/run_pmis_tests.py        # 3. uji di browser (opsional, butuh Node + Playwright)
```

Hasil (di `output/pmis/`, tidak di-commit karena berisi data proyek):

| File | Kegunaan |
|---|---|
| `LOGISTICS-PMIS-KODE.txt` | Kode untuk website (blok "custom code" / embed). Termasuk data cadangan. |
| `LOGISTICS-PMIS-PREVIEW.html` | Kode yang sama, untuk dibuka langsung di browser. |
| `LOGISTICS-PMIS-SHEET.xlsx` | 4 tab untuk Google Sheets (semua sel format teks, judul kolom di baris 1). |

Opsi: `--sheet-id <ID>` (menulis Sheet ID ke pengaturan), `--image https://…` (foto halaman Welcome),
`--project "Nama Proyek"`, `--no-data` (kode tanpa data, ±140 KB, untuk mode Google Sheets saja),
`--no-sheet`, `--db`, `--out-dir`.

## 5. Pasang di website

1. Buka `LOGISTICS-PMIS-KODE.txt`, salin semua, tempel ke elemen custom code / embed (sama seperti kode PMIS lain).
2. Ubah pengaturan langsung di kode: cari `PENGATURAN — Dashboard Logistics Readiness` (judul, bobot gate, kata
   kunci lokasi/tag site, batas MDR, tema, Welcome, dll.) dan `hub-config` di paling atas (judul bar navigator).
3. Jangan ubah blok `pmhub-z` dan blok data yang ber-atribut `data-z="1"` (teks acak = data terkompresi).

## 6. Hubungkan ke Google Sheets (data live)

1. Upload `LOGISTICS-PMIS-SHEET.xlsx` ke Google Drive → buka dengan Google Sheets (atau File → Import → Replace
   spreadsheet). Nama tab harus **Packages, Detail, Items, Issues** (atau samakan dengan `Tab …` di pengaturan).
2. **Pilih semua sel → Format → Number → Plain text** sebelum mengetik data baru. Google Sheets mengirim kolom
   campuran angka/teks sebagai kosong; dengan format teks semua nilai terkirim apa adanya. Tanggal tulis
   `yyyy-mm-dd` (contoh `2026-11-04`).
3. Share: "Siapa saja yang memiliki link: **Pelihat**" (jangan Editor — Sheet ID terlihat di kode halaman).
4. Isi `Sheet ID :` di pengaturan (teks di antara `/d/` dan `/edit` pada link). Dashboard tampil dulu dengan data
   cadangan, lalu memuat sheet dan memperbarui otomatis tiap `Auto Refresh` menit (tombol ↻ untuk segera).
5. Yang biasa diedit di site: kolom **RFS Material Receiving**, **Inspection Date**, **MDR Status**, **Remark**
   (lokasi, tulis seperti di kolom U: `Laydown 4`, `Laydown 5`, `Askara`), **Site Note** (tag seperti `onsite`) dan
   **Data Date** (tanggal status, kolom terakhir). Status dan ringkasan lokasi dihitung ulang langsung; kolom "(ETL)"
   sengaja tidak ikut berubah sehingga perbedaan terlihat di Data check.

## 7. Alur update rutin (mingguan)

1. Packing list batch baru / revisi → taruh di `source/` → jalankan ETL → cek `MAPPING_ISSUES` (HIGH dulu).
2. Jalankan builder → upload ulang `LOGISTICS-PMIS-SHEET.xlsx` ke Google Sheet yang sama (tab diganti, Sheet ID
   tetap) → website ikut ter-update tanpa mengganti kode.
3. Ganti `LOGISTICS-PMIS-KODE.txt` di website hanya bila ingin memperbarui data cadangan atau mengubah engine.
4. Review mingguan: Overview (Ready, MDR pending > 14 hari, pre-arrival risk) → Receiving (pace vs sisa) →
   Exceptions (tindak lanjut ke shipper / QA-QC / site).

## 8. Batas ukuran 1 MB

Builder mencoba layout berikut dan memakai yang pertama di bawah 1.000.000 byte; laporan build menyebut layout
yang dipakai:

1. Packages teks biasa (bisa diedit) · Detail, Issues, Items terkompresi — data sekarang: **±865 KB**.
2. Semua blok data terkompresi.
3. Semua terkompresi dan baris material hanya dari Google Sheet (tab Items).

Engine sendiri ±108 KB terkompresi; tiap batch baru (±300 package) menambah ±150–180 KB pada layout 1.

## 9. Risiko & kontrol

| Risiko | Kontrol |
|---|---|
| Sheet diedit sehingga status berbeda dari ETL | Status selalu dihitung ulang; perbedaan muncul di **Data check** dan di Readiness checks |
| Google Sheets mengubah tipe sel (angka/tanggal) | Sheet dari builder memakai format teks; tanggal gviz dibaca sebagai ISO |
| Sheet tidak bisa diakses | Dashboard tetap jalan dengan data cadangan + tanda "Offline data" |
| Data rahasia (PO, consignee, material) | Output & sheet tidak di-commit; share sheet hanya "Pelihat"; gunakan `Cek Data : sembunyi` untuk publik |
| Ukuran kode > 1 MB saat batch bertambah | Layout otomatis (bagian 8) atau `--no-data` + Google Sheets |
| Aturan readiness berubah | Ubah `config/readiness_rules.json` (ETL) **dan** bobot/kata kunci di pengaturan dashboard dengan nilai yang sama |

## 10. Struktur folder

```
pmis_embed/
├── build_pmis_embed.py        # builder: database → data blok + sheet, engine terkompresi, hub
├── framework/                 # bagian PMIS DS v8, verbatim dari embed PMIS (lihat MANIFEST.txt) — jangan diubah
├── src/
│   ├── shell.html             # hub-config, bar navigator, template pengaturan + data (placeholder {{…}})
│   ├── pages.html             # 4 halaman dashboard
│   ├── logistics.js           # logika: baca data, readiness (= ETL), halaman, Google Sheets
│   ├── logistics.css.html     # gaya tambahan kecil (token DS v8)
│   └── welcome.json           # teks halaman Welcome
└── tests/
    ├── run_pmis_tests.py      # build sementara + referensi ETL + uji browser (22 cek)
    └── test_pmis_embed.js     # skenario Playwright: offline, 4 halaman, live sheet, HP
```
