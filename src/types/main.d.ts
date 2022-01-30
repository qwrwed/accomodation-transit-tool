type LatLon = [number, number];
type ModeId = string;
type LineId = string;
type Direction = "inbound" | "outbound";
type UsedState<S> = [S, React.Dispatch<React.SetStateAction<S>>];
type UseStateSetter<S> = React.Dispatch<React.SetStateAction<S>>;
