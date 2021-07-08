import { Literotica } from "./literotica.js"
import { Milovana } from "./milovana.js"

export const getScraper = (url) => {
  const {host} = new URL(url)
  if(host.endsWith('milovana.com')) {
    return Milovana
  }
  if (host.endsWith('literotica.com')) {
    return Literotica
  }
}

export const getText = el => el.textContent

export const click = el => el.click()