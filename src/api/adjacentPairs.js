// pairs of adjacent dimensions
const adjacentPairs = arr => {
  let ret = [];
  for (let i = 0; i < arr.length - 1; i++) {
    ret.push([arr[i], arr[i + 1]]);
  }
  return ret;
};

export default adjacentPairs;
