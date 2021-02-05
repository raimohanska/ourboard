import { h, ListView } from "harmaja";
import * as L from "lonna";
import {UserCursorPosition, UserSessionInfo} from "../../../common/src/domain";

export const CursorsView = (
    { sessions, cursors }: 
    { cursors: L.Property<UserCursorPosition[]>, sessions: L.Property<UserSessionInfo[]> }
) => {
    return <ListView<UserCursorPosition, string>
          observable={cursors}
          renderObservable={(userId: string, pos: L.Property<UserCursorPosition>) => {
            const style = L.combineTemplate({
              position: "absolute", 
              display: "block", 
              left: L.view(pos, p => p.x, x => x + "em"),
              top: L.view(pos, p => p.y, y => y + "em")
            })
            return  <span className="cursor" style={style}>
              <span className="arrow"/>
              <span className="text">{L.view(sessions, sessions => sessions.find(s => s.userId === userId)?.nickname || null)}</span>
            </span>
          } }
          getKey={(c: UserCursorPosition) => c.userId}
        />
}