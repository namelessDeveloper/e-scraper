import handlebars from 'handlebars'
import { promises as fs} from 'fs'

function renderToString(source, data) {
  const template = handlebars.compile(source)
  const outputString = template(data)
  return outputString
}

export async function compileTemplate(templatePath, data) {
  const template = await fs.readFile(templatePath, 'utf8')
  return renderToString(template, data)
}