import toTypeCoerceNumbers from './toTypeCoerceNumbers';

// attempt to determine types of each dimension based on first row of data
const detectDimensionTypes = data =>
  Object.keys(data[0]).reduce((acc, cur) => {
    const key = isNaN(Number(cur)) ? cur : parseInt(cur);
    acc[key] = toTypeCoerceNumbers(data[0][cur]);

    return acc;
  }, {});

export default detectDimensionTypes;
