import sh, { Attributes } from 'sanitize-html';

const sanitizeConfig = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br' ],
    allowedAttributes: {
      'a': [ 'href', 'target' ]
    },
    transformTags: {
      'a': (tagName: string, attribs: Attributes) => {
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

const MAX_LINK_LENGTH = 30


function linkify(htmlText: string) {
  helperElem.innerHTML = htmlText
  for (let e of helperElem.childNodes) {
    if (e instanceof Text) {
      const urls = e.textContent!.split(" ").filter(isURL)
      if (urls.length) {
        const url = urls[0]
        const [before, after] = e.textContent!.split(url).map(t => new Text(t))
        const anchorNode = document.createElement("a")
        anchorNode.textContent = url.length > MAX_LINK_LENGTH ? url.slice(0, MAX_LINK_LENGTH - 2) + "..." : url
        anchorNode.href = url
        e.replaceWith(before, anchorNode, after)
      }
    }
  }
  return helperElem.innerHTML
}

export function sanitizeHTML(html: string, shouldLinkify?: boolean) {
  if (shouldLinkify) {
    html = linkify(sh(html, sanitizeConfig));
  }
  return sh(html, sanitizeConfig)
}

const helperElem = document.createElement("span")

export function toPlainText(html: string) {
    helperElem.innerHTML = html.replaceAll("<br>", "\n")
    return helperElem.textContent || ""    
}
 