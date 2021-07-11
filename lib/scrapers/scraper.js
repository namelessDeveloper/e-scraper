export class Scraper {
  _cache = null
  _page = null
  title = null
  _author = { name: null, url: null }
  constructor({page, cache}) {
    this._page = page
    this._cache = cache
    // Because page.waitFor(seconds) is deprecated and warnings are annoying
    console.warn = () => {}
    // This creates a folder based on the child class's name
    this._cache.createDir(this.__proto__.constructor.name)
  }
}

export const getText = el => el.textContent
export const getHref = el => el.href

export const click = el => el.click()