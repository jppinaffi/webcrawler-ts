import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedProduct, Store } from './types.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

type ProductNode = Record<string, any>;

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 30_000,
    responseType: 'text',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });
  return response.data;
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

async function extractJsonLd(url: string, store: Store): Promise<ScrapedProduct> {
  const $ = cheerio.load(await fetchHtml(url));
  const product = findProductNode(parseJsonLdBlocks($));
  if (!product) throw new Error('JSON-LD do tipo Product não encontrado');

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const price = parseFloat(String(offers?.price));
  if (!Number.isFinite(price)) throw new Error('offers.price inválido');

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
    case 'terabyte':
      return extractJsonLd(url, store);
  }
}
