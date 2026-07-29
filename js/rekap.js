/**
 * rekap.js - Modul Kelola Rekap Keuangan DompetQ
 * Menyediakan fungsi-fungsi rekapitulasi saldo, pemasukan, pengeluaran,
 * riwayat transaksi, serta modal detail dan arsip.
 */

// Global State / Cache untuk modul Rekap
window.rekapState = {
    saldoUtama: 0,
    saldoLalu: 0,
    pemasukanBulanIni: 0,
    pengeluaranBulanIni: 0,
    listTransaksiBulanIni: [],
    listArsipBulan: [],
    filterRiwayatAktif: 'semua'
};

/**
 * 1. INISIALISASI & AMBIL DATA REKAP UTAMA
 */
window.muatDataRekap = async function() {
    try {
        const skrg = new Date();
        const bulanAktif = skrg.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        
        // Update Label Bulan di UI
        const labelBulanEl = document.getElementById('label-rekap-bulan');
        if (labelBulanEl) {
            labelBulanEl.innerText = `Saldo Dompet ${bulanAktif}`;
        }

        // Ambil Data dari LocalStorage / Local State
        const dataTransaksi = JSON.parse(localStorage.getItem('dompetq_transaksi') || '[]');
        const dataSisaLalu = parseFloat(localStorage.getItem('dompetq_sisa_lalu') || '0');

        // Filter Transaksi Bulan Ini
        const thnBlnAktif = `${skrg.getFullYear()}-${String(skrg.getMonth() + 1).padStart(2, '0')}`;
        
        let totalMasuk = 0;
        let totalKeluar = 0;
        let listBulanIni = [];

        dataTransaksi.forEach(tx => {
            const txPeriode = tx.periode || (tx.tanggal ? tx.tanggal.substring(0, 7) : '');
            if (txPeriode === thnBlnAktif) {
                listBulanIni.push(tx);
                if (tx.jenis === 'masuk' || tx.tipe === 'masuk' || tx.tipe === 'gaji' || tx.tipe === 'thr' || tx.tipe === 'ksp') {
                    totalMasuk += parseFloat(tx.nominal || tx.bersih || 0);
                } else if (tx.jenis === 'keluar' || tx.tipe === 'pengeluaran') {
                    totalKeluar += parseFloat(tx.nominal || 0);
                }
            }
        });

        // Hitung Saldo Utama
        const saldoUtama = dataSisaLalu + totalMasuk - totalKeluar;

        // Update State
        window.rekapState = {
            saldoUtama,
            saldoLalu: dataSisaLalu,
            pemasukanBulanIni: totalMasuk,
            pengeluaranBulanIni: totalKeluar,
            listTransaksiBulanIni: listBulanIni,
            listArsipBulan: dataTransaksi
        };

        // Render Ke UI DOM
        window.renderUIStatistikRekap();
        window.renderRiwayatTransaksi();

    } catch (err) {
        console.error("Gagal memuat data rekap:", err);
    }
};

/**
 * 2. RENDER TEXT & RINGKASAN SALDO KE DOM
 */
window.renderUIStatistikRekap = function() {
    const { saldoUtama, saldoLalu, pemasukanBulanIni, pengeluaranBulanIni } = window.rekapState;

    const elSaldoUtama = document.getElementById('txt-saldo-utama');
    const elSaldoLalu = document.getElementById('txt-saldo-lalu');
    const elPemasukan = document.getElementById('txt-pemasukan');
    const elPengeluaran = document.getElementById('txt-pengeluaran');

    if (elSaldoUtama) elSaldoUtama.innerText = window.formatRupiahRekap(saldoUtama);
    if (elSaldoLalu) elSaldoLalu.innerText = window.formatRupiahRekap(saldoLalu);
    if (elPemasukan) elPemasukan.innerText = window.formatRupiahRekap(pemasukanBulanIni);
    if (elPengeluaran) elPengeluaran.innerText = window.formatRupiahRekap(pengeluaranBulanIni);
};

/**
 * 3. RENDER RIWAYAT TRANSAKSI DI DASHBOARD
 */
