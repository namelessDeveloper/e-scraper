import puppeteer from 'puppeteer'
import { isWebUri } from 'valid-url'

import { Cache } from './lib/cache.js'
import { getScraper } from './lib/scrapers/index.js'

const E_SCRAPER_CACHE = `${process.env.HOME}/e-scraper`

export const appOptions = ({
  silent = false,
  interactive = false,
  login = false,
}) => ({
  silent,
  interactive,
  login,
})

export async function app(url, options = appOptions()) {
  if(!isWebUri(url)) {
    console.error('Not a valid URL')
    return
  }
  const browser = await puppeteer.launch({headless: !options.interactive})
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  
  try {
    const cache = new Cache(E_SCRAPER_CACHE, options.silent)
    const Scraper = getScraper(url)
    const scraper = new Scraper({page, cache})

    if(options.login) {
      await scraper.login()
      return
    }

    await scraper.scrape(url)
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}