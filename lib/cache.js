import fs from 'fs'
import {readAsync} from './util.js'

export class Cache {
  constructor(cachePath, silent) {
    this.path = cachePath
    this.silent = silent
    if (!fs.existsSync(this.path)){
      fs.mkdirSync(this.path)
    }
  }
  
  createDir(dirName) {
    const newPath = `${this.path}/${dirName}`
    if (!fs.existsSync(newPath)){
      fs.mkdirSync(newPath)
    }
    this.path = newPath
  }

  async get (filename) {
    const filePath = `${this.path}/${filename}.md`
    const exists = fs.existsSync(filePath)
    if (exists){
      const file = await readAsync(filePath)
      !this.silent && console.log(file)
      return file
    }
    return null
  }

  async set (filename, novel) {
    try {
      fs.writeFileSync(`${this.path}/${filename}.md`, novel);
    } catch (error) {
      console.error(error)
    }
  }

  screenshotPath (filename) {
    return `${this.path}/${filename}.png`
  }
}