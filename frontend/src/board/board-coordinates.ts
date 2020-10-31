import * as L from "lonna"
import { Coordinates } from "./geometry";

const COORDINATES_PROTOTYPE = {
  x: 0,
  y: 0,
  // serialize to 2 decimal points precision
  toJSON() {
    return { x: this.x.toFixed(2), y: this.y.toFixed(2) }
  }
};
const newCoordinates = (x: number, y : number): Coordinates => {
  const coords = Object.create(COORDINATES_PROTOTYPE);
  coords.x = x;
  coords.y = y;
  return coords;
}


// HTML client coordinates: relative to viewport
export type ClientCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(boardElem: L.Atom<HTMLElement | null>) {
    let currentClientPos = L.atom({ x: 0, y: 0 })

    function pxToEm(px: number) {
      const baseFontSize = parseFloat(getComputedStyle(boardElem.get()!).fontSize)
      return px / baseFontSize;
    }
  
    function coordDiff(a: Coordinates, b: Coordinates) {
      return newCoordinates(a.x - b.x, a.y - b.y)
    }
  
    function clientToBoardCoordinates(clientCoords: ClientCoordinates): Coordinates {
      const elem = boardElem.get()
      if (!elem) return { x: 0, y: 0 } // Not the smartest move
      
      const rect = elem.getBoundingClientRect()
      return newCoordinates(pxToEm(clientCoords.x - rect.x), pxToEm(clientCoords.y - rect.y))
    }
  
    function clientCoordDiffToThisPoint(coords: ClientCoordinates) {
      return coordDiff(currentClientPos.get(), coords)
    }

    function getClippedCoordinate(coordinate: number, direction: 'clientWidth' | 'clientHeight', maxMargin: number) {
      const elem = boardElem.get()
      if (!elem) {
        return coordinate
      }
      const clientSize = elem[direction]      
      const maxCoordinate = pxToEm(clientSize) - maxMargin
      return Math.max(0, Math.min(coordinate, maxCoordinate))
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
      boardCoordDiffFromThisClientPoint: (coords: ClientCoordinates) => coordDiff(currentBoardCoordinates.get(), clientToBoardCoordinates(coords)),
      getClippedCoordinate
    }
  }