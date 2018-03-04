/**
 * dimension display names
 *
 * @param config
 * @param d
 * @returns {*}
 */
const dimensionLabels = config => d =>
  config.dimensions[d].title ? config.dimensions[d].title : d;

export default dimensionLabels;
