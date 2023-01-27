// attempt to determine types of each dimension
// if all non-null values are numbers, then it's a number, otherwise it's a string
const detectDimensionTypes = data => {
  const keys = Object.keys(data[0]);
  const nonNullValues = keys.map(key =>
    data.map(d => d[key]).filter(v => v !== null)
  );
  const types = nonNullValues.map(v => {
    if (v.every(x => !isNaN(x))) return 'number';
    return 'string';
  });
  return Object.fromEntries(keys.map((_, i) => [keys[i], types[i]]));
};

export default detectDimensionTypes;