window.renderRiwayatTransaksi = function() {
    const container = document.getElementById('container-riwayat-transaksi');
    if (!container) return;

    const list = window.rekapState.listTransaksiBulanIni;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-[11px] text-gray-400 font-medium">
                Belum ada riwayat transaksi bulan ini.
            </div>`;
        return;
    }

    // Urutkan dari yang terbaru
    const listSorted = [...list].reverse();

    let html = '';
    listSorted.forEach(tx => {
        const isMasuk = (tx.jenis === 'masuk' || tx.tipe === 'masuk' || tx.tipe === 'gaji' || tx.tipe === 'thr' || tx.tipe === 'ksp');
        const iconClass = isMasuk ? 'fa-file-invoice-dollar text-emerald-600 bg-emerald-50' : 'fa-wallet text-rose-600 bg-rose-50';
        const colorNominal = isMasuk ? 'text-emerald-600' : 'text-rose-600';
        const tanda = isMasuk ? '+' : '-';
        const nominal = parseFloat(tx.nominal || tx.bersih || 0);

        html += `
            <div class="py-3 flex items-center justify-between hover:bg-gray-50/50 transition px-1">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-xl ${iconClass} flex items-center justify-center text-xs shadow-xs">
                        <i class="fas ${iconClass.split(' ')[0]}"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 leading-snug">${tx.keterangan || tx.judul || (isMasuk ? 'Pemasukan/Slip' : 'Pengeluaran')}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">${tx.tanggal || 'Bulan Ini'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black ${colorNominal}">${tanda} ${window.formatRupiahRekap(nominal)}</p>
                    <span class="text-[9px] font-semibold text-gray-400 capitalize">${tx.kategori || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

/**
 * 4. MODAL DETAIL PEMASUKAN / SLIP
 */
window.bukaModalDetailPemasukan = function() {
    const modal = document.getElementById('modal-detail-pemasukan');
    const container = document.getElementById('list-slip-detail');
    if (!modal || !container) return;

    modal.classList.remove('hidden');

    const listMasuk = window.rekapState.listTransaksiBulanIni.filter(tx => 
        tx.jenis === 'masuk' || tx.tipe === 'masuk' || tx.tipe === 'gaji' || tx.tipe === 'thr' || tx.tipe === 'ksp'
    );

    if (listMasuk.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-6">Belum ada slip atau pemasukan tercatat bulan ini.</p>`;
        return;
    }

    let html = '';
    listMasuk.forEach((slip, idx) => {
        const nominal = parseFloat(slip.nominal || slip.bersih || 0);
        html += `
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                    <p class="font-bold text-gray-800 text-xs">${slip.keterangan || 'Slip Gaji / Pemasukan #' + (idx + 1)}</p>
                    <p class="text-[10px] text-gray-400 mt-0.5">${slip.tanggal || 'Periode Ini'}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-black text-emerald-600">${window.formatRupiahRekap(nominal)}</span>
                    ${slip.foto ? `<button onclick="window.pratinjauGambarSlip('${slip.foto}')" class="block text-[9px] text-blue-600 hover:underline font-bold mt-0.5">Lihat Slip</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

window.tutupModalDetailPemasukan = function() {
    const modal = document.getElementById('modal-detail-pemasukan');
    if (modal) modal.classList.add('hidden');
};

/**
 * 5. MODAL ARSIP DOMPET BULANAN
 */
window.bukaModalArsip = function() {
    const modal = document.getElementById('modal-arsip-dompet');
    const container = document.getElementById('kontainer-list-arsip');
    if (!modal || !container) return;

    modal.classList.remove('hidden');

    const allTx = window.rekapState.listArsipBulan;
    if (!allTx || allTx.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500 text-sm"><p>Belum ada rekaman arsip transaksi.</p></div>`;
        return;
    }

    // Kelompokkan Berdasarkan Periode (YYYY-MM)
    const goupPeriode = {};
    allTx.forEach(tx => {
        const p = tx.periode || (tx.tanggal ? tx.tanggal.substring(0, 7) : 'Lainnya');
        if (!goupPeriode[p]) goupPeriode[p] = [];
        goupPeriode[p].push(tx);
    });

    let html = '';
    Object.keys(goupPeriode).sort().reverse().forEach(periode => {
        const itemPeriode = goupPeriode[periode];
        let tot = 0;
        itemPeriode.forEach(t => {
            if (t.jenis === 'masuk' || t.tipe === 'masuk' || t.tipe === 'gaji') {
                tot += parseFloat(t.nominal || t.bersih || 0);
            }
        });

        html += `
            <div onclick="window.bukaDetailArsipPeriode('${periode}')" class="p-3.5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition cursor-pointer flex justify-between items-center shadow-xs">
                <div>
                    <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wide"><i class="far fa-calendar-alt text-blue-600 mr-1.5"></i>Periode ${periode}</h4>
                    <p class="text-[10px] text-gray-400 mt-0.5">${itemPeriode.length} catatan transaksi</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-black text-blue-700">${window.formatRupiahRekap(tot)}</span>
                    <i class="fas fa-chevron-right text-gray-300 text-xs ml-2"></i>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

window.tutupModalArsip = function() {
    const modal = document.getElementById('modal-arsip-dompet');
    if (modal) modal.classList.add('hidden');
};

/**
 * 6. MODAL DETAIL ARSIP PERIODE SPESIFIK
 */
window.bukaDetailArsipPeriode = function(periode) {
    window.tutupModalArsip();

    const modalDetail = document.getElementById('modal-detail-arsip-transaksi');
    const judul = document.getElementById('judul-detail-arsip');
    const txtTotal = document.getElementById('total-bersih-arsip');
    const containerItem = document.getElementById('kontainer-item-arsip');

    if (!modalDetail) return;

    if (judul) judul.innerText = `Rincian Arsip Periode (${periode})`;

    const allTx = window.rekapState.listArsipBulan;
    const txFiltered = allTx.filter(tx => {
        const p = tx.periode || (tx.tanggal ? tx.tanggal.substring(0, 7) : '');
        return p === periode;
    });

    let totalClean = 0;
    let html = '';

    txFiltered.forEach(tx => {
        const isMasuk = (tx.jenis === 'masuk' || tx.tipe === 'masuk' || tx.tipe === 'gaji');
        const nominal = parseFloat(tx.nominal || tx.bersih || 0);
        if (isMasuk) totalClean += nominal;

        html += `
            <div class="p-2.5 bg-white rounded-lg border border-gray-100 flex justify-between items-center text-xs">
                <div>
                    <p class="font-bold text-gray-800">${tx.keterangan || tx.judul || 'Transaksi'}</p>
                    <p class="text-[10px] text-gray-400">${tx.tanggal || '-'}</p>
                </div>
                <div class="text-right">
                    <span class="font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">${isMasuk ? '+' : '-'} ${window.formatRupiahRekap(nominal)}</span>
                </div>
            </div>
        `;
    });

    if (txtTotal) txtTotal.innerText = window.formatRupiahRekap(totalClean);
    if (containerItem) containerItem.innerHTML = html || `<p class="text-center text-xs text-gray-400 py-4">Kosong.</p>`;

    modalDetail.classList.remove('hidden');
};

window.tutupDetailArsip = function() {
    const modalDetail = document.getElementById('modal-detail-arsip-transaksi');
    if (modalDetail) modalDetail.classList.add('hidden');
};

window.kembaliKeArsipUtama = function() {
    window.tutupDetailArsip();
    window.bukaModalArsip();
};

/**
 * 7. PRATINJAU SLIP & UTILITY FORMAT
 */
window.pratinjauGambarSlip = function(srcGambar) {
    const modal = document.getElementById('modal-pratinjau-slip');
    const imgTarget = document.getElementById('img-pratinjau-slip-target');
    if (modal && imgTarget) {
        imgTarget.src = srcGambar;
        modal.classList.remove('hidden');
    }
};

window.tutupModalPratinjauSlip = function() {
    const modal = document.getElementById('modal-pratinjau-slip');
    if (modal) modal.classList.add('hidden');
};

window.formatRupiahRekap = function(angka) {
    const val = parseFloat(angka) || 0;
    return 'Rp ' + val.toLocaleString('id-ID');
};

// Auto-run saat dokumen loaded
document.addEventListener('DOMContentLoaded', () => {
    window.muatDataRekap();
});