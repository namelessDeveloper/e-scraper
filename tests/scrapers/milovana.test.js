import tap from 'tap'
import puppeteer from 'puppeteer'
import { Cache } from '../../lib/cache.js'
import { Milovana } from "../../lib/scrapers/milovana.js"

const E_SCRAPER_CACHE = '/tmp/e-scraper/testing-scope'

let page;
let cache;

tap.beforeEach(async () => {
  const browser = await puppeteer.launch()
  page = await browser.newPage()
  cache = new Cache(E_SCRAPER_CACHE, true)
})

tap.test('Milovana scraper', async test => {
  const scraper = new Milovana({page, cache})
  await scraper.scrape('https://milovana.com/webteases/showtease.php?id=31784')
  test.end()
})