import { keys } from 'd3-collection';

const computeRealCentroids = (dimensions, position) => row =>
  keys(dimensions).map(d => {
    const x = position(d);
    const y = dimensions[d].yscale(row[d]);
    return [x, y];
  });

export default computeRealCentroids;
