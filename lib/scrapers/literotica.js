/**
 * A "novelPage" corresponds to the pages of a published story, which are only
 * separated this way for UX reasons (avoiding really long this._page scroll)
 * 
 * A novelChapter is instead separate chapter that the author published.
 * (A novelChapter may have many novelPages)
 */

import { arrayEvalute, click, getText, Scraper } from './scraper.js'

function novelTemplate(title, author, description, yml) {
  return `---\n${yml.join('\n')}\n---\n# ${title}\n\n_by ${author}_\n\n${description}\n\n---\n\n`
}


// This map either blocks or transforms
const tagMap = {
  // snake-case here 
  'fdom':             false,
  'femdom':           false,
  'fetish':           false,
  'female-dominant':  false,
  'tease-and-denial': 'tease-denial',
  'denial':           'tease-denial',
  'tease':            'tease-denial',
  'ruined-orgasm':    'orgasm/ruined',
  'ruined':           'orgasm/ruined',
  'orgasm-denial':    'orgasm/denial',
  'cum':              'orgasm',
  'chastity-belt':    'chastity',
  'chastity-device':  'chastity',
  'university':       'college',
  'power':            'power-exchange',
  'pussy-eating':     'cunnilingus',
}

function reduceTags(acc, tag){
  const value = tagMap[tag]
  if(typeof value === 'string') {
    acc.push(value)
  }
  if(value === undefined) {
    acc.push(tag)
  }
  return acc
}

function normalizeTags(tags) {
  const normalized = tags
    .map(tag => tag.split(' ').join('-'))
    .reduce(reduceTags, [])
    .map(tag => `- ${tag}`)
  return new Set(normalized)
}


export class Literotica extends Scraper {
  async #getTitle() {
    return await this._page.$eval('.headline', getText)
  }

  /**
   * Gets chapters of Novel, if applicable. Defaults to 1
   * @returns {number}
   */
  async #getChapters() {
    try {
      const chaptersText = await this._page.$eval('.aK_at p', getText)
      const chapters = chaptersText.split(' ')[4]
      return parseInt(chapters)
    } catch (error) {
      return 1
    }
  }

  /**
   * Gets pages of Novel, if applicable. Defaults to 1
   * @returns {number}
   */
  async #getPages() {
    try {
      const anchorList = await this._page.$$('a.l_bJ')
      const lastAnchor = anchorList[anchorList.length - 1]
      const pages = await lastAnchor.evaluate(getText)
      return parseInt(pages)
    } catch (error) {
      return 1
    }
  }

  async #getSeriesTitle() {
    try {
      return await this._page.$eval('.aK_au a', getText)
    } catch (error) {
      return await this.#getTitle()
    }
  }

  #initNovel({title, author, description, url, tags}) {
    return novelTemplate(title, author, description, [
      'cssclass: is-readable-line-width',
      `source: ${url}`,
      `author: "${this._author.name}"`,
      `authorUrl: "${this._author.url}"`,
      'tags:',
      '- content/literotica',
      `- author/${this._author.name}`,
      ...tags
    ])
  }

  async #getTags() {
    const tagArray = await this._page.$$('.av_as.av_r')
    let tags = []
    for await (let tag of arrayEvalute(tagArray, getText) ) {
      tags.push(tag)
    }
    return normalizeTags(tags)
  }

  async #hasNextChapter() {
    try {
      return await this._page.$eval('.z_fi', getText) === '(Next Part)'
    } catch (error) {
      return false
    }
  }

  async #getAuthor() {
    const name = await this._page.$eval('.y_eU', getText)
    const url = await this._page.$eval('.y_eU', el => el.href)
    this._author.name = name
    this._author.url = url
    return `[${name}](${url})`
  }

  async scrape(url) {
    await this._page.goto(url, { waitUntil: 'networkidle2' })
    await this._page.waitFor(1000)

    const author = await this.#getAuthor()
    this._cache.createDir(this._author.name)
    console.log({author})
    
    const seriesTitle = await this.#getSeriesTitle()
    this._cache.createDir(seriesTitle)
    
    const novelChapters = await this.#getChapters()
    console.log({novelChapters});
    for (let ii = 0; ii < novelChapters; ii++) {
      const description = await this._page.$eval('.aK_B', getText)
      const title = await this.#getTitle()      
      const tags = await this.#getTags()
      let novel = this.#initNovel({title, author, description, url, tags})
      console.log({title, description, tags});
      const novelPages = await this.#getPages()
      console.log({novelPages});
      for (let i = 0; i < novelPages; i++) {
        // const pageID = await this._page.$eval('.h_aW span', getText)
        const paragraphs = await this._page.$$('.aa_ht div p')
        let pageText = ''
        for await (let p of arrayEvalute(paragraphs, getText) ) {
          pageText += `${p}\n\n`
        }
        novel += `${pageText}\n`
        console.log({page: i + 1});
        if(i + 1 < novelPages) {
          await this._page.$eval('.l_bJ.l_bL', click)
          await this._page.waitFor(500)
        }
      }
      console.log({characters: novel.length});
      await this._cache.set(title, novel)
      const hasNext = await this.#hasNextChapter()
      // Technically, if the loop is right, this if is not necessary...
      if(hasNext){
      // console.log({hasNext});
        await this._page.$eval('.z_t', click)
        await this._page.waitFor(1000)
      } else {
        // in the case that we started from say chapter 2 instead of 1
        // TODO see if we can remove the outer loop
        break
      }
    }

    console.log(this._cache.path);
  }
}