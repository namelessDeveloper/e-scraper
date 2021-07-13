import tap from 'tap'
import puppeteer from 'puppeteer'
import { Cache } from '../../lib/cache.js'
import { Literotica } from "../../lib/scrapers/literotica.js"

const E_SCRAPER_CACHE = '/tmp/e-scraper/testing-scope'

let page;
let cache;

tap.beforeEach(async () => {
  const browser = await puppeteer.launch()
  page = await browser.newPage()
  cache = new Cache(E_SCRAPER_CACHE, true)
})

tap.test('Literotica scraper', async test => {
  const scraper = new Literotica({page, cache})
  await scraper.scrape('https://literotica.com/s/the-seminal-regulator-insert')
  test.end()
})
