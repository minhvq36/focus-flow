-- Migration: 001_init_schema.sql
-- Description: Initialize database schema for focusflow

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create garden_items table
CREATE TABLE IF NOT EXISTS garden_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_type VARCHAR(100) NOT NULL,
  x INTEGER,
  y INTEGER,
  state VARCHAR(50) DEFAULT 'healthy',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_id VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create economy table
CREATE TABLE IF NOT EXISTS economy (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  coins INTEGER DEFAULT 0,
  gems INTEGER DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES users(id),
  item_id VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  friend_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
