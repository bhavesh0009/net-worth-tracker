-- ============================================================
-- BigQuery Setup for Net Worth Tracker Application
-- ============================================================
-- Project ID: deep-span-266614
-- Dataset: net_worth_tracker
-- Location: asia-south1 (Mumbai)
-- Created: December 01, 2025
-- ============================================================

-- ============================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================
-- Option 1: BigQuery Console UI
--   1. Go to https://console.cloud.google.com/bigquery
--   2. Select project: deep-span-266614
--   3. Click "Compose New Query"
--   4. Copy and paste this entire file
--   5. Click "Run"
--
-- Option 2: bq CLI Tool
--   bq query --project_id=deep-span-266614 < bigquery-setup.sql
--
-- Option 3: Cloud Shell
--   1. Upload this file to Cloud Shell
--   2. Run: bq query --use_legacy_sql=false < bigquery-setup.sql
-- ============================================================

-- ============================================================
-- 1. CREATE DATASET
-- ============================================================
CREATE SCHEMA IF NOT EXISTS `deep-span-266614.net_worth_tracker`
OPTIONS (
  location = 'asia-south1',
  description = 'Net Worth Tracker Application - Personal Finance Database'
);

-- ============================================================
-- 2. CREATE TABLE: accounts
-- ============================================================
-- Stores the static list of financial accounts (Assets & Liabilities)
CREATE TABLE IF NOT EXISTS `deep-span-266614.net_worth_tracker.accounts` (
  id STRING NOT NULL,
  name STRING NOT NULL,
  type STRING NOT NULL,
  category STRING NOT NULL,
  is_active BOOLEAN NOT NULL
);

-- ============================================================
-- 3. CREATE TABLE: periods
-- ============================================================
-- Represents monthly time buckets for net worth snapshots
CREATE TABLE IF NOT EXISTS `deep-span-266614.net_worth_tracker.periods` (
  id STRING NOT NULL,
  month_date DATE NOT NULL,
  notes STRING,
  total_nw NUMERIC
);

-- ============================================================
-- 4. CREATE TABLE: records
-- ============================================================
-- Transactional snapshots - intersection of Account and Period
-- Clustered by period_id and account_id for optimal query performance
CREATE TABLE IF NOT EXISTS `deep-span-266614.net_worth_tracker.records` (
  id STRING NOT NULL,
  period_id STRING NOT NULL,
  account_id STRING NOT NULL,
  amount NUMERIC NOT NULL
)
CLUSTER BY period_id, account_id;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Uncomment and run these queries to verify the setup

-- List all tables in the dataset
-- SELECT * FROM `deep-span-266614.net_worth_tracker.INFORMATION_SCHEMA.TABLES`;

-- Describe accounts table schema
-- SELECT * FROM `deep-span-266614.net_worth_tracker.INFORMATION_SCHEMA.COLUMNS`
-- WHERE table_name = 'accounts';

-- Describe periods table schema
-- SELECT * FROM `deep-span-266614.net_worth_tracker.INFORMATION_SCHEMA.COLUMNS`
-- WHERE table_name = 'periods';

-- Describe records table schema
-- SELECT * FROM `deep-span-266614.net_worth_tracker.INFORMATION_SCHEMA.COLUMNS`
-- WHERE table_name = 'records';

-- ============================================================
-- SAMPLE DATA INSERTION (OPTIONAL - FOR TESTING)
-- ============================================================
-- Uncomment to insert sample data for testing
-- Note: Generate UUIDs in your application code before inserting

-- Insert sample accounts
-- INSERT INTO `deep-span-266614.net_worth_tracker.accounts` (id, name, type, category, is_active)
-- VALUES
--   ('550e8400-e29b-41d4-a716-446655440001', 'HDFC Savings Account', 'Asset', 'Cash', TRUE),
--   ('550e8400-e29b-41d4-a716-446655440002', 'Angel One Portfolio', 'Asset', 'Equity', TRUE),
--   ('550e8400-e29b-41d4-a716-446655440003', 'Home Loan - HDFC', 'Liability', 'Real Estate', TRUE),
--   ('550e8400-e29b-41d4-a716-446655440004', 'EPF Account', 'Asset', 'EPF', TRUE);

-- Insert sample period
-- INSERT INTO `deep-span-266614.net_worth_tracker.periods` (id, month_date, notes, total_nw)
-- VALUES
--   ('660e8400-e29b-41d4-a716-446655440001', '2025-11-01', 'Initial setup month', 500000.00);

-- Insert sample records
-- INSERT INTO `deep-span-266614.net_worth_tracker.records` (id, period_id, account_id, amount)
-- VALUES
--   ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 100000.00),
--   ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 250000.00),
--   ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', -300000.00),
--   ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 450000.00);

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
-- Dataset: deep-span-266614.net_worth_tracker
-- Tables created: accounts, periods, records
-- Next steps:
--   1. Run verification queries above
--   2. Set up authentication in your React application
--   3. Use BigQuery client library to interact with tables
-- ============================================================
