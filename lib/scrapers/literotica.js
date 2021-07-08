/**
 * A "novelPage" corresponds to the pages of a published story, which are only
 * separated this way for UX reasons (avoiding really long page scroll)
 * 
 * A novelChapter is instead separate chapter that the author published.
 * (A novelChapter may have many novelPages)
 */

import { click, getText } from './index.js'

async function* arrayEvalute(array, evaluator) {
  for (let p of array) {
    yield await p.evaluate(evaluator)
  }
} 

function novelTemplate(title, description, yml) {
  return `---\n${yml.join('\n')}\n---\n# ${title}\n\n${description}\n\n---\n\n`
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


export class Literotica {
  #cache = null
  title = null
  constructor(cache) {
    this.#cache = cache
    // Because page.waitFor(seconds) is deprecated and warnings are annoying
    console.warn = () => {}
  }

  async #getTitle(page) {
    return await page.$eval('.headline', getText)
  }

  /**
   * Gets chapters of Novel, if applicable. Defaults to 1
   * @returns {number}
   */
  async #getChapters(page) {
    try {
      const chaptersText = await page.$eval('.aK_at p', getText)
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
  async #getPages(page) {
    try {
      const anchorList = await page.$$('a.l_bJ')
      const lastAnchor = anchorList[anchorList.length - 1]
      const pages = await lastAnchor.evaluate(getText)
      return parseInt(pages)
    } catch (error) {
      return 1
    }
  }

  async #getSeriesTitle(page) {
    try {
      return await page.$eval('.aK_au a', getText)
    } catch (error) {
      return await this.#getTitle(page)
    }
  }

  #initNovel(title, description, {url, tags}) {
    return novelTemplate(title, description, [
      'cssclass: is-readable-line-width',
      `source: ${url}`,
      'tags:',
      '- content/literotica',
      ...tags
    ])
  }

  async #getTags(page) {
    const tagArray = await page.$$('.av_as.av_r')
    let tags = []
    for await (let tag of arrayEvalute(tagArray, getText) ) {
      tags.push(tag)
    }
    return normalizeTags(tags)
  }

  async #hasNextChapter(page) {
    try {
      return await page.$eval('.z_fi', getText) === '(Next Part)'
    } catch (error) {
      return false
    }
  }

  async scrape(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.waitFor(1000)
    const novelChapters = await this.#getChapters(page)
    
    const seriesTitle = await this.#getSeriesTitle(page)
    this.#cache.createDir(seriesTitle)

    console.log({novelChapters});
    for (let ii = 0; ii < novelChapters; ii++) {
      const description = await page.$eval('.aK_B', getText)
      const title = await this.#getTitle(page)      
      const tags = await this.#getTags(page)
      let novel = this.#initNovel(title, description, {url, tags})
      console.log({title, description, tags});
      const novelPages = await this.#getPages(page)
      console.log({novelPages});
      for (let i = 0; i < novelPages; i++) {
        // const pageID = await page.$eval('.h_aW span', getText)
        const paragraphs = await page.$$('.aa_ht div p')
        let pageText = ''
        for await (let p of arrayEvalute(paragraphs, getText) ) {
          pageText += `${p}\n\n`
        }
        novel += `${pageText}\n`
        console.log({page: i + 1});
        if(i + 1 < novelPages) {
          await page.$eval('.l_bJ.l_bL', click)
          await page.waitFor(500)
        }
      }
      console.log({characters: novel.length});
      await this.#cache.set(title, novel)
      const hasNext = await this.#hasNextChapter(page)
      // Technically, if the loop is right, this if is not necessary...
      if(hasNext){
      // console.log({hasNext});
        await page.$eval('.z_t', click)
        await page.waitFor(1000)
      } else {
        // in the case that we started from say chapter 2 instead of 1
        // TODO see if we can remove the outer loop
        break
      }
    }

    console.log(this.#cache.path);
  }
}