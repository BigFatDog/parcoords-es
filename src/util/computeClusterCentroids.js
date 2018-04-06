const computeClusterCentroids = (config, d) => {
  const clusterCentroids = new Map();
  const clusterCounts = new Map();
  // determine clusterCounts
  config.data.forEach(function(row) {
    let scaled = config.dimensions[d].yscale(row[d]);
    if (!clusterCounts.has(scaled)) {
      clusterCounts.set(scaled, 0);
    }
    let count = clusterCounts.get(scaled);
    clusterCounts.set(scaled, count + 1);
  });

  config.data.forEach(function(row) {
    Object.keys(config.dimensions).map(p => {
      let scaled = config.dimensions[d].yscale(row[d]);
      if (!clusterCentroids.has(scaled)) {
        const _map = new Map();
        clusterCentroids.set(scaled, _map);
      }
      if (!clusterCentroids.get(scaled).has(p)) {
        clusterCentroids.get(scaled).set(p, 0);
      }
      let value = clusterCentroids.get(scaled).get(p);
      value += config.dimensions[p].yscale(row[p]) / clusterCounts.get(scaled);
      clusterCentroids.get(scaled).set(p, value);
    });
  });

  return clusterCentroids;
};

export default computeClusterCentroids;
