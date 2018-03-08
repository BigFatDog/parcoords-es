// test if point falls between lines
const containmentTest = (strum, width) => p => {
  const p1 = [strum.p1[0] - strum.minX, strum.p1[1] - strum.minX],
    p2 = [strum.p2[0] - strum.minX, strum.p2[1] - strum.minX],
    m1 = 1 - width / p1[0],
    b1 = p1[1] * (1 - m1),
    m2 = 1 - width / p2[0],
    b2 = p2[1] * (1 - m2);

  const x = p[0],
    y = p[1],
    y1 = m1 * x + b1,
    y2 = m2 * x + b2;

  return y > Math.min(y1, y2) && y < Math.max(y1, y2);
};

const crossesStrum = (state, config) => (d, id) => {
  let strum = state.strums[id],
    test = containmentTest(strum, state.strums.width(id)),
    d1 = strum.dims.left,
    d2 = strum.dims.right,
    y1 = config.dimensions[d1].yscale,
    y2 = config.dimensions[d2].yscale,
    point = [y1(d[d1]) - strum.minX, y2(d[d2]) - strum.minX];
  return test(point);
};

const selected = (brushGroup, state, config) => {
  // Get the ids of the currently active strums.
  const ids = Object.getOwnPropertyNames(state.strums).filter(d => !isNaN(d)),
    brushed = config.data;

  if (ids.length === 0) {
    return brushed;
  }

  const crossTest = crossesStrum(state, config);

  return brushed.filter(d => {
    switch (brushGroup.predicate) {
      case 'AND':
        return ids.every(id => crossTest(d, id));
      case 'OR':
        return ids.some(id => crossTest(d, id));
      default:
        throw new Error('Unknown brush predicate ' + config.brushPredicate);
    }
  });
};

export default selected;
