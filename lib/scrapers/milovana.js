import clipboardy from 'clipboardy'

export class Milovana {
  #cache = null
  title = null
  constructor(cache) {
    this.#cache = cache
  }

  async #getNovel(page, title) {
    let novel = await this.#cache.get(title)
    // Cache hit
    if(novel !== null){ 
      return novel
    }
    // scrape and cache!
    novel = await this.#getMilovanaNovel(page, this.#cache.silent)
    
    await this.#cache.set(title, novel)
  
    return novel
  }

  // Its actually ${title} by ${author}, which makes it a good uuid too. But whatever
  async #getTitle(page) {
    const titleNode = await page.$('#tease_title')
    const title = await titleNode.evaluate(el => el.textContent)
    this.title = title
    return title
  }

  async #getMilovanaNovel(page, silent) {
    let continueButton
    let novel = ''
    do {
      continueButton = await page.$('#continue')
  
      const textNode = await page.$('#tease_content .text')
      let text = await textNode.evaluate(el => el.textContent)
  
      const imgNode = await page.$('#cm_wide img')
      let src = await imgNode.evaluate(el => el.src)
  
      const nextPart = this.#format(text, src)
      
      !silent && console.log(nextPart)
      
      novel += nextPart
      if(continueButton !== null) {
        await continueButton.evaluate(el => el.click())
        await page.waitForNavigation()
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

  async scrape(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2' })
    const title = await this.#getTitle(page)
    const novel = await this.#getNovel(page, title)

    !this.#cache.silent && clipboardy.writeSync(novel);
  }
}