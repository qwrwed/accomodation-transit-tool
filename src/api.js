import { objectMap, roundAccurately } from "./utils";

import { TFL_API_URL_ROOT } from "./constants";

const postcodes = require("node-postcodes.io");

export const getLatLonFromPostCode = async (postcode) => {
  let { result: res } = await postcodes.lookup(postcode);
  res = objectMap(res, (v) => roundAccurately(v, 3));
  return { lat: res.latitude, lon: res.longitude };
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
  const { exceptionType, httpStatusCode, httpStatus, message } =
    await response.json();
  console.error(
    `${exceptionType}: ${httpStatusCode} (${httpStatus})\n${message} (from ${TFL_API_URL_ROOT}${route})`
  );
  return null;
};

export const getLinesFromModes = async (modesList) => {
  const modesString = modesList.join(",");
  const linesList = await makeTFLGetRequest(`/Line/Mode/${modesString}`);
  return linesList;
};

export const getRoutesOnLine = async (line) => {
  const routeSequence = await makeTFLGetRequest(
    `/Line/${line.id}/Route/Sequence/all`
  );
  routeSequence.lineStrings = routeSequence.lineStrings.map(
    (lineString) => JSON.parse(lineString)[0]
  );
  return routeSequence;
};
