import clipboardy from 'clipboardy'
import Input from 'prompt-input'
import { arrayEvalute, click, getImgSrc, getText, Scraper } from './scraper.js'
import { compileTemplate } from '../handlebars.js'

const MILOVANA_LOGIN_PAGE = 'https://milovana.com/id/'
const COOKIES_FILE = 'cookies.json'
const EOS_PAGE_TEMPLATE = 'lib/templates/eosPage.hbs'
const EOS_PLAYTHRU_TEMPLATE = 'lib/templates/eosPlaythru.hbs'

//TODO refactor this into the class
const waitForResponse = (page, url = undefined) => {
  return new Promise(resolve => {
    page.on("response", function callback(response){
      if (url === undefined || response.url() === url) {
        resolve(response);
      }
      page.removeListener("response",callback)
    })
  })
};

export class Milovana extends Scraper {
  async login() {
    await this._page.goto(MILOVANA_LOGIN_PAGE, { waitUntil: 'networkidle2' })

    const {username, password} = await this._promptLogin()

    // Username
    await this._fillInput('#login_username', username)
    await this._fillInput('#login_password', password)

    // Keep me signed in
    await this._page.$eval('#login_permanent', click)

    // Login!
    await this._page.$eval('#cm_wide > div:nth-child(3) > div > form > p.button > input[type=submit]', click)
    await this._wait()

    // Save Cookies
    const cookies = await this._page.cookies();
    await this._cache.set(COOKIES_FILE, JSON.stringify(cookies, null, 2))

    console.log('Login Successful!')
    console.log('You can now drop the -l / --login flag and scrape normally')

    await this._page.close()
  }

  async isEos() {
    try {
      const rating = await this._page.$eval('#eosRatingDialog', getText)
      return true
    } catch (error) {
      return false
    }
  }

  async scrape(url) {
    await this._page.goto(url, { waitUntil: 'networkidle2' })      

    let isEos = await this.isEos()
    
    const props = {page: this._page, cache: this._cache}
    const scraper = !isEos ? new MilovanaTease(props) : new MilovanaEOS(props)
    await scraper.scrape(url)
  }
}

class MilovanaTease extends Scraper {
  // Its actually ${title} by ${author}, which makes it a good uuid too. But whatever
  async #getTitle() {
    const titleNode = await this._page.$('#tease_title')
    const title = await titleNode.evaluate(el => el.textContent)
    this.title = title
    return title
  }

  async #getNovel(title) {
    let novel = await this._cache.get(`${title}.md`)
    // Cache hit
    if(novel !== null){ 
      return novel
    }
    // scrape and cache!
    novel = await this.#getMilovanaNovel(this._cache.silent)
    
    await this._cache.set(`${title}.md`, novel)
  
    return novel
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
    const title = await this.#getTitle()
    const novel = await this.#getNovel(title)
    
    !this._cache.silent && clipboardy.writeSync(novel);
  }
}

class MilovanaEOS extends Scraper {
  #eos = {}
  #eosOrder = []

