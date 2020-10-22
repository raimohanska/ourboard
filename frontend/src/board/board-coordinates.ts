import * as L from "lonna"

export type Coordinates = { x: number, y: number }
// HTML client coordinates: relative to viewport
export type ClientCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(boardElem: L.Atom<HTMLElement | null>, fontSize: L.Property<string>) {
    let currentClientPos = L.atom({ x: 0, y: 0 })

    const temporaryElement: HTMLDivElement = document.createElement("div");
    temporaryElement.style.setProperty("position", "absolute", "important");
    temporaryElement.style.setProperty("visibility", "hidden", "important");
    temporaryElement.style.setProperty("font-size", "1em", "important");

    const baseFontSizeAtom = L.atom(0);

    boardElem.forEach(element => {
      element = element === null || element === undefined ? document.documentElement : element;
      if (temporaryElement.parentNode !== element) {
        temporaryElement.parentNode && temporaryElement.parentNode.removeChild(temporaryElement);
        element.appendChild(temporaryElement);
      }
    })

    fontSize.forEach((_) => baseFontSizeAtom.set(parseFloat(getComputedStyle(temporaryElement).fontSize)))

    function pxToEm(px: number, baseFontSize: number) {
      return px / baseFontSize;
    }
  
    function coordDiff(a: Coordinates, b: Coordinates) {
      return { x: a.x - b.x, y: a.y - b.y }
    }
  
    function clientToBoardCoordinates(clientCoords: ClientCoordinates): Coordinates {
      const elem = boardElem.get()
      if (!elem) return { x: 0, y: 0 } // Not the smartest move
      
      const baseFontSize = baseFontSizeAtom.get();
      const rect = boardElem.get()!.getBoundingClientRect()
      return { 
        x: pxToEm(clientCoords.x - rect.x, baseFontSize) | 0, 
        y: pxToEm(clientCoords.y - rect.y, baseFontSize) | 0
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