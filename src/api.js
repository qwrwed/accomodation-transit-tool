import { objectMap, roundAccurately } from "./utils";

import { TFL_API_URL_ROOT } from "./constants";

const postcodes = require("node-postcodes.io");

export const getLatLonFromPostCode = async (postcode) => {
  let { result: res } = await postcodes.lookup(postcode);
  res = objectMap(res, (v) => roundAccurately(v, 3));
  return [res.latitude, res.longitude];
};

export const getTFLApiKey = () => process.env.REACT_APP_TFL_KEY;

export const makeTFLGetRequest = async (route, otherParams) => {
  const appKey = getTFLApiKey();
  let params = appKey
    ? { app_key: appKey, ...otherParams }
    : { ...otherParams };
  params = new URLSearchParams(params).toString();
  // console.log(`GET ${TFL_API_URL_ROOT}${route}?${params}`)
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${params}`);
  if (response.ok) {
    return response.json();
  }
  const {
    exceptionType, httpStatusCode, httpStatus, message,
  } = await response.json();
  console.error(
    `${exceptionType}: ${httpStatusCode} (${httpStatus})\n${message} (from ${TFL_API_URL_ROOT}${route})`,
  );
  return null;
};

export const getLinesFromModes = async (modesList) => {
  const modesString = modesList.join(",");
  const linesList = await makeTFLGetRequest(`/Line/Mode/${modesString}`);
  return linesList;
};

export const getRoutesOnLine = async (lineId) => {
  const routeSequence = await makeTFLGetRequest(
    `/Line/${lineId}/Route/Sequence/all`,
  );
  routeSequence.lineStrings = routeSequence.lineStrings.map(
    (lineString) => JSON.parse(lineString)[0],
  );
  return routeSequence;
};

export const getNaptanTypes = async () => makeTFLGetRequest("/StopPoint/Meta/StopTypes");

export const getStoppointDataCategories = async () => makeTFLGetRequest("/StopPoint/Meta/categories");

export const getTransportModes = async () => {
  let res = await makeTFLGetRequest("/Line/Meta/Modes");
  res = res.filter((mode) => mode.isScheduledService);
  res = Object.values(objectMap(res, (v) => v.modeName));
  return res;
};