  #getTeaseID (search) {
    return search
      .slice(1)
      .split('&')
      .filter(el => el.startsWith('id'))[0]
      .split('=')[1]
  }

  // if null, no continue indicator. if not null can call .click() to continue
  async getContinueIndicator() {
    return await this._page.$eval('.TextBubble_continueIndicator__sXRN-')
  }

  async getPrompt() {
    await this._page.$eval('.PromptBubble_root__fSr1O input')
  }



  async #getPageId(frame) {
    return await frame.$eval('#eosContainer > div.TopBar_root__vkQ0A > div.DebugInterface_root__3CKfN > div > button', getText)
  }

  async #getImage(frame) {
    return await frame.$eval('#eosContainer > div.Viewport_root__1xGnl > div.Picture_root__1KcRX > img', getImgSrc)
  }

  async #eosGetText(frame) {
    const paragraphs = await frame.$$('.SingleBubble_root__2r7DX p')
    let pageText = ''
    for await (let p of arrayEvalute(paragraphs, getText) ) {
      pageText += `${p}\n\n`
    }
    return pageText
  }

  async #eosGetLinks(frame) {
    const linkArr = await frame.$$('.ChoiceBubble_root__38cRB div')
    if(!linkArr?.length) return []
    let texts = []
    for await (let text of arrayEvalute(linkArr, getText) ) {
      texts.push(text)
    }
    return linkArr.map((link, i) => ({
      link, // puppeteer link
      text: texts[i], // text displayed on page
      id: null, // id that this button goes to
      chosen: null
    }))
  }

  async #eosGetPageData (frame) {
    const id = await this.#getPageId(frame)
    // console.log(`Page ID: ${id}`);
    const image = await this.#getImage(frame)
    const text = await this.#eosGetText(frame)
    // console.log(text);
    const links = await this.#eosGetLinks(frame)

    this.#eos[id] = {
      id, image, text, links
    }
    this.#eosOrder.push(id)

    return {links, id}
  }

  async #eosPromptUserChoice(links) {
    console.log('Choose an Option (-1 to exit)');
    const link = new Input({
      name: 'linkChoice',
      message: '\n' + links.map((l, i) => `${i} - ${l.text.trim()}`).join('\n') + '\n'
    })

    const linkChoice = await link.run()

    return parseInt(linkChoice)
  }

  async scrape(url) {
    const cookiesString = await this._cache.get(COOKIES_FILE)
    if(cookiesString === null) {
      console.error('This is an EOS Link. Eos requires login. add -l or --login')
      console.log('Once logged in, you don\'t need to unless the e-scraper/milovana/cookies.json file is deleted')
      return
    }

    const cookies = JSON.parse(cookiesString);
    await this._page.setCookie(...cookies);
    
    const { origin, pathname, search} = new URL(url)
    const teaseID = this.#getTeaseID(search)
    const eosUrl = `${origin}${pathname}?id=${teaseID}&preview=1`
    await this._page.goto(eosUrl, { waitUntil: 'networkidle2' })
    // const res = await waitForResponse(this._page, `https://milovana.com/webteases/geteosscript.php?id=${teaseID}&preview=1`)
    // console.log(res);
    await this._page.waitForSelector("iframe.eosIframe");
    const elementHandle = await this._page.$('iframe.eosIframe');
    
    // EOS IFrame is laoded

    const frame = await elementHandle.contentFrame();

    await this._wait(200)

    await elementHandle.evaluate(el => {
      const doc = document.querySelector('iframe').contentWindow.document
      doc.querySelector('.SplashScreen_root__3vtZk').click()
    })
    await this._wait(1000)

    let choice = null

    while (true) {
      const {links, id} = await this.#eosGetPageData(frame)
      if(choice !== null) {
        const prevId = this.#eosOrder[this.#eosOrder.length - 2]
        if(this.#eos[prevId]){
          this.#eos[prevId].links[choice].id = id
          this.#eos[prevId].links[choice].chosen = choice
        }
      }
      
      if(links.length === 0) {
        break
      }


      choice = await this.#eosPromptUserChoice(links)
      // choice = mockChoices.pop()
      if(choice === -1) { //exit early
        break
      }
      links[choice].link.evaluate(click)
      await waitForResponse(this._page)
      await this._wait(200)
    }
    
    console.log(this.#eos)
    console.log(this.#eosOrder)


    this._cache.createDir('eos-test')

    const orderedData = []

    for (const id of this.#eosOrder) {
      const data = this.#eos[id]
      const txt = await compileTemplate(EOS_PAGE_TEMPLATE, data)
      this._cache.set(`${id}.md`, txt)
      orderedData.push(data)
    }


    const txt = await compileTemplate(EOS_PLAYTHRU_TEMPLATE, {dataArray: orderedData})
    this._cache.set('index.md', txt)
  }

}