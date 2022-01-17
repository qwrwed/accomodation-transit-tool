/* eslint-disable */

// remove pairs where value is false, then extract only keys to list
const objectToList = (obj) =>
  Object.entries(obj)
    .filter(([key, value]) => value)
    .map(([key, value]) => key);
//.join();

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const getDistanceFromLatLonInKm = (loc1, loc2) => {
  const { lat: lat1, lon: lon1 } = loc1;
  const { lat: lat2, lon: lon2 } = loc2;
  // https://stackoverflow.com/q/18883601
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
};

const getUniqueListBy = (arr, key) => {
  // https://stackoverflow.com/a/56768137
  return [...new Map(arr.map((item) => [item[key], item])).values()];
};

const kvArrayToObject = (arr) => {
  return arr.reduce(function (result, item) {
    var key = Object.keys(item)[0]; //first property: a, b, c
    result[key] = item[key];
    return result;
  }, {});
};

const objectMap = (obj, fn) =>
  // https://stackoverflow.com/a/14810722
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )

const objectFilter = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([k, v], i) => fn(v, k, i)
    )
  );

var getDescendants = (obj, key, currentDescendantIds = new Set(), level = 0) => {
  // console.log(`getDescendants(L${level}: ${obj}, ${key}, ${JSON.stringify(currentDescendantIds)})`)
  // console.log(descendantIds)
  for (const id of currentDescendantIds) {
    let newDescendantIds = new Set(obj[id][key].map(id => id.toString()))
    newDescendantIds = setDifference(newDescendantIds, currentDescendantIds)
    if (newDescendantIds.length > 0) {
      let res = getDescendants(obj, key, newDescendantIds, level + 1)
      currentDescendantIds = new Set([...currentDescendantIds, ...res].map(id => id.toString()))
    }
  }
  return currentDescendantIds
}

const setDifference = (a, b) =>
  new Set(
    Array.from(a).filter(x => !b.has(x))
  );

const setIntersection = (a, b) => new Set(
  Array.from(a).filter(x => b.has(x))
);

const setUnion = (a, b) => new Set([...a, ...b]);

const roundAccurately = (number, decimalPlaces = 1) => Number(Math.round(number + "e" + decimalPlaces) + "e-" + decimalPlaces)
// https://gist.github.com/djD-REK/068cba3d430cf7abfddfd32a5d7903c3

export { setIntersection, setUnion, objectFilter, roundAccurately, setDifference, objectToList, getDistanceFromLatLonInKm, getUniqueListBy, kvArrayToObject, objectMap, getDescendants };
