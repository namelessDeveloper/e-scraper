import puppeteer from 'puppeteer'
import clipboardy from 'clipboardy'
import fs from 'fs'

import {readAsync} from './lib/util.js'

async function main(url, silent) {
  const browser = await puppeteer.launch()
  try {
    await app(browser, url, silent)
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close()
  }
}

const MILOVANA_CACHE = '/tmp/milovana'

const urls = process.argv.slice(2)

if (urls.length === 0) {
  const clipboard = clipboardy.readSync()
  if(clipboard.startsWith('https://milovana.com/webteases/showtease.php')){
    main(clipboard)
  } else {
    process.exit(0)
  }
}

if (urls.length === 1) {
  main(urls[0])
}

for (const url of urls) {
  // TODO main is not awaited -> unexpected behaviour will ensue
  main(url, true)
}


//TODO implement a logger to avoid passing around silent

async function app(browser, url, silent = false) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  await page.goto(url, {
    waitUntil: 'networkidle2',
  })
  
  if (!fs.existsSync(MILOVANA_CACHE)){
    fs.mkdirSync(MILOVANA_CACHE);
  }
  const title = await getTitle(page)
  const novel = await getNovel(page, `${MILOVANA_CACHE}/${title}.md`, silent)

  !silent && clipboardy.writeSync(novel);
  try {
    await debugScreenshot(page, title)
  } catch (error) {
    console.error(error)
  }
}

function format(text, src) {
  // reduce whitespace
  const txt = text.replace(/\n\n\n/g, '\n');
  // markdown image format
  const img = `![](${src})\n`
  return `${txt}\n${img}\n\n`
}


async function getNovel(page, path, silent) {
  const cache = await queryCache(path, silent)
  // Cache hit
  if(cache !== null){ 
    return cache
  }
  // scrape and cache!
  const novel = await getMilovanaNovel(page, silent)
  try {
    fs.writeFileSync(path, novel);
  } catch (error) {
    console.error(error)
  }
  return novel
}

async function queryCache(path, silent) {
  const exists = fs.existsSync(path)
  if (exists){
    const file = await readAsync(path)
    !silent && console.log(file)
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
  const path = `${MILOVANA_CACHE}/${title}.png`
  if (fs.existsSync(path)){
    fs.unlinkSync(path)
  }
  await page.screenshot({ path })
}

async function getMilovanaNovel(page, silent) {
  let continueButton
  let novel = ''
  do {
    continueButton = await page.$('#continue')

    const textNode = await page.$('#tease_content .text')
    let text = await textNode.evaluate(el => el.textContent)

    const imgNode = await page.$('#cm_wide img')
    let src = await imgNode.evaluate(el => el.src)

    const nextPart = format(text, src)
    
    !silent && console.log(nextPart)
    
    novel += nextPart
    if(continueButton !== null) {
      await continueButton.evaluate(el => el.click())
      await page.waitForNavigation()
    }
  } while(continueButton !== null)

  return novel
} 