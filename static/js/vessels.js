// Global variables
let vesselsData = [];
let vesselMap = null;
let filteredVessels = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadVesselsData();
    setupEventListeners();
    startAutoRefresh();
});

// Map initialization
function initializeMap() {
    vesselMap = L.map('vesselMap', {
        center: [19.0760, 72.8777],
        zoom: 6,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: false,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        noWrap: true
    }).addTo(vesselMap);
    
    // Custom vessel icons
    window.vesselIcons = {
        'Bulk Carrier': L.divIcon({
            className: 'vessel-marker bulk-carrier',
            html: '<i class="fas fa-ship"></i>',
            iconSize: [30, 30]
        }),
        'Container Ship': L.divIcon({
            className: 'vessel-marker container-ship',
            html: '<i class="fas fa-shipping-fast"></i>',
            iconSize: [30, 30]
        }),
        'Tanker': L.divIcon({
            className: 'vessel-marker tanker',
            html: '<i class="fas fa-oil-can"></i>',
            iconSize: [30, 30]
        }),
        'General Cargo': L.divIcon({
            className: 'vessel-marker general-cargo',
            html: '<i class="fas fa-boxes"></i>',
            iconSize: [30, 30]
        })
    };
}

// Data loading
async function loadVesselsData() {
    try {
        showMessage('Loading vessels data...', 'info');
        const response = await fetch('/api/vessels');
        const data = await response.json();
        
        if (data.status === 'success') {
            vesselsData = data.vessels;
            filteredVessels = [...vesselsData];
            updateVesselsDisplay();
            updateVesselsMap();
            updateVesselsStats();
            showMessage('Vessels data loaded successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to load vessels data');
        }
    } catch (error) {
        console.error('Error loading vessels data:', error);
        showMessage('Error loading vessels data', 'error');
    }
}

