import { keys } from 'd3-collection';

const computeRealCentroids = (dimensions, position) => row => {
  let realCentroids = [];

  let p = keys(dimensions);
  let cols = p.length;
  let a = 0.5;

  for (let i = 0; i < cols; ++i) {
    let x = position(p[i]);
    let y = dimensions[p[i]].yscale(row[p[i]]);
    realCentroids.push([x, y]);
  }

  return realCentroids;
};

export default computeRealCentroids;
