/* eslint-disable */

// remove pairs where value is false, then extract only keys to list
const objectToList = (obj) =>
  Object.entries(obj)
    .filter(([key, value]) => value)
    .map(([key, value]) => key)
    //.join();

export { objectToList };
