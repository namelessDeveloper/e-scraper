import { promises as fs } from 'fs'

export const readAsync = (path) => fs.readFile(path, 'utf8')

export async function downloadImage(page, { url, path }) {
  const imageSource = await page.goto(url);
  try {
    await fs.writeFile(path, await imageSource.buffer())
  } catch (err) {
    console.log(err);
  }
  console.log(`Downloaded ${path}`);
}

export function replaceAll(str, target, replacement) {
  // If a regex pattern
  if (Object.prototype.toString.call(target).toLowerCase() === '[object regexp]') {
    return str.replace(target, replacement);
  }

  // If a string
  return str.replace(new RegExp(target, 'g'), replacement);
};