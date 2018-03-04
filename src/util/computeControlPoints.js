const computeControlPoints = (smoothness, centroids) => {
  let cols = centroids.length;
  let a = smoothness;
  let cps = [];

  cps.push(centroids[0]);
  cps.push(
    $V([
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
    $V([
      centroids[cols - 1].e(1) +
        a * 2 * (centroids[cols - 2].e(1) - centroids[cols - 1].e(1)),
      centroids[cols - 1].e(2),
    ])
  );
  cps.push(centroids[cols - 1]);

  return cps;
};

export default computeControlPoints;
