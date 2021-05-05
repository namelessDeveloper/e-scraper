export function milovana(){
  console.log('milo');
  try {
    const text = document.querySelector('#tease_content .text').textContent
    const image = document.querySelector('#cm_wide img').src
    const formatted = `${text.replaceAll('\n\n\n', '\n')}\n![](${image})\n\n`
    
    const id = location.search.substr(1).split('&')[0]
    const data = localStorage.getItem(id)
    localStorage.setItem(id, data + formatted)
    document.querySelector('#continue').click()
    return localStorage.getItem(id)
  } catch (error) {
    const id = location.search.substr(1).split('&')[0]
    const data = localStorage.getItem(id)
    if(data.startsWith('null')){
      console.log(localStorage.getItem(id).substr(4))
    } else {
      console.log(localStorage.getItem(id))
    }
  }
}