const computeRealCentroids = (config, position) => row =>
  Object.keys(config.dimensions).map(d => {
    const x = position(d);
    const y = config.dimensions[d].yscale(row[d]);
    return [x, y];
  });

export default computeRealCentroids;
