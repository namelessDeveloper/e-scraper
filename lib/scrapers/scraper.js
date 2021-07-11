import puppeteer from "puppeteer";
import { Cache } from "../cache.js"
import fs, { promises } from 'fs'
export class Scraper {
  title = null
  _author = { name: null, url: null }
  /**@param {{page: puppeteer.Page, cache: Cache}} props */
  constructor({page, cache}) {
    this._page = page
    this._cache = cache
    // Because page.waitFor(seconds) is deprecated and warnings are annoying
    console.warn = () => {}
    // This creates a folder based on the child class's name
    this._cache.createDir(this.__proto__.constructor.name)
  }

  async _navigate(url, ms = 1000){
    await this._page.goto(url, { waitUntil: 'networkidle2' })
    await this._wait(ms)
  }

  async _wait(ms = 1000) {
    await this._page.waitFor(ms)
  }

  async _downloadImage(url, path) {
    const imgSrc = await this._page.goto(url);
    const imagePath = this._cache.newFilePath(path)
    await fs.writeFile(imagePath, await imgSrc.buffer(), err => {
      if(err){
        console.log(err);
      }
    })
    console.log(`Downloaded ${path}`);
  }

  async _screenshot(path) {
    try {
      if (fs.existsSync(path)){
        fs.unlinkSync(path)
      }
      await this._page.screenshot({ path })
    } catch (error) {
      console.error(error)
    }
  }
  
}

export const getText = el => el.textContent
export const getHref = a => a.href
export const getImgSrc = img => img.src

export const click = el => el.click()

export async function* arrayEvalute(array, evaluator) {
  for (let p of array) {
    yield await p.evaluate(evaluator)
  }
} 