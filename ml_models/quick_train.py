#!/usr/bin/env python3
"""
Quick Start Training Script
Run this to train your first delay prediction model
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from train_delay_predictor import TrainDelayPredictor

def main():
    print("Starting Train Delay Model Training...")
    print("=" * 50)
    
    # Initialize predictor
    predictor = TrainDelayPredictor()
    
    # Load and prepare synthetic data (replace with real data)
    print("Loading training data...")
    df = predictor.load_and_prepare_data()
    print(f"Dataset shape: {df.shape}")
    
    # Select features
    X, y, feature_names = predictor.select_features(df)
    print(f"Selected {len(feature_names)} features")
    
    # Train models
    print("Training models...")
    model_results, X_test, y_test = predictor.train_model(X, y)
    
    # Display results
    best_model_name = predictor.plot_results(model_results, X_test, y_test)
    print(f"Best model: {best_model_name}")
    
    # Save model
    os.makedirs('models', exist_ok=True)
    predictor.save_model('models/train_delay_model.pkl')
    
    print("\nTraining completed successfully!")
    print("Model saved to: models/train_delay_model.pkl")
    print("\nYou can now use the delay prediction API endpoint:")
    print("GET /api/predict-train-delay")

if __name__ == "__main__":
    main()
