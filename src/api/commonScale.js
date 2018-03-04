import { keys } from 'd3-collection';
import { extent } from 'd3-array';

const commonScale = (config, pc) =>
  function(global, type) {
    let t = type || 'number';
    if (typeof global === 'undefined') {
      global = true;
    }

    // try to autodetect dimensions and create scales
    if (!keys(config.dimensions).length) {
      pc.detectDimensions();
    }
    pc.autoscale();

    // scales of the same type
    let scales = keys(config.dimensions).filter(function(p) {
      return config.dimensions[p].type == t;
    });

    if (global) {
      let _extent = extent(
        scales
          .map(function(d, i) {
            return config.dimensions[d].yscale.domain();
          })
          .reduce(function(a, b) {
            return a.concat(b);
          })
      );

      scales.forEach(function(d) {
        config.dimensions[d].yscale.domain(_extent);
      });
    } else {
      scales.forEach(function(d) {
        config.dimensions[d].yscale.domain(
          extent(config.data, function(d) {
            return +d[k];
          })
        );
      });
    }

    // update centroids
    if (config.bundleDimension !== null) {
      pc.bundleDimension(config.bundleDimension);
    }

    return this;
  };

export default commonScale;
