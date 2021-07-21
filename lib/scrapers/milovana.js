import clipboardy from 'clipboardy'
import { waitHandle } from '../util.js'
import { arrayEvalute, click, getHref, getText, Scraper } from './scraper.js'

const MILOVANA_LOGIN_PAGE = 'https://milovana.com/id/'
const COOKIES_FILE = 'cookies.json'
export class Milovana extends Scraper {
  #eos = {}
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

  async login() {
    await this._page.goto(MILOVANA_LOGIN_PAGE, { waitUntil: 'networkidle2' })

    const {username, password} = await this._promptLogin()

    // Username
    await this._page.focus('#login_username')
    await this._page.keyboard.type(username)

    // Password
    await this._page.focus('#login_password')
    await this._page.keyboard.type(password)

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

  async #isEos() {
    try {
      const rating = await this._page.$eval('#eosRatingDialog', getText)
      return true
    } catch (error) {
      return false
    }
  }

  async #getPageId(frame) {
    return await frame.$eval('#eosContainer > div.TopBar_root__vkQ0A > div.DebugInterface_root__3CKfN > div > button', getText)
  }

  async #getImage(frame) {
    return await frame.$eval('#eosContainer > div.Viewport_root__1xGnl > div.Page_root__3alPK > div > div.Page_media__1TjlW > img', getHref)
  }

  async #eosGetText(frame) {
    const paragraphs = await frame.$$('#eosContainer > div.Viewport_root__1xGnl > div.Page_root__3alPK > div.Page_main__3tpbp > div.Page_text__1sHZE > div > span > p')
    let pageText = ''
    for await (let p of arrayEvalute(paragraphs, getText) ) {
      pageText += `${p}\n\n`
    }
    return pageText
  }

  async #eosGetPageData (frame) {
    const id = await this.#getPageId(frame)
    const image = await this.#getImage(frame)
    const text = await this.#eosGetText(frame)

    this.#eos[id] = {
      id, image, text
    }

    return this.#eos[id]
  }

  #getTeaseID (search) {
    return search
      .slice(1)
      .split('&')
      .filter(el => el.startsWith('id'))[0]
      .split('=')[1]
  }

  async scrape(url) {
    await this._page.goto(url, { waitUntil: 'networkidle2' })      
    let isEos = await this.#isEos()
    if(!isEos) {
      const title = await this.#getTitle()
      const novel = await this.#getNovel(title)
      
      !this._cache.silent && clipboardy.writeSync(novel);
      return
    }

    
    // Eos Interractive WebTease Scraping...
    
    const cookiesString = await this._cache.get(COOKIES_FILE)
    if(cookiesString === null) {
      console.error('This is an EOS Link. Eos requires login. add -l or --login')
      console.log('Once logged in, you don\'t need to unless the e-scraper/milovana/cookies.json file is deleted')
      return
    }

    const cookies = JSON.parse(cookiesString);
    await this._page.setCookie(...cookies);
    
    try {
      const { origin, pathname, search} = new URL(url)
      // const eosUrl = `${origin}${pathname}?id=${this.#getTeaseID(search)}&preview=true`
      // await this._page.goto(eosUrl, { waitUntil: 'networkidle2' })      
    } catch (error) {
    }

    // await this._page.waitForSelector("iframe.eosIframe");
    // await this._wait()
    // const elementHandle = await this._page.$('iframe.eosIframe');
    // const frame = await elementHandle.contentFrame();

    // console.log(frame);

    // const data = await this.#eosGetPageData(frame)
    // console.log(data);
    
    // setInterval(async () => {
    // }, 2000);


  }
}