import fs from 'fs'
import {promisify} from 'util'

export const readAsync = (path) => promisify(fs.readFile)(path, 'utf8')