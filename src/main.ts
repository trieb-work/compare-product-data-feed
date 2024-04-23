import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

/**
 * run with: pnpm tsx pnpm tsx src/main.ts OLDURL NEWURL
 */

type Product = {
  id: string;
  price: string;
};

async function fetchXML(url: string): Promise<any> {
  const response = await fetch(url);
  const xmlData = await response.text();
  return parseStringPromise(xmlData);
}

async function extractProducts(xml: any): Promise<Map<string, string>> {
    const products = new Map<string, string>();
    let items = xml?.rss?.channel?.[0]?.item || [];
  
    if (items.length === 0) {
      throw new Error(`No items found in the feed!`);
    }
    if (!Array.isArray(items)) { // Handle the case where there is only one item
      items = [items];
    }
  
    items.forEach((item: any) => {
      const id = item['g:id']?.[0];
      const priceUnclean = item['g:price'] ? item['g:price']?.[0] : undefined; // Check if price exists before splitting
      /**
       * Price can be written with a currency or without and with thousands separator. 
       */
      const price = priceUnclean ? priceUnclean.split(' ')[0].replace(/,/g, '') : undefined;
      if (id && price) {
        products.set(id, price);
      }
    });
  
    return products;
  }

async function compareFeeds(oldUrl: string, newUrl: string) {
  try {
    const oldFeed = await fetchXML(oldUrl);
    const newFeed = await fetchXML(newUrl);

    const oldProducts = await extractProducts(oldFeed);
    const newProducts = await extractProducts(newFeed);

    console.log(`Got ${oldProducts.size} products from the old feed and ${newProducts.size} products from the new feed.`);

    const missingInNew = new Map<string, string>();
    const priceDifferences = new Map<string, [string, string]>();

    oldProducts.forEach((price, id) => {
      if (!newProducts.has(id)) {
        missingInNew.set(id, price);
      } else if (newProducts.get(id) !== price) {
        priceDifferences.set(id, [price, newProducts.get(id)!]);
      }
    });

    console.log(`Missing in new feed (total ${missingInNew.size}):`, Array.from(missingInNew));
    console.log(`Price differences (total ${priceDifferences.size}):`, Array.from(priceDifferences));

  } catch (error) {
    console.error("Error comparing feeds:", error);
  }
}

/**
 * Read old + new feed URLs from the command line arguments
 */
const oldFeedUrl = process.argv[2];
const newFeedUrl = process.argv[3];

compareFeeds(oldFeedUrl, newFeedUrl);
