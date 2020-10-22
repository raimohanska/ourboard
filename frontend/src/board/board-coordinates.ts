import * as L from "lonna"

export type Coordinates = { x: number, y: number }
// HTML client coordinates: relative to viewport
export type ClientCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(boardElem: L.Atom<HTMLElement | null>) {
    let currentClientPos = { x: 0, y: 0 }
    
    function pxToEm(px: number, element: HTMLElement) {
      element = element === null || element === undefined ? document.documentElement : element;
      var temporaryElement: HTMLDivElement = document.createElement("div");
      temporaryElement.style.setProperty("position", "absolute", "important");
      temporaryElement.style.setProperty("visibility", "hidden", "important");
      temporaryElement.style.setProperty("font-size", "1em", "important");
      element.appendChild(temporaryElement);
      var baseFontSize = parseFloat(getComputedStyle(temporaryElement).fontSize);
      temporaryElement.parentNode!.removeChild(temporaryElement);
      return px / baseFontSize;
    }
  
    function coordDiff(a: Coordinates, b: Coordinates) {
      return { x: a.x - b.x, y: a.y - b.y }
    }
  
    function clientToBoardCoordinates(clientCoords: ClientCoordinates): Coordinates {
      const rect = boardElem.get()!.getBoundingClientRect()
      return { 
        x: pxToEm(clientCoords.x - rect.x, boardElem.get()!), 
        y: pxToEm(clientCoords.y - rect.y, boardElem.get()!)
      }
    }
  
    function clientCoordDiffToThisPoint(coords: ClientCoordinates) {
      return coordDiff(currentClientPos, coords)
    }
  
    boardElem.forEach(elem => {
      if (!elem) return
      elem.addEventListener("dragover", e => {
         //console.log("Drag over board")
      currentClientPos = { x: e.clientX, y: e.clientY }
      e.preventDefault() // To disable Safari slow animation
      })
    })
  
    const currentBoardCoordinates = () => clientToBoardCoordinates(currentClientPos)
  
    return {
      clientToBoardCoordinates,
      clientCoordDiffToThisPoint,
      currentClientCoordinates: () => currentClientPos,
      currentBoardCoordinates,
      boardCoordDiffFromThisClientPoint: (coords: ClientCoordinates) => coordDiff(currentBoardCoordinates(), clientToBoardCoordinates(coords))
    }
  }