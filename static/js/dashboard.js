// Global variables
let vesselsData = [];
let portsData = [];
let plantsData = [];
let vesselMap = null;
let currentPortal = 'vessels';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeMap();
    loadInitialData();
    setupEventListeners();
    startAutoRefresh();
});

// Navigation handling
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const portals = document.querySelectorAll('.portal');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const portalName = btn.dataset.portal;
            switchPortal(portalName);
        });
    });
}

function switchPortal(portalName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-portal="${portalName}"]`).classList.add('active');
    
    // Update portals
    document.querySelectorAll('.portal').forEach(portal => {
        portal.classList.remove('active');
    });
    document.getElementById(`${portalName}Portal`).classList.add('active');
    
    // Update filters
    document.querySelectorAll('[id$="Filters"]').forEach(filter => {
        filter.style.display = 'none';
    });
    const targetFilter = document.getElementById(`${portalName}Filters`);
    if (targetFilter) {
        targetFilter.style.display = 'block';
    }
    
    currentPortal = portalName;
    
    // Load portal-specific data
    if (portalName === 'vessels') {
        loadVesselsData();
    } else if (portalName === 'ports') {
        loadPortsData();
    } else if (portalName === 'plants') {
        loadPlantsData();
    }
}

// Map initialization
function initializeMap() {
    const mapContainer = document.getElementById('vesselMap');
    if (!mapContainer) {
        console.log('vesselMap container not found, skipping map initialization');
        return;
    }
    
    try {
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
        
        console.log('vesselMap initialized successfully');
    } catch (error) {
        console.error('Error initializing vesselMap:', error);
    }
    
    // Add custom markers for different vessel types
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
        })
    };
}

// Data loading functions
async function loadInitialData() {
    await Promise.all([
        loadVesselsData(),
        loadPortsData(),
        loadPlantsData()
    ]);
}

async function loadVesselsData() {
    try {
        const response = await fetch('/api/vessels');
        const data = await response.json();
        
        if (data.status === 'success') {
            vesselsData = data.vessels;
            updateVesselsDisplay();
            updateVesselsMap();
            updateVesselsStats();
        }
    } catch (error) {
        console.error('Error loading vessels data:', error);
        showMessage('Error loading vessels data', 'error');
    }
}

async function loadPortsData() {
    try {
        const response = await fetch('/api/ports');
        const data = await response.json();
        
        if (data.status === 'success') {
            portsData = data.ports;
            updatePortsDisplay();
            updatePortsCharts();
            updatePortsStats();
        }
    } catch (error) {
        console.error('Error loading ports data:', error);
        showMessage('Error loading ports data', 'error');
    }
}

async function loadPlantsData() {
    try {
        const response = await fetch('/api/plants');
        const data = await response.json();
        
        if (data.status === 'success') {
            plantsData = data.plants;
            updatePlantsDisplay();
            updatePlantsCharts();
            updatePlantsStats();
        }
    } catch (error) {
        console.error('Error loading plants data:', error);
        showMessage('Error loading plants data', 'error');
    }
}

// Display update functions
function updateVesselsDisplay() {
    const tbody = document.getElementById('vesselsTableBody');
    tbody.innerHTML = '';
    
    vesselsData.forEach(vessel => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vessel.mmsi}</td>
            <td>${vessel.vessel_name}</td>
            <td>${vessel.vessel_type}</td>
            <td>${vessel.speed}</td>
            <td>${vessel.course}°</td>
            <td>${vessel.destination}</td>
            <td>${formatDateTime(vessel.eta)}</td>
            <td><span class="status-badge status-${vessel.status.toLowerCase().replace(' ', '-')}">${vessel.status}</span></td>
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
}

function updateVesselsMap() {
    if (!vesselMap) {
        console.log('vesselMap not initialized, skipping map update');
        return;
    }
    
    // Clear existing markers
    vesselMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            vesselMap.removeLayer(layer);
        }
    });
    
    // Add vessel markers
    vesselsData.forEach(vessel => {
        const icon = window.vesselIcons[vessel.vessel_type] || window.vesselIcons['Bulk Carrier'];
        
        const marker = L.marker([vessel.lat, vessel.lon], { icon })
            .addTo(vesselMap)
            .bindPopup(`
                <div class="vessel-popup">
                    <h4>${vessel.vessel_name}</h4>
                    <p><strong>MMSI:</strong> ${vessel.mmsi}</p>
                    <p><strong>Type:</strong> ${vessel.vessel_type}</p>
                    <p><strong>Speed:</strong> ${vessel.speed} kn</p>
                    <p><strong>Destination:</strong> ${vessel.destination}</p>
                    <p><strong>Status:</strong> ${vessel.status}</p>
                </div>
            `);
    });
}

function updatePortsDisplay() {
    const tbody = document.getElementById('portsTableBody');
    tbody.innerHTML = '';
    
    portsData.forEach(port => {
        const row = document.createElement('tr');
        const utilizationPercent = ((port.current_stock / port.capacity) * 100).toFixed(1);
        
        row.innerHTML = `
            <td>${port.port_id}</td>
            <td>${port.port_name}</td>
            <td>${port.capacity.toLocaleString()} MT</td>
            <td>${port.current_stock.toLocaleString()} MT</td>
            <td>${port.available_capacity.toLocaleString()} MT</td>
            <td>$${port.handling_cost}/MT</td>
            <td><span class="congestion-${port.congestion_level.toLowerCase()}">${port.congestion_level}</span></td>
            <td>${port.expected_vessels}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-sm btn-info" onclick="showPortDetails('${port.port_id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="updatePortStock('${port.port_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updatePlantsDisplay() {
    const tbody = document.getElementById('plantsTableBody');
    tbody.innerHTML = '';
    
    plantsData.forEach(plant => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${plant.plant_id}</td>
            <td>${plant.plant_name}</td>
            <td>${plant.required_materials.iron_ore.toLocaleString()} MT</td>
            <td>${plant.required_materials.coal.toLocaleString()} MT</td>
            <td>${plant.required_materials.limestone.toLocaleString()} MT</td>
            <td>${plant.rail_connectivity}</td>
            <td><span class="urgency-${plant.urgency_level.toLowerCase()}">${plant.urgency_level}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-sm btn-info" onclick="showPlantDetails('${plant.plant_id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="updatePlantStock('${plant.plant_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Statistics update functions
function updateVesselsStats() {
    document.getElementById('totalVessels').textContent = vesselsData.length;
    document.getElementById('delayedVessels').textContent = 
        vesselsData.filter(v => v.status === 'Delayed').length;
    document.getElementById('enRouteVessels').textContent = 
        vesselsData.filter(v => v.status === 'En Route').length;
}

function updatePortsStats() {
    document.getElementById('totalPorts').textContent = portsData.length;
    
    const avgCapacity = portsData.reduce((sum, port) => 
        sum + (port.current_stock / port.capacity), 0) / portsData.length * 100;
    document.getElementById('avgCapacity').textContent = `${avgCapacity.toFixed(1)}%`;
    
    const totalCost = portsData.reduce((sum, port) => 
        sum + (port.handling_cost * port.current_stock), 0);
    document.getElementById('totalCost').textContent = `$${totalCost.toLocaleString()}`;
}

function updatePlantsStats() {
    document.getElementById('totalPlants').textContent = plantsData.length;
    document.getElementById('urgentRequests').textContent = 
        plantsData.filter(p => p.urgency_level === 'High').length;
    
    const totalDemand = plantsData.reduce((sum, plant) => 
        sum + plant.required_materials.iron_ore + 
        plant.required_materials.coal + 
        plant.required_materials.limestone, 0);
    document.getElementById('totalDemand').textContent = totalDemand.toLocaleString();
}

// Chart functions
function updatePortsCharts() {
    // Port Capacity Chart
    const capacityCtx = document.getElementById('portCapacityChart').getContext('2d');
    new Chart(capacityCtx, {
        type: 'bar',
        data: {
            labels: portsData.map(p => p.port_name),
            datasets: [{
                label: 'Current Stock',
                data: portsData.map(p => p.current_stock),
                backgroundColor: 'rgba(102, 126, 234, 0.6)'
            }, {
                label: 'Available Capacity',
                data: portsData.map(p => p.available_capacity),
                backgroundColor: 'rgba(118, 75, 162, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Capacity (MT)'
                    }
                }
            }
        }
    });
    
    // Cost Analysis Chart
    const costCtx = document.getElementById('costAnalysisChart').getContext('2d');
    new Chart(costCtx, {
        type: 'doughnut',
        data: {
            labels: portsData.map(p => p.port_name),
            datasets: [{
                data: portsData.map(p => p.handling_cost),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Handling Costs by Port'
                }
            }
        }
    });
}

function updatePlantsCharts() {
    // Demand vs Supply Chart
    const demandCtx = document.getElementById('demandSupplyChart').getContext('2d');
    new Chart(demandCtx, {
        type: 'bar',
        data: {
            labels: plantsData.map(p => p.plant_name),
            datasets: [{
                label: 'Required Iron Ore',
                data: plantsData.map(p => p.required_materials.iron_ore),
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }, {
                label: 'Current Stock',
                data: plantsData.map(p => p.current_stock.iron_ore),
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity (MT)'
                    }
                }
            }
        }
    });
    
    // Material Distribution Chart
    const materialCtx = document.getElementById('materialDistributionChart').getContext('2d');
    const totalIronOre = plantsData.reduce((sum, p) => sum + p.required_materials.iron_ore, 0);
    const totalCoal = plantsData.reduce((sum, p) => sum + p.required_materials.coal, 0);
    const totalLimestone = plantsData.reduce((sum, p) => sum + p.required_materials.limestone, 0);
    
    new Chart(materialCtx, {
        type: 'pie',
        data: {
            labels: ['Iron Ore', 'Coal', 'Limestone'],
            datasets: [{
                data: [totalIronOre, totalCoal, totalLimestone],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Material Demand Distribution'
                }
            }
        }
    });
}

// Event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Filter functionality
    document.getElementById('vesselTypeFilter').addEventListener('change', filterVessels);
    document.getElementById('congestionFilter').addEventListener('change', filterPorts);
    document.getElementById('urgencyFilter').addEventListener('change', filterPlants);
    
    // Action buttons
    document.getElementById('optimizeBtn').addEventListener('click', runOptimization);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('exportBtn').addEventListener('click', exportReport);
    
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
            <h4>${vessel.vessel_name}</h4>
            <div class="detail-grid">
                <div><strong>MMSI:</strong> ${vessel.mmsi}</div>
                <div><strong>Type:</strong> ${vessel.vessel_type}</div>
                <div><strong>Speed:</strong> ${vessel.speed} knots</div>
                <div><strong>Course:</strong> ${vessel.course}°</div>
                <div><strong>Destination:</strong> ${vessel.destination}</div>
                <div><strong>ETA:</strong> ${formatDateTime(vessel.eta)}</div>
                <div><strong>Cargo:</strong> ${vessel.cargo}</div>
                <div><strong>Status:</strong> ${vessel.status}</div>
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
        
        let alertClass = 'info';
        if (prediction.delay_probability > 0.7) alertClass = 'error';
        else if (prediction.delay_probability > 0.4) alertClass = 'warning';
        
        showAlert(`Vessel ${mmsi}: ${(prediction.delay_probability * 100).toFixed(1)}% delay probability`, alertClass);
    } catch (error) {
        showAlert('Error predicting delay', 'error');
    }
}

async function runOptimization() {
    const modal = document.getElementById('optimizationModal');
    const content = document.getElementById('optimizationModalContent');
    
    content.innerHTML = '<div class="loading"></div> Running optimization...';
    modal.style.display = 'block';
    
    try {
        const response = await fetch('/api/optimize');
        const result = await response.json();
        
        if (result.status === 'optimal') {
            content.innerHTML = `
                <div class="optimization-results">
                    <h4>Optimization Results</h4>
                    <div class="result-summary">
                        <div class="cost-savings">
                            <strong>Total Optimized Cost:</strong> $${result.total_cost.toLocaleString()}
                        </div>
                    </div>
                    <div class="allocations">
                        <h5>Recommended Allocations:</h5>
                        <div class="allocation-grid">
                            ${Object.entries(result.allocations).map(([route, amount]) => 
                                `<div><strong>${route.replace('_', ' → ')}:</strong> ${amount.toLocaleString()} MT</div>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="recommendations">
                        <h5>Recommendations:</h5>
                        <ul>
                            ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `<div class="error">Optimization failed: ${result.message}</div>`;
        }
    } catch (error) {
        content.innerHTML = '<div class="error">Error running optimization</div>';
    }
}

function refreshData() {
    showAlert('Refreshing data...', 'info');
    loadInitialData();
}

function exportReport() {
    // Simple CSV export functionality
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (currentPortal === 'vessels') {
        csvContent += "MMSI,Vessel Name,Type,Speed,Course,Destination,ETA,Status\n";
        vesselsData.forEach(vessel => {
            csvContent += `${vessel.mmsi},${vessel.vessel_name},${vessel.vessel_type},${vessel.speed},${vessel.course},${vessel.destination},${vessel.eta},${vessel.status}\n`;
        });
    } else if (currentPortal === 'ports') {
        csvContent += "Port ID,Port Name,Capacity,Current Stock,Available Capacity,Handling Cost,Congestion Level\n";
        portsData.forEach(port => {
            csvContent += `${port.port_id},${port.port_name},${port.capacity},${port.current_stock},${port.available_capacity},${port.handling_cost},${port.congestion_level}\n`;
        });
    } else if (currentPortal === 'plants') {
        csvContent += "Plant ID,Plant Name,Iron Ore Req,Coal Req,Limestone Req,Rail Connectivity,Urgency Level\n";
        plantsData.forEach(plant => {
            csvContent += `${plant.plant_id},${plant.plant_name},${plant.required_materials.iron_ore},${plant.required_materials.coal},${plant.required_materials.limestone},${plant.rail_connectivity},${plant.urgency_level}\n`;
        });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentPortal}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Report exported successfully', 'success');
}

// Filter functions
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    // Implement search logic based on current portal
    showAlert(`Searching for: ${searchTerm}`, 'info');
}

function filterVessels() {
    const vesselType = document.getElementById('vesselTypeFilter').value;
    // Implement vessel filtering logic
    updateVesselsDisplay();
}

function filterPorts() {
    const congestionLevel = document.getElementById('congestionFilter').value;
    // Implement port filtering logic
    updatePortsDisplay();
}

function filterPlants() {
    const urgencyLevel = document.getElementById('urgencyFilter').value;
    // Implement plant filtering logic
    updatePlantsDisplay();
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

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh vessel data every 30 seconds
    setInterval(() => {
        if (currentPortal === 'vessels') {
            loadVesselsData();
        }
    }, 30000);
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

// Keep showAlert for backward compatibility
function showAlert(message, type = 'info') {
    showMessage(message, type);
}

// Placeholder functions for additional features
function showPortDetails(portId) {
    showAlert(`Showing details for port: ${portId}`, 'info');
}

function updatePortStock(portId) {
    showAlert(`Updating stock for port: ${portId}`, 'info');
}

function showPlantDetails(plantId) {
    showAlert(`Showing details for plant: ${plantId}`, 'info');
}

function updatePlantStock(plantId) {
    showAlert(`Updating stock for plant: ${plantId}`, 'info');
}
