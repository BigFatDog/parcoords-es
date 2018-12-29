import { Vector } from 'sylvester-es6/src/Vector';

const computeCentroids = (config, position, row) => {
  const centroids = [];

  const p = Object.keys(config.dimensions);
  const cols = p.length;
  const a = 0.5; // center between axes
  for (let i = 0; i < cols; ++i) {
    // centroids on 'real' axes
    const x = position(p[i]);
    const y = config.dimensions[p[i]].yscale(row[p[i]]);
    centroids.push(new Vector([x, y]));

    // centroids on 'virtual' axes
    if (i < cols - 1) {
      const cx = x + a * (position(p[i + 1]) - x);
      let cy = y + a * (config.dimensions[p[i + 1]].yscale(row[p[i + 1]]) - y);
      if (config.bundleDimension !== null) {
        const leftCentroid = config.clusterCentroids
          .get(
            config.dimensions[config.bundleDimension].yscale(
              row[config.bundleDimension]
            )
          )
          .get(p[i]);
        const rightCentroid = config.clusterCentroids
          .get(
            config.dimensions[config.bundleDimension].yscale(
              row[config.bundleDimension]
            )
          )
          .get(p[i + 1]);
        let centroid = 0.5 * (leftCentroid + rightCentroid);
        cy = centroid + (1 - config.bundlingStrength) * (cy - centroid);
      }
      centroids.push(new Vector([cx, cy]));
    }
  }

  return centroids;
};

export default computeCentroids;
