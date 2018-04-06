// this descriptive text should live with other introspective methods
const toString = config => () =>
  'Parallel Coordinates: ' +
  Object.keys(config.dimensions).length +
  ' dimensions (' +
  Object.keys(config.data[0]).length +
  ' total) , ' +
  config.data.length +
  ' rows';

export default toString;
