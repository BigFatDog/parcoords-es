import { Vector } from 'sylvester-es6/src/Vector';

const computeControlPoints = (smoothness, centroids) => {
  const cols = centroids.length;
  const a = smoothness;
  const cps = [];

  cps.push(centroids[0]);
  cps.push(
    new Vector([
      centroids[0].e(1) + a * 2 * (centroids[1].e(1) - centroids[0].e(1)),
      centroids[0].e(2),
    ])
  );
  for (let col = 1; col < cols - 1; ++col) {
    let mid = centroids[col];
    let left = centroids[col - 1];
    let right = centroids[col + 1];

    let diff = left.subtract(right);
    cps.push(mid.add(diff.x(a)));
    cps.push(mid);
    cps.push(mid.subtract(diff.x(a)));
  }

  cps.push(
    new Vector([
      centroids[cols - 1].e(1) +
        a * 2 * (centroids[cols - 2].e(1) - centroids[cols - 1].e(1)),
      centroids[cols - 1].e(2),
    ])
  );
  cps.push(centroids[cols - 1]);

  return cps;
};

export default computeControlPoints;
