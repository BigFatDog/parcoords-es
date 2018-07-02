// draw single cubic bezier curve
import computeCentroids from './computeCentroids';
import computeControlPoints from './computeControlPoints';
import h from './height';

const singleCurve = (config, position, d, ctx) => {
  const centroids = computeCentroids(config, position, d);
  const cps = computeControlPoints(config.smoothness, centroids);

  ctx.moveTo(cps[0].e(1), cps[0].e(2));

  for (let i = 1; i < cps.length; i += 3) {
    if (config.showControlPoints) {
      for (let j = 0; j < 3; j++) {
        ctx.fillRect(cps[i + j].e(1), cps[i + j].e(2), 2, 2);
      }
    }
    ctx.bezierCurveTo(
      cps[i].e(1),
      cps[i].e(2),
      cps[i + 1].e(1),
      cps[i + 1].e(2),
      cps[i + 2].e(1),
      cps[i + 2].e(2)
    );
  }
};

// returns the y-position just beyond the separating null value line
const getNullPosition = config => {
  if (config.nullValueSeparator === 'bottom') {
    return h(config) + 1;
  } else if (config.nullValueSeparator === 'top') {
    return 1;
  } else {
    console.log(
      "A value is NULL, but nullValueSeparator is not set; set it to 'bottom' or 'top'."
    );
  }
  return h(config) + 1;
};

const singlePath = (config, position, d, ctx) => {
  Object.keys(config.dimensions)
    .map(p => [
      position(p),
      d[p] === undefined
        ? getNullPosition(config)
        : config.dimensions[p].yscale(d[p]),
    ])
    .sort((a, b) => a[0] - b[0])
    .forEach((p, i) => {
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    });
};

// draw single polyline
const colorPath = (config, position, d, ctx) => {
  ctx.beginPath();
  if (
    (config.bundleDimension !== null && config.bundlingStrength > 0) ||
    config.smoothness > 0
  ) {
    singleCurve(config, position, d, ctx);
  } else {
    singlePath(config, position, d, ctx);
  }
  ctx.stroke();
};

export default colorPath;