// Display functions
function updateVesselsDisplay() {
    const tbody = document.getElementById('vesselsTableBody');
    tbody.innerHTML = '';
    
    // Show only first 8 rows, with scroll for more
    filteredVessels.slice(0, 8).forEach(vessel => {
        const row = document.createElement('tr');
        const status = vessel.status || 'Unknown';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        
        row.innerHTML = `
            <td>${vessel.mmsi || 'N/A'}</td>
            <td>${vessel.vessel_name || 'Unknown Vessel'}</td>
            <td>${vessel.vessel_type || 'Unknown'}</td>
            <td>${vessel.speed || 0}</td>
            <td>${vessel.course || 0}°</td>
            <td>${vessel.destination || 'Unknown'}</td>
            <td>${vessel.eta ? formatDateTime(vessel.eta) : 'N/A'}</td>
            <td><span class="status-badge status-${statusClass}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-sm btn-info" onclick="showVesselDetails('${vessel.mmsi}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-sm btn-warning" onclick="predictDelay('${vessel.mmsi}')">
                        <i class="fas fa-clock"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add scroll indicator if more than 8 rows
    if (filteredVessels.length > 8) {
        const scrollIndicator = document.createElement('tr');
        scrollIndicator.innerHTML = `
            <td colspan="9" class="scroll-indicator">
                <i class="fas fa-chevron-down"></i>
                Showing 8 of ${filteredVessels.length} vessels. Scroll to view more.
            </td>
        `;
        tbody.appendChild(scrollIndicator);
    }
}

function updateVesselsMap() {
    // Clear existing markers
    vesselMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            vesselMap.removeLayer(layer);
        }
    });
    
    // Add vessel markers
    filteredVessels.forEach(vessel => {
        if (vessel.lat && vessel.lon) {
            const icon = window.vesselIcons[vessel.vessel_type] || window.vesselIcons['Bulk Carrier'];
            
            const marker = L.marker([vessel.lat, vessel.lon], { icon })
                .addTo(vesselMap)
                .bindPopup(`
                    <div class="vessel-popup">
                        <h4>${vessel.vessel_name || 'Unknown Vessel'}</h4>
                        <p><strong>MMSI:</strong> ${vessel.mmsi || 'N/A'}</p>
                        <p><strong>Type:</strong> ${vessel.vessel_type || 'Unknown'}</p>
                        <p><strong>Speed:</strong> ${vessel.speed || 0} kn</p>
                        <p><strong>Destination:</strong> ${vessel.destination || 'Unknown'}</p>
                        <p><strong>Status:</strong> ${vessel.status || 'Unknown'}</p>
                        <p><strong>Cargo:</strong> ${vessel.cargo || 'N/A'}</p>
                    </div>
                `);
        }
    });
}

function updateVesselsStats() {
    document.getElementById('totalVessels').textContent = filteredVessels.length;
    document.getElementById('delayedVessels').textContent = 
        filteredVessels.filter(v => v.status === 'Delayed').length;
    document.getElementById('enRouteVessels').textContent = 
        filteredVessels.filter(v => v.status === 'En Route').length;
}

// Search and filter functions
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const vesselTypeFilter = document.getElementById('vesselTypeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredVessels = vesselsData.filter(vessel => {
        const vesselName = (vessel.vessel_name || '').toLowerCase();
        const mmsi = (vessel.mmsi || '').toString();
        const destination = (vessel.destination || '').toLowerCase();
        const cargo = (vessel.cargo || '').toLowerCase();
        
        const matchesSearch = !searchTerm || 
            vesselName.includes(searchTerm) ||
            mmsi.includes(searchTerm) ||
            destination.includes(searchTerm) ||
            cargo.includes(searchTerm);
        
        const matchesType = !vesselTypeFilter || vessel.vessel_type === vesselTypeFilter;
        const matchesStatus = !statusFilter || vessel.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    updateVesselsDisplay();
    updateVesselsMap();
    updateVesselsStats();
}

function filterVessels() {
    performSearch(); // Reuse search logic
}

// Event listeners
function setupEventListeners() {
    // Modal handling
    setupModalHandlers();
}

// Action functions
async function showVesselDetails(mmsi) {
    const vessel = vesselsData.find(v => v.mmsi === mmsi);
    if (!vessel) return;
    
    const modal = document.getElementById('vesselModal');
    const content = document.getElementById('vesselModalContent');
    
    content.innerHTML = `
        <div class="vessel-details">
            <h4>${vessel.vessel_name || 'Unknown Vessel'}</h4>
            <div class="detail-grid">
                <div><strong>MMSI:</strong> ${vessel.mmsi || 'N/A'}</div>
                <div><strong>Type:</strong> ${vessel.vessel_type || 'Unknown'}</div>
                <div><strong>Speed:</strong> ${vessel.speed || 0} knots</div>
                <div><strong>Course:</strong> ${vessel.course || 0}°</div>
                <div><strong>Destination:</strong> ${vessel.destination || 'Unknown'}</div>
                <div><strong>ETA:</strong> ${vessel.eta ? formatDateTime(vessel.eta) : 'N/A'}</div>
                <div><strong>Cargo:</strong> ${vessel.cargo || 'N/A'}</div>
                <div><strong>Status:</strong> ${vessel.status || 'Unknown'}</div>
                <div><strong>Length:</strong> ${vessel.length || 0}m</div>
                <div><strong>Width:</strong> ${vessel.width || 0}m</div>
                <div><strong>Draft:</strong> ${vessel.draft || 0}m</div>
                <div><strong>Last Update:</strong> ${vessel.last_update ? formatDateTime(vessel.last_update) : 'N/A'}</div>
            </div>
            <div class="loading-prediction">
                <div class="loading"></div> Loading delay prediction...
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Load delay prediction
    try {
        const response = await fetch(`/api/predict-delay?vessel_mmsi=${mmsi}`);
        const prediction = await response.json();
        
        content.querySelector('.loading-prediction').innerHTML = `
            <div class="prediction-results">
                <h5>Delay Prediction</h5>
                <div class="prediction-grid">
                    <div><strong>Delay Probability:</strong> ${(prediction.delay_probability * 100).toFixed(1)}%</div>
                    <div><strong>Predicted Delay:</strong> ${prediction.predicted_delay_hours} hours</div>
                    <div><strong>Confidence:</strong> ${(prediction.confidence * 100).toFixed(1)}%</div>
                </div>
                <div class="contributing-factors">
                    <strong>Contributing Factors:</strong>
                    <ul>
                        ${prediction.contributing_factors.map(factor => `<li>${factor}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    } catch (error) {
        content.querySelector('.loading-prediction').innerHTML = 
            '<div class="error">Error loading prediction</div>';
    }
}

async function predictDelay(mmsi) {
    try {
        const response = await fetch(`/api/predict-delay?vessel_mmsi=${mmsi}`);
        const prediction = await response.json();
        
        let messageType = 'info';
        if (prediction.delay_probability > 0.7) messageType = 'error';
        else if (prediction.delay_probability > 0.4) messageType = 'warning';
        
        showMessage(`Vessel ${mmsi}: ${(prediction.delay_probability * 100).toFixed(1)}% delay probability`, messageType);
    } catch (error) {
        showMessage('Error predicting delay', 'error');
    }
}

function refreshData() {
    showMessage('Refreshing vessel data...', 'info');
    loadVesselsData();
}

function exportReport() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "MMSI,Vessel Name,Type,Speed,Course,Destination,ETA,Status,Cargo,Length,Width,Draft\n";
    
    filteredVessels.forEach(vessel => {
        csvContent += `${vessel.mmsi},${vessel.vessel_name},${vessel.vessel_type},${vessel.speed},${vessel.course},${vessel.destination},${vessel.eta},${vessel.status},${vessel.cargo},${vessel.length},${vessel.width},${vessel.draft}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vessels_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Vessels report exported successfully', 'success');
}

// Modal handlers
function setupModalHandlers() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Auto-refresh
function startAutoRefresh() {
    setInterval(() => {
        loadVesselsData();
    }, 30000); // Refresh every 30 seconds
}

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    toast.className = `message-toast ${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}
