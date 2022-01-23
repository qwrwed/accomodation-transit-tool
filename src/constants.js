import { pantonePalette } from "./colors";

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
    selectedByDefault: true,
    icon: "fa-subway",
  },
  "national-rail": {
    label: "National Rail",
    icon: "fa-train",
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
    hidden: true,
    icon: "fa-train",
  },
  tram: {
    label: "London Tramlink",
    color: pantonePalette["368"],
    icon: "fa-subway",
  },
  tube: {
    label: "London Underground",
    color: pantonePalette["158"],
    selectedByDefault: false,
    icon: "fa-subway",
  },
};

export const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";

export const NAPTAN_STOPTYPES = [
  "NaptanMetroStation",
  "NaptanRailStation",
  "NaptanBusCoachStation",
  "NaptanPublicBusCoachTram",
  "NaptanFerryPort",
];

export const DEFAULT_RADIUS = 1000;

// export const DEFAULT_POSTCODE = "SE1 6TG"; // example location in API docs
// export const DEFAULT_POSTCODE = "SE1 9SG"; // london bridge bus station
// export const DEFAULT_POSTCODE = "SW1A 2JR"; // westminster tube station
export const DEFAULT_POSTCODE = "E14 0AF"; // poplar DLR station
