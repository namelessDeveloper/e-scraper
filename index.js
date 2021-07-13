import puppeteer from 'puppeteer'
import clipboardy from 'clipboardy'
import { isWebUri } from 'valid-url'
import { Cache } from './lib/cache.js'
import { getScraper } from './lib/scrapers/index.js'

const E_SCRAPER_CACHE = '/tmp/e-scraper'

const urls = process.argv.slice(2)

main(urls)

async function main(urls) {
  if (urls.length === 0) {
    const clipboard = clipboardy.readSync()
    if(clipboard.startsWith('https://')){
      await app(clipboard)
    } else {
      process.exit(0)
    }
  }
  
  if (urls.length === 1) {
    await app(urls[0])
  } else {
    for (const url of urls) {
      await app(url, true)
    }
  }
}

async function app(url, silent = false) {
  if(!isWebUri(url)) {
    console.error('Not a valid URL')
    return
  }
  const browser = await puppeteer.launch()
  const page = await browser.pages()[0]
  await page.setViewport({ width: 1000, height: 1000 })
  
  try {
    const cache = new Cache(E_SCRAPER_CACHE, silent)
    const Scraper = getScraper(url)
    const scraper = new Scraper({page, cache})
    await scraper.scrape(url)
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}
