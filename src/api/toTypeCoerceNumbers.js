import toType from './toType';
// try to coerce to number before returning type
const toTypeCoerceNumbers = v => {
  if (parseFloat(v) == v && v != null) {
    return 'number';
  }
  return toType(v);
};

export default toTypeCoerceNumbers;
