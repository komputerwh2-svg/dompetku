/**
 * ============================================================================
 * DompetQ - Core Application Controller & Event Handlers (app.js)
 * ============================================================================
 */

// Map untuk menyimpan status script yang sudah dimuat agar tidak direload ulang
const loadedScripts = {};

// Inisialisasi Utama Aplikasi saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Tanggal Header
    updateHeaderDate();

    // 2. Set default periode pada input type month di modal-modal
    initDefaultPeriodInputs();

    // 3. Tampilkan Default Tab 'rekap' saat pertama kali dibuka
    switchTab('rekap');
});

/**
 * Memperbarui Teks Tanggal di Header Aplikasi
 */
function updateHeaderDate() {
    const elDate = document.querySelector('header p');
    if (elDate) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const today = new Date().toLocaleDateString('id-ID', options);
        elDate.textContent = today;
    }
}

/**
 * Inisialisasi default nilai bulan & tahun (YYYY-MM) pada semua input periode
 */
function initDefaultPeriodInputs() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const defaultPeriode = `${year}-${month}`;

    const periodeInputs = ['out-periode', 'mutasi-periode', 'ocr-periode'];
    periodeInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) {
            el.value = defaultPeriode;
        }
    });
}

/**
 * Memuat view HTML secara dinamis atau switch tab statis (SPA Switcher)
 * @param {string} tabName - Nama tab (rekap, tabungan, servis, pengaturan)
 */
async function switchTab(tabName) {
    const mainContainer = document.getElementById('app-content') || document.querySelector('main');
    
    // Simpan informasi tab aktif secara global di elemen body/dataset
    document.body.dataset.activeTab = tabName;

    // 1. Update status tampilan Nav Bar (Highlight Active Tab)
    document.querySelectorAll('.tab-link').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active-tab');
        } else {
            btn.classList.remove('active-tab');
        }
    });

    // 2. Cek Jika tab ada di dalam halaman sebagai section statis (fall-back / single page mode)
    const staticTabs = document.querySelectorAll('.tab-content');
    if (staticTabs.length > 0) {
        staticTabs.forEach(tab => {
            if (tab.id === tabName) {
                tab.classList.add('active-content');
                tab.classList.remove('hidden');
            } else {
                tab.classList.remove('active-content');
                tab.classList.add('hidden');
            }
        });

        // Trigger init function tab jika modul skripnya sudah ada
        const initFunctionName = `initTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
        if (typeof window[initFunctionName] === 'function') {
            window[initFunctionName]();
        }
        return;
    }

    // 3. Tampilkan Loader jika menggunakan dynamic fetch views/
    mainContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-64 text-gray-400">
            <i class="fas fa-circle-notch fa-spin text-3xl text-blue-600 mb-2"></i>
            <p class="text-xs font-semibold">Memuat halaman...</p>
        </div>
    `;

    try {
        // 4. Fetch file HTML View sesuai Tab
        const response = await fetch(`views/${tabName}.html`);
        if (!response.ok) throw new Error(`Gagal memuat views/${tabName}.html`);
        
        const htmlContent = await response.text();
        mainContainer.innerHTML = htmlContent;

        // 5. Load & eksekusi Script JS khusus tab tersebut secara dinamis
        loadTabScript(tabName);

    } catch (error) {
        console.error(error);
        mainContainer.innerHTML = `
            <div class="text-center py-12 text-rose-500 text-xs">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Gagal memuat halaman. Pastikan koneksi/file tersedia.</p>
            </div>
        `;
    }
}

/**
 * Injeksi skrip JS khusus per modul secara dinamis
 * @param {string} tabName 
 */
