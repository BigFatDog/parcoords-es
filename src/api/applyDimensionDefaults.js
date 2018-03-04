import { keys } from 'd3-collection';

const applyDimensionDefaults = (config, pc) =>
  function(dims) {
    let types = pc.detectDimensionTypes(config.data);
    dims = dims ? dims : keys(types);
    let newDims = {};
    let currIndex = 0;
    dims.forEach(function(k) {
      newDims[k] = config.dimensions[k] ? config.dimensions[k] : {};
      //Set up defaults
      newDims[k].orient = newDims[k].orient ? newDims[k].orient : 'left';
      newDims[k].ticks = newDims[k].ticks != null ? newDims[k].ticks : 5;
      newDims[k].innerTickSize =
        newDims[k].innerTickSize != null ? newDims[k].innerTickSize : 6;
      newDims[k].outerTickSize =
        newDims[k].outerTickSize != null ? newDims[k].outerTickSize : 0;
      newDims[k].tickPadding =
        newDims[k].tickPadding != null ? newDims[k].tickPadding : 3;
      newDims[k].type = newDims[k].type ? newDims[k].type : types[k];

      newDims[k].index =
        newDims[k].index != null ? newDims[k].index : currIndex;
      currIndex++;
    });
    return newDims;
  };

export default applyDimensionDefaults;
