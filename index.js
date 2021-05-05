import puppeteer from 'puppeteer'
import fs from 'fs'
// import promptSync from'prompt-sync'
// const prompt = promptSync()
import {readAsync} from './lib/util.js'

import clipboardy from 'clipboardy'


async function main(url) {
  const browser = await puppeteer.launch()
  try {
    await app(browser, url)
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}
// prompt("Insert Milovana URL to scrape:\n")
const url = process.argv.slice(2)[0]
if(url){
  // console.error('Scraping...')
  main(url)
}

const MILOVANA_CACHE = '/tmp/milovana'

async function app(browser, url) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  await page.goto(url, {
    waitUntil: 'networkidle2',
  })
  
  if (!fs.existsSync(MILOVANA_CACHE)){
    fs.mkdirSync(MILOVANA_CACHE);
  }
  const title = await getTitle(page)
  const novel = await getNovel(page, `${MILOVANA_CACHE}/${title}.md`)

  await debugScreenshot(page, title)

  clipboardy.writeSync(novel);
}

function format(text, src) {
  // reduce whitespace
  const txt = text.replace(/\n\n\n/g, '\n');
  // markdown image format
  const img = `![](${src})`
  return `${txt}\n${img}\n\n`
}


async function getNovel(page, path) {
  const cache = await queryCache(path)
  // Cache hit
  if(cache !== null){ 
    return cache
  }
  // scrape and cache!
  const novel = await getMilovanaNovel(page)
  fs.writeFileSync(path, novel);
  return novel
}

async function queryCache(path) {
  const exists = fs.existsSync(path)
  if (exists){
    const file = await readAsync(path)
    console.log(file)
    return file
  }
  return null
}

// Its actually ${title} by ${author}, which makes it a good uuid too. But whatever
async function getTitle(page) {
  const titleNode = await page.$('#tease_title')
  return await titleNode.evaluate(el => el.textContent)
}

async function debugScreenshot(page, title) {
  const path = `${MILOVANA_CACHE}/debug-${title}.png`
  if (fs.existsSync(path)){
    fs.unlinkSync(path)
  }
  await page.screenshot({ path })
}

async function getMilovanaNovel(page) {
  let continueButton
  let novel = ''
  do {
    continueButton = await page.$('#continue')

    const textNode = await page.$('#tease_content .text')
    let text = await textNode.evaluate(el => el.textContent)
    console.log(text)

    const imgNode = await page.$('#cm_wide img')
    let src = await imgNode.evaluate(el => el.src)
    console.log(src);

    novel += format(text, src)
    if(continueButton !== null) {
      await continueButton.evaluate(el => el.click())
      await page.waitForNavigation()
    }
  } while(continueButton !== null)

  return novel
} 