"""
Delay Prediction Service
Integrates trained ML models with the main application
"""

import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import json
import os
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DelayPredictionService:
    def __init__(self, model_path='models/train_delay_model.pkl'):
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.label_encoders = {}
        self.feature_importance = None
        self.load_model()
        
    def load_model(self):
        """Load the trained model and preprocessing objects"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.label_encoders = model_data['label_encoders']
                self.feature_importance = model_data.get('feature_importance')
                logger.info(f"Model loaded successfully from {self.model_path}")
            else:
                logger.warning(f"Model file not found at {self.model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
    
    def get_current_weather(self, lat: float, lon: float) -> Dict:
        """Get current weather data for a location"""
        api_key = os.getenv('OPENWEATHER_API_KEY', 'YOUR_API_KEY')
        
        if api_key == 'YOUR_API_KEY':
            # Return mock weather data if no API key
            return {
                'temperature': 25.0,
                'rainfall': 0.0,
                'wind_speed': 10.0,
                'visibility': 10.0,
                'humidity': 65.0
            }
        
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'temperature': data['main']['temp'],
                    'rainfall': data.get('rain', {}).get('1h', 0),
                    'wind_speed': data['wind']['speed'] * 3.6,  # Convert m/s to km/h
                    'visibility': data.get('visibility', 10000) / 1000,  # Convert to km
                    'humidity': data['main']['humidity']
                }
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
        
        # Return default values if API call fails
        return {
            'temperature': 25.0,
            'rainfall': 0.0,
            'wind_speed': 10.0,
            'visibility': 10.0,
            'humidity': 65.0
        }
    
    def get_operational_factors(self, route: str, current_time: datetime) -> Dict:
        """Get operational factors affecting train delays"""
        # This would typically connect to railway operations systems
        # For now, we'll simulate based on time and route
        
        hour = current_time.hour
        day_of_week = current_time.weekday()
        
        # Simulate signal failures based on time (more likely during peak hours)
        signal_failures = 0
        if hour in [7, 8, 9, 17, 18, 19]:  # Peak hours
            signal_failures = np.random.poisson(0.8)
        else:
            signal_failures = np.random.poisson(0.2)
        
        # Simulate maintenance work (more likely on weekends)
        maintenance_work = 1 if day_of_week in [5, 6] and np.random.random() < 0.3 else 0
        
        # Simulate congestion based on route and time
        congestion_factors = {
            'Mumbai-JSW': 0.7,
            'Chennai-Tata': 0.5,
            'Kolkata-ArcelorMittal': 0.6,
            'Vizag-JSW': 0.4
        }
        
        base_congestion = congestion_factors.get(route, 0.5)
        if hour in [7, 8, 9, 17, 18, 19]:
            base_congestion *= 1.5
        
        origin_congestion = min(1.0, base_congestion + np.random.uniform(-0.2, 0.2))
        destination_congestion = min(1.0, base_congestion * 0.8 + np.random.uniform(-0.2, 0.2))
        
        # Track condition (would normally come from maintenance systems)
        track_conditions = ['Good', 'Fair', 'Poor']
        track_weights = [0.7, 0.25, 0.05]
        track_condition = np.random.choice(track_conditions, p=track_weights)
        
        return {
            'signal_failures': signal_failures,
            'maintenance_work': maintenance_work,
            'origin_congestion': origin_congestion,
            'destination_congestion': destination_congestion,
            'track_condition': track_condition
        }
    
    def get_route_history(self, route: str) -> float:
        """Get historical average delay for a route"""
        # This would typically query historical data
        # For now, simulate based on route characteristics
        
        route_delays = {
            'Mumbai-JSW': 1.5,
            'Chennai-Tata': 1.2,
            'Kolkata-ArcelorMittal': 1.8,
            'Vizag-JSW': 1.0,
            'Paradip-Tata': 1.3,
            'Kandla-SAIL': 1.6
        }
        
        return route_delays.get(route, 1.2)
    
    def predict_train_delay(self, train_data: Dict) -> Dict:
        """
        Predict delay for a specific train
        
        Args:
            train_data: Dictionary containing train information
                - route: str
                - distance_km: float
                - scheduled_duration_hours: float
                - departure_time: datetime or str
                - cargo_weight_tonnes: float
                - num_wagons: int
                - origin_lat: float (optional)
                - origin_lon: float (optional)
        
        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            return {
                'status': 'error',
                'message': 'Model not loaded',
                'predicted_delay_hours': 0,
                'confidence': 0,
                'factors': []
            }
        
        try:
            # Parse departure time
            if isinstance(train_data['departure_time'], str):
                departure_time = datetime.fromisoformat(train_data['departure_time'].replace('Z', ''))
            else:
                departure_time = train_data['departure_time']
            
            # Get weather data
            weather = self.get_current_weather(
                train_data.get('origin_lat', 19.0760),
                train_data.get('origin_lon', 72.8777)
            )
            
            # Get operational factors
            operational = self.get_operational_factors(train_data['route'], departure_time)
            
            # Get route history
            route_avg_delay = self.get_route_history(train_data['route'])
            
            # Prepare features for prediction
            features = {
                'route': train_data['route'],
                'distance_km': train_data['distance_km'],
                'scheduled_duration_hours': train_data['scheduled_duration_hours'],
                'departure_hour': departure_time.hour,
                'day_of_week': departure_time.weekday(),
                'month': departure_time.month,
                'temperature_c': weather['temperature'],
                'rainfall_mm': weather['rainfall'],
                'wind_speed_kmh': weather['wind_speed'],
                'visibility_km': weather['visibility'],
                'cargo_weight_tonnes': train_data['cargo_weight_tonnes'],
                'num_wagons': train_data['num_wagons'],
                'track_condition': operational['track_condition'],
                'signal_failures': operational['signal_failures'],
                'maintenance_work': operational['maintenance_work'],
                'origin_congestion': operational['origin_congestion'],
                'destination_congestion': operational['destination_congestion'],
                'route_avg_delay_hours': route_avg_delay
            }
            
            # Make prediction using the trained model
            from train_delay_predictor import TrainDelayPredictor
            predictor = TrainDelayPredictor()
            predictor.model = self.model
            predictor.scaler = self.scaler
            predictor.label_encoders = self.label_encoders
            
            predicted_delay = predictor.predict_delay(features)
            
            # Calculate confidence based on feature stability
            confidence = self.calculate_prediction_confidence(features)
            
            # Identify contributing factors
            contributing_factors = self.identify_contributing_factors(features, predicted_delay)
            
            return {
                'status': 'success',
                'predicted_delay_hours': round(predicted_delay, 2),
                'predicted_delay_minutes': round(predicted_delay * 60, 0),
                'confidence': round(confidence, 2),
                'delay_probability': min(1.0, predicted_delay / 3.0),  # Normalize to probability
                'contributing_factors': contributing_factors,
                'weather_conditions': weather,
                'operational_factors': operational,
                'prediction_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in delay prediction: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'predicted_delay_hours': 0,
                'confidence': 0,
                'factors': []
            }
    
    def calculate_prediction_confidence(self, features: Dict) -> float:
        """Calculate confidence score for the prediction"""
        confidence = 0.8  # Base confidence
        
        # Reduce confidence for extreme weather
        if features['rainfall_mm'] > 10:
            confidence -= 0.2
        if features['wind_speed_kmh'] > 25:
            confidence -= 0.1
        if features['visibility_km'] < 3:
            confidence -= 0.2
        
        # Reduce confidence for operational issues
        if features['signal_failures'] > 2:
            confidence -= 0.1
        if features['maintenance_work'] == 1:
            confidence -= 0.15
        if features['origin_congestion'] > 0.7:
            confidence -= 0.1
        
        return max(0.1, confidence)
    
    def identify_contributing_factors(self, features: Dict, predicted_delay: float) -> List[str]:
        """Identify main factors contributing to the predicted delay"""
        factors = []
        
        # Weather factors
        if features['rainfall_mm'] > 5:
            factors.append(f"Heavy rainfall ({features['rainfall_mm']:.1f}mm)")
        if features['wind_speed_kmh'] > 20:
            factors.append(f"Strong winds ({features['wind_speed_kmh']:.1f} km/h)")
        if features['visibility_km'] < 5:
            factors.append(f"Poor visibility ({features['visibility_km']:.1f}km)")
        if features['temperature_c'] > 40 or features['temperature_c'] < 5:
            factors.append(f"Extreme temperature ({features['temperature_c']:.1f}°C)")
        
        # Operational factors
        if features['signal_failures'] > 0:
            factors.append(f"Signal failures ({features['signal_failures']})")
        if features['maintenance_work'] == 1:
            factors.append("Scheduled maintenance work")
        if features['origin_congestion'] > 0.6:
            factors.append("High origin station congestion")
        if features['destination_congestion'] > 0.6:
            factors.append("High destination station congestion")
        if features['track_condition'] == 'Poor':
            factors.append("Poor track conditions")
        elif features['track_condition'] == 'Fair':
            factors.append("Fair track conditions")
        
        # Time-based factors
        if features['departure_hour'] in [6, 7, 8, 17, 18, 19]:
            factors.append("Peak hour departure")
        if features['day_of_week'] in [0, 6]:  # Monday, Sunday
            factors.append("Weekend/Monday operations")
        
        # Route factors
        if features['route_avg_delay_hours'] > 2:
            factors.append("Route with high historical delays")
        
        # Default message if no specific factors
        if not factors and predicted_delay > 0.5:
            factors.append("Normal operational variations")
        elif not factors:
            factors.append("Optimal conditions expected")
        
        return factors[:5]  # Return top 5 factors
    
    def get_delay_trend(self, route: str, days: int = 7) -> Dict:
        """Get delay trend for a route over the past few days"""
        # This would typically query historical data
        # For now, simulate trend data
        
        dates = [(datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days)]
        delays = [max(0, np.random.normal(1.2, 0.8)) for _ in range(days)]
        
        return {
            'route': route,
            'dates': dates,
            'average_delays': delays,
            'trend': 'increasing' if delays[-1] > delays[0] else 'decreasing'
        }


