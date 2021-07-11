import { getText, getHref, Scraper, click, getImgSrc, arrayEvalute } from "./scraper.js"

function novelTemplate(title, author, description, yml) {
  return `---\n${yml.join('\n')}\n---
# ${title}

_by ${author}_

${description}

---

`
}

export class Imagefap extends Scraper {
  #initStory = ({title, formattedAuthor, description, url}) => [
      '---',
      'cssclass: is-readable-line-width',
      `source: ${url}`,
      `author: "${this._author.name}"`,
      `authorUrl: "${this._author.url}"`,
      'tags:',
      '- content/caption-story',
      `- author/${this._author.name}`,
      '---',
      `# ${title}`,
      '',
      `_by ${formattedAuthor}_`,
      '',
      `${description}`,
      '',
      '---',
      '',
    ].join('\n')
  
  async #getTitle() {
    return await this._page.$eval(
      "#menubar > table > tbody > tr:nth-child(1) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > b:nth-child(1) > font",
      getText
    )
  }

  async #getAuthor() {
    const author = await this._page.$eval(
      "#menubar > table > tbody > tr:nth-child(1) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > b:nth-child(3) > font",
      el => el.textContent.slice(12)
    )
    const profileLink = await this._page.$eval(
      "#menubar > table > tbody > tr:nth-child(2) > td:nth-child(1) > a",
      getHref
    )
    this._author.name = author
    this._author.url = profileLink
    return `[${author}](${profileLink})` 
  }

  async #getDescription() {
    try {
      return await this._page.$eval(
        '#cnt_description > center > table > tbody > tr > td > font > span',
        getText
      )
    } catch (error) {
      // Description is optional
      return ''
    }
  }

  async #startGallery() {
    const anchors = await this._page.$$(
      "table > tbody > tr:nth-child(1) > td > a"
    )

    const evaluator = el => [el.name, el.href]

    let link
    for await (let [name, href] of arrayEvalute(anchors, evaluator) ) {
      if(name !== ''){
        link = href
        break
      }
    }
    
    await this._navigate(link)
  }

  async #tryNext() {
    try {
      const href = await this._page.$eval(
        "#navigation > div.top.pagination > a.next", getHref
      )
      await this._navigate(href)
      return true
    } catch (err) {
      return false
    }
  }

  async #getPictureLink() {
    const selector = "#slideshow > center > div.image-wrapper > span > img"
    // Even after waiting for the element once, it sometimes would fail
    // So waiting then checking again seems to make it way more consistent
    await this._page.waitForSelector(selector)
    await this._wait(50)
    await this._page.waitForSelector(selector)
    return await this._page.$eval(selector, img => img.src)
  }

  async #getFilenames() {
    const filesArray = await this._page.$$(
      "table > tbody > tr:nth-child(2) > td > font:nth-child(2) > i"
    )
    const names = []
    for await (let name of arrayEvalute(filesArray, getText) ) {
      names.push(name)
    }
    return names
  }

  // THis makes sure that its in the one page view, so we can scrape all file names
  #getOnePageGalleryURL(link) {
    const url = new URL(link)
    const gid = url.pathname.split('/')[2]
    url.search = `?gid=${gid}&view=2`
    return url.toString()
  }

  async scrape(url) {
    await this._navigate(this.#getOnePageGalleryURL(url))

    const title = await this.#getTitle()
    this._cache.createDir(title)
    console.log({title});

    const formattedAuthor = await this.#getAuthor()
    console.log({formattedAuthor});

    const description = await this.#getDescription()
    console.log({description});

    const filenames = await this.#getFilenames()
    console.log({length: filenames.length, filenames});

    await this.#startGallery()
    const gallery = []
    do {
      const galleryUrl = await this._page.url()
      for (let i = 0; i < filenames.length; i++) {
        await this._navigate(`${galleryUrl}#${i}`, 250)
        const imgSrc = await this.#getPictureLink()
        // this._screenshot(this._cache.newFilePath('debug-'+filenames[i]))
        gallery.push(imgSrc)
        console.log({[gallery.length]: imgSrc});
      }
    } while (await this.#tryNext())

    this._cache.createDir('images')
    for (let i = 0; i < filenames.length; i++) {
      await this._downloadImage(gallery[i], filenames[i])
    }
    this._cache.upDir()

    let story = this.#initStory({title, formattedAuthor, description, url})
    for (let i = 0; i < filenames.length; i++) {
      story += `![[${title}/images/${filenames[i]}]]\n`
    }
    await this._cache.set(title, story)
  }
}