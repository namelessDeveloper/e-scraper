import tap from 'tap'
import puppeteer from 'puppeteer'
import { Cache } from '../../lib/cache.js'
import { Imagefap } from "../../lib/scrapers/imagefap.js"

const E_SCRAPER_CACHE = '/tmp/e-scraper/testing-scope'

let page;
let cache;

tap.beforeEach(async () => {
  const browser = await puppeteer.launch()
  page = await browser.newPage()
  cache = new Cache(E_SCRAPER_CACHE, true)
})

tap.test('Imagefap scraper', async test => {
  const scraper = new Imagefap({page, cache})
  await scraper.scrape('https://www.imagefap.com/pictures/7546291/Reparations-at-College-YOUR-COMMENTS-PLEASE%21%21')
  test.end()
})