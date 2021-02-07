import sh, { Attributes } from 'sanitize-html';

const sanitizeConfig = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br' ],
    allowedAttributes: {
      'a': [ 'href', 'target' ]
    },
    transformTags: {
      'a': (tagName: string, attribs: Attributes) => {
        console.log(attribs)
        return {
          tagName,
          attribs: { ...attribs, target: "_blank" },
        }
      }
    }
  }
const html = `<h1>HELLO</h1> world <b>BOLD</b> <i>ITALIC</i> <script>alert("LOL")</script>`

function isURL(str: string) {
    var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    var url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
}

function linkify(htmlText: string) {
  // Yeah, currently linkifies only text that consists of a single URL.
  // Would be great to go deeper, but only linkify parts that are not already
  // contained in an <a> tag.
  if (isURL(htmlText)) {
      return `<a href="${htmlText}">${htmlText}</a>`
  }
  return htmlText
}

export function sanitizeHTML(html: string) {
    return sh(linkify(html), sanitizeConfig)
}

const helperElem = document.createElement("span")

export function toPlainText(html: string) {
    helperElem.innerHTML = html.replaceAll("<br>", "\n")
    return helperElem.textContent || ""    
}
 