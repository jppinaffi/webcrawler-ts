import { extractProduct } from './extractors.js';
import { jitter } from './delay.js';
import { buildAlertMessage, sendTelegramMessage } from './telegram.js';
import type { AppConfig, ScrapedProduct, Target, TargetLink } from './types.js';

const lastNotifiedPrice = new Map<string, number>();

export const log = (message: string): void =>
  console.log(`[${new Date().toLocaleString('pt-BR')}] ${message}`);

export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const shouldNotify = (product: ScrapedProduct, target: Target): boolean =>
  product.inStock && product.price <= target.targetPrice;

async function notifyIfNeeded(target: Target, link: TargetLink, product: ScrapedProduct): Promise<void> {
  const key = `${target.id}:${link.url}`;

  if (!shouldNotify(product, target)) {
    lastNotifiedPrice.delete(key);
    return;
  }
  if (lastNotifiedPrice.get(key) === product.price) return;

  await sendTelegramMessage(buildAlertMessage(target, product));
  lastNotifiedPrice.set(key, product.price);
  log(`Notificação enviada: ${target.name} (${link.store})`);
}

async function checkLink(target: Target, link: TargetLink): Promise<void> {
  try {
    const product = await extractProduct(link.store, link.url);
    const availability = product.inStock ? 'em estoque' : 'indisponível';
    log(`${target.name} | ${link.store} | R$ ${product.price.toFixed(2)} | ${availability}`);
    await notifyIfNeeded(target, link, product);
  } catch (error) {
    log(`Falha em ${target.name} (${link.store}) ${link.url}: ${describeError(error)}`);
  }
}

export async function runCycle(config: AppConfig): Promise<void> {
  let isFirstRequest = true;
  for (const target of config.targets) {
    for (const link of target.links) {
      if (!isFirstRequest) await jitter();
      isFirstRequest = false;
      await checkLink(target, link);
    }
  }
}
