import {promises as fs} from 'fs'

export const readAsync = (path) => fs.readFile(path, 'utf8')

export async function downloadImage(page, { url, path}) {
  const imageSource = await page.goto(url);
  try {
    await fs.writeFile(path, await imageSource.buffer())
  } catch (err) {
    console.log(err); 
  }
  console.log(`Downloaded ${path}`);
}

/*

    const [untilFinished, finish] = waitHandle()
    this._page.on('close', () => finish('closed page'))

    const res = await untilFinished
    console.log({res});
*/

export function waitHandle(page) {
  
  const sigint = () => resolve('ctrl + c')
  const closedPage = () => finish('closed page')

  let resolver
  const promise = new Promise(resolve => {
    resolver = (...data) => {
      process.removeListener('SIGINT', sigint)
      page.off('close', closedPage)
      resolve(...data)
    }
  })

  process.on('SIGINT', sigint);
  page.on('close', closedPage)

  return [promise, resolver]
}

export function waitTimeout(ms = 1000, value) {
  let resolver
  
  const promise = new Promise(resolve => {
    resolver = (...data) => {
      resolve(...data)
      clearTimeout(timer)
    }
    const timer = setTimeout(() => resolve(value), ms)
  })

  return [promise, resolver]
}