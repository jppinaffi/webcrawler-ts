import { Impit } from 'impit';
import * as cheerio from 'cheerio';
import type { ScrapedProduct, Store } from './types.js';

type ProductNode = Record<string, any>;

const browserClient = new Impit({
  browser: 'chrome',
  timeout: 30_000,
  followRedirects: true,
  headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
});

async function fetchHtml(url: string): Promise<string> {
  const response = await browserClient.fetch(url);
  if (!response.ok) throw new Error(`Request failed with status code ${response.status}`);
  return response.text();
}

async function extractKabum(url: string): Promise<ScrapedProduct> {
  const $ = cheerio.load(await fetchHtml(url));
  const rawJson = $('script#__NEXT_DATA__').first().html();
  if (!rawJson) throw new Error('__NEXT_DATA__ não encontrado');

  const product = JSON.parse(rawJson)?.props?.pageProps?.product;
  if (!product) throw new Error('props.pageProps.product ausente');

  const price = Number(product.prices?.priceWithDiscount);
  if (!Number.isFinite(price)) throw new Error('prices.priceWithDiscount inválido');

  return {
    title: String(product.title),
    price,
    inStock: product.available === true,
    store: 'kabum',
    url,
  };
}

function findProductNode(node: unknown): ProductNode | undefined {
  if (Array.isArray(node)) {
    return node.map(findProductNode).find((found) => found !== undefined);
  }
  if (node === null || typeof node !== 'object') return undefined;

  const record = node as ProductNode;
  const type = record['@type'];
  const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
  if (isProduct) return record;
  return record['@graph'] ? findProductNode(record['@graph']) : undefined;
}

function parseJsonLdBlocks($: cheerio.CheerioAPI): unknown[] {
  return $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((element) => {
      try {
        return [JSON.parse($(element).text())];
      } catch {
        return [];
      }
    });
}

type PriceReader = (html: string, offers: ProductNode | undefined) => number;

const PICHAU_CASH_PRICE_PATTERN = /\\?"pichau_prices\\?":\{\\?"avista\\?":([\d.]+)/;

const readOfferPrice: PriceReader = (_html, offers) => parseFloat(String(offers?.price));

const readPichauCashPrice: PriceReader = (html) =>
  parseFloat(html.match(PICHAU_CASH_PRICE_PATTERN)?.[1] ?? '');

async function extractJsonLd(url: string, store: Store, readPrice: PriceReader): Promise<ScrapedProduct> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const product = findProductNode(parseJsonLdBlocks($));
  if (!product) throw new Error('JSON-LD do tipo Product não encontrado');

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const price = readPrice(html, offers);
  if (!Number.isFinite(price)) throw new Error('preço à vista não encontrado');

  return {
    title: String(product.name),
    price,
    inStock: String(offers?.availability ?? '').includes('InStock'),
    store,
    url,
  };
}

export function extractProduct(store: Store, url: string): Promise<ScrapedProduct> {
  switch (store) {
    case 'kabum':
      return extractKabum(url);
    case 'pichau':
      return extractJsonLd(url, store, readPichauCashPrice);
    case 'terabyte':
      return extractJsonLd(url, store, readOfferPrice);
  }
}
