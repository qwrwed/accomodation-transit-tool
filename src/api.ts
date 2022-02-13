/* eslint-disable no-param-reassign */
import TfL from "tfl-api-wrapper/dist/lib/interfaces/tfl";
import { StopPoint as StopPointFunctions } from "tfl-api-wrapper";
import {
  getDistanceFromLatLonInKm,
  getUniqueListBy,
  objectMap,
  roundAccurately,
  setIntersection,
} from "./utils";

import { TFL_API_URL_ROOT } from "./constants";
import { components as StopPointComponents } from "./types/StopPoint";

const postcodes = require("node-postcodes.io");

type StopPoint = StopPointComponents["schemas"]["Tfl-11"];

export const getLatLonFromPostCode = async (
  postcode: string,
): Promise<LatLon> => {
  let { result: res } = await postcodes.lookup(postcode);
  res = objectMap(res, (v: number) => roundAccurately(v, 3));
  return [res.latitude, res.longitude];
};

export const getTFLApiKey = () => process.env.REACT_APP_TFL_KEY || "";
const stopPointInstance = new StopPointFunctions(getTFLApiKey());

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

  //   requires upstream fix: "latitude"->"lat" and "longitude"->"lon" in function getInRadius
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
  return [];
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
  res = res.filter((mode: TfL["Mode"]) => mode.isScheduledService);
  res = Object.values(
    objectMap(res, ({ modeName }: { modeName: string }) => modeName),
  );
  return res;
};

export const filterStopPoints = async (
  stopPoints: TfL["StopPoint"][],
  chosenModesSet: Set<string>,
  topLevelKey: string | undefined,
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
  stopPoints = await Promise.all(
    stopPoints.map(async (stopPoint) =>
      // makeTFLGetRequest(`/StopPoint/${stopPoint[topLevelKey]}`),
      makeTFLGetRequest(`/StopPoint/${stopPoint.stationNaptan}`),
    ),
  );
  stopPoints = stopPoints.map((stopPoint) => ({
    ...stopPoint,
    distance: !origin
      ? undefined
      : getDistanceFromLatLonInKm(origin, [stopPoint.lat, stopPoint.lon]),
  }));
  return getUniqueListBy(stopPoints, topLevelKey);
};
