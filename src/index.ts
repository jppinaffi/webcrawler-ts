import path from 'node:path';
import dotenv from 'dotenv';
import { getIntervalMs, loadConfig, projectRoot } from './config.js';
import { sleep } from './delay.js';
import { describeError, log, runCycle } from './monitor.js';

dotenv.config({ path: path.join(projectRoot, '.env') });

async function main(): Promise<void> {
  const intervalMs = getIntervalMs();
  log(`Monitor iniciado. Intervalo: ${intervalMs / 60_000} min`);

  while (true) {
    try {
      await runCycle(await loadConfig());
    } catch (error) {
      log(`Falha no ciclo: ${describeError(error)}`);
    }
    await sleep(intervalMs);
  }
}

void main();
