import hypothenuse from './util/hypothenuse';

// [0, 2*PI] -> [-PI/2, PI/2]
const signedAngle = angle =>
  angle > Math.PI ? 1.5 * Math.PI - angle : 0.5 * Math.PI - angle;

/**
 * angles are stored in radians from in [0, 2*PI], where 0 in 12 o'clock.
 * However, one can only select lines from 0 to PI, so we compute the
 * 'signed' angle, where 0 is the horizontal line (3 o'clock), and +/- PI/2
 * are 12 and 6 o'clock respectively.
 */
const containmentTest = arc => a => {
  let startAngle = signedAngle(arc.startAngle);
  let endAngle = signedAngle(arc.endAngle);

  if (startAngle > endAngle) {
    const tmp = startAngle;
    startAngle = endAngle;
    endAngle = tmp;
  }

  // test if segment angle is contained in angle interval
  return a >= startAngle && a <= endAngle;
};

const crossesStrum = (state, config) => (d, id) => {
  const arc = state.arcs[id],
    test = containmentTest(arc),
    d1 = arc.dims.left,
    d2 = arc.dims.right,
    y1 = config.dimensions[d1].yscale,
    y2 = config.dimensions[d2].yscale,
    a = state.arcs.width(id),
    b = y1(d[d1]) - y2(d[d2]),
    c = hypothenuse(a, b),
    angle = Math.asin(b / c); // rad in [-PI/2, PI/2]
  return test(angle);
};

const selected = (brushGroup, state, config) => {
  const ids = Object.getOwnPropertyNames(state.arcs).filter(d => !isNaN(d));
  const brushed = config.data;

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
