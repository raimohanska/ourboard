import sh from 'sanitize-html';

const sanitizeConfig = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br' ],
    allowedAttributes: {
      'a': [ 'href' ]
    }
  }
const html = `<h1>HELLO</h1> world <b>BOLD</b> <i>ITALIC</i> <script>alert("LOL")</script>`

function isURL(str: string) {
    var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    var url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
}

//console.log(linkifyUrls("See https://www.npmjs.com/package/sanitize-html"))

//console.log(linkifyUrls(`<h1>HELLO</h1> world https://www.npmjs.com/package/sanitize-html <b>BOLD</b> <i>ITALIC</i> <script>alert("LOL")</script>`))

//const exampleHTML = `Check <i>out</i> the documentation at<br><br><a href="http://localhost:1337/b/b0f61bfc-1807-4fbe-be9b-f4665aa517a6">http://localhost:1337/b/b0f61bfc-1807-4fbe-be9b-f4665aa517a6</a><br><br>BOOM!`

export function sanitizeHTML(html: string) {
    return sh(html, sanitizeConfig)
}

const helperElem = document.createElement("span")

export function toPlainText(html: string) {
    helperElem.innerHTML = html.replaceAll("<br>", "\n")
    return helperElem.textContent || ""    
}
 