import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import {UserCursorPosition, UserSessionInfo} from "../../../common/src/domain";

export const CursorsView = (
    { sessions, cursors, coordinateHelper }: 
    { cursors: L.Property<UserCursorPosition[]>, coordinateHelper: BoardCoordinateHelper, sessions: L.Property<UserSessionInfo[]> }
) => {
    return <ListView<UserCursorPosition, string>
          observable={cursors}
          renderObservable={(userId: string, pos: L.Property<UserCursorPosition>) => {
            const style = L.combineTemplate({
              position: "absolute", 
              display: "block", 
              left: L.view(pos, p => p.x, x => coordinateHelper.getClippedCoordinate(x, 'clientWidth', 0) + "em"),
              top: L.view(pos, p => p.y, y => coordinateHelper.getClippedCoordinate(y, 'clientHeight', 2) + "em")
            })
            return  <span className="cursor" style={style}>
              <span className="arrow" style={{ 
                transform: "rotate(-35deg)", 
                display: "block", 
                width: "0px", height:"0px", 
                borderLeft: "5px solid transparent", 
                borderRight: "5px solid transparent", 
                borderBottom: "10px solid tomato", 
              }}/>
              <span className="text">{sessions.get().find(s => s.userId === userId)?.nickname || null}</span>
            </span>
          } }
          getKey={(c: UserCursorPosition) => c.userId}
        />
}