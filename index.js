import path from 'path';
import { fileURLToPath } from 'url';

import puppeteer from 'puppeteer'
import clipboardy from 'clipboardy'
import { isWebUri } from 'valid-url'
import { Cache } from './lib/cache.js'
import { getScraper } from './lib/scrapers/index.js'

import { config } from 'dotenv'
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: __dirname + '/.env' });


const E_SCRAPER_CACHE = process.env.E_SCRAPER_CACHE || '/tmp/e-scraper';

const urls = process.argv.slice(2)

main(urls)

async function main(urls) {
  const browser = await puppeteer.launch()
  try {
    if (urls.length === 0) {
      const clipboard = clipboardy.readSync()
      if (clipboard.startsWith('https://')) {
        await app(browser, clipboard)
      } else {
        process.exit(0)
      }
    }

    if (urls.length === 1) {
      await app(browser, urls[0])
    } else {
      for (const url of urls) {
        await app(browser, url, true)
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}

async function app(browser, url, silent = false) {
  if (!isWebUri(url)) {
    console.error('Not a valid URL')
    return
  }
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  const cache = new Cache(E_SCRAPER_CACHE, silent)

  const Scraper = getScraper(url)
  const scraper = new Scraper({ page, cache })
  await scraper.scrape(url)

  await page.close()
}
