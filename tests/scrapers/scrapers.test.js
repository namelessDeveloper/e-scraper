import tap from 'tap'
import puppeteer from "puppeteer";
import { Cache } from "../../lib/cache.js";

import { Imagefap } from "../../lib/scrapers/imagefap.js"
import { Literotica } from "../../lib/scrapers/literotica.js"
import { Milovana } from "../../lib/scrapers/milovana.js"

const E_SCRAPER_CACHE = '/tmp/e-scraper/testing'

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

tap.test('Literotica scraper', async test => {
  const scraper = new Literotica({page, cache})
  await scraper.scrape('https://literotica.com/s/the-seminal-regulator-insert')
  test.end()
})

tap.test('Milovana scraper', async test => {
  const scraper = new Milovana({page, cache})
  await scraper.scrape('https://milovana.com/webteases/showtease.php?id=31784')
  test.end()
})