function loadTabScript(tabName) {
    const scriptId = `script-${tabName}`;
    
    // Hapus script lama jika ada agar event listener di-bind ulang secara segar
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
        existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `js/${tabName}.js?v=${new Date().getTime()}`; // cache busting
    script.onload = () => {
        // Panggil fungsi init jika didefinisikan di modul JS masing-masing
        const initFunctionName = `initTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
        if (typeof window[initFunctionName] === 'function') {
            window[initFunctionName]();
        }
    };
    document.body.appendChild(script);
}


/* ============================================================================
 * GLOBAL MODAL HANDLERS & PINTASAN AKSI CEPAT
 * ============================================================================ */

// 1. Tombol Utama (+) / Aksi Cepat / Scanner (Center Button Nav)
function openAksiCepatModal() {
    // Deteksi tab aktif (baik mode SPA dataset maupun static element class)
    const currentTab = document.body.dataset.activeTab;
    
    const tabRekapStatic = document.getElementById('rekap');
    const isRekapActive = currentTab === 'rekap' || (tabRekapStatic && tabRekapStatic.classList.contains('active-content'));

    const tabTabunganStatic = document.getElementById('tabungan');
    const isTabunganActive = currentTab === 'tabungan' || (tabTabunganStatic && tabTabunganStatic.classList.contains('active-content'));

    // Jika bukan tab Rekap dan bukan tab Tabungan, hentikan proses (tombol tidak berfungsi)
    if (!isRekapActive && !isTabunganActive) {
        return;
    }

    // Efek animasi tombol berputar hanya jika tombol aktif/berfungsi
    const btnCenter = document.querySelector('.center-btn');
    if (btnCenter) {
        btnCenter.classList.add('rotate-act');
        setTimeout(() => btnCenter.classList.remove('rotate-act'), 300);
    }

    // JIKA DI TAB REKAP: Buka Modal Pilihan Transaksi
    if (isRekapActive) {
        if (typeof window.bukaModalPilihanTransaksi === 'function') {
            window.bukaModalPilihanTransaksi();
        } else {
            const modalPilihan = document.getElementById('modal-pilihan-transaksi');
            if (modalPilihan) {
                modalPilihan.classList.remove('hidden');
            } else {
                alert('Modal Pilihan Transaksi belum siap.');
            }
        }
    } 
    // JIKA DI TAB TABUNGAN: Buka Modal Mutasi Saldo
    else if (isTabunganActive) {
        const modalMutasi = document.getElementById('modal-mutasi-saldo');
        if (modalMutasi) {
            modalMutasi.classList.remove('hidden');
        } else {
            alert('Modal Mutasi Saldo belum siap.');
        }
    }
}

// Handler Pilihan Transaksi (Modal Pilihan Transaksi)
window.bukaModalPilihanTransaksi = function() {
    const modalPilihan = document.getElementById('modal-pilihan-transaksi');
    if (modalPilihan) modalPilihan.classList.remove('hidden');
};

window.tutupPilihanTransaksi = function() {
    const modalPilihan = document.getElementById('modal-pilihan-transaksi');
    if (modalPilihan) modalPilihan.classList.add('hidden');
};

window.pilihTransaksiMasuk = function() {
    window.tutupPilihanTransaksi();
    const modalOcr = document.getElementById('modal-ocr');
    if (modalOcr) modalOcr.classList.remove('hidden');
};

window.pilihTransaksiKeluar = function() {
    window.tutupPilihanTransaksi();
    const modalPengeluaran = document.getElementById('modal-pengeluaran-baru');
    if (modalPengeluaran) modalPengeluaran.classList.remove('hidden');
};

window.pilihTransaksiMutasi = function() {
    window.tutupPilihanTransaksi();
    const modalMutasi = document.getElementById('modal-mutasi-saldo');
    if (modalMutasi) modalMutasi.classList.remove('hidden');
};

// 2. Modal Notifikasi
function openNotifModal() {
    const modal = document.getElementById('modal-notif');
    if (modal) {
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0', 'scale-95');
                modal.classList.add('opacity-100', 'scale-100');
            }, 10);
        } else {
            modal.classList.add('opacity-0', 'scale-95');
            modal.classList.remove('opacity-100', 'scale-100');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
    }
}

function bersihkanNotif() {
    alert('Notifikasi telah ditandai dibaca.');
    openNotifModal();
}

// 3. Modal Otentikasi / Login
function openLoginModal() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.classList.remove('hidden');
}

function tutupLoginModal() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.classList.add('hidden');
}

function handleGoogleLogin() {
    alert('Proses Autentikasi Google...');
    tutupLoginModal();
}

function loginDenganFingerprint() {
    alert('Memindai Sidik Jari...');
    tutupLoginModal();
}

// 4. Modal Arsip Bulanan & Detail
window.bukaModalArsip = function() {
    const modal = document.getElementById('modal-arsip-dompet');
    if (modal) modal.classList.remove('hidden');
};

window.tutupModalArsip = function() {
    const modal = document.getElementById('modal-arsip-dompet');
    if (modal) modal.classList.add('hidden');
};

window.tutupDetailArsip = function() {
    const modal = document.getElementById('modal-detail-arsip-transaksi');
    if (modal) modal.classList.add('hidden');
};

window.kembaliKeArsipUtama = function() {
    window.tutupDetailArsip();
    window.bukaModalArsip();
};

window.bukaModalDetailPemasukan = function() {
    const modal = document.getElementById('modal-detail-pemasukan');
    if (modal) modal.classList.remove('hidden');
};

window.tutupModalDetailPemasukan = function() {
    const modal = document.getElementById('modal-detail-pemasukan');
    if (modal) modal.classList.add('hidden');
};

// 5. Modal Riwayat Aktivitas (Gopay Style)
window.openArsipModal = function() {
    const modal = document.getElementById('modal-arsip-riwayat');
    if (modal) modal.classList.remove('hidden');
};

window.closeArsipModal = function() {
    const modal = document.getElementById('modal-arsip-riwayat');
    if (modal) modal.classList.add('hidden');
};

window.toggleFilterKustomTipe = function() {
    const panel = document.getElementById('panel-filter-kustom');
    if (panel) panel.classList.toggle('hidden');
};

// 6. Modal Kendaraan & Servis
window.bukaModalEditKendaraan = function(index) {
    const modal = document.getElementById('modal-edit-kendaraan');
    const inputIndex = document.getElementById('edit-kendaraan-index');
    if (inputIndex) inputIndex.value = index;

    // Ambil data eksisting dari elemen DOM jika ada
    const elNamaPlat = document.getElementById(`servis-v${index}-nama-plat`);
    if (elNamaPlat) {
        const textParts = elNamaPlat.textContent.split(' - ');
        document.getElementById('edit-nama-kendaraan').value = textParts[0] || '';
        document.getElementById('edit-plat-kendaraan').value = textParts[1] || '';
    }

    if (modal) modal.classList.remove('hidden');
};

window.tutupModalEditKendaraan = function() {
    const modal = document.getElementById('modal-edit-kendaraan');
    if (modal) modal.classList.add('hidden');
};

window.simpanIdentitasKendaraan = function(event) {
    event.preventDefault();
    const index = document.getElementById('edit-kendaraan-index')?.value || 1;
    const nama = document.getElementById('edit-nama-kendaraan')?.value;
    const plat = document.getElementById('edit-plat-kendaraan')?.value;

    const elNamaPlat = document.getElementById(`servis-v${index}-nama-plat`);
    if (elNamaPlat) {
        elNamaPlat.textContent = `${nama} - ${plat.toUpperCase()}`;
    }

    window.tutupModalEditKendaraan();
};

// 7. Modal Pengaturan BBM
window.bukaModalPengaturanBBM = function() {
    const modal = document.getElementById('modal-pengaturan-bbm');
    if (modal) modal.style.display = 'flex';
};

window.tutupModalPengaturanBBM = function() {
    const modal = document.getElementById('modal-pengaturan-bbm');
    if (modal) modal.style.display = 'none';
};

window.simpanPengaturanBBM = function() {
    const pertalite = document.getElementById('cfg-harga-pertalite')?.value || '10.000';
    const pertamax = document.getElementById('cfg-harga-pertamax')?.value || '12.950';
    
    localStorage.setItem('harga_pertalite', pertalite);
    localStorage.setItem('harga_pertamax', pertamax);
    
    alert('Harga BBM berhasil disimpan!');
    window.tutupModalPengaturanBBM();
};

// 8. Form Modal Pengeluaran Manual & Servis/Bensin
window.tutupModalPengeluaran = function() {
    const modal = document.getElementById('modal-pengeluaran-baru');
    if (modal) modal.classList.add('hidden');
};

window.toggleFormOtomotifServis = function() {
    const kategori = document.getElementById('out-kategori')?.value;
    const panelKhusus = document.getElementById('panel-khusus-servis');
    if (panelKhusus) {
        if (kategori === 'transportasi') {
            panelKhusus.classList.remove('hidden');
        } else {
            panelKhusus.classList.add('hidden');
        }
    }
};

window.switchSubKategoriKendaraan = function(mode) {
    const formBensin = document.getElementById('sub-form-bensin');
    const formServis = document.getElementById('sub-form-servis');

    if (mode === 'bensin') {
        if (formBensin) formBensin.classList.remove('hidden');
        if (formServis) formServis.classList.add('hidden');
    } else {
        if (formBensin) formBensin.classList.add('hidden');
        if (formServis) formServis.classList.remove('hidden');
    }
};

window.pilihJenisBBMForm = function(jenis) {
    const btnPertalite = document.getElementById('btn-bbm-pertalite');
    const btnPertamax = document.getElementById('btn-bbm-pertamax');

    if (jenis === 'Pertalite') {
        btnPertalite?.classList.add('border-2', 'border-green-500', 'bg-green-50', 'text-green-700');
        btnPertalite?.classList.remove('border', 'border-gray-300', 'bg-white', 'text-gray-600');

        btnPertamax?.classList.remove('border-2', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnPertamax?.classList.add('border', 'border-gray-300', 'bg-white', 'text-gray-600');
    } else {
        btnPertamax?.classList.add('border-2', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnPertamax?.classList.remove('border', 'border-gray-300', 'bg-white', 'text-gray-600');

        btnPertalite?.classList.remove('border-2', 'border-green-500', 'bg-green-50', 'text-green-700');
        btnPertalite?.classList.add('border', 'border-gray-300', 'bg-white', 'text-gray-600');
    }
};

window.pilihNominalCepatBensin = function(nominal) {
    const inputBayar = document.getElementById('out-bensin-bayar');
    const inputNominalUtama = document.getElementById('out-nominal');
    
    if (inputBayar) {
        inputBayar.value = new Intl.NumberFormat('id-ID').format(nominal);
    }
    if (inputNominalUtama) {
        inputNominalUtama.value = new Intl.NumberFormat('id-ID').format(nominal);
    }
};

// 9. Modal Mutasi Saldo
window.tutupModalMutasi = function() {
    const modal = document.getElementById('modal-mutasi-saldo');
    if (modal) modal.classList.add('hidden');
};

// 10. Lightbox Zoom Gambar Slip & Modal OCR
function tutupModal() {
    const modalOcr = document.getElementById('modal-ocr');
    if (modalOcr) modalOcr.classList.add('hidden');
}

function bukaZoomGambar(src) {
    const lightbox = document.getElementById('lightbox-zoom');
    const imgTarget = document.getElementById('lightbox-img');
    const previewImg = document.getElementById('ocr-preview-img');

    if (lightbox && imgTarget) {
        imgTarget.src = src || (previewImg ? previewImg.src : '');
        lightbox.classList.remove('hidden');
        setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
    }
}

function tutupZoomGambar() {
    const lightbox = document.getElementById('lightbox-zoom');
    if (lightbox) {
        lightbox.classList.add('opacity-0');
        setTimeout(() => lightbox.classList.add('hidden'), 300);
    }
}

/* ============================================================================
 * UTILITY HELPERS
 * ============================================================================ */

// Utility Helper: Format Currency Input Ribuan (100.000)
window.formatInputRibuan = function(input) {
    let value = input.value.replace(/\D/g, '');
    if (value) {
        input.value = new Intl.NumberFormat('id-ID').format(value);
    } else {
        input.value = '';
    }
};

window.formatRupiahInput = window.formatInputRibuan;
window.formatRupiahBensin = window.formatInputRibuan;