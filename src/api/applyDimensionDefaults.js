import { keys } from 'd3-collection';

const applyDimensionDefaults = (config, pc) =>
  function(dims) {
    const types = pc.detectDimensionTypes(config.data);
    dims = dims ? dims : keys(types);

    return dims.reduce((acc, cur, i)=> {
        const k = config.dimensions[cur] ? config.dimensions[cur] : {};

        acc[cur] = {
            ...k,
            orient: k.orient ? k.orient : 'left',
            ticks: k.ticks != null ? k.ticks : 5,
            innerTickSize: k.innerTickSize != null ? k.innerTickSize : 6,
            outerTickSize: k.outerTickSize != null ? k.outerTickSize : 0,
            tickPadding: k.tickPadding != null ? k.tickPadding : 3,
            type: k.type ? k.type : types[cur],
            index: k.index != null ? k.index : i,
        }

        return acc;
    }, {});
  };

export default applyDimensionDefaults;
