// Global variables
let portsData = [];
let filteredPorts = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadPortsData();
    setupEventListeners();
});

// Data loading
async function loadPortsData() {
    try {
        showMessage('Loading ports data...', 'info');
        const response = await fetch('/api/ports');
        const data = await response.json();
        
        if (data.status === 'success') {
            portsData = data.ports;
            filteredPorts = [...portsData];
            updatePortsDisplay();
            updatePortsCharts();
            updatePortsStats();
            showMessage('Ports data loaded successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to load ports data');
        }
    } catch (error) {
        console.error('Error loading ports data:', error);
        showMessage('Error loading ports data', 'error');
    }
}

// Display functions
function updatePortsDisplay() {
    const tbody = document.getElementById('portsTableBody');
    tbody.innerHTML = '';
    
    // Show only first 8 rows, with scroll for more
    filteredPorts.slice(0, 8).forEach((port, index) => {
        const row = document.createElement('tr');
        const portId = port.port_id || `PORT-${index + 1}`;
        const congestionLevel = getCongestionLevel(port.utilization_percent || 0);
        
        row.innerHTML = `
            <td>${portId}</td>
            <td>${port.port_name || 'Unknown Port'}</td>
            <td>${(port.capacity || 0).toLocaleString()} MT</td>
            <td>${(port.current_stock || 0).toLocaleString()} MT</td>
            <td>${(port.available_capacity || 0).toLocaleString()} MT</td>
            <td>$${port.handling_cost || 0}/MT</td>
            <td><span class="congestion-${congestionLevel.toLowerCase()}">${congestionLevel}</span></td>
            <td>${port.expected_vessels || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-sm btn-info" onclick="showPortDetails('${portId}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="updatePortStock('${portId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add scroll indicator if more than 8 rows
    if (filteredPorts.length > 8) {
        const scrollIndicator = document.createElement('tr');
        scrollIndicator.innerHTML = `
            <td colspan="9" class="scroll-indicator">
                <i class="fas fa-chevron-down"></i>
                Showing 8 of ${filteredPorts.length} ports. Scroll to view more.
            </td>
        `;
        tbody.appendChild(scrollIndicator);
    }
}

function updatePortsStats() {
    document.getElementById('totalPorts').textContent = filteredPorts.length;
    
    const avgCapacity = filteredPorts.reduce((sum, port) => 
        sum + port.utilization_percent, 0) / filteredPorts.length;
    document.getElementById('avgCapacity').textContent = `${avgCapacity.toFixed(1)}%`;
    
    const totalCost = filteredPorts.reduce((sum, port) => 
        sum + (port.handling_cost * port.current_stock), 0);
    document.getElementById('totalCost').textContent = `$${totalCost.toLocaleString()}`;
}

function updatePortsCharts() {
    // Port Capacity Chart - show top 10 ports
    const topPorts = filteredPorts.slice(0, 10);
    const capacityCtx = document.getElementById('portCapacityChart');
    if (!capacityCtx) return;
    
    // Destroy existing chart if it exists
    if (window.portCapacityChart && typeof window.portCapacityChart.destroy === 'function') {
        window.portCapacityChart.destroy();
    }
    
    window.portCapacityChart = new Chart(capacityCtx, {
        type: 'bar',
        data: {
            labels: topPorts.map(p => (p.port_name || 'Unknown').substring(0, 15) + '...'),
            datasets: [{
                label: 'Current Stock',
                data: topPorts.map(p => p.current_stock || 0),
                backgroundColor: 'rgba(102, 126, 234, 0.6)'
            }, {
                label: 'Available Capacity',
                data: topPorts.map(p => p.available_capacity || 0),
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
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Port Capacity Analysis (Top 10)'
                }
            }
        }
    });
    
    // Cost Analysis Chart - by congestion level
    const costCtx = document.getElementById('costAnalysisChart');
    if (!costCtx) return;
    
    // Destroy existing chart if it exists
    if (window.costAnalysisChart && typeof window.costAnalysisChart.destroy === 'function') {
        window.costAnalysisChart.destroy();
    }
    
    const congestionData = {
        'Low': filteredPorts.filter(p => getCongestionLevel(p.utilization_percent || 0) === 'Low').reduce((sum, p) => sum + (p.handling_cost || 0), 0),
        'Medium': filteredPorts.filter(p => getCongestionLevel(p.utilization_percent || 0) === 'Medium').reduce((sum, p) => sum + (p.handling_cost || 0), 0),
        'High': filteredPorts.filter(p => getCongestionLevel(p.utilization_percent || 0) === 'High').reduce((sum, p) => sum + (p.handling_cost || 0), 0)
    };
    
    window.costAnalysisChart = new Chart(costCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(congestionData),
            datasets: [{
                data: Object.values(congestionData),
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Handling Costs by Congestion Level'
                }
            }
        }
    });
}

// Search and filter functions
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const congestionFilter = document.getElementById('congestionFilter').value;
    const capacityFilter = document.getElementById('capacityFilter').value;
    
    filteredPorts = portsData.filter(port => {
        const portName = (port.port_name || '').toLowerCase();
        const portId = (port.port_id || '').toString().toLowerCase();
        const state = (port.state || '').toLowerCase();
        
        const matchesSearch = !searchTerm || 
            portName.includes(searchTerm) ||
            portId.includes(searchTerm) ||
            state.includes(searchTerm);
        
        const portCongestionLevel = getCongestionLevel(port.utilization_percent || 0);
        const matchesCongestion = !congestionFilter || portCongestionLevel === congestionFilter;
        
        let matchesCapacity = true;
        if (capacityFilter) {
            const utilization = port.utilization_percent || 0;
            switch (capacityFilter) {
                case '0-25':
                    matchesCapacity = utilization >= 0 && utilization <= 25;
                    break;
                case '25-50':
                    matchesCapacity = utilization > 25 && utilization <= 50;
                    break;
                case '50-75':
                    matchesCapacity = utilization > 50 && utilization <= 75;
                    break;
                case '75-100':
                    matchesCapacity = utilization > 75 && utilization <= 100;
                    break;
            }
        }
        
        return matchesSearch && matchesCongestion && matchesCapacity;
    });
    
    updatePortsDisplay();
    updatePortsCharts();
    updatePortsStats();
}

function filterPorts() {
    performSearch(); // Reuse search logic
}

// Event listeners
function setupEventListeners() {
    setupModalHandlers();
}

// Action functions
function showPortDetails(portId) {
    const port = portsData.find(p => (p.port_id || `PORT-${portsData.indexOf(p) + 1}`) === portId);
    if (!port) return;
    
    const modal = document.getElementById('portModal');
    const content = document.getElementById('portModalContent');
    
    const location = port.location || {};
    const congestionLevel = getCongestionLevel(port.utilization_percent || 0);
    
    content.innerHTML = `
        <div class="port-details">
            <h4>${port.port_name || 'Unknown Port'}</h4>
            <div class="detail-grid">
                <div><strong>Port ID:</strong> ${portId}</div>
                <div><strong>Location:</strong> ${location.lat || 'N/A'}, ${location.lon || 'N/A'}</div>
                <div><strong>Total Capacity:</strong> ${(port.capacity || 0).toLocaleString()} MT</div>
                <div><strong>Current Stock:</strong> ${(port.current_stock || 0).toLocaleString()} MT</div>
                <div><strong>Available Capacity:</strong> ${(port.available_capacity || 0).toLocaleString()} MT</div>
                <div><strong>Utilization:</strong> ${port.utilization_percent || 0}%</div>
                <div><strong>Handling Cost:</strong> $${port.handling_cost || 0}/MT</div>
                <div><strong>Storage Cost:</strong> $${port.storage_cost || 0}/MT</div>
                <div><strong>Congestion Level:</strong> ${congestionLevel}</div>
                <div><strong>Expected Vessels:</strong> ${port.expected_vessels || 0}</div>
                <div><strong>Berth Count:</strong> ${port.berth_count || 'N/A'}</div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function updatePortStock(portId) {
    showMessage(`Stock update feature for port ${portId} - Coming soon!`, 'info');
}

function refreshData() {
    showMessage('Refreshing ports data...', 'info');
    loadPortsData();
}

function exportReport() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Port ID,Port Name,State,Capacity,Current Stock,Available Capacity,Utilization %,Handling Cost,Congestion Level,Expected Vessels\n";
    
    filteredPorts.forEach(port => {
        csvContent += `${port.port_id},${port.port_name},${port.state},${port.capacity},${port.current_stock},${port.available_capacity},${port.utilization_percent},${port.handling_cost},${port.congestion_level},${port.expected_vessels}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ports_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Ports report exported successfully', 'success');
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

function getCongestionLevel(utilizationPercent) {
    if (utilizationPercent >= 80) return 'High';
    if (utilizationPercent >= 50) return 'Medium';
    return 'Low';
}
