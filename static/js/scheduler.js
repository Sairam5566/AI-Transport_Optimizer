// Scheduler Page JavaScript
let scheduleTrips = [];
let optimizerAllocations = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Auto run to show something on load
    runScheduler();
    runOptimizer();
});

async function runScheduler() {
    try {
        showMessage('Generating truck schedule...', 'info');
        const res = await fetch('/api/scheduler/truck');
        const json = await res.json();
        if (json.status !== 'success') throw new Error(json.message || 'Failed to generate');
        scheduleTrips = json.trips || [];
        renderSchedule();
        updateScheduleStats(json);
        showMessage('Truck schedule generated', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Error generating schedule', 'error');
    }
}

async function runOptimizer() {
    try {
        showMessage('Running truck optimizer...', 'info');
        const res = await fetch('/api/optimizer/truck');
        const json = await res.json();
        if (json.status !== 'optimal' && json.status !== 'success') throw new Error(json.message || 'No optimal solution');
        optimizerAllocations = json.allocations || [];
        renderAllocations();
        showMessage('Optimizer completed', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Error running optimizer', 'error');
    }
}

function renderSchedule() {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    scheduleTrips.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.truck_id}</td>
            <td>${t.origin}</td>
            <td>${t.destination}</td>
            <td>${formatDateTime(t.depart_time)}</td>
            <td>${formatDateTime(t.arrive_time)}</td>
            <td>${numberFormat(t.distance_km)}</td>
            <td>${numberFormat(t.fuel_liters)}</td>
            <td>$${numberFormat(t.cost)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAllocations() {
    const tbody = document.getElementById('allocTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    optimizerAllocations.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.from}</td>
            <td>${a.to}</td>
            <td>${numberFormat(a.tonnes)}</td>
            <td>${numberFormat(a.distance_km)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateScheduleStats(meta) {
    const tripsCount = scheduleTrips.length;
    const totalFuel = scheduleTrips.reduce((s, t) => s + (Number(t.fuel_liters) || 0), 0);
    const totalCost = scheduleTrips.reduce((s, t) => s + (Number(t.cost) || 0), 0);

    const tripsEl = document.getElementById('tripsCount');
    const fuelEl = document.getElementById('totalFuel');
    const costEl = document.getElementById('totalCost');

    if (tripsEl) tripsEl.textContent = tripsCount;
    if (fuelEl) fuelEl.textContent = `${numberFormat(totalFuel.toFixed ? Number(totalFuel.toFixed(0)) : totalFuel)} L`;
    if (costEl) costEl.textContent = `$${numberFormat(totalCost.toFixed ? Number(totalCost.toFixed(0)) : totalCost)}`;
}

function exportScheduleCSV() {
    const fields = ['truck_id','origin','destination','depart_time','arrive_time','distance_km','fuel_liters','cost'];
    const rows = [fields.join(',')];
    scheduleTrips.forEach(t => {
        const row = fields.map(f => (t[f] !== undefined ? String(t[f]).replace(/,/g,';') : ''));
        rows.push(row.join(','));
    });
    downloadCSV(rows.join('\n'), 'truck_schedule.csv');
    showMessage('Exported schedule CSV', 'success');
}

function exportAllocationsCSV() {
    const fields = ['from','to','tonnes','distance_km'];
    const rows = [fields.join(',')];
    optimizerAllocations.forEach(a => {
        const row = fields.map(f => (a[f] !== undefined ? String(a[f]).replace(/,/g,';') : ''));
        rows.push(row.join(','));
    });
    downloadCSV(rows.join('\n'), 'optimizer_allocations.csv');
    showMessage('Exported allocations CSV', 'success');
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
