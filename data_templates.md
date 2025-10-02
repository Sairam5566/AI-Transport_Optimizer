# Data File Templates

This document describes the required CSV file formats for the AI Logistics Optimizer.

## Required Data Files

### 1. ports_data.csv
Port information and capacity data.

**Required columns:**
```
port_id,port_name,state,location_lat,location_lon,capacity,current_stock,available_capacity,utilization_percent,handling_cost,storage_cost,congestion_level,expected_vessels,berth_count,max_vessel_size,materials_handled,rail_connectivity,road_connectivity,last_updated
```

**Example:**
```csv
port_id,port_name,state,location_lat,location_lon,capacity,current_stock,available_capacity,utilization_percent,handling_cost,storage_cost,congestion_level,expected_vessels,berth_count,max_vessel_size,materials_handled,rail_connectivity,road_connectivity,last_updated
MUM001,Mumbai Port Terminal A,Maharashtra,18.9220,72.8347,50000,30000,20000,60.0,25.50,5.00,Medium,3,8,Capesize,"Iron Ore, Coal",Available,Excellent,2025-09-25T12:00:00
```

### 2. plants_data.csv
Steel plant requirements and specifications.

**Required columns:**
```
plant_id,plant_name,state,location_lat,location_lon,capacity_mtpa,required_materials_iron_ore,required_materials_coal,required_materials_limestone,current_stock_iron_ore,current_stock_coal,current_stock_limestone,stock_days_remaining_iron_ore,stock_days_remaining_coal,stock_days_remaining_limestone,rail_connectivity,urgency_level,quality_requirements_iron_ore_grade,quality_requirements_coal_type,preferred_suppliers,transportation_mode,environmental_rating,last_updated
```

**Example:**
```csv
plant_id,plant_name,state,location_lat,location_lon,capacity_mtpa,required_materials_iron_ore,required_materials_coal,required_materials_limestone,current_stock_iron_ore,current_stock_coal,current_stock_limestone,stock_days_remaining_iron_ore,stock_days_remaining_coal,stock_days_remaining_limestone,rail_connectivity,urgency_level,quality_requirements_iron_ore_grade,quality_requirements_coal_type,preferred_suppliers,transportation_mode,environmental_rating,last_updated
JSW001,JSW Steel Vijayanagar,Karnataka,15.3173,76.4602,12.0,8000,6000,2000,15000,12000,4000,30,25,40,Available,Medium,65%,Coking Coal,NMDC,Rail,A,2025-09-25T12:00:00
```

### 3. trains_data.csv
Train freight and supplier information.

**Required columns:**
```
train_id,supplier_id,supplier_name,origin_port,destination_plant,commodity,wagons,rake_type,rake_capacity_tonnes,route_distance_km,scheduled_departure,scheduled_arrival,status,expected_cost_per_ton
```

**Example:**
```csv
train_id,supplier_id,supplier_name,origin_port,destination_plant,commodity,wagons,rake_type,rake_capacity_tonnes,route_distance_km,scheduled_departure,scheduled_arrival,status,expected_cost_per_ton
TR001,SUP001,NMDC,Mumbai Port,JSW Steel Vijayanagar,Iron Ore,58,BOXN,3654,720,2025-09-25T10:00:00,2025-09-26T03:00:00,Scheduled,1.90
```

## Data Types

- **Numeric fields**: capacity, stock levels, costs, coordinates, etc.
- **Text fields**: names, states, status, connectivity levels
- **Date fields**: ISO format (YYYY-MM-DDTHH:MM:SS)
- **Categorical fields**: 
  - congestion_level: Low, Medium, High
  - urgency_level: Low, Medium, High
  - rail_connectivity: Available, Limited, Not Available
  - status: Scheduled, En Route, Arrived, Delayed

## Notes

1. All CSV files should have headers as the first row
2. Use UTF-8 encoding for special characters
3. Numeric values should not contain commas (use periods for decimals)
4. Date/time fields should be in ISO format
5. Location coordinates should be in decimal degrees
6. Missing values can be left empty but columns must exist
