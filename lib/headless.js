import puppeteer from "puppeteer";
import _ from 'lodash'

function wait(ms = 1000, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function difference(object, base) {
	function changes(object, base) {
		return _.transform(object, function(result, value, key) {
			if (!_.isEqual(value, base[key])) {
				result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
			}
		});
	}
	return changes(object, base);
}

import { promises as fs} from "fs";

main()

async function main(url = 'https://milovana.com/webteases/showtease.php?id=16757&preview=true') {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1000 })
  // const cookiesString = await fs.readFile('./cookies.json');
  // const cookies = JSON.parse(cookiesString);
  // await page.setCookie(...cookies);
  await page.goto(url, { waitUntil: 'networkidle2' })
  
  // while (true){
  //   let cookies = await page.cookies();
  //   await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
  // }
}
