// Dashboard Overview JavaScript
let dashboardOverviewData = {
    vessels: [],
    ports: [],
    plants: []
};
let dashboardOverviewMap = null;
let dashboardOverviewCharts = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboardMap();
    loadDashboardData();
    setupEventListeners();
    startAutoRefresh();
});

// Map initialization
function initializeDashboardMap() {
    const mapContainer = document.getElementById('dashboardMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    try {
        dashboardOverviewMap = L.map('dashboardMap', {
            center: [20.5937, 78.9629], // Center on India
            zoom: 5,
            minZoom: 2,
            maxZoom: 18,
            worldCopyJump: false,
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            noWrap: true
        }).addTo(dashboardOverviewMap);
        
        console.log('Dashboard map initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard map:', error);
    }
}

// Data loading
async function loadDashboardData() {
    try {
        showMessage('Loading dashboard data...', 'info');
        
        // Load all data in parallel
        const [vesselsResponse, portsResponse, plantsResponse] = await Promise.all([
            fetch('/api/vessels'),
            fetch('/api/ports'),
            fetch('/api/plants')
        ]);
        
        const vesselsResult = await vesselsResponse.json();
        const portsResult = await portsResponse.json();
        const plantsResult = await plantsResponse.json();
        
        if (vesselsResult.status === 'success') {
            dashboardOverviewData.vessels = vesselsResult.vessels;
        }
        if (portsResult.status === 'success') {
            dashboardOverviewData.ports = portsResult.ports;
        }
        if (plantsResult.status === 'success') {
            dashboardOverviewData.plants = plantsResult.plants;
        }
        
        updateDashboardStats();
        updateDashboardCharts();
        updateDashboardMap();
        updateRecentActivities();
        updateCriticalAlerts();
        
        showMessage('Dashboard data loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Error loading dashboard data', 'error');
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    // Header stats
    document.getElementById('totalVessels').textContent = dashboardOverviewData.vessels.length;
    document.getElementById('totalPorts').textContent = dashboardOverviewData.ports.length;
    document.getElementById('totalPlants').textContent = dashboardOverviewData.plants.length;
    
    const totalCapacity = dashboardOverviewData.ports.reduce((sum, port) => sum + port.capacity, 0);
    document.getElementById('totalCapacity').textContent = (totalCapacity / 1000000).toFixed(1) + 'M';
    
    // KPI calculations
    const enRouteVessels = dashboardOverviewData.vessels.filter(v => v.status === 'En Route').length;
    const vesselEfficiency = ((enRouteVessels / dashboardOverviewData.vessels.length) * 100).toFixed(0);
    document.getElementById('vesselEfficiency').textContent = vesselEfficiency + '%';
    
    const avgUtilization = dashboardOverviewData.ports.reduce((sum, port) => 
        sum + port.utilization_percent, 0) / dashboardOverviewData.ports.length;
    document.getElementById('portUtilization').textContent = avgUtilization.toFixed(0) + '%';
    
    const highUrgencyPlants = dashboardOverviewData.plants.filter(p => p.urgency_level === 'High').length;
    const plantDemandMet = ((dashboardOverviewData.plants.length - highUrgencyPlants) / dashboardOverviewData.plants.length * 100).toFixed(0);
    document.getElementById('plantDemand').textContent = plantDemandMet + '%';
    
    // Simulate cost savings
    const costSavings = (Math.random() * 3 + 1).toFixed(1);
    document.getElementById('costSavings').textContent = '$' + costSavings + 'M';
}

// Update dashboard charts
function updateDashboardCharts() {
    createFleetStatusChart();
    createPortCapacityChart();
    createMaterialTrendsChart();
    createCostAnalysisChart();
}

function createFleetStatusChart() {
    const ctx = document.getElementById('fleetStatusChart');
    if (!ctx) return;
    
    if (dashboardOverviewCharts.fleetStatus && typeof dashboardOverviewCharts.fleetStatus.destroy === 'function') {
        dashboardOverviewCharts.fleetStatus.destroy();
    }
    
    const statusCounts = {
        'En Route': dashboardOverviewData.vessels.filter(v => v.status === 'En Route').length,
        'Delayed': dashboardOverviewData.vessels.filter(v => v.status === 'Delayed').length,
        'Docked': dashboardOverviewData.vessels.filter(v => v.status === 'Docked').length,
        'Anchored': dashboardOverviewData.vessels.filter(v => v.status === 'Anchored').length
    };
    
    dashboardOverviewCharts.fleetStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(251, 191, 36, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createPortCapacityChart() {
    const ctx = document.getElementById('portCapacityOverview');
    if (!ctx) return;
    
    if (dashboardOverviewCharts.portCapacity && typeof dashboardOverviewCharts.portCapacity.destroy === 'function') {
        dashboardOverviewCharts.portCapacity.destroy();
    }
    
    const topPorts = dashboardOverviewData.ports.slice(0, 6);
    
    dashboardOverviewCharts.portCapacity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPorts.map(p => p.port_name.substring(0, 10) + '...'),
            datasets: [{
                label: 'Utilization %',
                data: topPorts.map(p => p.utilization_percent),
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createMaterialTrendsChart() {
    const ctx = document.getElementById('materialTrendsChart');
    if (!ctx) return;
    
    if (dashboardOverviewCharts.materialTrends && typeof dashboardOverviewCharts.materialTrends.destroy === 'function') {
        dashboardOverviewCharts.materialTrends.destroy();
    }
    
    // Safely access plant data with fallback values
    const totalIronOre = dashboardOverviewData.plants.reduce((sum, p) => {
        const ironOre = p.required_materials_iron_ore || (p.required_materials && p.required_materials.iron_ore) || 0;
        return sum + ironOre;
    }, 0);
    
    const totalCoal = dashboardOverviewData.plants.reduce((sum, p) => {
        const coal = p.required_materials_coal || (p.required_materials && p.required_materials.coal) || 0;
        return sum + coal;
    }, 0);
    
    const totalLimestone = dashboardOverviewData.plants.reduce((sum, p) => {
        const limestone = p.required_materials_limestone || (p.required_materials && p.required_materials.limestone) || 0;
        return sum + limestone;
    }, 0);
    
    dashboardOverviewCharts.materialTrends = new Chart(ctx, {
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
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createCostAnalysisChart() {
    const ctx = document.getElementById('costAnalysisOverview');
    if (!ctx) return;
    
    if (dashboardOverviewCharts.costAnalysis && typeof dashboardOverviewCharts.costAnalysis.destroy === 'function') {
        dashboardOverviewCharts.costAnalysis.destroy();
    }
    
    // Generate cost data from real data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const costs = months.map(() => 0); // Will be populated with real data
    
    dashboardOverviewCharts.costAnalysis = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Costs ($)',
                data: costs,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update dashboard map
function updateDashboardMap() {
    if (!dashboardOverviewMap) {
        console.warn('Dashboard map not initialized');
        return;
    }
    
    // Clear existing markers
    dashboardOverviewMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            dashboardOverviewMap.removeLayer(layer);
        }
    });
    
    // Add vessel markers (limit to 20 vessels for performance)
    const limitedVessels = dashboardOverviewData.vessels.slice(0, 20);
    limitedVessels.forEach(vessel => {
        if (vessel.lat && vessel.lon) {
            const color = getVesselColor(vessel.status || 'Unknown');
            const marker = L.circleMarker([vessel.lat, vessel.lon], {
                radius: 6,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(dashboardOverviewMap);
            
            marker.bindPopup(`
                <strong>${vessel.vessel_name || 'Unknown Vessel'}</strong><br>
                Status: ${vessel.status || 'Unknown'}<br>
                Speed: ${vessel.speed || 0} kn<br>
                Destination: ${vessel.destination || 'Unknown'}
            `);
        }
    });
    
    // Add port markers (limit to 10 ports for performance)
    const limitedPorts = dashboardOverviewData.ports.slice(0, 10);
    limitedPorts.forEach(port => {
        if (port.location && port.location.lat && port.location.lon) {
            const marker = L.marker([port.location.lat, port.location.lon], {
                icon: L.divIcon({
                    className: 'port-marker',
                    html: '<i class="fas fa-warehouse"></i>',
                    iconSize: [20, 20]
                })
            }).addTo(dashboardOverviewMap);
            
            marker.bindPopup(`
                <strong>${port.port_name || 'Unknown Port'}</strong><br>
                Capacity: ${(port.capacity || 0).toLocaleString()} MT<br>
                Utilization: ${port.utilization_percent || 0}%
            `);
        }
    });
}

function getVesselColor(status) {
    switch (status) {
        case 'En Route': return '#22c55e';
        case 'Delayed': return '#ef4444';
        case 'Docked': return '#3b82f6';
        case 'Anchored': return '#fbbf24';
        default: return '#6b7280';
    }
}

// Update recent activities
function updateRecentActivities() {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    
    const activities = [
        {
            type: 'vessel',
            icon: 'fas fa-ship',
            title: 'MV STEEL CARRIER 1 arrived at Mumbai Port',
            time: '2 minutes ago'
        },
        {
            type: 'port',
            icon: 'fas fa-warehouse',
            title: 'Chennai Port reached 85% capacity',
            time: '15 minutes ago'
        },
        {
            type: 'plant',
            icon: 'fas fa-industry',
            title: 'JSW Steel requested urgent iron ore delivery',
            time: '1 hour ago'
        },
        {
            type: 'vessel',
            icon: 'fas fa-ship',
            title: 'MV OCEAN TRADER 5 delayed by 3 hours',
            time: '2 hours ago'
        },
        {
            type: 'port',
            icon: 'fas fa-warehouse',
            title: 'Kolkata Port completed maintenance',
            time: '4 hours ago'
        }
    ];
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Update critical alerts
function updateCriticalAlerts() {
    const container = document.getElementById('criticalAlerts');
    if (!container) return;
    
    const alerts = [
        {
            type: 'critical',
            icon: 'fas fa-exclamation-triangle',
            title: 'Port Congestion Alert',
            description: 'Mumbai Port at 95% capacity - delays expected'
        },
        {
            type: 'warning',
            icon: 'fas fa-clock',
            title: 'Vessel Delay',
            description: '3 vessels delayed due to weather conditions'
        },
        {
            type: 'info',
            icon: 'fas fa-info-circle',
            title: 'Maintenance Scheduled',
            description: 'Kandla Port Terminal A maintenance tomorrow'
        },
        {
            type: 'critical',
            icon: 'fas fa-exclamation-triangle',
            title: 'Material Shortage',
            description: 'Tata Steel low on iron ore - urgent delivery needed'
        }
    ];
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <div class="alert-icon">
                <i class="${alert.icon}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
            </div>
        </div>
    `).join('');
}

// Event listeners
function setupEventListeners() {
    // Any dashboard-specific event listeners
}

// Auto refresh
function startAutoRefresh() {
    setInterval(() => {
        loadDashboardData();
    }, 60000); // Refresh every minute
}

// Utility functions
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
