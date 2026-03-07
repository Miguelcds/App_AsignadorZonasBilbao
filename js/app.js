/**
 * app.js — Lógica principal del Asignador de Zonas
 * ─────────────────────────────────────────────────
 * Depende de: data.js (zonasEstandar)
 */

// ── ESTADO GLOBAL ─────────────────────────────────────────
const LS_KEY = 'zonasCustom_v1';
let customStreets = {};
let processedData = [];
let filteredRows  = [];
let currentPage   = 1;
const PAGE_SIZE   = 50;

// ── UTILS ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function loadCustom() {
    try { customStreets = JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch { customStreets = {}; }
}

function saveCustom() {
    localStorage.setItem(LS_KEY, JSON.stringify(customStreets));
}

function getDictionary() {
    // Calles personalizadas tienen prioridad sobre el diccionario base
    return { ...zonasEstandar, ...customStreets };
}

function asignarZona(calle) {
    if (!calle) return '';
    const upper = calle.toString().toUpperCase().trim();
    for (const [clave, zona] of Object.entries(getDictionary())) {
        if (upper.includes(clave.toUpperCase())) return zona;
    }
    return '';
}

function showFeedback(el, type, msg) {
    el.className = 'feedback ' + type;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 4500);
}

// ── TABS ─────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $('tab-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'dictionary') renderDictionary();
        if (btn.dataset.tab === 'search')     renderDictStats();
    });
});

// ── DRAG & DROP ──────────────────────────────────────────
const dropzone  = $('dropzone');
const fileInput = $('fileInput');

dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', ()  => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && /\.xlsx?$/i.test(file.name)) {
        // Asignar al input para reutilizar el mismo flujo
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        processBtn.disabled = false;
    }
});

dropzone.addEventListener('click', e => { if (e.target !== fileInput) fileInput.click(); });
fileInput.addEventListener('change', e => { processBtn.disabled = !e.target.files.length; });

// ── PROCESAR EXCEL ───────────────────────────────────────
const processBtn  = $('processBtn');
const downloadBtn = $('downloadBtn');

processBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    processBtn.textContent = 'Procesando…';
    processBtn.disabled    = true;

    try {
        const buffer   = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        processedData = jsonData.map(row => ({
            ...row,
            Zona: asignarZona(row.Calle),
        }));

        renderResults(processedData);
        downloadBtn.disabled = false;

    } catch (err) {
        alert('Error al procesar el archivo: ' + err.message);
    } finally {
        processBtn.textContent = 'Procesar Archivo';
        processBtn.disabled    = false;
    }
});

downloadBtn.addEventListener('click', () => {
    if (!processedData.length) return;
    const ws = XLSX.utils.json_to_sheet(processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calles con Zonas');
    XLSX.writeFile(wb, 'Calles_Asignadas.xlsx');
});

// ── RENDER RESULTADOS ────────────────────────────────────
function renderResults(data) {
    const total   = data.length;
    const found   = data.filter(r => r.Zona).length;
    const missing = total - found;
    const pct     = total ? Math.round((found / total) * 100) : 0;

    $('statTotal').textContent   = total;
    $('statFound').textContent   = found;
    $('statMissing').textContent = missing;
    $('statPct').textContent     = pct + '%';
    $('statsBar').classList.remove('hidden');

    // Desglose por zona
    const byZone = {};
    data.forEach(r => { if (r.Zona) byZone[r.Zona] = (byZone[r.Zona] || 0) + 1; });

    $('zonaList').innerHTML = Object.entries(byZone)
        .sort((a, b) => b[1] - a[1])
        .map(([zona, n]) => `
            <div class="zona-chip">
                <span class="chip-dot"></span>
                <span>${zona}</span>
                <span class="chip-count">${n}</span>
            </div>`).join('');
    $('zonaBreakdown').classList.remove('hidden');

    // Calles no identificadas
    const unmatched = [...new Set(
        data.filter(r => !r.Zona).map(r => r.Calle).filter(Boolean)
    )];

    if (unmatched.length) {
        const ul = $('unmatchedList');
        ul.innerHTML = unmatched.map(s =>
            `<span class="unmatched-tag" data-calle="${s}">${s}</span>`
        ).join('');
        ul.querySelectorAll('.unmatched-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelector('[data-tab="addstreet"]').click();
                $('newStreetInput').value = tag.dataset.calle;
                $('newStreetInput').focus();
            });
        });
        $('unmatchedCard').classList.remove('hidden');
    } else {
        $('unmatchedCard').classList.add('hidden');
    }

    // Botón exportar no identificadas
    $('exportUnmatched').onclick = () => {
        const blob = new Blob([unmatched.join('\n')], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'),
            { href: url, download: 'calles_no_identificadas.txt' }
        ).click();
        URL.revokeObjectURL(url);
    };

    // Tabla de vista previa
    filteredRows = [...data];
    currentPage  = 1;
    renderTable();
    $('previewCard').classList.remove('hidden');
}

