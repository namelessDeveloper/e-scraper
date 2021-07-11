import clipboardy from 'clipboardy'
import { Scraper } from './scraper.js'

export class Milovana extends Scraper {
  async #getNovel(title) {
    let novel = await this._cache.get(title)
    // Cache hit
    if(novel !== null){ 
      return novel
    }
    // scrape and cache!
    novel = await this.#getMilovanaNovel(this._cache.silent)
    
    await this._cache.set(title, novel)
  
    return novel
  }

  // Its actually ${title} by ${author}, which makes it a good uuid too. But whatever
  async #getTitle() {
    const titleNode = await this._page.$('#tease_title')
    const title = await titleNode.evaluate(el => el.textContent)
    this.title = title
    return title
  }

  async #getMilovanaNovel(silent) {
    let continueButton
    let novel = ''
    do {
      continueButton = await this._page.$('#continue')
  
      const textNode = await this._page.$('#tease_content .text')
      let text = await textNode.evaluate(el => el.textContent)
  
      const imgNode = await this._page.$('#cm_wide img')
      let src = await imgNode.evaluate(el => el.src)
  
      const nextPart = this.#format(text, src)
      
      !silent && console.log(nextPart)
      
      novel += nextPart
      if(continueButton !== null) {
        await continueButton.evaluate(el => el.click())
        await this._page.waitForNavigation()
      }
    } while(continueButton !== null)
  
    return novel
  } 

  #format (text, src) {
    // reduce whitespace
    const txt = text.replace(/\n\n\n/g, '\n');
    // markdown image format
    const img = `![](${src})\n`
    return `${txt}\n${img}\n\n`
  }

  async scrape(url) {
    await this._page.goto(url, { waitUntil: 'networkidle2' })
    const title = await this.#getTitle()
    const novel = await this.#getNovel(title)

    !this._cache.silent && clipboardy.writeSync(novel);
  }
}