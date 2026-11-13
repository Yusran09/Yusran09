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
| 05 Foundations | **Status pondasi × status material per Axis** (sheet pondasi kolom B / R ↔ drawing number material): filter Foundation · Material · STA, matriks status × posisi material, *linear view* per STA, register axis, detail axis → baris material → package, Print / Excel | Axes with material, Erection front, Material waiting, Foundation waiting |

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

### Drawing list — cetak & Excel drawing number

Untuk mengambil semua drawing number dari package tertentu (contoh: MDR **Approved** di **Laydown 4 + Laydown 5**):

1. Buka **Packing List** → baris *Position*: klik **Laydown 5** lalu **Laydown 4** (tombol laydown bisa digabung) →
   baris *MDR*: **Approved** → bila perlu pilih Batch / Category / Package group.
2. Klik **Drawing list** (kanan atas tabel): setiap package (laydown, status, MDR, tanggal inspeksi, RFS, berat) diikuti
   semua baris materialnya dengan **Drawing No**, S/N, deskripsi, equipment, qty dan berat.
3. Tombol di atas tabel:
   * **Print list** — semua baris material, A4 landscape, judul + filter + data date + nomor halaman
     (contoh di atas: 328 package · 5.807 baris ≈ 214 halaman). Pilih "Save as PDF" untuk menyimpan.
   * **Print compact** — satu baris per package dengan semua drawing number-nya (contoh di atas ≈ 42 halaman).
   * **Excel** — file .xlsx, satu baris per material (22 kolom, judul kolom beku, filter aktif).
4. Dari satu package (klik package-nya): tombol **Print drawings** / **Excel** untuk package itu saja.

Bila website memblokir print / download di dalam embed, buka dashboard di tab sendiri lalu ulangi.

### Foundation × material (halaman 05)

**Tujuan:** dalam satu tab terlihat untuk setiap pondasi (Axis) *status pondasinya* dan *di mana materialnya* — dan
sebaliknya, untuk setiap drawing material, status pondasi tujuannya. Dipakai untuk menentukan front erection dan
prioritas pengiriman / pengeluaran material.

**Pencocokan (aturan tetap, sama di dashboard dan di test Python):**

| Sheet pondasi | Material (packing list) | Aturan |
|---|---|---|
| Kolom **B** `Axis ID` — contoh `O2J3Z043` | Kolom **Drawing No** — contoh `02J3Z043-HJ-1` | Awal drawing number = axis ID; huruf **O** dan angka **0** di depan dianggap sama |
| `O2J2Z003 ~ 5` | `02J2Z003-…`, `02J2Z004-…`, `02J2Z005-…` | Rentang di register dipecah per axis (003, 004, 005) |
| `O2J2Z010 ~ 10b` | `02J2Z010B-…` | Huruf akhiran dipertahankan |
| — | `01J5Z001~01J5Z008` | Rentang di drawing number = 8 axis |
| Kolom **R** `Foundation Works` | — | Status pondasi apa adanya (Concreting, Rebar & Form Works, Piling, Excavation, Not Started, Any Constraint, …) |

* **Posisi material per axis** (dari semua package yang punya baris dengan drawing axis tsb.): *On site* (semua package
  di site) · *Partly on site* · *Not on site* (semua masih in transit) · *No material* (tidak ada di Batch 4–5).
* **Pondasi siap** = status mengandung kata di pengaturan `Pondasi Siap` (default: concreting, complete, done, finish).
* **KPI:** *Axes with material* · *Erection front* = pondasi siap + semua material di site (ditambah jumlah yang baru
  sebagian di site) · *Material waiting* = material sudah di site tapi pondasi belum siap · *Foundation waiting* =
  pondasi siap tapi material belum di site (in transit / belum ada di packing list). Klik kartu untuk daftar axis-nya.
* **Matriks** status pondasi × posisi material: hijau = siap + material di site, hijau muda = siap + sebagian, oranye
  = material di site tapi pondasi belum siap, biru = pondasi siap, material belum di site. Klik angka → daftar axis.
* **Linear view:** satu kotak per pondasi, urut seperti sheet (chainage), satu baris per STA; warna = status pondasi,
  garis bawah = posisi material. Klik kotak → detail axis.
* **Register axis** (urut *Axis order* / *Gaps first* / *Most material*) dan **detail axis**: 4 gate (pondasi, area &
  earth works, lokasi, material) + semua baris material (package, posisi/laydown, status, MDR, drawing, qty, berat);
  klik baris → package di Packing List. **Print** (A4) dan **Excel** (satu baris per pondasi, 24 kolom) mengikuti filter.
* **Arah sebaliknya (material → pondasi):** Drawing list dan baris material package di halaman 03 punya kolom
  *Foundation · status*; Excel drawing list mendapat kolom `Axis (foundation)`, `Foundation status`, `Foundation STA`.