// ── TABLA PREVIEW ─────────────────────────────────────────
function renderTable() {
    const q      = ($('previewSearch').value || '').toUpperCase();
    const filter = $('previewFilter').value;

    filteredRows = processedData.filter(r => {
        const okSearch = !q || (r.Calle || '').toUpperCase().includes(q) || (r.Zona || '').toUpperCase().includes(q);
        const okFilter = filter === 'all'
            || (filter === 'found'   &&  r.Zona)
            || (filter === 'missing' && !r.Zona);
        return okSearch && okFilter;
    });

    const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE) || 1;
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const rows  = filteredRows.slice(start, start + PAGE_SIZE);

    $('previewBody').innerHTML = rows.map((r, i) => `
        <tr class="${r.Zona ? '' : 'row-missing'}">
            <td style="color:var(--muted)">${start + i + 1}</td>
            <td>${r.Calle || '<em style="opacity:.4">—</em>'}</td>
            <td>${r.Zona  || '<em style="opacity:.4">Sin zona</em>'}</td>
            <td>${r.Zona
                ? '<span class="badge-found">✓ Encontrada</span>'
                : '<span class="badge-missing">✗ No identificada</span>'}</td>
        </tr>`).join('');

    // Paginación
    const pag = $('pagination');
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    pag.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(p => `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-p="${p}">${p}</button>`)
        .join('');
    pag.querySelectorAll('.page-btn').forEach(b => {
        b.addEventListener('click', () => { currentPage = +b.dataset.p; renderTable(); });
    });
}

$('previewSearch').addEventListener('input',  () => { currentPage = 1; renderTable(); });
$('previewFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });

// ── AÑADIR NUEVA CALLE ────────────────────────────────────
const zoneSelect      = $('zoneSelect');
const customZoneGroup = $('customZoneGroup');

zoneSelect.addEventListener('change', () => {
    customZoneGroup.style.display = zoneSelect.value === 'custom' ? 'flex' : 'none';
});

$('addStreetBtn').addEventListener('click', () => {
    const calle   = $('newStreetInput').value.trim().toUpperCase();
    const zona    = zoneSelect.value === 'custom'
        ? $('customZoneInput').value.trim()
        : zoneSelect.value;
    const fb = $('addFeedback');

    if (!calle) return showFeedback(fb, 'err', 'Escribe el nombre de la calle.');
    if (!zona)  return showFeedback(fb, 'err', 'Selecciona o escribe una zona.');

    if (zonasEstandar[calle]) {
        return showFeedback(fb, 'err',
            `"${calle}" ya existe en el diccionario base → ${zonasEstandar[calle]}`);
    }

    customStreets[calle] = zona;
    saveCustom();
    renderCustomList();
    showFeedback(fb, 'ok', `✓ "${calle}" añadida correctamente a "${zona}".`);

    $('newStreetInput').value   = '';
    $('customZoneInput').value  = '';
    zoneSelect.value            = '';
    customZoneGroup.style.display = 'none';
});

$('exportCustomBtn').addEventListener('click', () => {
    if (!Object.keys(customStreets).length)
        return alert('No tienes calles personalizadas guardadas.');
    const blob = new Blob([JSON.stringify(customStreets, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'),
        { href: url, download: 'calles_personalizadas.json' }
    ).click();
    URL.revokeObjectURL(url);
});

$('clearCustomBtn').addEventListener('click', () => {
    if (!Object.keys(customStreets).length) return;
    if (confirm('¿Eliminar todas las calles personalizadas?')) {
        customStreets = {};
        saveCustom();
        renderCustomList();
    }
});

function renderCustomList() {
    const list  = $('customList');
    const count = $('customCount');
    const keys  = Object.keys(customStreets);
    count.textContent = `${keys.length} calle${keys.length !== 1 ? 's' : ''}`;

    if (!keys.length) {
        list.innerHTML = '<p class="empty-msg">Todavía no has añadido ninguna calle personalizada.</p>';
        return;
    }
    list.innerHTML = keys.map(k => `
        <div class="custom-item">
            <div>
                <span class="item-key">${k}</span>
                <span style="color:var(--border);margin:0 6px">→</span>
                <span class="item-zone">${customStreets[k]}</span>
            </div>
            <button class="btn-del" data-key="${k}" title="Eliminar">✕</button>
        </div>`).join('');

    list.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', () => {
            delete customStreets[btn.dataset.key];
            saveCustom();
            renderCustomList();
        });
    });
}

