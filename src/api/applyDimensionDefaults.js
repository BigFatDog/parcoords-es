const isValid = d => d !== null && d !== undefined;

const applyDimensionDefaults = (config, pc) =>
  function(dims) {
    const types = pc.detectDimensionTypes(config.data);
    dims = dims ? dims : Object.keys(types);

    return dims.reduce((acc, cur, i) => {
      const k = config.dimensions[cur] ? config.dimensions[cur] : {};
      acc[cur] = {
        ...k,
        orient: isValid(k.orient) ? k.orient : 'left',
        ticks: isValid(k.ticks) ? k.ticks : 5,
        innerTickSize: isValid(k.innerTickSize) ? k.innerTickSize : 6,
        outerTickSize: isValid(k.outerTickSize) ? k.outerTickSize : 0,
        tickPadding: isValid(k.tickPadding) ? k.tickPadding : 3,
        type: isValid(k.type) ? k.type : types[cur],
        index: isValid(k.index) ? k.index : i,
      };

      return acc;
    }, {});
  };

export default applyDimensionDefaults;
