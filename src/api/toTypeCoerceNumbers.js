import toType from './toType';

// try to coerce to number before returning type
const toTypeCoerceNumbers = v =>
  parseFloat(v) == v && v !== null ? 'number' : toType(v);

export default toTypeCoerceNumbers;
