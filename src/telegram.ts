import axios from 'axios';
import type { ScrapedProduct, Target } from './types.js';

const STORE_LABELS: Record<ScrapedProduct['store'], string> = {
  kabum: 'KaBuM!',
  pichau: 'Pichau',
  terabyte: 'Terabyte',
};

const formatBrl = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildAlertMessage(target: Target, product: ScrapedProduct): string {
  return [
    '🔔 <b>Alerta de preço</b>',
    '',
    `📦 <b>${escapeHtml(product.title)}</b>`,
    `🏬 Loja: ${STORE_LABELS[product.store]}`,
    `💰 À vista: <b>${formatBrl(product.price)}</b> (teto: ${formatBrl(target.targetPrice)})`,
    `🔗 <a href="${product.url}">Abrir produto</a>`,
  ].join('\n');
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórios');

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const description = error.response.data?.description ?? error.message;
      throw new Error(`Telegram respondeu ${error.response.status}: ${description}`);
    }
    throw error;
  }
}
