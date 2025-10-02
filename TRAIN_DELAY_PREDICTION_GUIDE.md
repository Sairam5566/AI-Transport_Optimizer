# Train Delay Prediction Models - Complete Implementation Guide

## 🎯 **Overview**

This guide provides a complete implementation of train delay prediction using machine learning models for your AI-Transport Optimizer system. The solution includes data collection, model training, and integration with your existing application.

## 📊 **Data Sources & Collection**

### **1. Free/Open Data Sources**

#### **Indian Railways Official Data**
- **Portal**: https://data.gov.in/catalog/indian-railways
- **Data**: Train schedules, station information, route details
- **Format**: CSV, JSON
- **Update Frequency**: Monthly/Quarterly

#### **NTES (National Train Enquiry System)**
- **URL**: https://enquiry.indianrail.gov.in/ntes/
- **Data**: Real-time train running status
- **Access**: Web scraping (respect robots.txt)
- **Update Frequency**: Real-time

#### **Weather Data**
- **OpenWeatherMap**: https://openweathermap.org/api
  - Free tier: 1000 calls/day
  - Historical weather data
  - Current conditions and forecasts

- **IMD (India Meteorological Department)**: https://mausam.imd.gov.in/
  - Official weather data for India
  - Historical and real-time data

### **2. Commercial APIs**

#### **RailwayAPI.com**
- **Cost**: ₹500-2000/month
- **Features**: Real-time train status, delay information
- **Coverage**: All Indian trains
- **Rate Limits**: 1000-10000 calls/day

#### **Trainman API**
- **Cost**: Custom pricing
- **Features**: Train tracking, delay predictions
- **Integration**: REST API

#### **ConfirmTkt API**
- **Cost**: Subscription-based
- **Features**: Train delay predictions, PNR status
- **Accuracy**: High for popular routes

### **3. Alternative Data Sources**

#### **Web Scraping Targets**
```python
# Example targets (always check robots.txt first)
sources = [
    "https://enquiry.indianrail.gov.in/ntes/",  # NTES
    "https://www.trainman.in/",                 # Trainman
    "https://www.confirmtkt.com/",              # ConfirmTkt
    "https://www.railyatri.in/"                # RailYatri
]
```

#### **Social Media & News**
- Twitter APIs for real-time disruption information
- News APIs for major incidents affecting railways
- Railway official social media accounts

## 🚀 **Quick Start Implementation**

### **Step 1: Setup**
```bash
# Run the setup script
python setup_ml_models.py

# This will:
# - Create necessary directories
# - Install ML dependencies
# - Create configuration files
# - Set up training scripts
```

### **Step 2: Train Your First Model**
```bash
cd ml_models
python quick_train.py
```

### **Step 3: Test the API**
```bash
# Start your application
python start_server.py

# Test the prediction endpoint
curl "http://localhost:8000/api/predict-train-delay?route=Mumbai-JSW&distance_km=800&scheduled_duration_hours=18&departure_time=2024-01-15T14:00:00&cargo_weight_tonnes=2500&num_wagons=42"
```

## 📈 **Model Training Process**

### **1. Data Collection**

#### **Using the Data Collector**
```python
from ml_models.data_collector import TrainDataCollector

# Initialize collector
collector = TrainDataCollector()

# Define trains to track
train_numbers = ["12951", "12301", "12009", "16031", "18047"]

# Collect historical data
train_data = collector.collect_indian_railways_data(train_numbers, days_back=90)
weather_data = collector.collect_weather_data(station_coords, days_back=90)

# Save to database
collector.save_to_database(train_data, weather_data)

# Export for training
training_df = collector.export_training_data('training_data.csv')
```

#### **Manual Data Collection**
If APIs are not available, you can create training data manually:

