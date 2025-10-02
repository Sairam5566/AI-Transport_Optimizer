"""
Data Collection Script for Train Delay Prediction
Collects historical train data from various APIs and sources
"""

import requests
import pandas as pd
import json
import time
from datetime import datetime, timedelta
import sqlite3
import os
from typing import Dict, List, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrainDataCollector:
    def __init__(self, db_path='train_data.db'):
        self.db_path = db_path
        self.setup_database()
        
    def setup_database(self):
        """Create SQLite database for storing collected data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create table for train delay data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS train_delays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                train_number TEXT,
                train_name TEXT,
                route TEXT,
                origin_station TEXT,
                destination_station TEXT,
                scheduled_departure TEXT,
                actual_departure TEXT,
                scheduled_arrival TEXT,
                actual_arrival TEXT,
                delay_minutes INTEGER,
                distance_km REAL,
                date_collected TEXT,
                weather_temp REAL,
                weather_rainfall REAL,
                weather_wind_speed REAL,
                weather_visibility REAL,
                track_condition TEXT,
                signal_failures INTEGER,
                maintenance_work INTEGER,
                source TEXT
            )
        ''')
        
        # Create table for weather data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weather_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                station_code TEXT,
                date TEXT,
                temperature REAL,
                rainfall REAL,
                wind_speed REAL,
                visibility REAL,
                humidity REAL,
                pressure REAL
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def collect_indian_railways_data(self, train_numbers: List[str], days_back: int = 30):
        """
        Collect data from Indian Railways APIs
        Note: You'll need to register for API keys
        """
        base_url = "https://api.railwayapi.com/v2"
        # Replace with your actual API key
        api_key = "YOUR_RAILWAY_API_KEY"
        
        collected_data = []
        
        for train_number in train_numbers:
            logger.info(f"Collecting data for train {train_number}")
            
            for days_ago in range(days_back):
                date = (datetime.now() - timedelta(days=days_ago)).strftime('%d-%m-%Y')
                
                try:
                    # Get train running status
                    url = f"{base_url}/live/train/{train_number}/date/{date}/apikey/{api_key}/"
                    response = requests.get(url, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if data.get('response_code') == 200:
                            train_info = data.get('train', {})
                            route_info = data.get('route', [])
                            
                            # Extract delay information
                            for station in route_info:
                                if station.get('has_arrived') and station.get('has_departed'):
                                    delay_data = {
                                        'train_number': train_number,
                                        'train_name': train_info.get('name', ''),
                                        'station_code': station.get('station', {}).get('code', ''),
                                        'station_name': station.get('station', {}).get('name', ''),
                                        'scheduled_arrival': station.get('scharr', ''),
                                        'actual_arrival': station.get('actarr', ''),
                                        'scheduled_departure': station.get('schdep', ''),
                                        'actual_departure': station.get('actdep', ''),
                                        'delay_arrival': station.get('delayarr', 0),
                                        'delay_departure': station.get('delaydep', 0),
                                        'date': date,
                                        'source': 'railway_api'
                                    }
                                    collected_data.append(delay_data)
                    
                    time.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error collecting data for {train_number} on {date}: {e}")
                    continue
        
        return collected_data
    
    def collect_weather_data(self, station_coords: Dict[str, tuple], days_back: int = 30):
        """
        Collect historical weather data from OpenWeatherMap
        """
        api_key = "YOUR_OPENWEATHER_API_KEY"  # Replace with your API key
        base_url = "http://api.openweathermap.org/data/2.5/onecall/timemachine"
        
        weather_data = []
        
        for station_code, (lat, lon) in station_coords.items():
            logger.info(f"Collecting weather data for {station_code}")
            
            for days_ago in range(days_back):
                timestamp = int((datetime.now() - timedelta(days=days_ago)).timestamp())
                
                try:
                    params = {
                        'lat': lat,
                        'lon': lon,
                        'dt': timestamp,
                        'appid': api_key,
                        'units': 'metric'
                    }
                    
                    response = requests.get(base_url, params=params, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        current = data.get('current', {})
                        
                        weather_record = {
                            'station_code': station_code,
                            'date': datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d'),
                            'temperature': current.get('temp', 0),
                            'rainfall': current.get('rain', {}).get('1h', 0),
                            'wind_speed': current.get('wind_speed', 0),
                            'visibility': current.get('visibility', 10000) / 1000,  # Convert to km
                            'humidity': current.get('humidity', 0),
                            'pressure': current.get('pressure', 0)
                        }
                        weather_data.append(weather_record)
                    
                    time.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error collecting weather data for {station_code}: {e}")
                    continue
        
        return weather_data
    
    def scrape_ntes_data(self, train_numbers: List[str]):
        """
        Scrape data from NTES (National Train Enquiry System)
        Note: This is for educational purposes. Always respect robots.txt and terms of service
        """
        # This would require web scraping techniques
        # Implementation depends on the website structure
        logger.info("NTES scraping not implemented - requires web scraping setup")
        return []
    
    def save_to_database(self, train_data: List[Dict], weather_data: List[Dict]):
        """Save collected data to SQLite database"""
        conn = sqlite3.connect(self.db_path)
        
        # Save train data
        if train_data:
            df_trains = pd.DataFrame(train_data)
            df_trains.to_sql('train_delays', conn, if_exists='append', index=False)
            logger.info(f"Saved {len(train_data)} train delay records")
        
        # Save weather data
        if weather_data:
            df_weather = pd.DataFrame(weather_data)
            df_weather.to_sql('weather_data', conn, if_exists='append', index=False)
            logger.info(f"Saved {len(weather_data)} weather records")
        
        conn.close()
    
    def export_training_data(self, output_file='training_data.csv'):
        """Export processed data for model training"""
        conn = sqlite3.connect(self.db_path)
        
        # Join train delays with weather data
        query = '''
        SELECT 
            td.*,
            wd.temperature,
            wd.rainfall,
            wd.wind_speed,
            wd.visibility,
            wd.humidity,
            wd.pressure
        FROM train_delays td
        LEFT JOIN weather_data wd ON td.origin_station = wd.station_code 
            AND date(td.date_collected) = wd.date
        WHERE td.delay_minutes IS NOT NULL
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # Additional processing
        df['delay_hours'] = df['delay_minutes'] / 60
        df['departure_hour'] = pd.to_datetime(df['scheduled_departure'], errors='coerce').dt.hour
        df['day_of_week'] = pd.to_datetime(df['date_collected']).dt.dayofweek
        df['month'] = pd.to_datetime(df['date_collected']).dt.month
        
        df.to_csv(output_file, index=False)
        logger.info(f"Training data exported to {output_file}")
        
        return df


def create_sample_data_collection_config():
    """Create a sample configuration for data collection"""
    config = {
        "train_numbers": [
            "12951",  # Mumbai Rajdhani
            "12301",  # Howrah Rajdhani
            "12009",  # Shatabdi Express
            "16031",  # Andaman Express
            "18047",  # Amaravathi Express
        ],
        "station_coordinates": {
            "CSTM": (18.9401, 72.8352),  # Mumbai CST
            "HWH": (22.5804, 88.3431),   # Howrah
            "NDLS": (28.6431, 77.2197),  # New Delhi
            "MAS": (13.0878, 80.2785),   # Chennai Central
            "SBC": (12.9762, 77.5993),   # Bangalore City
        },
        "collection_period_days": 90,
        "api_keys": {
            "railway_api": "YOUR_RAILWAY_API_KEY",
            "openweather": "YOUR_OPENWEATHER_API_KEY"
        }
    }
    
    with open('data_collection_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    print("Sample configuration created: data_collection_config.json")
    print("Please update the API keys before running data collection")


def main():
    """Main data collection function"""
    print("Train Data Collection Script")
    print("=" * 40)
    
    # Create sample config if it doesn't exist
    if not os.path.exists('data_collection_config.json'):
        create_sample_data_collection_config()
        return
    
    # Load configuration
    with open('data_collection_config.json', 'r') as f:
        config = json.load(f)
    
    # Initialize collector
    collector = TrainDataCollector()
    
    # Collect data
    print("Starting data collection...")
    
    # Collect train delay data
    train_data = collector.collect_indian_railways_data(
        config['train_numbers'], 
        config['collection_period_days']
    )
    
    # Collect weather data
    weather_data = collector.collect_weather_data(
        config['station_coordinates'],
        config['collection_period_days']
    )
    
    # Save to database
    collector.save_to_database(train_data, weather_data)
    
    # Export training data
    training_df = collector.export_training_data()
    
    print(f"Data collection complete!")
    print(f"Collected {len(train_data)} train delay records")
    print(f"Collected {len(weather_data)} weather records")
    print(f"Training dataset shape: {training_df.shape}")


if __name__ == "__main__":
    main()
