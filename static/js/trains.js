// Trains Page JavaScript
let trainsData = [];
let filteredTrains = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadTrains();
});

async function loadTrains() {
    try {
        showMessage('Loading trains data...', 'info');
        const res = await fetch('/api/trains');
        const json = await res.json();
        if (json.status !== 'success') throw new Error(json.error || 'Failed');
        trainsData = json.trains || [];
        // Normalize numeric fields if loaded from CSV
        trainsData = trainsData.map(t => ({
            ...t,
            wagons: Number(t.wagons),
            rake_capacity_tonnes: Number(t.rake_capacity_tonnes),
            route_distance_km: Number(t.route_distance_km),
            expected_cost_per_ton: Number(t.expected_cost_per_ton)
        }));
        populateSupplierFilter();
        applyFilters();
        showMessage('Trains data loaded', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Error loading trains data', 'error');
    }
}

function populateSupplierFilter() {
    const select = document.getElementById('supplierFilter');
    if (!select) return;
    const suppliers = Array.from(new Set(trainsData.map(t => `${t.supplier_id}|${t.supplier_name}`)))
        .map(s => ({ id: s.split('|')[0], name: s.split('|')[1] }));
    // Clear
    select.innerHTML = '<option value="">All Suppliers</option>';
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name}`;
        select.appendChild(opt);
    });
}

function applyFilters() {
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const supplier = document.getElementById('supplierFilter')?.value || '';
    const commodity = document.getElementById('commodityFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    filteredTrains = trainsData.filter(t => {
        const matchesTerm = !term ||
            (t.train_id || '').toLowerCase().includes(term) ||
            (t.origin_port || '').toLowerCase().includes(term) ||
            (t.destination_plant || '').toLowerCase().includes(term) ||
            (t.supplier_name || '').toLowerCase().includes(term) ||
            (t.commodity || '').toLowerCase().includes(term);
        const matchesSupplier = !supplier || (t.supplier_id === supplier);
        const matchesCommodity = !commodity || (t.commodity === commodity);
        const matchesStatus = !status || (t.status === status);
        return matchesTerm && matchesSupplier && matchesCommodity && matchesStatus;
    });

    renderTrains();
    updateStats();
}

function renderTrains() {
    const tbody = document.getElementById('trainsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredTrains.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.train_id}</td>
            <td>${t.supplier_name}</td>
            <td>${t.origin_port}</td>
            <td>${t.destination_plant}</td>
            <td>${t.commodity}</td>
            <td>${t.wagons}</td>
            <td>${t.rake_type}</td>
            <td>${numberFormat(t.rake_capacity_tonnes)}</td>
            <td>${numberFormat(t.route_distance_km)}</td>
            <td>${formatDateTime(t.scheduled_departure)}</td>
            <td>${formatDateTime(t.scheduled_arrival)}</td>
            <td><span class="status-badge">${t.status}</span></td>
            <td>$${t.expected_cost_per_ton?.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    const total = filteredTrains.length;
    const totalCap = filteredTrains.reduce((s, t) => s + (Number(t.rake_capacity_tonnes) || 0), 0);
    const avgCost = filteredTrains.length
        ? filteredTrains.reduce((s, t) => s + (Number(t.expected_cost_per_ton) || 0), 0) / filteredTrains.length
        : 0;

    const elTotal = document.getElementById('totalTrains');
    const elCap = document.getElementById('totalCapacity');
    const elCost = document.getElementById('avgCost');
    if (elTotal) elTotal.textContent = total;
    if (elCap) elCap.textContent = numberFormat(totalCap);
    if (elCost) elCost.textContent = `$${avgCost.toFixed(2)}`;
}

function refreshTrains() {
    loadTrains();
}

function exportTrainsCSV() {
    const fields = [
        'train_id','supplier_id','supplier_name','origin_port','destination_plant','commodity','wagons','rake_type','rake_capacity_tonnes','route_distance_km','scheduled_departure','scheduled_arrival','status','expected_cost_per_ton'
    ];
    const rows = [fields.join(',')];
    filteredTrains.forEach(t => {
        const row = fields.map(f => (t[f] !== undefined ? String(t[f]).replace(/,/g,';') : ''));
        rows.push(row.join(','));
    });
    downloadCSV(rows.join('\n'), 'trains_export.csv');
    showMessage('Exported trains CSV', 'success');
}

function exportSuppliersCSV() {
    // Aggregate by supplier
    const agg = {};
    filteredTrains.forEach(t => {
        const key = t.supplier_id || 'UNKNOWN';
        if (!agg[key]) {
            agg[key] = {
                supplier_id: t.supplier_id,
                supplier_name: t.supplier_name,
                total_trains: 0,
                total_capacity_tonnes: 0,
                avg_cost_per_ton: 0,
                costs: []
            };
        }
        agg[key].total_trains += 1;
        agg[key].total_capacity_tonnes += Number(t.rake_capacity_tonnes) || 0;
        if (t.expected_cost_per_ton !== undefined) agg[key].costs.push(Number(t.expected_cost_per_ton));
    });
    const fields = ['supplier_id','supplier_name','total_trains','total_capacity_tonnes','avg_cost_per_ton'];
    const rows = [fields.join(',')];
    Object.values(agg).forEach(s => {
        s.avg_cost_per_ton = s.costs.length ? (s.costs.reduce((x,y)=>x+y,0)/s.costs.length) : 0;
        const row = [s.supplier_id, s.supplier_name, s.total_trains, Math.round(s.total_capacity_tonnes), s.avg_cost_per_ton.toFixed(2)];
        rows.push(row.join(','));
    });
    downloadCSV(rows.join('\n'), 'suppliers_export.csv');
    showMessage('Exported suppliers CSV', 'success');
}

// Helpers
function numberFormat(n) {
    if (!isFinite(n)) return '0';
    return Number(n).toLocaleString();
}

function formatDateTime(s) {
    if (!s) return '';
    const d = new Date(s);
    return d.toLocaleString();
}

function downloadCSV(content, filename) {
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    if (!toast) return;
    toast.className = `message-toast ${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(()=>{ toast.style.display = 'none'; }, 4000);
}
