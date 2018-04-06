/**
 * Renders the polylines.
 * If no dimensions have been specified, it will attempt to detect quantitative
 * dimensions based on the first data entry. If scales haven't been set, it will
 * autoscale based on the extent for each dimension.
 *
 * @param config
 * @param pc
 * @param events
 * @returns {Function}
 */
const render = (config, pc, events) =>
  function() {
    // try to autodetect dimensions and create scales
    if (!Object.keys(config.dimensions).length) {
      pc.detectDimensions();
    }
    pc.autoscale();

    pc.render[config.mode]();

    events.call('render', this);
    return this;
  };

export default render;
