import { Literotica } from "./literotica.js"
import { Milovana } from "./milovana.js"

export const getScraper = (url) => {
  if(url.startsWith('https://milovana.com/webteases/showtease.php')) {
    return Milovana
  }
  if (url.startsWith('https://www.literotica.com/s/')) {
    return Literotica
  }
}