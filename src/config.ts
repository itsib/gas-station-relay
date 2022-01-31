import { existsSync } from 'fs';
import path from 'path';
import { LogLevel } from './types';

require('dotenv').config(dotenvConfig());

export const CONFIG = {
  LOG_LEVEL: formatLogLeven(process.env.LOG_LEVEL),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RPC_URL: required(process.env.RPC_URL, 'The environment variable RPC_URL is not set.'),
  FEE_PAYER_WALLET_KEY: required(process.env.FEE_PAYER_WALLET_KEY, 'The environment variable FEE_PAYER_WALLET_KEY is not set.'),
  RELAY_CONTRACT_ADDRESS: required(process.env.RELAY_CONTRACT_ADDRESS, 'The environment variable RELAY_CONTRACT_ADDRESS is not set.'),
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

function required(variable: string, errorMessage: string): string {
  if (!variable) {
    throw new Error(errorMessage);
  }
  return variable;
}

function formatLogLeven(logLevel?: string): LogLevel {
  if (!logLevel) {
    return LogLevel.DEBUG;
  }
  logLevel = logLevel.toLowerCase();
  switch (logLevel) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    default:
      return LogLevel.DEBUG;
  }
}