# Integration with the main FastAPI application
def create_delay_prediction_endpoint():
    """
    Function to integrate with main.py
    Add this to your main.py file
    """
    
    prediction_service = DelayPredictionService()
    
    async def predict_train_delay_endpoint(
        route: str,
        distance_km: float,
        scheduled_duration_hours: float,
        departure_time: str,
        cargo_weight_tonnes: float,
        num_wagons: int,
        origin_lat: float = 19.0760,
        origin_lon: float = 72.8777
    ):
        """Enhanced train delay prediction endpoint"""
        
        train_data = {
            'route': route,
            'distance_km': distance_km,
            'scheduled_duration_hours': scheduled_duration_hours,
            'departure_time': departure_time,
            'cargo_weight_tonnes': cargo_weight_tonnes,
            'num_wagons': num_wagons,
            'origin_lat': origin_lat,
            'origin_lon': origin_lon
        }
        
        return prediction_service.predict_train_delay(train_data)
    
    return predict_train_delay_endpoint


if __name__ == "__main__":
    # Test the prediction service
    service = DelayPredictionService()
    
    # Test prediction
    test_data = {
        'route': 'Mumbai-JSW',
        'distance_km': 800,
        'scheduled_duration_hours': 18,
        'departure_time': datetime.now() + timedelta(hours=2),
        'cargo_weight_tonnes': 2500,
        'num_wagons': 42,
        'origin_lat': 19.0760,
        'origin_lon': 72.8777
    }
    
    result = service.predict_train_delay(test_data)
    print("Delay Prediction Result:")
    print(json.dumps(result, indent=2, default=str))