* **Catatan pencocokan** di bawah matriks: kolom yang dipakai, jumlah baris material yang tertaut, baris tanpa pondasi
  per prefix (mis. OLC-1 `01…` bila sheet hanya berisi OLC-2), axis ID ganda (keduanya ditampilkan), nilai kolom B
  yang bukan axis ID, dan status koneksi sheet.
* Snapshot 13 Nov 2026 (file pondasi yang diunggah): 1.085 pondasi (1.064 kode axis, 25 axis ID ganda) · 2.100 dari
  4.574 baris material ber-drawing axis tertaut (semua baris OLC-2; 2.474 baris OLC-1 belum ada di sheet ini) ·
  143 axis bermaterial (246 package): on site 4 · sebagian 116 · belum di site 23.

## 3. Arsitektur

```
Data layer       4 workbook Final Packing List ─► ETL (etl/run_etl.py) ─► MASTER_LOGISTICS_DATABASE.sqlite
                 Sheet pondasi (Axis ID · Foundation Works) ─► Publish to web CSV (live) + snapshot terkompresi di kode
Semantic layer   PACKAGE_MASTER · DETAIL_PACKAGES · PACKAGE_DETAIL · MAPPING_ISSUES · PACKAGE_READINESS
                 ─► build_pmis_embed.py ─► 4 tab: Packages · Detail · Items · Issues (TSV di kode / Google Sheet)
Visualization    framework/ (DS v8, verbatim) + src/ (halaman, logika, gaya logistik) ─► LOGISTICS-PMIS-KODE.txt
                 halaman 05: axis ↔ drawing number dihitung di browser (pondasi × material, tanpa tabel tambahan)
Reporting        Weekly review: Overview + Receiving; Exceptions untuk follow-up shipper / QA-QC; cetak dari dashboard
```

## 4. Build

```bash
python3 -I etl/run_etl.py                         # 1. ETL (database)
python3 pmis_embed/build_pmis_embed.py            # 2. embed + sheet
python3 pmis_embed/tests/run_pmis_tests.py        # 3. uji di browser (opsional, butuh Node + Playwright)
python3 pmis_embed/tests/run_pmis_tests.py --foundation PONDASI.xlsx   #    sama, dengan sheet pondasi asli
```

Hasil (di `output/pmis/`, tidak di-commit karena berisi data proyek):

| File | Kegunaan |
|---|---|
| `LOGISTICS-PMIS-KODE.txt` | Kode untuk website (blok "custom code" / embed). Termasuk data cadangan. |
| `LOGISTICS-PMIS-PREVIEW.html` | Kode yang sama, untuk dibuka langsung di browser. |
| `LOGISTICS-PMIS-SHEET.xlsx` | 4 tab untuk Google Sheets (semua sel format teks, judul kolom di baris 1). |

Opsi: `--sheet-id <ID>` (menulis Sheet ID ke pengaturan), `--image https://…` (foto halaman Welcome),
`--project "Nama Proyek"`, `--no-data` (kode tanpa data, ±177 KB, untuk mode Google Sheets saja),
`--no-sheet`, `--db`, `--out-dir`.

Halaman 05 (pondasi):

```bash
python3 -I pmis_embed/build_pmis_embed.py --foundation PONDASI.xlsx \
    --foundation-src "<link Publish to web CSV tab pondasi>" \
    --foundation-sheet-id "<link Bagikan sheet pondasi>" --foundation-tab <gid>
```

`--foundation` = file pondasi (xlsx, sheet `Map Area Readiness`; ganti dengan `--foundation-sheet`, atau .csv) yang
ditanam sebagai snapshot terkompresi (blok `lg-data-fnd`, semua kolom dari A agar huruf kolom tetap sama).
`--foundation-src` / `--foundation-sheet-id` / `--foundation-tab` mengisi `Pondasi Sumber` / `Pondasi Sheet ID` /
`Pondasi Tab` di pengaturan. Link dan file pondasi hanya masuk ke `output/pmis/` (tidak di-commit).

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

### Sheet pondasi (halaman 05)

1. Di sheet pondasi: **File → Bagikan → Publikasikan ke web** → pilih **tab pondasi** (bukan "Seluruh dokumen") →
   format **CSV** → Publikasikan → salin link ke `Pondasi Sumber :` (bentuk `…/pub?gid=…&single=true&output=csv`).
2. Cadangan: share sheet "Siapa saja yang memiliki link: **Pelihat**", isi `Pondasi Sheet ID :` (link Bagikan boleh
   ditempel utuh) dan `Pondasi Tab :` (gid tab atau nama tab; kosong = gid dari link Publish).
3. Urutan pemuatan: snapshot di kode tampil dulu → link Publish CSV → Sheet ID (CSV) → Sheet ID (JSONP). Diperbarui
   otomatis tiap `Auto Refresh` menit; tombol sumber di kanan atas matriks (*Foundation sheet · live hh:mm* /
   *Foundation snapshot*) memuat ulang seketika dan menampilkan alasan bila sheet tidak bisa dibuka.
