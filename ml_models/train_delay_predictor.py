"""
Train Delay Prediction Model
Predicts train delays using historical data, weather conditions, and operational factors
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class TrainDelayPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_importance = None
        
    def load_and_prepare_data(self, data_path=None):
        """
        Load and prepare training data from multiple sources
        """
        if data_path:
            # Load from provided CSV file
            df = pd.read_csv(data_path)
        else:
            # Generate synthetic training data for demonstration
            df = self.generate_synthetic_data()
        
        return self.preprocess_data(df)
    
    def generate_synthetic_data(self, n_samples=10000):
        """
        Generate synthetic train delay data for training
        Replace this with real data loading
        """
        np.random.seed(42)
        
        # Train routes (major freight corridors)
        routes = [
            'Mumbai-JSW', 'Chennai-Tata', 'Kolkata-ArcelorMittal', 
            'Vizag-JSW', 'Paradip-Tata', 'Kandla-SAIL'
        ]
        
        # Generate synthetic data
        data = []
        for i in range(n_samples):
            # Basic features
            route = np.random.choice(routes)
            distance = np.random.uniform(200, 1500)  # km
            scheduled_duration = distance / 45 + np.random.uniform(-2, 2)  # hours
            
            # Time-based features
            hour = np.random.randint(0, 24)
            day_of_week = np.random.randint(0, 7)
            month = np.random.randint(1, 13)
            
            # Weather features
            temperature = np.random.uniform(15, 45)
            rainfall = np.random.exponential(2)
            wind_speed = np.random.uniform(0, 30)
            visibility = np.random.uniform(1, 10)
            
            # Operational features
            cargo_weight = np.random.uniform(1000, 4000)  # tonnes
            num_wagons = int(cargo_weight / 60)  # approx 60 tonnes per wagon
            track_condition = np.random.choice(['Good', 'Fair', 'Poor'], p=[0.6, 0.3, 0.1])
            signal_failures = np.random.poisson(0.5)
            maintenance_work = np.random.choice([0, 1], p=[0.8, 0.2])
            
            # Station congestion
            origin_congestion = np.random.uniform(0, 1)
            destination_congestion = np.random.uniform(0, 1)
            
            # Historical performance
            route_avg_delay = np.random.uniform(0, 3)  # hours
            
            # Calculate delay (target variable)
            base_delay = 0
            
            # Weather impact
            if rainfall > 5:
                base_delay += rainfall * 0.2
            if wind_speed > 20:
                base_delay += (wind_speed - 20) * 0.1
            if visibility < 3:
                base_delay += (3 - visibility) * 0.5
            if temperature > 40 or temperature < 5:
                base_delay += 0.5
            
            # Operational impact
            if track_condition == 'Poor':
                base_delay += 2
            elif track_condition == 'Fair':
                base_delay += 0.5
            
            base_delay += signal_failures * 0.5
            base_delay += maintenance_work * 1.5
            base_delay += origin_congestion * 1.0
            base_delay += destination_congestion * 0.8
            
            # Time-based impact
            if hour in [6, 7, 8, 17, 18, 19]:  # Peak hours
                base_delay += 0.5
            if day_of_week in [0, 6]:  # Monday, Sunday
                base_delay += 0.3
            
            # Add some randomness
            delay = max(0, base_delay + np.random.normal(0, 0.5))
            
            data.append({
                'route': route,
                'distance_km': distance,
                'scheduled_duration_hours': scheduled_duration,
                'departure_hour': hour,
                'day_of_week': day_of_week,
                'month': month,
                'temperature_c': temperature,
                'rainfall_mm': rainfall,
                'wind_speed_kmh': wind_speed,
                'visibility_km': visibility,
                'cargo_weight_tonnes': cargo_weight,
                'num_wagons': num_wagons,
                'track_condition': track_condition,
                'signal_failures': signal_failures,
                'maintenance_work': maintenance_work,
                'origin_congestion': origin_congestion,
                'destination_congestion': destination_congestion,
                'route_avg_delay_hours': route_avg_delay,
                'actual_delay_hours': delay
            })
        
        return pd.DataFrame(data)
    
    def preprocess_data(self, df):
        """
        Preprocess the data for training
        """
        # Handle categorical variables
        categorical_columns = ['route', 'track_condition']
        for col in categorical_columns:
            if col in df.columns:
                le = LabelEncoder()
                df[col + '_encoded'] = le.fit_transform(df[col])
                self.label_encoders[col] = le
        
        # Create additional time-based features
        if 'departure_hour' in df.columns:
            df['is_peak_hour'] = df['departure_hour'].apply(
                lambda x: 1 if x in [6, 7, 8, 17, 18, 19] else 0
            )
            df['is_night'] = df['departure_hour'].apply(
                lambda x: 1 if x >= 22 or x <= 5 else 0
            )
        
        if 'day_of_week' in df.columns:
            df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x in [5, 6] else 0)
        
        # Weather severity index
        if all(col in df.columns for col in ['rainfall_mm', 'wind_speed_kmh', 'visibility_km']):
            df['weather_severity'] = (
                (df['rainfall_mm'] / 10) + 
                (df['wind_speed_kmh'] / 30) + 
                ((10 - df['visibility_km']) / 10)
            ) / 3
        
        # Operational stress index
        if all(col in df.columns for col in ['signal_failures', 'maintenance_work', 'origin_congestion']):
            df['operational_stress'] = (
                df['signal_failures'] + 
                df['maintenance_work'] * 2 + 
                df['origin_congestion'] + 
                df['destination_congestion']
            ) / 5
        
        return df
    
    def select_features(self, df):
        """
        Select relevant features for training
        """
        feature_columns = [
            'distance_km', 'scheduled_duration_hours', 'departure_hour', 
            'day_of_week', 'month', 'temperature_c', 'rainfall_mm', 
            'wind_speed_kmh', 'visibility_km', 'cargo_weight_tonnes', 
            'num_wagons', 'signal_failures', 'maintenance_work',
            'origin_congestion', 'destination_congestion', 'route_avg_delay_hours',
            'route_encoded', 'track_condition_encoded', 'is_peak_hour', 
            'is_night', 'is_weekend', 'weather_severity', 'operational_stress'
        ]
        
        # Only include columns that exist in the dataframe
        available_features = [col for col in feature_columns if col in df.columns]
        
        X = df[available_features]
        y = df['actual_delay_hours']
        
        return X, y, available_features
    
    def train_model(self, X, y):
        """
        Train multiple models and select the best one
        """
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale the features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Define models to try
        models = {
            'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'Linear Regression': LinearRegression()
        }
        
        best_model = None
        best_score = float('inf')
        model_results = {}
        
        print("Training and evaluating models...")
        
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            if name == 'Linear Regression':
                model.fit(X_train_scaled, y_train)
                y_pred = model.predict(X_test_scaled)
            else:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
            
            # Calculate metrics
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, y_pred)
            
            model_results[name] = {
                'model': model,
                'mae': mae,
                'mse': mse,
                'rmse': rmse,
                'r2': r2,
                'predictions': y_pred
            }
            
            print(f"MAE: {mae:.3f}, RMSE: {rmse:.3f}, R²: {r2:.3f}")
            
            if mae < best_score:
                best_score = mae
                best_model = model
                self.model = model
        
        # Store feature importance for tree-based models
        if hasattr(best_model, 'feature_importances_'):
            self.feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': best_model.feature_importances_
            }).sort_values('importance', ascending=False)
        
        return model_results, X_test, y_test
    
    def plot_results(self, model_results, X_test, y_test):
        """
        Plot training results and model performance
        """
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Model comparison
        model_names = list(model_results.keys())
        mae_scores = [model_results[name]['mae'] for name in model_names]
        r2_scores = [model_results[name]['r2'] for name in model_names]
        
        axes[0, 0].bar(model_names, mae_scores)
        axes[0, 0].set_title('Model Comparison - Mean Absolute Error')
        axes[0, 0].set_ylabel('MAE (hours)')
        axes[0, 0].tick_params(axis='x', rotation=45)
        
        axes[0, 1].bar(model_names, r2_scores)
        axes[0, 1].set_title('Model Comparison - R² Score')
        axes[0, 1].set_ylabel('R² Score')
        axes[0, 1].tick_params(axis='x', rotation=45)
        
        # Best model predictions vs actual
        best_model_name = min(model_results.keys(), 
                            key=lambda x: model_results[x]['mae'])
        best_predictions = model_results[best_model_name]['predictions']
        
        axes[1, 0].scatter(y_test, best_predictions, alpha=0.6)
        axes[1, 0].plot([y_test.min(), y_test.max()], 
                       [y_test.min(), y_test.max()], 'r--', lw=2)
        axes[1, 0].set_xlabel('Actual Delay (hours)')
        axes[1, 0].set_ylabel('Predicted Delay (hours)')
        axes[1, 0].set_title(f'Best Model ({best_model_name}) - Predictions vs Actual')
        
        # Feature importance (if available)
        if self.feature_importance is not None:
            top_features = self.feature_importance.head(10)
            axes[1, 1].barh(top_features['feature'], top_features['importance'])
            axes[1, 1].set_title('Top 10 Feature Importance')
            axes[1, 1].set_xlabel('Importance')
        
        plt.tight_layout()
        plt.savefig('model_training_results.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        return best_model_name
    
    def save_model(self, model_path='train_delay_model.pkl'):
        """
        Save the trained model and preprocessing objects
        """
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_importance': self.feature_importance
        }
        
        joblib.dump(model_data, model_path)
        print(f"Model saved to {model_path}")
    
    def load_model(self, model_path='train_delay_model.pkl'):
        """
        Load a trained model
        """
        model_data = joblib.load(model_path)
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.label_encoders = model_data['label_encoders']
        self.feature_importance = model_data.get('feature_importance')
        print(f"Model loaded from {model_path}")
    
    def predict_delay(self, features):
        """
        Predict delay for new data
        """
        if self.model is None:
            raise ValueError("Model not trained or loaded")
        
        # Preprocess features similar to training data
        if isinstance(features, dict):
            features = pd.DataFrame([features])
        
        # Apply same preprocessing as training
        features_processed = self.preprocess_features_for_prediction(features)
        
        # Make prediction
        if hasattr(self.model, 'predict'):
            if isinstance(self.model, LinearRegression):
                features_scaled = self.scaler.transform(features_processed)
                prediction = self.model.predict(features_scaled)
            else:
                prediction = self.model.predict(features_processed)
        
        return max(0, prediction[0])  # Ensure non-negative delay
    
    def preprocess_features_for_prediction(self, features):
        """
        Preprocess features for prediction (similar to training preprocessing)
        """
        df = features.copy()
        
        # Apply label encoding
        for col, encoder in self.label_encoders.items():
            if col in df.columns:
                df[col + '_encoded'] = encoder.transform(df[col])
        
        # Create time-based features
        if 'departure_hour' in df.columns:
            df['is_peak_hour'] = df['departure_hour'].apply(
                lambda x: 1 if x in [6, 7, 8, 17, 18, 19] else 0
            )
            df['is_night'] = df['departure_hour'].apply(
                lambda x: 1 if x >= 22 or x <= 5 else 0
            )
        
        if 'day_of_week' in df.columns:
            df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x in [5, 6] else 0)
        
        # Weather and operational indices
        if all(col in df.columns for col in ['rainfall_mm', 'wind_speed_kmh', 'visibility_km']):
            df['weather_severity'] = (
                (df['rainfall_mm'] / 10) + 
                (df['wind_speed_kmh'] / 30) + 
                ((10 - df['visibility_km']) / 10)
            ) / 3
        
        if all(col in df.columns for col in ['signal_failures', 'maintenance_work', 'origin_congestion']):
            df['operational_stress'] = (
                df['signal_failures'] + 
                df['maintenance_work'] * 2 + 
                df['origin_congestion'] + 
                df['destination_congestion']
            ) / 5
        
        # Select only the features used in training
        feature_columns = [
            'distance_km', 'scheduled_duration_hours', 'departure_hour', 
            'day_of_week', 'month', 'temperature_c', 'rainfall_mm', 
            'wind_speed_kmh', 'visibility_km', 'cargo_weight_tonnes', 
            'num_wagons', 'signal_failures', 'maintenance_work',
            'origin_congestion', 'destination_congestion', 'route_avg_delay_hours',
            'route_encoded', 'track_condition_encoded', 'is_peak_hour', 
            'is_night', 'is_weekend', 'weather_severity', 'operational_stress'
        ]
        
        available_features = [col for col in feature_columns if col in df.columns]
        return df[available_features]


def main():
    """
    Main training function
    """
    print("Starting Train Delay Prediction Model Training...")
    
    # Initialize predictor
    predictor = TrainDelayPredictor()
    
    # Load and prepare data
    print("Loading and preparing data...")
    df = predictor.load_and_prepare_data()
    print(f"Dataset shape: {df.shape}")
    
    # Select features
    X, y, feature_names = predictor.select_features(df)
    print(f"Selected {len(feature_names)} features for training")
    
    # Train models
    model_results, X_test, y_test = predictor.train_model(X, y)
    
    # Plot results
    best_model_name = predictor.plot_results(model_results, X_test, y_test)
    print(f"\nBest model: {best_model_name}")
    
    # Save model
    predictor.save_model('models/train_delay_model.pkl')
    
    # Example prediction
    print("\nExample prediction:")
    example_features = {
        'route': 'Mumbai-JSW',
        'distance_km': 800,
        'scheduled_duration_hours': 18,
        'departure_hour': 14,
        'day_of_week': 2,
        'month': 10,
        'temperature_c': 28,
        'rainfall_mm': 2.5,
        'wind_speed_kmh': 15,
        'visibility_km': 8,
        'cargo_weight_tonnes': 2500,
        'num_wagons': 42,
        'track_condition': 'Good',
        'signal_failures': 0,
        'maintenance_work': 0,
        'origin_congestion': 0.3,
        'destination_congestion': 0.2,
        'route_avg_delay_hours': 1.2
    }
    
    predicted_delay = predictor.predict_delay(example_features)
    print(f"Predicted delay: {predicted_delay:.2f} hours")


if __name__ == "__main__":
    main()
