import { Method } from 'axios';
import { existsSync } from 'fs';
import path from 'path';
import { BaseOfNumber, LogLevel } from './types';

require('dotenv').config(dotenvConfig());

export const CONFIG = {
  // Server settings
  LOG_LEVEL: validateEnum<LogLevel>([LogLevel.ERROR, LogLevel.WARN, LogLevel.DEBUG, LogLevel.INFO], process.env.LOG_LEVEL, LogLevel.DEBUG),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  // Chain settings
  RPC_URL: required(process.env.RPC_URL, 'The environment variable RPC_URL is not set.'),
  FEE_PAYER_WALLET_KEY: required(process.env.FEE_PAYER_WALLET_KEY, 'The environment variable FEE_PAYER_WALLET_KEY is not set.'),
  GAS_STATION_CONTRACT_ADDRESS: required(process.env.GAS_STATION_CONTRACT_ADDRESS, 'The environment variable GAS_STATION_CONTRACT_ADDRESS is not set.'),
  // Gas price settings
  EXTERNAL_GAS_STATION_URL: process.env.EXTERNAL_GAS_STATION_URL,
  EXTERNAL_GAS_STATION_METHOD: validateEnum<Method>(['GET', 'DELETE', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'PURGE', 'LINK', 'UNLINK'], process.env.EXTERNAL_GAS_STATION_METHOD, 'GET'),
  EXTERNAL_GAS_STATION_VALUE_BASE: validateEnum<BaseOfNumber>(['HEX', 'DEC'], process.env.EXTERNAL_GAS_STATION_VALUE_BASE, 'DEC'),
  EXTERNAL_GAS_STATION_VALUE_DECIMALS: validateInteger(process.env.EXTERNAL_GAS_STATION_VALUE_DECIMALS, '0'),
  EXTERNAL_GAS_STATION_VALUE_PLACE: process.env.EXTERNAL_GAS_STATION_VALUE_PLACE || '',
  // Gas multipliers
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

