import pantonePalette from "./pantonePalette.ts";
import { objectFilter, objectMap } from "./utils";

// only scheduled modes
export const MODES_INFO_ALL = {
  bus: {
    label: "London Buses",
    color: pantonePalette["485"],
    selectedByDefault: false,
    icon: "fa-bus",
  },
  "cable-car": { hidden: true },
  coach: {
    label: "Victoria Coach Station",
    color: pantonePalette["130"],
    hidden: true,
  },
  dlr: {
    label: "Docklands Light Railway",
    color: pantonePalette["326"],
    icon: "fa-subway",
    selectedByDefault: true,
  },
  "national-rail": {
    label: "National Rail",
    icon: "fa-train",
    selectedByDefault: false,
  },
  overground: {
    label: "London Overground",
    color: pantonePalette["158"],
    selectedByDefault: true,
    icon: "fa-subway",
  },
  "replacement-bus": { hidden: false },
  "river-bus": {
    label: "London River Services",
    color: pantonePalette["299"],
    hidden: true,
    icon: "fa-ship",
  },
  "river-tour": { hidden: true },
  tflrail: {
    label: "TFL Rail",
    hidden: false,
    icon: "fa-train",
    color: pantonePalette["266"],
    selectedByDefault: true,
  },
  tram: {
    label: "London Tramlink",
    color: pantonePalette["368"],
    icon: "fa-subway",
    selectedByDefault: true,
  },
  tube: {
    label: "London Underground",
    color: pantonePalette["158"],
    icon: "fa-subway",
    selectedByDefault: true,
  },
};

export const MODES_INFO = objectFilter(MODES_INFO_ALL, ({ hidden }) => !hidden);
export const MODES_LABELS = objectMap(MODES_INFO, ({ label }) => label);
export const MODES_DEFAULT = objectMap(
  MODES_INFO,
  ({ selectedByDefault }) => selectedByDefault || false,
);

const LONDON_UNDERGROUND_LINE_COLORS = {
  bakerloo: pantonePalette["470"],
  central: pantonePalette["485"],
  circle: pantonePalette["116"],
  piccadilly: pantonePalette["Blue 072"],
  district: pantonePalette["356"],
  "waterloo-city": pantonePalette["338"],
  "hammersmith-city": pantonePalette["197"],
  victoria: pantonePalette["299"],
  jubilee: pantonePalette["430"],
  metropolitan: pantonePalette["235"],
  northern: pantonePalette.Black,
};

const NATIONAL_RAIL_LINE_COLORS = {
  "avanti-west-coast": "#AAAAAA",
  c2c: "#AF8EC7",
  "chiltern-railways": "#FB369B",
  "cross-country": "#AAAAAA",
  "east-midlands-railway": "#31B0CD",
  "first-hull-trains": "#AAAAAA",
  "first-transpennine-express": "#AAAAAA",
  "gatwick-express": "#2C2E35",
  "grand-central": "#AAAAAA",
  "greater-anglia": "#7E93A8",
  "great-northern": "#D49C60",
  "great-western-railway": "#142A96",
  "heathrow-express": "#5BCDC2",
  "island-line": "#AAAAAA",
  "london-north-eastern-railway": "#88C946",
  merseyrail: "#AAAAAA",
  "northern-rail": "#AAAAAA",
  scotrail: "#AAAAAA",
  southeastern: "#0174C0",
  southern: "#00AB4F",
  "south-western-railway": "#FF2E17",
  thameslink: "#BC2373",
  "transport-for-wales": "#AAAAAA",
  "west-midlands-trains": "#AAAAAA",
};

export const LINE_COLORS = {
  ...objectMap(MODES_INFO_ALL, ({ color }) => color),
  ...NATIONAL_RAIL_LINE_COLORS,
  ...LONDON_UNDERGROUND_LINE_COLORS,
  // elizabeth: pantonePalette["266"],
  "london-overground": MODES_INFO_ALL.overground.color,
  "tfl-rail": MODES_INFO_ALL.tflrail.color,
};

export const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";

export const NAPTAN_STOPTYPES = [
  "NaptanMetroStation",
  "NaptanRailStation",
  "NaptanBusCoachStation",
  "NaptanPublicBusCoachTram",
  "NaptanFerryPort",
];

export const GRAPH_NODE_SIZE = 2;

export const DEFAULT_RADIUS = 500;

// export const DEFAULT_POSTCODE = "SE1 6TG"; // example location in API docs
// export const DEFAULT_POSTCODE = "SE1 9SG"; // london bridge bus station
// export const DEFAULT_POSTCODE = "SW1A 2JR"; // westminster tube station
// export const DEFAULT_POSTCODE = "E14 0AF"; // poplar DLR station
export const DEFAULT_POSTCODE = "EC2M 7PY"; // liverpool street
// export const DEFAULT_POSTCODE = "CR0 2AF"; // west croydon (trams)

// export const EDGE_TYPE = "line";
export const EDGE_TYPE = "arrow";
