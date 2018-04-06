import { extent } from 'd3-array';

const commonScale = (config, pc) =>
  function(global, type) {
    const t = type || 'number';
    if (typeof global === 'undefined') {
      global = true;
    }

    // try to autodetect dimensions and create scales
    if (!Object.keys(config.dimensions).length) {
      pc.detectDimensions();
    }
    pc.autoscale();

    // scales of the same type
    const scales = Object.keys(config.dimensions).filter(
      p => config.dimensions[p].type == t
    );

    if (global) {
      let _extent = extent(
        scales
          .map(d => config.dimensions[d].yscale.domain())
          .reduce((cur, acc) => cur.concat(acc))
      );

      scales.forEach(d => {
        config.dimensions[d].yscale.domain(_extent);
      });
    } else {
      scales.forEach(d => {
        config.dimensions[d].yscale.domain(extent(config.data, d => +d[k]));
      });
    }

    // update centroids
    if (config.bundleDimension !== null) {
      pc.bundleDimension(config.bundleDimension);
    }

    return this;
  };

export default commonScale;
