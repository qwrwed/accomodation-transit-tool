/* eslint-disable */

// remove pairs where value is false, then extract only keys to list
export const objectKeysToList = (obj) =>
  Object.entries(obj)
    .filter(([key, value]) => value)
    .map(([key, value]) => key);
// .join();

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export const getDistanceFromLatLonInKm = (loc1, loc2) => {
  const [lat1, lon1] = loc1;
  const [lat2, lon2] = loc2;
  // https://stackoverflow.com/q/18883601
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export const getUniqueListBy = (arr, key) => 
  // https://stackoverflow.com/a/56768137
   [...new Map(arr.map((item) => [item[key], item])).values()]
;

export const kvArrayToObject = (arr) => arr.reduce((result, item) => {
    const key = Object.keys(item)[0]; // first property: a, b, c
    result[key] = item[key];
    return result;
  }, {});

export const mapArrayOfKeysToObject = (arr, fn) => Object.fromEntries(arr.map(k => [k, fn(k)]))

export const objectMap = (obj, fn) =>
  // https://stackoverflow.com/a/14810722
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )

export const objectFilter = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([k, v], i) => fn(v, k, i)
    )
  );

export let getDescendants = (obj, key, currentDescendantIds = new Set(), level = 0) => {
  // console.log(`getDescendants(L${level}: ${obj}, ${key}, ${JSON.stringify(currentDescendantIds)})`)
  // console.log(descendantIds)
  for (const id of currentDescendantIds) {
    let newDescendantIds = new Set(obj[id][key].map(id => id.toString()))
    newDescendantIds = setDifference(newDescendantIds, currentDescendantIds)
    if (newDescendantIds.length > 0) {
      const res = getDescendants(obj, key, newDescendantIds, level + 1)
      currentDescendantIds = new Set([...currentDescendantIds, ...res].map(id => id.toString()))
    }
  }
  return currentDescendantIds
}

export const setDifference = (a, b) =>
  new Set(
    Array.from(a).filter(x => !b.has(x))
  );

export const setIntersection = (a, b) => new Set(
  Array.from(a).filter(x => b.has(x))
);

export const setUnion = (a, b) => new Set([...a, ...b]);

export const roundAccurately = (number, decimalPlaces = 1) => Number(`${Math.round(`${number  }e${  decimalPlaces}`)  }e-${  decimalPlaces}`)
// https://gist.github.com/djD-REK/068cba3d430cf7abfddfd32a5d7903c3


/**
 * Function: createNestedObject( base, names[, value] )
 * @param {*} base The object on which to create the hierarchy.
 * @param {*} names An array of strings (or dot-separated string) contaning the names of the objects
 * @param {*} value (optional) if given, will be the last object in the hierarchy.
 * @returns The last object in the hierarchy.
 */
 export const setNestedObject = function( base, names, value ) {
  // https://stackoverflow.com/a/11433067
  if (typeof (names) === "string")
    names = names.split(".")

  // If a value is given, remove the last name and keep it for later:
  var lastName = arguments.length === 3 ? names.pop() : false;

  // Walk the hierarchy, creating new objects where needed.
  // If the lastName was removed, then the last object is not set yet:
  for( var i = 0; i < names.length; i++ ) {
      base = base[ names[i] ] = base[ names[i] ] || {};
  }

  // If a value was given, set it to the last name:
  if( lastName ) base = base[ lastName ] = value;

  // Return the last object in the hierarchy:
  return base;
};

export const catchHttpError = (fn) => {
  return (async function (...args){
    try {
      return await fn(...args);
    } catch (e) {
      alert(`${e.response.data} (Error code ${e.response.status})`);
    }
  })
};
