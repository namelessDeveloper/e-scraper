import { Literotica } from "./literotica.js"
import { Milovana } from "./milovana.js"
import { Imagefap } from "./imagefap.js"

export const getScraper = (url) => {
  const {host} = new URL(url)
  if(host.endsWith('milovana.com')) {
    return Milovana
  }
  if (host.endsWith('literotica.com')) {
    return Literotica
  }
  if (host.endsWith('imagefap.com')) {
    return Imagefap
  }
}