// Global variables
let plantsData = [];
let filteredPlants = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadPlantsData();
    setupEventListeners();
});

// Data loading
async function loadPlantsData() {
    try {
        showMessage('Loading plants data...', 'info');
        const response = await fetch('/api/plants');
        const data = await response.json();
        
        if (data.status === 'success') {
            plantsData = data.plants;
            filteredPlants = [...plantsData];
            updatePlantsDisplay();
            updatePlantsCharts();
            updatePlantsStats();
            showMessage('Plants data loaded successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to load plants data');
        }
    } catch (error) {
        console.error('Error loading plants data:', error);
        showMessage('Error loading plants data', 'error');
    }
}

// Display functions
function updatePlantsDisplay() {
    const tbody = document.getElementById('plantsTableBody');
    tbody.innerHTML = '';
    
    // Show only first 8 rows, with scroll for more
    filteredPlants.slice(0, 8).forEach((plant, index) => {
        const row = document.createElement('tr');
        const plantId = plant.plant_id || `PLANT-${index + 1}`;
        const urgencyLevel = getUrgencyLevel(plant);
        
        row.innerHTML = `
            <td>${plantId}</td>
            <td>${plant.plant_name || 'Unknown Plant'}</td>
            <td>${(plant.required_materials_iron_ore || 0).toLocaleString()} MT</td>
            <td>${(plant.required_materials_coal || 0).toLocaleString()} MT</td>
            <td>${(plant.required_materials_limestone || 0).toLocaleString()} MT</td>
            <td>${plant.rail_connectivity || 'N/A'}</td>
            <td><span class="urgency-${urgencyLevel.toLowerCase()}">${urgencyLevel}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-sm btn-info" onclick="showPlantDetails('${plantId}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="updatePlantStock('${plantId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add scroll indicator if more than 8 rows
    if (filteredPlants.length > 8) {
        const scrollIndicator = document.createElement('tr');
        scrollIndicator.innerHTML = `
            <td colspan="8" class="scroll-indicator">
                <i class="fas fa-chevron-down"></i>
                Showing 8 of ${filteredPlants.length} plants. Scroll to view more.
            </td>
        `;
        tbody.appendChild(scrollIndicator);
    }
}

function updatePlantsStats() {
    document.getElementById('totalPlants').textContent = filteredPlants.length;
    document.getElementById('urgentRequests').textContent = 
        filteredPlants.filter(p => getUrgencyLevel(p) === 'High').length;
    
    const totalDemand = filteredPlants.reduce((sum, plant) => 
        sum + (plant.required_materials_iron_ore || 0) + 
        (plant.required_materials_coal || 0) + 
        (plant.required_materials_limestone || 0), 0);
    document.getElementById('totalDemand').textContent = totalDemand.toLocaleString();
}

function updatePlantsCharts() {
    // Demand vs Supply Chart - show top 10 plants
    const topPlants = filteredPlants.slice(0, 10);
    const demandCtx = document.getElementById('demandSupplyChart');
    if (!demandCtx) return;
    
    // Destroy existing chart if it exists
    if (window.demandSupplyChart && typeof window.demandSupplyChart.destroy === 'function') {
        window.demandSupplyChart.destroy();
    }
    
    window.demandSupplyChart = new Chart(demandCtx, {
        type: 'bar',
        data: {
            labels: topPlants.map(p => (p.plant_name || 'Unknown').substring(0, 15) + '...'),
            datasets: [{
                label: 'Required Iron Ore',
                data: topPlants.map(p => p.required_materials_iron_ore || 0),
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }, {
                label: 'Current Stock',
                data: topPlants.map(p => p.current_stock_iron_ore || 0),
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
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Iron Ore Demand vs Supply (Top 10 Plants)'
                }
            }
        }
    });
    
    // Material Distribution Chart
    const materialCtx = document.getElementById('materialDistributionChart');
    if (!materialCtx) return;
    
    // Destroy existing chart if it exists
    if (window.materialDistributionChart && typeof window.materialDistributionChart.destroy === 'function') {
        window.materialDistributionChart.destroy();
    }
    
    const totalIronOre = filteredPlants.reduce((sum, p) => sum + (p.required_materials_iron_ore || 0), 0);
    const totalCoal = filteredPlants.reduce((sum, p) => sum + (p.required_materials_coal || 0), 0);
    const totalLimestone = filteredPlants.reduce((sum, p) => sum + (p.required_materials_limestone || 0), 0);
    
    window.materialDistributionChart = new Chart(materialCtx, {
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

// Search and filter functions
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const urgencyFilter = document.getElementById('urgencyFilter').value;
    const materialFilter = document.getElementById('materialFilter').value;
    
    filteredPlants = plantsData.filter(plant => {
        const plantName = (plant.plant_name || '').toLowerCase();
        const plantId = (plant.plant_id || '').toString().toLowerCase();
        const state = (plant.state || '').toLowerCase();
        
        const matchesSearch = !searchTerm || 
            plantName.includes(searchTerm) ||
            plantId.includes(searchTerm) ||
            state.includes(searchTerm);
        
        const plantUrgencyLevel = getUrgencyLevel(plant);
        const matchesUrgency = !urgencyFilter || plantUrgencyLevel === urgencyFilter;
        
        let matchesMaterial = true;
        if (materialFilter) {
            // Check if plant has significant demand for the selected material
            const materialDemand = plant[`required_materials_${materialFilter}`] || 0;
            matchesMaterial = materialDemand > 0;
        }
        
        return matchesSearch && matchesUrgency && matchesMaterial;
    });
    
    updatePlantsDisplay();
    updatePlantsCharts();
    updatePlantsStats();
}

function filterPlants() {
    performSearch(); // Reuse search logic
}

// Event listeners
function setupEventListeners() {
    setupModalHandlers();
}

// Action functions
function showPlantDetails(plantId) {
    const plant = plantsData.find(p => (p.plant_id || `PLANT-${plantsData.indexOf(p) + 1}`) === plantId);
    if (!plant) return;
    
    const modal = document.getElementById('plantModal');
    const content = document.getElementById('plantModalContent');
    
    const location = plant.location || {};
    const urgencyLevel = getUrgencyLevel(plant);
    
    content.innerHTML = `
        <div class="plant-details">
            <h4>${plant.plant_name || 'Unknown Plant'}</h4>
            <div class="detail-grid">
                <div><strong>Plant ID:</strong> ${plantId}</div>
                <div><strong>Location:</strong> ${location.lat || 'N/A'}, ${location.lon || 'N/A'}</div>
                <div><strong>Capacity:</strong> ${plant.capacity_mtpa || 0} MTPA</div>
                <div><strong>Rail Connectivity:</strong> ${plant.rail_connectivity || 'N/A'}</div>
                <div><strong>Urgency Level:</strong> ${urgencyLevel}</div>
            </div>
            
            <h5>Material Requirements</h5>
            <div class="material-grid">
                <div class="material-card">
                    <h6>Iron Ore</h6>
                    <p><strong>Required:</strong> ${(plant.required_materials_iron_ore || 0).toLocaleString()} MT</p>
                    <p><strong>Current Stock:</strong> ${(plant.current_stock_iron_ore || 0).toLocaleString()} MT</p>
                    <p><strong>Days Remaining:</strong> ${plant.stock_days_remaining_iron_ore || 0} days</p>
                </div>
                <div class="material-card">
                    <h6>Coal</h6>
                    <p><strong>Required:</strong> ${(plant.required_materials_coal || 0).toLocaleString()} MT</p>
                    <p><strong>Current Stock:</strong> ${(plant.current_stock_coal || 0).toLocaleString()} MT</p>
                    <p><strong>Days Remaining:</strong> ${plant.stock_days_remaining_coal || 0} days</p>
                </div>
                <div class="material-card">
                    <h6>Limestone</h6>
                    <p><strong>Required:</strong> ${(plant.required_materials_limestone || 0).toLocaleString()} MT</p>
                    <p><strong>Current Stock:</strong> ${(plant.current_stock_limestone || 0).toLocaleString()} MT</p>
                    <p><strong>Days Remaining:</strong> ${plant.stock_days_remaining_limestone || 0} days</p>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function updatePlantStock(plantId) {
    showMessage(`Stock update feature for plant ${plantId} - Coming soon!`, 'info');
}

function refreshData() {
    showMessage('Refreshing plants data...', 'info');
    loadPlantsData();
}

function exportReport() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Plant ID,Plant Name,State,Capacity MTPA,Iron Ore Req,Coal Req,Limestone Req,Iron Ore Stock,Coal Stock,Limestone Stock,Rail Connectivity,Urgency Level\n";
    
    filteredPlants.forEach(plant => {
        csvContent += `${plant.plant_id},${plant.plant_name},${plant.state},${plant.capacity_mtpa},${plant.required_materials.iron_ore},${plant.required_materials.coal},${plant.required_materials.limestone},${plant.current_stock.iron_ore},${plant.current_stock.coal},${plant.current_stock.limestone},${plant.rail_connectivity},${plant.urgency_level}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plants_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Plants report exported successfully', 'success');
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

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    if (toast) {
        toast.className = `message-toast ${type}`;
        toast.textContent = message;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
}

function getUrgencyLevel(plant) {
    // Calculate urgency based on stock days remaining
    const ironOreDays = plant.stock_days_remaining_iron_ore || 0;
    const coalDays = plant.stock_days_remaining_coal || 0;
    const limestoneDays = plant.stock_days_remaining_limestone || 0;
    
    const minDays = Math.min(ironOreDays, coalDays, limestoneDays);
    
    if (minDays <= 10) return 'High';
    if (minDays <= 30) return 'Medium';
    return 'Low';
}
