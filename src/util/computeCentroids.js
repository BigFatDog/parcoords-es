import { keys } from 'd3-collection';

const computeCentroids = (config, position, row) => {
  let centroids = [];

  let p = keys(config.dimensions);
  let cols = p.length;
  let a = 0.5; // center between axes
  for (let i = 0; i < cols; ++i) {
    // centroids on 'real' axes
    let x = position(p[i]);
    let y = config.dimensions[p[i]].yscale(row[p[i]]);
    centroids.push($V([x, y]));

    // centroids on 'virtual' axes
    if (i < cols - 1) {
      let cx = x + a * (position(p[i + 1]) - x);
      let cy = y + a * (config.dimensions[p[i + 1]].yscale(row[p[i + 1]]) - y);
      if (config.bundleDimension !== null) {
        let leftCentroid = config.clusterCentroids
          .get(
            config.dimensions[config.bundleDimension].yscale(
              row[config.bundleDimension]
            )
          )
          .get(p[i]);
        let rightCentroid = config.clusterCentroids
          .get(
            config.dimensions[config.bundleDimension].yscale(
              row[config.bundleDimension]
            )
          )
          .get(p[i + 1]);
        let centroid = 0.5 * (leftCentroid + rightCentroid);
        cy = centroid + (1 - config.bundlingStrength) * (cy - centroid);
      }
      centroids.push($V([cx, cy]));
    }
  }

  return centroids;
};

export default computeCentroids;
