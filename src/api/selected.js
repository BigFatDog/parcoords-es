import { brushSelection } from 'd3-brush';

const selected = (config, pc) => () => {
  let actives = [];
  let extents = [];
  let ranges = {};
  //get brush selections from each node, convert to actual values
  //invert order of values in array to comply with the parcoords architecture
  if (config.brushes.length === 0) {
    let nodes = pc
      .g()
      .selectAll('.brush')
      .nodes();
    for (let k = 0; k < nodes.length; k++) {
      if (brushSelection(nodes[k]) !== null) {
        actives.push(nodes[k].__data__);
        let values = [];
        let ranger = brushSelection(nodes[k]);
        if (
          typeof config.dimensions[nodes[k].__data__].yscale.domain()[0] ===
          'number'
        ) {
          for (let i = 0; i < ranger.length; i++) {
            if (
              actives.includes(nodes[k].__data__) &&
              config.flipAxes.includes(nodes[k].__data__)
            ) {
              values.push(
                config.dimensions[nodes[k].__data__].yscale.invert(ranger[i])
              );
            } else if (config.dimensions[nodes[k].__data__].yscale() !== 1) {
              values.unshift(
                config.dimensions[nodes[k].__data__].yscale.invert(ranger[i])
              );
            }
          }
          extents.push(values);
          for (let ii = 0; ii < extents.length; ii++) {
            if (extents[ii].length === 0) {
              extents[ii] = [1, 1];
            }
          }
        } else {
          ranges[nodes[k].__data__] = brushSelection(nodes[k]);
          let dimRange = config.dimensions[nodes[k].__data__].yscale.range();
          let dimDomain = config.dimensions[nodes[k].__data__].yscale.domain();
          for (let j = 0; j < dimRange.length; j++) {
            if (
              dimRange[j] >= ranger[0] &&
              dimRange[j] <= ranger[1] &&
              actives.includes(nodes[k].__data__) &&
              config.flipAxes.includes(nodes[k].__data__)
            ) {
              values.push(dimRange[j]);
            } else if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1]) {
              values.unshift(dimRange[j]);
            }
          }
          extents.push(values);
          for (let ii = 0; ii < extents.length; ii++) {
            if (extents[ii].length === 0) {
              extents[ii] = [1, 1];
            }
          }
        }
      }
    }
    // test if within range
    const within = {
      date: function(d, p, dimension) {
        let category = d[p];
        let categoryIndex = config.dimensions[p].yscale
          .domain()
          .indexOf(category);
        let categoryRangeValue = config.dimensions[p].yscale.range()[
          categoryIndex
        ];
        return (
          categoryRangeValue >= ranges[p][0] &&
          categoryRangeValue <= ranges[p][1]
        );
      },
      number: function(d, p, dimension) {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      },
      string: function(d, p, dimension) {
        let category = d[p];
        let categoryIndex = config.dimensions[p].yscale
          .domain()
          .indexOf(category);
        let categoryRangeValue = config.dimensions[p].yscale.range()[
          categoryIndex
        ];
        return (
          categoryRangeValue >= ranges[p][0] &&
          categoryRangeValue <= ranges[p][1]
        );
      },
    };
    return config.data.filter(d =>
      actives.every((p, dimension) =>
        within[config.dimensions[p].type](d, p, dimension)
      )
    );
  } else {
    // need to get data from each brush instead of each axis
    // first must find active axes by iterating through all brushes
    // then go through similiar process as above.
    let multiBrushData = [];
    for (let idx = 0; idx < config.brushes.length; idx++) {
      let brush = config.brushes[idx];
      let values = [];
      let ranger = brush.extent;
      let actives = [brush.data];
      if (
        typeof config.dimensions[brush.data].yscale.domain()[0] === 'number'
      ) {
        for (let i = 0; i < ranger.length; i++) {
          if (
            actives.includes(brush.data) &&
            config.flipAxes.includes(brush.data)
          ) {
            values.push(config.dimensions[brush.data].yscale.invert(ranger[i]));
          } else if (config.dimensions[brush.data].yscale() !== 1) {
            values.unshift(
              config.dimensions[brush.data].yscale.invert(ranger[i])
            );
          }
        }
        extents.push(values);
        for (let ii = 0; ii < extents.length; ii++) {
          if (extents[ii].length === 0) {
            extents[ii] = [1, 1];
          }
        }
      } else {
        ranges[brush.data] = brush.extent;
        let dimRange = config.dimensions[brush.data].yscale.range();
        let dimDomain = config.dimensions[brush.data].yscale.domain();
        for (let j = 0; j < dimRange.length; j++) {
          if (
            dimRange[j] >= ranger[0] &&
            dimRange[j] <= ranger[1] &&
            actives.includes(brush.data) &&
            config.flipAxes.includes(brush.data)
          ) {
            values.push(dimRange[j]);
          } else if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1]) {
            values.unshift(dimRange[j]);
          }
        }
        extents.push(values);
        for (let ii = 0; ii < extents.length; ii++) {
          if (extents[ii].length === 0) {
            extents[ii] = [1, 1];
          }
        }
      }
      let within = {
        date: function(d, p, dimension) {
          let category = d[p];
          let categoryIndex = config.dimensions[p].yscale
            .domain()
            .indexOf(category);
          let categoryRangeValue = config.dimensions[p].yscale.range()[
            categoryIndex
          ];
          return (
            categoryRangeValue >= ranges[p][0] &&
            categoryRangeValue <= ranges[p][1]
          );
        },
        number: function(d, p, dimension) {
          return extents[idx][0] <= d[p] && d[p] <= extents[idx][1];
        },
        string: function(d, p, dimension) {
          let category = d[p];
          let categoryIndex = config.dimensions[p].yscale
            .domain()
            .indexOf(category);
          let categoryRangeValue = config.dimensions[p].yscale.range()[
            categoryIndex
          ];
          return (
            categoryRangeValue >= ranges[p][0] &&
            categoryRangeValue <= ranges[p][1]
          );
        },
      };

      // filter data, but instead of returning it now,
      // put it into multiBrush data which is returned after
      // all brushes are iterated through.
      let filtered = config.data.filter(d =>
        actives.every((p, dimension) =>
          within[config.dimensions[p].type](d, p, dimension)
        )
      );
      for (let z = 0; z < filtered.length; z++) {
        multiBrushData.push(filtered[z]);
      }
      actives = [];
      ranges = {};
    }
    return multiBrushData;
  }
};

export default selected;
