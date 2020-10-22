import * as L from "lonna"

export type Coordinates = { x: number, y: number }
// HTML client coordinates: relative to viewport
export type ClientCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(boardElem: L.Atom<HTMLElement | null>) {
    let currentClientPos = L.atom({ x: 0, y: 0 })
    
    function getBaseFontSize(element: HTMLElement) {
        element = element === null || element === undefined ? document.documentElement : element;
        var temporaryElement: HTMLDivElement = document.createElement("div");
        temporaryElement.style.setProperty("position", "absolute", "important");
        temporaryElement.style.setProperty("visibility", "hidden", "important");
        temporaryElement.style.setProperty("font-size", "1em", "important");
        element.appendChild(temporaryElement);
        var baseFontSize = parseFloat(getComputedStyle(temporaryElement).fontSize);
        return baseFontSize
      }

    function pxToEm(px: number, baseFontSize: number) {
      return px / baseFontSize;
    }
  
    function coordDiff(a: Coordinates, b: Coordinates) {
      return { x: a.x - b.x, y: a.y - b.y }
    }
  
    function clientToBoardCoordinates(clientCoords: ClientCoordinates): Coordinates {
      const elem = boardElem.get()
      if (!elem) return { x: 0, y: 0 } // Not the smartest move
      
      const baseFontSize = getBaseFontSize(elem)
      const rect = boardElem.get()!.getBoundingClientRect()
      return { 
        x: pxToEm(clientCoords.x - rect.x, baseFontSize), 
        y: pxToEm(clientCoords.y - rect.y, baseFontSize)
      }
    }
  
    function clientCoordDiffToThisPoint(coords: ClientCoordinates) {
      return coordDiff(currentClientPos.get(), coords)
    }
  
    boardElem.forEach(elem => {
      if (!elem) return
      elem.addEventListener("dragover", e => {
         //console.log("Drag over board")
        currentClientPos.set({ x: e.clientX, y: e.clientY })
        e.preventDefault() // To disable Safari slow animation
      })
      elem.addEventListener("mousemove", e => {
        currentClientPos.set({ x: e.clientX, y: e.clientY })
      })
    })
  
    const currentBoardCoordinates = L.view(currentClientPos, pos => clientToBoardCoordinates(pos))
  
    return {
      clientToBoardCoordinates,
      clientCoordDiffToThisPoint,
      currentClientCoordinates: currentClientPos,
      currentBoardCoordinates,
      boardCoordDiffFromThisClientPoint: (coords: ClientCoordinates) => coordDiff(currentBoardCoordinates.get(), clientToBoardCoordinates(coords))
    }
  }