```csv
# training_data.csv format
train_number,route,distance_km,scheduled_duration_hours,departure_hour,day_of_week,month,temperature_c,rainfall_mm,wind_speed_kmh,visibility_km,cargo_weight_tonnes,num_wagons,track_condition,signal_failures,maintenance_work,origin_congestion,destination_congestion,actual_delay_hours
12951,Mumbai-Delhi,1384,16,14,2,10,28,0,12,10,0,0,Good,0,0,0.3,0.2,0.5
12301,Howrah-Delhi,1441,17,22,5,11,22,5,18,8,0,0,Fair,1,0,0.5,0.4,1.2
```

### **2. Model Training**

#### **Using the Training Script**
```python
from ml_models.train_delay_predictor import TrainDelayPredictor

# Initialize predictor
predictor = TrainDelayPredictor()

# Load your data
df = predictor.load_and_prepare_data('path/to/your/training_data.csv')

# Or use synthetic data for testing
df = predictor.load_and_prepare_data()  # Uses synthetic data

# Train models
X, y, feature_names = predictor.select_features(df)
model_results, X_test, y_test = predictor.train_model(X, y)

# Save the best model
predictor.save_model('models/train_delay_model.pkl')
```

#### **Model Performance Metrics**
The training script will output:
- **Mean Absolute Error (MAE)**: Average prediction error in hours
- **Root Mean Square Error (RMSE)**: Penalizes larger errors more
- **R² Score**: Proportion of variance explained by the model
- **Feature Importance**: Which factors most affect delays

### **3. Model Evaluation**

#### **Cross-Validation**
```python
from sklearn.model_selection import cross_val_score

# Evaluate model performance
cv_scores = cross_val_score(predictor.model, X, y, cv=5, scoring='neg_mean_absolute_error')
print(f"Cross-validation MAE: {-cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
```

#### **Feature Analysis**
```python
# Analyze feature importance
if predictor.feature_importance is not None:
    print("Top 10 Most Important Features:")
    print(predictor.feature_importance.head(10))
```

## 🔧 **API Integration**

### **Endpoint Usage**
```python
import requests

# Predict delay for a specific train
response = requests.get('http://localhost:8000/api/predict-train-delay', params={
    'route': 'Mumbai-JSW',
    'distance_km': 800,
    'scheduled_duration_hours': 18,
    'departure_time': '2024-01-15T14:00:00',
    'cargo_weight_tonnes': 2500,
    'num_wagons': 42,
    'origin_lat': 19.0760,
    'origin_lon': 72.8777
})

result = response.json()
```

### **Response Format**
```json
{
    "status": "success",
    "predicted_delay_hours": 1.25,
    "predicted_delay_minutes": 75,
    "confidence": 0.82,
    "delay_probability": 0.42,
    "contributing_factors": [
        "Heavy rainfall (8.5mm)",
        "Peak hour departure",
        "High origin station congestion"
    ],
    "weather_conditions": {
        "temperature": 28.5,
        "rainfall": 8.5,
        "wind_speed": 15.2,
        "visibility": 6.8
    },
    "operational_factors": {
        "signal_failures": 1,
        "maintenance_work": 0,
        "origin_congestion": 0.7,
        "destination_congestion": 0.3,
        "track_condition": "Fair"
    },
    "prediction_timestamp": "2024-01-15T12:30:00"
}
```

## 📊 **Data Requirements**

### **Minimum Data for Training**
- **Historical Records**: At least 1000 train journeys
- **Time Period**: 3-6 months of data
- **Routes**: Multiple routes for generalization
- **Weather Data**: Corresponding weather conditions
- **Operational Data**: Track conditions, signal failures, etc.

### **Optimal Data for Production**
- **Historical Records**: 10,000+ train journeys
- **Time Period**: 1-2 years of data
- **Seasonal Variation**: All seasons represented
- **Route Coverage**: All major freight corridors
- **Real-time Integration**: Live operational data feeds

## 🎯 **Model Improvement Strategies**

