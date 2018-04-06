const sortDimensionsByRowData = config => rowdata => {
  const copy = Object.assign({}, config.dimensions);
  const positionSortedKeys = Object.keys(config.dimensions).sort((a, b) => {
    const pixelDifference =
      config.dimensions[a].yscale(rowdata[a]) -
      config.dimensions[b].yscale(rowdata[b]);

    // Array.sort is not necessarily stable, this means that if pixelDifference is zero
    // the ordering of dimensions might change unexpectedly. This is solved by sorting on
    // variable name in that case.
    return pixelDifference === 0 ? a.localeCompare(b) : pixelDifference;
  });
  config.dimensions = {};
  positionSortedKeys.forEach((p, i) => {
    config.dimensions[p] = copy[p];
    config.dimensions[p].index = i;
  });
};

export default sortDimensionsByRowData;
