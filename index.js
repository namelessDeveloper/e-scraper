import clipboardy from 'clipboardy'
import { isWebUri } from 'valid-url'
import { Command } from 'commander';

import { app, appOptions } from './app.js';

const cmd = new Command();

cmd
  .option('-i, --interactive', 'Enables Interractive Mode (e.g. Eos for milovana)')
  .option('-c, --clipboard', 'Uses a link in the clipboard')
  .option('-l, --login', 'Prompt login for given scraper. Some types of scraping e.g. Milovana Eos require a logged in user.')

cmd.parse(process.argv)

const opts = cmd.opts()
const urls = cmd.args

main(urls, opts)


// This is mainly for intellisense...
const defaultCommandOptions = {
  interactive: false,
  clipboard: false,
  login: false,
}

async function main(urls, opt = defaultCommandOptions) {
  if(opt.clipboard) {
    const clipboard = clipboardy.readSync()
    if(!isWebUri(clipboard)) {
      console.error('Not a valid URL')
      process.exit(0)
    }
    await app(clipboard, appOptions(opt))
  }

  if (urls.length === 1) {
    await app(urls[0], appOptions(opt))
  } else {
    for (const url of urls) {
      await app(url, appOptions({ ...opt, silent: true }))
    }
  }
}