### **1. Feature Engineering**
```python
# Add more sophisticated features
def create_advanced_features(df):
    # Time-based features
    df['hour_sin'] = np.sin(2 * np.pi * df['departure_hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['departure_hour'] / 24)
    
    # Seasonal features
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Rolling averages
    df['route_delay_7d'] = df.groupby('route')['actual_delay_hours'].rolling(7).mean()
    df['route_delay_30d'] = df.groupby('route')['actual_delay_hours'].rolling(30).mean()
    
    return df
```

### **2. Advanced Models**
```python
# Try ensemble methods
from sklearn.ensemble import VotingRegressor
from xgboost import XGBRegressor

# Create ensemble
ensemble = VotingRegressor([
    ('rf', RandomForestRegressor(n_estimators=100)),
    ('gb', GradientBoostingRegressor(n_estimators=100)),
    ('xgb', XGBRegressor(n_estimators=100))
])

ensemble.fit(X_train, y_train)
```

### **3. Deep Learning Approach**
```python
# For large datasets, consider neural networks
import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu', input_shape=(X.shape[1],)),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.fit(X_train, y_train, epochs=100, validation_split=0.2)
```

## 🔄 **Continuous Improvement**

### **1. Model Retraining**
```python
# Set up automated retraining
def retrain_model(new_data_path):
    predictor = TrainDelayPredictor()
    predictor.load_model('models/train_delay_model.pkl')
    
    # Load new data
    new_df = pd.read_csv(new_data_path)
    
    # Combine with existing data
    # Retrain model
    # Evaluate performance
    # Deploy if improved
```

### **2. A/B Testing**
```python
# Test different models in production
def predict_with_ab_testing(features, model_version='A'):
    if model_version == 'A':
        return model_a.predict(features)
    else:
        return model_b.predict(features)
```

### **3. Feedback Loop**
```python
# Collect actual vs predicted for model improvement
def log_prediction_accuracy(predicted, actual, features):
    accuracy_log = {
        'predicted': predicted,
        'actual': actual,
        'error': abs(predicted - actual),
        'features': features,
        'timestamp': datetime.now()
    }
    # Store in database for analysis
```

## 📋 **Production Checklist**

### **Before Deployment**
- [ ] Collect sufficient training data (>1000 records)
- [ ] Train and validate model (MAE < 1.0 hour)
- [ ] Set up API keys for weather data
- [ ] Test API endpoints thoroughly
- [ ] Implement error handling and logging
- [ ] Set up monitoring and alerting

### **After Deployment**
- [ ] Monitor prediction accuracy
- [ ] Set up automated retraining
- [ ] Implement feedback collection
- [ ] Scale infrastructure as needed
- [ ] Regular model performance reviews

## 🚨 **Common Issues & Solutions**

### **Issue 1: Poor Model Performance**
**Symptoms**: High MAE (>2 hours), Low R² (<0.5)
**Solutions**:
- Collect more diverse training data
- Add more relevant features
- Try different algorithms
- Check for data quality issues

### **Issue 2: API Rate Limits**
**Symptoms**: HTTP 429 errors, missing data
**Solutions**:
- Implement exponential backoff
- Use multiple API keys
- Cache frequently requested data
- Consider paid API tiers

### **Issue 3: Real-time Performance**
**Symptoms**: Slow prediction response (>5 seconds)
**Solutions**:
- Optimize model complexity
- Use model caching
- Implement async processing
- Consider model quantization

## 📞 **Support & Resources**

### **Documentation**
- [Scikit-learn Documentation](https://scikit-learn.org/stable/)
- [Indian Railways Data Portal](https://data.gov.in/catalog/indian-railways)
- [OpenWeatherMap API](https://openweathermap.org/api)

### **Community**
- Stack Overflow: `[machine-learning]` `[indian-railways]`
- Reddit: r/MachineLearning, r/india
- GitHub: Search for "train delay prediction" repositories

### **Commercial Support**
- Railway API providers
- ML consulting services
- Cloud ML platforms (AWS, GCP, Azure)

---

**Next Steps**: Run `python setup_ml_models.py` to get started with your train delay prediction implementation!
