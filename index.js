import puppeteer from 'puppeteer'
import clipboardy from 'clipboardy'
import { isWebUri } from 'valid-url'
import fs from 'fs'
import { Cache } from './lib/cache.js'
import { getScraper } from './lib/scrapers/index.js'


async function main(url, silent) {
  const browser = await puppeteer.launch()
  try {
    await app(browser, url, silent)
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}

const E_SCRAPER_CACHE = '/tmp/e-scraper'

const urls = process.argv.slice(2)

if (urls.length === 0) {
  const clipboard = clipboardy.readSync()
  if(clipboard.startsWith('https://')){
    main(clipboard)
  } else {
    process.exit(0)
  }
}

if (urls.length === 1) {
  main(urls[0])
} else {
  for (const url of urls) {
    // TODO main is not awaited -> unexpected behaviour will ensue
    main(url, true)
  }
}



//TODO implement a logger to avoid passing around silent

async function app(browser, url, silent = false) {
  if(!isWebUri(url)) {
    console.error('Not a valid URL')
    return
  }
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  const cache = new Cache(E_SCRAPER_CACHE, silent)

  const Scraper = getScraper(url)
  const scraper = new Scraper(cache)
  await scraper.scrape(page, url)

  // await debugScreenshot(page, cache.screenshotPath(scraper.title))
}

async function debugScreenshot(page, path) {
  try {
    if (fs.existsSync(path)){
      fs.unlinkSync(path)
    }
    await page.screenshot({ path })
  } catch (error) {
    console.error(error)
  }
}
