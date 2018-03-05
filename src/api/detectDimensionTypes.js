import { keys } from 'd3-collection';

import toTypeCoerceNumbers from './toTypeCoerceNumbers';
// attempt to determine types of each dimension based on first row of data

const detectDimensionTypes = data => {
  let types = {};
  keys(data[0]).forEach(col => {
    types[isNaN(Number(col)) ? col : parseInt(col)] = toTypeCoerceNumbers(
      data[0][col]
    );
  });
  return types;
};

export default detectDimensionTypes;
