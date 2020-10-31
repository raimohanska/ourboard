import { h } from "harmaja";

import { Item, newContainer} from "../../../common/domain";

export const NewContainer = ({ onAdd }: { onAdd: (i: Item) => void }) => {
  return <span onDragEnd={() => onAdd(newContainer())} className="container palette-item" draggable={true}/>
}