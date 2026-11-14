import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { AppConfig } from './types.js';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function loadConfig(): Promise<AppConfig> {
  const content = await readFile(path.join(projectRoot, 'config.json'), 'utf8');
  return JSON.parse(content) as AppConfig;
}

export function getIntervalMs(): number {
  const minutes = Number(process.env.CHECK_INTERVAL_MINUTES);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60_000;
}
