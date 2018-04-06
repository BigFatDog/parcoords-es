const computeRealCentroids = (dimensions, position) => row =>
  Object.keys(dimensions).map(d => {
    const x = position(d);
    const y = dimensions[d].yscale(row[d]);
    return [x, y];
  });

export default computeRealCentroids;
