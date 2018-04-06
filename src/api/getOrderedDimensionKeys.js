import { ascending } from 'd3-array';

const getOrderedDimensionKeys = config => () =>
  Object.keys(config.dimensions).sort((x, y) =>
    ascending(config.dimensions[x].index, config.dimensions[y].index)
  );

export default getOrderedDimensionKeys;
