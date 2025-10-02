# AI-Enabled Logistics Optimizer for Steel Supply Chain

A comprehensive web-based multi-portal system designed to optimize steel raw material logistics with real-time vessel tracking, AI delay prediction, and cost optimization.

## Features

### 🚢 Vessels Portal
- Real-time vessel tracking with interactive maps
- AIS data integration for live positioning
- AI-powered delay prediction
- Vessel filtering and search capabilities
- Status monitoring and alerts

### 🏭 Ports Portal
- Port capacity and stock level monitoring
- Cost analysis and optimization
- Congestion level tracking
- Dispatch planning and scheduling
- Interactive charts and dashboards

### 🏗️ Plants Portal
- Steel plant raw material requirements tracking
- Demand vs supply analysis
- Urgency-based prioritization
- Rail connectivity status
- Material quality requirements

### 🚆 Trains & Supplier Exports
- Train freight list with rake capacity (wagons × capacity)
- Supplier metadata (ID, name) with filtering
- Export-ready CSVs for suppliers and all trains
- Route distance, schedules, and per-ton cost

### 🚛 AI Truck Optimizer & Scheduler
- Cost and fuel weighted optimizer (MILP via PuLP)
- Port-to-plant truck schedule generator with ETA, fuel, cost
- CSV exports for schedules and optimizer allocations

### 🔐 Authentication System
- Single login for all portals
- Role-based access control (Admin/Planner/Viewer)
- Secure JWT-based authentication
- Session management

### 🤖 AI & Optimization
- MILP-based cost optimization
- Delay prediction algorithms
- Route optimization recommendations
- Real-time decision support

## Tech Stack

- **Backend**: Python + FastAPI
- **Frontend**: HTML5, CSS3, JavaScript
- **Maps**: Leaflet.js for interactive vessel tracking
- **Charts**: Chart.js for data visualization
- **Authentication**: JWT tokens with secure sessions
- **Optimization**: PuLP for MILP solving
- **Data Integration**: AISStream API for vessel data

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### 1. Clone or Download the Project
```bash
cd AI-Optimizer3
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
The `.env` file is already configured with:
- AISStream API key for vessel tracking
- Security settings for JWT authentication
- Application configuration

### 4. Prepare Data Files
Create CSV files in the `data/` directory:
- `ports_data.csv` - Port information and capacity data
- `plants_data.csv` - Steel plant requirements and specifications  
- `trains_data.csv` - Train freight and supplier information

**Note**: Sample data has been removed. You need to provide your own data files.

### 5. Run the Application
```bash
python start_server.py
```

The application will start on `http://127.0.0.1:8000`

## Usage

### Login Credentials
The system comes with pre-configured demo accounts:

- **Admin**: `admin` / `admin123` (Full access)
- **Planner**: `planner` / `planner123` (Full access)
- **Viewer**: `viewer` / `viewer123` (Read-only access)

### Navigation
1. **Login** using any of the demo credentials
2. **Dashboard** provides access to all three portals
3. **Switch between portals** using the navigation menu
4. **Use filters and search** in the sidebar for data exploration
5. **Interactive features** include maps, charts, and optimization tools

## API Endpoints

### Authentication
- `POST /login` - User authentication
- `POST /logout` - Session termination
- `GET /dashboard` - Main dashboard (requires authentication)

### Data APIs
- `GET /api/vessels` - Real-time vessel data from AISStream
- `GET /api/ports` - Port capacities and stock levels
- `GET /api/plants` - Steel plant requirements and status
- `GET /api/predict-delay` - AI-based delay prediction
- `GET /api/optimize` - MILP cost optimization
 - `GET /api/trains` - Train freight, rake capacity, suppliers (CSV-backed)
 - `GET /api/optimizer/truck` - AI cost & fuel optimizer for trucks (MILP)
 - `GET /api/scheduler/truck` - AI truck scheduler (heuristic)

## Key Features Explained

### Real-time Vessel Tracking
- Integrates with AISStream API for live vessel positions
- Updates every 30 seconds without page refresh
- Interactive map with vessel type indicators
- Detailed vessel information popups

### AI Delay Prediction
- Machine learning algorithms analyze multiple factors
- Weather conditions, port congestion, traffic density
- Confidence scores and contributing factor analysis
- Proactive alert system for potential delays

### Cost Optimization Engine
- Mixed Integer Linear Programming (MILP) solver
- Minimizes total logistics costs
- Considers port handling costs, storage fees, transportation
- Provides optimal allocation recommendations

### Interactive Dashboards
- Real-time statistics and KPIs
- Sortable and filterable data tables
- Interactive charts and visualizations
- Export functionality for reports

## Data Sources

### Vessels
- **AISStream API**: Real-time AIS data for vessel positions
- **Mock Data**: Realistic sample data for demonstration

### Ports & Plants
- **Sample Data**: 50+ realistic records for ports and plants
- **CSV/JSON Support**: Easy data import capabilities
- **API Ready**: Designed for future integration with real data sources

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Different permission levels
- **Environment Variables**: Secure API key storage
- **Session Management**: Automatic logout and token expiration

## Future Enhancements

- **Machine Learning**: Advanced prediction models with historical data
- **Real Database**: PostgreSQL/MongoDB integration
- **Mobile App**: React Native companion app
- **Advanced Analytics**: Predictive analytics and trend analysis
- **IoT Integration**: Sensor data from ports and vessels
- **Blockchain**: Supply chain transparency and traceability

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in .env file or kill existing process
   netstat -ano | findstr :8000
   taskkill /PID <process_id> /F
   ```

2. **Module Not Found**
   ```bash
   # Ensure all dependencies are installed
   pip install -r requirements.txt
   ```

3. **API Key Issues**
   - Verify AISStream API key in `.env` file
   - Check API key validity and rate limits

## Development

### Project Structure
```
AI-Optimizer3/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── .env                   # Environment variables
├── README.md              # This file
├── templates/             # HTML templates
│   ├── login.html
│   └── dashboard.html
└── static/               # Static assets
    ├── css/
    │   └── style.css
    └── js/
        └── dashboard.js
```

### Adding New Features
1. **Backend**: Add new endpoints in `main.py`
2. **Frontend**: Update templates and JavaScript
3. **Styling**: Modify CSS for new components
4. **Data**: Extend mock data or add new data sources

## License

This project is developed for educational and demonstration purposes. Please ensure compliance with AISStream API terms of service when using real vessel data.

## Support

For issues, questions, or feature requests, please refer to the project documentation or contact the development team.

---

**AI-Enabled Logistics Optimizer** - Revolutionizing Steel Supply Chain Management with AI and Real-time Data
