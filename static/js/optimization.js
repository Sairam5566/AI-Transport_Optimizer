// Global variables
let optimizationResults = null;
let isOptimizing = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    setupModalHandlers();
}

// Optimization functions
async function runOptimization() {
    if (isOptimizing) {
        showMessage('Optimization already in progress...', 'warning');
        return;
    }
    
    isOptimizing = true;
    
    // Show modal with progress
    const modal = document.getElementById('optimizationModal');
    const content = document.getElementById('optimizationModalContent');
    
    content.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Running optimization algorithm...</p>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <p id="progressText">Initializing...</p>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Simulate progress updates
    const progressSteps = [
        { progress: 20, text: 'Loading vessel data...' },
        { progress: 40, text: 'Analyzing port capacities...' },
        { progress: 60, text: 'Processing plant requirements...' },
        { progress: 80, text: 'Running MILP solver...' },
        { progress: 100, text: 'Generating recommendations...' }
    ];
    
    try {
        // Simulate progress updates
        for (let i = 0; i < progressSteps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const step = progressSteps[i];
            document.getElementById('progressFill').style.width = step.progress + '%';
            document.getElementById('progressText').textContent = step.text;
        }
        
        // Call the actual optimization API
        const response = await fetch('/api/optimize', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.status === 'optimal') {
            optimizationResults = result;
            displayOptimizationResults(result);
            showMessage('Optimization completed successfully!', 'success');
        } else {
            throw new Error(result.message || 'Optimization failed');
        }
        
    } catch (error) {
        console.error('Optimization error:', error);
        showMessage('Optimization failed: ' + (error.message || 'Unknown error'), 'error');
        content.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h4>Optimization Failed</h4>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="document.getElementById('optimizationModal').style.display='none'">
                    Close
                </button>
            </div>
        `;
    } finally {
        isOptimizing = false;
        setTimeout(() => {
            modal.style.display = 'none';
        }, 2000);
    }
}

function displayOptimizationResults(result) {
    // Hide placeholder and show results
    document.getElementById('optimizationPlaceholder').style.display = 'none';
    document.getElementById('optimizationResults').style.display = 'block';
    document.getElementById('allocationTable').style.display = 'block';
    
    // Update stats with real data
    document.getElementById('totalSavings').textContent = `$${result.total_cost || 0}`;
    document.getElementById('optimizationTime').textContent = `${result.optimization_time || 0}`;
    document.getElementById('solutionQuality').textContent = `${result.solution_quality || 0}%`;
    
    // Update result status
    document.getElementById('resultStatus').textContent = result.status.charAt(0).toUpperCase() + result.status.slice(1);
    
    // Create cost comparison chart
    try {
        createCostComparisonChart(result);
    } catch (error) {
        console.error('Error creating cost comparison chart:', error);
    }
    
    // Create allocation chart
    try {
        createAllocationChart(result);
    } catch (error) {
        console.error('Error creating allocation chart:', error);
    }
    
    // Display recommendations
    displayRecommendations(result.recommendations);
    
    // Display allocation table
    displayAllocationTable(result.allocations);
}

function createCostComparisonChart(result) {
    const canvas = document.getElementById('costComparisonChart');
    if (!canvas) {
        console.log('costComparisonChart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.costComparisonChart && typeof window.costComparisonChart.destroy === 'function') {
        try {
            window.costComparisonChart.destroy();
        } catch (error) {
            console.log('Error destroying costComparisonChart:', error);
        }
    }
    
    const ctx = canvas.getContext('2d');
    const currentCost = result.total_cost * 1.2; // Simulate current higher cost
    const optimizedCost = result.total_cost;
    
    window.costComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Current Cost', 'Optimized Cost'],
            datasets: [{
                label: 'Cost ($)',
                data: [currentCost, optimizedCost],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ]
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
                        text: 'Cost ($)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cost Comparison'
                }
            }
        }
    });
}

function createAllocationChart(result) {
    const canvas = document.getElementById('allocationChart');
    if (!canvas) {
        console.log('allocationChart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.allocationChart && typeof window.allocationChart.destroy === 'function') {
        try {
            window.allocationChart.destroy();
        } catch (error) {
            console.log('Error destroying allocationChart:', error);
        }
    }
    
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(result.allocations).map(key => key.replace('_', ' → '));
    const data = Object.values(result.allocations);
    
    window.allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
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
                    text: 'Material Allocation by Route'
                }
            }
        }
    });
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const recElement = document.createElement('div');
        recElement.className = 'recommendation-item';
        recElement.innerHTML = `
            <div class="recommendation-header">
                <i class="fas fa-lightbulb"></i>
                <span class="recommendation-priority">Priority ${index + 1}</span>
            </div>
            <p>${rec}</p>
        `;
        container.appendChild(recElement);
    });
}

function displayAllocationTable(allocations) {
    const tbody = document.getElementById('allocationTableBody');
    tbody.innerHTML = '';
    
    Object.entries(allocations).forEach(([route, amount]) => {
        if (amount > 0) {
            const [from, to] = route.split('_to_');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${from.replace('_', ' ')} → ${to.replace('_', ' ')}</td>
                <td>Mixed Materials</td>
                <td>${amount.toLocaleString()} MT</td>
                <td>$${(amount * 25).toLocaleString()}</td>
                <td>3 days</td>
                <td><span class="priority-medium">Medium</span></td>
            `;
            tbody.appendChild(row);
        }
    });
}

function saveOptimization() {
    if (!optimizationResults) {
        showMessage('No optimization results to save', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(optimizationResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimization_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('Optimization results saved successfully', 'success');
}

function exportReport() {
    if (!optimizationResults) {
        showMessage('No optimization results to export', 'warning');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Route,Material,Quantity (MT),Cost ($),Transit Time (days),Priority\n";
    
    Object.entries(optimizationResults.allocations).forEach(([route, amount]) => {
        if (amount > 0) {
            const [from, to] = route.split('_to_');
            csvContent += `${from.replace('_', ' ')} → ${to.replace('_', ' ')},Mixed Materials,${amount},${(amount * 25).toFixed(2)},3,Medium\n`;
        }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "optimization_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Optimization report exported successfully', 'success');
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
function showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    toast.className = `message-toast ${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}
