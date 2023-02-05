/* eslint-disable no-param-reassign */
/* eslint-disable */
// @ts-nocheck
import {
  StopPoint as StopPointFunctions,
  Line as LineFunctions,
} from "tfl-api-wrapper";
import {
  getDistanceFromLatLonInKm,
  getUniqueListBy,
  objectMap,
  roundAccurately,
  setIntersection,
} from "./utils";

import { MODES_INFO_ALL, TFL_API_URL_ROOT } from "./constants";
import { components as StopPointComponents } from "./types/StopPoint";
import { components as LineComponents } from "./types/Line";

import postcodes from "node-postcodes.io";

type StopPoint = StopPointComponents["schemas"]["Tfl-11"];
type Mode = LineComponents["schemas"]["Tfl"];

export const getLatLonFromPostCode = async (
  postcode: string,
): Promise<LatLon> => {
  let { result: res } = await postcodes.lookup(postcode);
  if (res){
    res = objectMap(res, (v: number) => roundAccurately(v, 3));
    return [res.latitude, res.longitude];
  }
};

export const getPostCodeFromLatLon = async(
  latLon: LatLon,
) => {
  const [latitude, longitude] = latLon
  // need to wrap `geo` in a list so we can enable wideSearch
  const response  = await postcodes.geo([{latitude, longitude, wideSearch: true}]);
  const postcode = response.result[0].result[0].postcode
  if (postcode){
    return postcode;
  }
}

export const getTFLApiKey = () => process.env.REACT_APP_TFL_KEY || "";
const stopPointInstance = new StopPointFunctions(getTFLApiKey());
const lineInstance = new LineFunctions(getTFLApiKey());

export const getModes = () => lineInstance.getModes();
export const getLinesByModes = (modeNames: string[]) =>
  lineInstance.getAllByModes(modeNames);

export const getStopPointsInfo = (stopPointIds: string[]) =>
  stopPointInstance.getByIDs(stopPointIds);

const getlineModeDictionary = async () => {
  const lineModeDictionary = {};
  const modes = await getModes();
  let modeNames = modes.map(({ modeName }) => modeName);
  const lines = await getLinesByModes(modeNames);
  for (const line of lines) {
    const { modeName: modeId, id: lineId, name: lineName } = line;
    const modeName = MODES_INFO_ALL[modeId].label;
    if (
      lineId in lineModeDictionary &&
      lineModeDictionary[lineId] !== modeId
    ) {
      console.warn(`line ${lineId} already corresponds to mode ${modeId}`);
    } else {
      lineModeDictionary[lineId] = {lineId, lineName, modeId, modeName};
    }
  }
  return lineModeDictionary;
};

export const lineModeDictionary = getlineModeDictionary();

export const makeTFLGetRequest = async (
  route: string,
  otherParams?: Record<string, any>,
) => {
  const appKey = getTFLApiKey();
  const params = appKey
    ? { app_key: appKey, ...otherParams }
    : { ...otherParams };
  const paramsString = new URLSearchParams(params).toString();
  // console.log(`GET ${TFL_API_URL_ROOT}${route}?${params}`)
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${paramsString}`);
  if (response.ok) {
    return response.json();
  }
  const { exceptionType, httpStatusCode, httpStatus, message } =
    await response.json();
  console.error(
    `${exceptionType}: ${httpStatusCode} (${httpStatus})\n${message} (from ${TFL_API_URL_ROOT}${route})`,
  );
  return null;
};

export const getStopPointsByRadius = async (
  stopTypes: string[],
  latLong: [number, number],
  radius: number,
) => {
  const [lat, lon] = latLong;

  const res = await stopPointInstance.getInRadius(
    stopTypes,
    radius,
    false,
    [],
    [],
    true,
    lat,
    lon,
  );

  //   own implementation
  // const res = await makeTFLGetRequest("/StopPoint", {
  //   stopTypes: stopTypes.join(),
  //   lat,
  //   lon,
  //   radius,
  //   returnLines: true,
  // });

  if (typeof res !== "undefined") return res.stopPoints as StopPoint[];
  return [] as StopPoint[];
};

export const getLinesFromModes = async (modesList: string[]) => {
  const modesString = modesList.join(",");
  const linesList = await makeTFLGetRequest(`/Line/Mode/${modesString}`);
  return linesList;
};

export const getRoutesOnLine = async (lineId: string) => {
  const routeSequence = await makeTFLGetRequest(
    `/Line/${lineId}/Route/Sequence/all`,
  );
  if (routeSequence === null) return null;
  routeSequence.lineStrings = routeSequence.lineStrings.map(
    (lineString: string) => JSON.parse(lineString)[0],
  );
  return routeSequence;
};

export const getNaptanTypes = async () =>
  makeTFLGetRequest("/StopPoint/Meta/StopTypes");

export const getStoppointDataCategories = async () =>
  makeTFLGetRequest("/StopPoint/Meta/categories");

export const getTransportModes = async () => {
  let res = await makeTFLGetRequest("/Line/Meta/Modes");
  res = res.filter((mode: Mode) => mode.isScheduledService);
  res = Object.values(
    objectMap(res, ({ modeName }: { modeName: string }) => modeName),
  );
  return res;
};

export const filterStopPoints = async (
  stopPoints: StopPoint[],
  chosenModesSet: Set<string>,
  topLevelKey: KeyOfType<StopPoint, string> | undefined,
  origin: LatLon | undefined,
) => {
  // remove stopPoints with no line data
  stopPoints = stopPoints.filter(
    ({ lines }) => lines?.length && lines.length > 0,
  );

  // remove stopPoints that don't serve the chosen modes
  if (typeof chosenModesSet !== "undefined") {
    stopPoints = stopPoints.filter(
      ({ modes }) => setIntersection(new Set(modes), chosenModesSet).size > 0,
    );
  }

  // remove duplicate stopPoints
  if (typeof topLevelKey === "undefined") {
    return stopPoints;
  }
  // topLevelKey = "stationNaptan";
  stopPoints = await Promise.all(
    stopPoints.map(
      async (stopPoint) =>
        // makeTFLGetRequest(`/StopPoint/${stopPoint[topLevelKey]}`),
        (await stopPointInstance.getByIDs([
          stopPoint[topLevelKey],
        ])) as StopPoint,
    ),
  );
  stopPoints = stopPoints.map((stopPoint) => ({
    ...stopPoint,
    distance: !origin
      ? -1 // TODO: check if StopPoint.distance can be undefined
      : getDistanceFromLatLonInKm(origin, [stopPoint.lat, stopPoint.lon]),
  }));
  return getUniqueListBy(stopPoints, topLevelKey);
};
