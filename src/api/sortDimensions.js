const sortDimensions = (config, position) => () => {
  const copy = Object.assign({}, config.dimensions);
  const positionSortedKeys = Object.keys(config.dimensions).sort(
    (a, b) => (position(a) - position(b) === 0 ? 1 : position(a) - position(b))
  );
  config.dimensions = {};
  positionSortedKeys.forEach((p, i) => {
    config.dimensions[p] = copy[p];
    config.dimensions[p].index = i;
  });
};

export default sortDimensions;
