import clipboardy from 'clipboardy'
import { replaceAll } from '../util.js'
import { Scraper } from './scraper.js'

const BLOGSPOT_WIDTH = 570

export class Milovana extends Scraper {
  async #getNovel(title) {
    let novel = await this._cache.get(title)
    // Cache hit
    if (novel !== null) {
      return novel
    }
    // scrape and cache!
    novel = await this.#getMilovanaNovel(this._cache.silent, title)

    await this._cache.set(title, novel)

    return novel
  }

  // Its actually ${title} by ${author}, which makes it a good uuid too. But whatever
  async #getTitle() {
    const titleNode = await this._page.$('#tease_title')
    const title = await titleNode.evaluate(el => el.textContent)

    this.title = replaceAll(title, ':', '-') // : is invalid in file names
    return this.title
  }

  async #getMilovanaNovel(silent, title) {
    let continueButton
    let novel = `---\n---\n\n# ${title}\n\n`
    do {
      continueButton = await this._page.$('#continue')

      const textNode = await this._page.$('#tease_content .text')
      let text = await textNode.evaluate(el => el.textContent)

      const imgNode = await this._page.$('#cm_wide img')
      const img = await imgNode.evaluate(el => ({
        src: el.src,
        height: el.height,
        width: el.width
      }))

      const nextPart = this.#format(text, img)

      !silent && console.log(nextPart)

      novel += nextPart
      if (continueButton !== null) {
        await continueButton.evaluate(el => el.click())
        await this._page.waitForNavigation()
      }
    } while (continueButton !== null)

    return novel
  }

  #format(text, { src }) {
    // reduce whitespace
    const txt = text.replace(/\n\n\n/g, '\n');
    // markdown image format
    const img = `![](${src})\n`
    return `${txt}\n${img}\n\n`
  }

  #htmlFormat(text, { src, width, height }) {

    // Scale the image down if the width is larger than the blogspot page width.
    if (width > BLOGSPOT_WIDTH) {
      height = height / (width / BLOGSPOT_WIDTH)
      width = BLOGSPOT_WIDTH
    }

    const txt = text.replace(/\n\n\n/g, '<br>');
    const img = `<a href="${src}"><img src="${src}" width="${width}" height="${height}"></a>`
    return `${img}\n<p>${txt}</p>\n`
  }

  async scrape(url) {
    await this._page.goto(url, { waitUntil: 'networkidle2' })
    const title = await this.#getTitle()
    const novel = await this.#getNovel(title)

    !this._cache.silent && clipboardy.writeSync(novel);
  }
}