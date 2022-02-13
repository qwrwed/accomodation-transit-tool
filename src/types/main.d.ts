// import { components as StopPointComponents } from "./StopPoint";

type LatLon = [number, number];
type ModeId = string;
type LineId = string;
type Direction = "inbound" | "outbound";
type UsedState<S> = [S, React.Dispatch<React.SetStateAction<S>>];
type UseStateSetter<S> = React.Dispatch<React.SetStateAction<S>>;
interface RenderTree {
  id: string;
  name: string;
  children?: RenderTree[];
}
// type StopPoint = StopPointComponents["schemas"]["Tfl-11"];
// type LineModeGroup = StopPointComponents["schemas"]["Tfl-8"];