4. Kolom: `Pondasi Kolom Axis : B` dan `Pondasi Kolom Status : R` (huruf kolom atau judul kolom). Bila kolom
   bergeser dan isinya bukan axis ID / berupa angka, dashboard memakai kolom berjudul `Axis ID` / `Foundation Works`
   dan menuliskannya di catatan halaman 05. Link Publish CSV lebih disarankan daripada Sheet ID: gviz mengosongkan
   sel yang tipenya berbeda dari mayoritas kolom.

## 7. Alur update rutin (mingguan)

1. Packing list batch baru / revisi → taruh di `source/` → jalankan ETL → cek `MAPPING_ISSUES` (HIGH dulu).
2. Jalankan builder → upload ulang `LOGISTICS-PMIS-SHEET.xlsx` ke Google Sheet yang sama (tab diganti, Sheet ID
   tetap) → website ikut ter-update tanpa mengganti kode.
3. Ganti `LOGISTICS-PMIS-KODE.txt` di website hanya bila ingin memperbarui data cadangan atau mengubah engine.
   Status pondasi cukup diubah di sheet pondasi (link Publish) — halaman 05 mengikuti tanpa mengganti kode.
4. Review mingguan: Overview (Ready, MDR pending > 14 hari, pre-arrival risk) → Receiving (pace vs sisa) →
   Exceptions (tindak lanjut ke shipper / QA-QC / site).

## 8. Batas ukuran 1 MB

Builder mencoba layout berikut dan memakai yang pertama di bawah 1.000.000 byte; laporan build menyebut layout
yang dipakai:

1. Packages teks biasa (bisa diedit) · Detail, Issues, Items terkompresi — data sekarang: **±899 KB**, dengan
   snapshot pondasi (±61 KB) **±961 KB**.
2. Semua blok data terkompresi.
3. Semua terkompresi dan baris material hanya dari Google Sheet (tab Items).

Snapshot pondasi dipertahankan selama layout 1 atau 2 masih muat; bila tidak, snapshot dilepas lebih dulu (halaman 05
memuat sheet pondasi saja) sebelum baris material dikeluarkan dari kode. Engine sendiri ±141 KB terkompresi; tiap
batch baru (±300 package) menambah ±150–180 KB pada layout 1.

## 9. Risiko & kontrol

| Risiko | Kontrol |
|---|---|
| Sheet diedit sehingga status berbeda dari ETL | Status selalu dihitung ulang; perbedaan muncul di **Data check** dan di Readiness checks |
| Google Sheets mengubah tipe sel (angka/tanggal) | Sheet dari builder memakai format teks; tanggal gviz dibaca sebagai ISO |
| Sheet tidak bisa diakses | Dashboard tetap jalan dengan data cadangan + tanda "Offline data" |
| Data rahasia (PO, consignee, material) | Output & sheet tidak di-commit; share sheet hanya "Pelihat"; gunakan `Cek Data : sembunyi` untuk publik |
| Ukuran kode > 1 MB saat batch bertambah | Layout otomatis (bagian 8) atau `--no-data` + Google Sheets |
| Aturan readiness berubah | Ubah `config/readiness_rules.json` (ETL) **dan** bobot/kata kunci di pengaturan dashboard dengan nilai yang sama |
| Format axis ID / drawing berbeda (O vs 0, rentang, akhiran huruf) | Aturan pencocokan tetap (bagian 2) dan diuji terhadap cermin Python; baris yang tidak tertaut dihitung per prefix di catatan halaman 05 |
| Axis ID ganda di sheet pondasi (contoh: 25 axis OLC-2 di dua segmen) | Kedua pondasi ditampilkan dan disebut di catatan — perbaiki di sheet pondasi bila salah input |
| Sheet pondasi hanya berisi OLC-2 | Baris OLC-1 (`01…`) tampil sebagai "not in foundation register" — tambahkan tab/baris OLC-1 ke sheet pondasi |
| Kolom B / R bergeser | Validasi isi kolom; fallback ke judul `Axis ID` / `Foundation Works` + catatan |
| Link pondasi tidak bisa dibuka | Snapshot tetap tampil, tombol sumber berwarna kuning + alasan |

## 10. Struktur folder

```
pmis_embed/
├── build_pmis_embed.py        # builder: database → data blok + sheet, engine terkompresi, hub
├── framework/                 # bagian PMIS DS v8, verbatim dari embed PMIS (lihat MANIFEST.txt) — jangan diubah
├── src/
│   ├── shell.html             # hub-config, bar navigator, template pengaturan + data (placeholder {{…}})
│   ├── pages.html             # 5 halaman dashboard
│   ├── logistics.js           # logika: baca data, readiness (= ETL), halaman, Google Sheets, pondasi × material
│   ├── logistics.css.html     # gaya tambahan kecil (token DS v8)
│   └── welcome.json           # teks halaman Welcome
└── tests/
    ├── run_pmis_tests.py      # build sementara + referensi ETL + cermin Python pencocokan pondasi + uji browser (43 cek)
    └── test_pmis_embed.js     # skenario Playwright: offline, 5 halaman, live sheet + CSV pondasi, HP
```
