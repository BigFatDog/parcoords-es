import { ascending } from 'd3-array';
import { keys } from 'd3-collection';

const getOrderedDimensionKeys = config => () =>
  keys(config.dimensions).sort((x, y) =>
    ascending(config.dimensions[x].index, config.dimensions[y].index)
  );

export default getOrderedDimensionKeys;
