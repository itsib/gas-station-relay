import { existsSync } from 'fs';
import path from 'path';
import { LogLevel } from './types';

require('dotenv').config(dotenvConfig());

export const CONFIG = {
  // Server settings
  LOG_LEVEL: validateEnum<LogLevel>([LogLevel.ERROR, LogLevel.WARN, LogLevel.DEBUG, LogLevel.INFO], process.env.LOG_LEVEL, LogLevel.DEBUG),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  BASE_PATH: process.env.BASE_PATH || '/',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  // Chain settings
  RPC_URL: required(process.env.RPC_URL, 'The environment variable RPC_URL is not set.'),
  FEE_PAYER_WALLET_KEY: required(process.env.FEE_PAYER_WALLET_KEY, 'The environment variable FEE_PAYER_WALLET_KEY is not set.'),
  GAS_STATION_CONTRACT_ADDRESS: required(process.env.GAS_STATION_CONTRACT_ADDRESS, 'The environment variable GAS_STATION_CONTRACT_ADDRESS is not set.'),
  // Gas settings
  GAS_CACHE_TIMEOUT: Number(process.env.GAS_CACHE_TIMEOUT) || 30,
  FEE_PER_GAS_MULTIPLIER: Number(process.env.FEE_PER_GAS_MULTIPLIER) || 1,
  ESTIMATE_GAS_MULTIPLIER: Number(process.env.ESTIMATE_GAS_MULTIPLIER) || 1,
}

function dotenvConfig(): { path: string } | undefined {
  function findEnv(envPath: string): string | undefined {
    if (envPath === '/') {
      return undefined;
    }
    if (existsSync(`${envPath}/.env`)) {
      return `${envPath}/.env`;
    }
    return findEnv(path.resolve(`${envPath}/..`));
  }

  const envFile = findEnv(__dirname);

  return envFile ? { path: envFile } : undefined;
}

function required(variable: string, errorMessage?: string): string {
  if (!variable) {
    throw new Error(errorMessage || 'Value is required');
  }
  return variable;
}

function validateEnum<T extends string>(enumerate: T[], value: string, defaultValue: T, errorMessage?: string): T {
  value = value ? value : defaultValue;
  if (enumerate.includes(value as T)) {
    return value as T;
  }
  throw new Error(errorMessage || `Values are supported ${enumerate.join(',')}`);
}

function validateInteger(value: string, defaultValue: string, errorMessage?: string): string {
  value = value ? value : defaultValue;
  if (/^\d+$/.test(value)) {
    return value;
  }
  throw new Error(errorMessage || `Value should be valid integer number`);
}

