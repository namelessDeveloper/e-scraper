import puppeteer from 'puppeteer'
import fs from 'fs'
// import promptSync from'prompt-sync'
// const prompt = promptSync()

import clipboardy from 'clipboardy'


async function main(url){
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

async function app(browser, url){
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  await page.goto(url, {
    waitUntil: 'networkidle2',
  })
  

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

  const titleNode = await page.$('#tease_title')
  let title = await titleNode.evaluate(el => el.textContent)
  const tmpDir = '/tmp/milovana'
  if (!fs.existsSync(tmpDir)){
    fs.mkdirSync(tmpDir);
  }
  const path = `${tmpDir}/debug-${title}.png`
  fs.unlinkSync(path)
  await page.screenshot({ path })
  clipboardy.writeSync(novel);
}

function format(text, src){
  // reduce whitespace
  const txt = text.replace(/\n\n\n/g, '\n');
  // markdown image format
  const img = `![](${src})`
  return `${txt}\n${img}\n\n`
}