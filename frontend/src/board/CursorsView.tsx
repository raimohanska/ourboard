import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import {UserCursorPosition, UserSessionInfo} from "../../../common/src/domain";

export const CursorsView = (
    { sessions, cursors, coordinateHelper }: 
    { cursors: L.Property<UserCursorPosition[]>, coordinateHelper: BoardCoordinateHelper, sessions: L.Property<UserSessionInfo[]> }
) => {
    return <ListView
          observable={cursors}
          renderObservable={({ x, y, userId }: UserCursorPosition) => <span
            className="cursor"
            style={{
              position: "absolute", 
              display: "block", 
              left: coordinateHelper.getClippedCoordinate(x, 'clientWidth', 0) + "em",
              top: coordinateHelper.getClippedCoordinate(y, 'clientHeight', 2) + "em"
            }}
          >
            <span className="arrow" style={{ 
              transform: "rotate(-35deg)", 
              display: "block", 
              width: "0px", height:"0px", 
              borderLeft: "5px solid transparent", 
              borderRight: "5px solid transparent", 
              borderBottom: "10px solid tomato", 
            }}/>
            <span className="text">{sessions.get().find(s => s.userId === userId)?.nickname || null}</span>
          </span> }
          getKey={(c: UserCursorPosition) => c}
        />
}