// ── CONSULTAR ZONA ────────────────────────────────────────
$('lookupBtn').addEventListener('click', doLookup);
$('lookupInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });

function doLookup() {
    const q    = $('lookupInput').value.trim();
    const res  = $('lookupResult');
    if (!q) return;
    const zona = asignarZona(q);
    if (zona) {
        res.className = 'lookup-result found';
        res.innerHTML = `<strong>${q.toUpperCase()}</strong> &rarr; <strong>${zona}</strong>`;
    } else {
        res.className = 'lookup-result not-found';
        res.innerHTML = `<strong>${q.toUpperCase()}</strong> no está en el diccionario. Puedes añadirla en "Nueva Calle".`;
    }
    res.classList.remove('hidden');
}

// ── STATS DICCIONARIO ─────────────────────────────────────
function renderDictStats() {
    const dict   = getDictionary();
    const byZone = {};
    Object.values(dict).forEach(z => { byZone[z] = (byZone[z] || 0) + 1; });

    $('dictStats').innerHTML =
        Object.entries(byZone)
            .sort((a, b) => b[1] - a[1])
            .map(([z, n]) => `
                <div class="ds-item">
                    <div class="ds-name">${z}</div>
                    <div class="ds-num">${n}</div>
                </div>`).join('')
        + `<div class="ds-item" style="border-color:rgba(230,48,48,.3)">
               <div class="ds-name">Total entradas</div>
               <div class="ds-num" style="color:var(--red)">${Object.keys(dict).length}</div>
           </div>`;
}

// ── DICCIONARIO VIEWER ────────────────────────────────────
function renderDictionary() {
    const dict       = getDictionary();
    const allEntries = Object.entries(dict);
    const zoneFilter = $('dictZoneFilter');
    const searchIn   = $('dictSearch');

    // Poblar selector de zonas (solo la primera vez)
    if (zoneFilter.options.length <= 1) {
        [...new Set(Object.values(dict))].sort().forEach(z => {
            const opt = document.createElement('option');
            opt.value = z; opt.textContent = z;
            zoneFilter.appendChild(opt);
        });
    }

    function applyFilter() {
        const q  = searchIn.value.trim().toUpperCase();
        const zf = zoneFilter.value;
        const filtered = allEntries.filter(([k, v]) =>
            (!q  || k.includes(q) || v.toUpperCase().includes(q)) &&
            (!zf || v === zf)
        );

        $('dictCounter').textContent =
            `Mostrando ${filtered.length} de ${allEntries.length} entradas`;

        $('dictBody').innerHTML = filtered.map(([k, v]) => {
            const isCustom = customStreets[k] !== undefined;
            return `
                <tr>
                    <td style="font-family:monospace;font-size:.8rem">${k}</td>
                    <td>${v}</td>
                    <td>${isCustom
                        ? '<span class="badge-found">Personal</span>'
                        : '<span style="color:var(--muted);font-size:.75rem">Base</span>'}</td>
                </tr>`;
        }).join('');
    }

    searchIn.addEventListener('input',   applyFilter);
    zoneFilter.addEventListener('change', applyFilter);
    applyFilter();
}

// ── INIT ──────────────────────────────────────────────────
loadCustom();
renderCustomList();
renderDictStats();
