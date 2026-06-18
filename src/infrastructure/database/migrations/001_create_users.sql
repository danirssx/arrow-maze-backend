-- Migration 001: create users table for Identity bounded context
CREATE TABLE IF NOT EXISTS users (
  id          UUID         PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  username    VARCHAR(30)  UNIQUE NOT NULL,
  password_hash TEXT       NOT NULL,
  role        VARCHAR(10)  NOT NULL DEFAULT 'USER',
  status      VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ  NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL
);
