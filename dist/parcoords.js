(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('requestanimationframe'), require('d3-selection'), require('d3-brush'), require('d3-drag'), require('d3-shape'), require('d3-scale'), require('d3-array'), require('d3-collection'), require('d3-axis'), require('d3-dispatch')) :
  typeof define === 'function' && define.amd ? define(['requestanimationframe', 'd3-selection', 'd3-brush', 'd3-drag', 'd3-shape', 'd3-scale', 'd3-array', 'd3-collection', 'd3-axis', 'd3-dispatch'], factory) :
  (global.ParCoords = factory(null,global.d3Selection,global.d3Brush,global.d3Drag,global.d3Shape,global.d3Scale,global.d3Array,global.d3Collection,global.d3Axis,global.d3Dispatch));
}(this, (function (requestanimationframe,d3Selection,d3Brush,d3Drag,d3Shape,d3Scale,d3Array,d3Collection,d3Axis,d3Dispatch) { 'use strict';

  var renderQueue = function renderQueue(func) {
    var _queue = [],
        // data to be rendered
    _rate = 1000,
        // number of calls per frame
    _invalidate = function _invalidate() {},
        // invalidate last render queue
    _clear = function _clear() {}; // clearing function

    var rq = function rq(data) {
      if (data) rq.data(data);
      _invalidate();
      _clear();
      rq.render();
    };

    rq.render = function () {
      var valid = true;
      _invalidate = rq.invalidate = function () {
        valid = false;
      };

      function doFrame() {
        if (!valid) return true;
        var chunk = _queue.splice(0, _rate);
        chunk.map(func);
        requestAnimationFrame(doFrame);
      }

      doFrame();
    };

    rq.data = function (data) {
      _invalidate();
      _queue = data.slice(0); // creates a copy of the data
      return rq;
    };

    rq.add = function (data) {
      _queue = _queue.concat(data);
    };

    rq.rate = function (value) {
      if (!arguments.length) return _rate;
      _rate = value;
      return rq;
    };

    rq.remaining = function () {
      return _queue.length;
    };

    // clear the canvas
    rq.clear = function (func) {
      if (!arguments.length) {
        _clear();
        return rq;
      }
      _clear = func;
      return rq;
    };

    rq.invalidate = _invalidate;

    return rq;
  };

  var w = function w(config) {
    return config.width - config.margin.right - config.margin.left;
  };

  var invertCategorical = function invertCategorical(selection, scale) {
    if (selection.length === 0) {
      return [];
    }
    var domain = scale.domain();
    var range = scale.range();
    var found = [];
    range.forEach(function (d, i) {
      if (d >= selection[0] && d <= selection[1]) {
        found.push(domain[i]);
      }
    });
    return found;
  };

  var invertByScale = function invertByScale(selection, scale) {
    if (scale === null) return [];
    return typeof scale.invert === 'undefined' ? invertCategorical(selection, scale) : selection.map(function (d) {
      return scale.invert(d);
    });
  };

  var brushExtents = function brushExtents(state, config, pc) {
    return function (extents) {
      var brushes = state.brushes,
          brushNodes = state.brushNodes;


      if (typeof extents === 'undefined') {
        return Object.keys(config.dimensions).reduce(function (acc, cur) {
          var brush = brushes[cur];
          //todo: brush check
          if (brush !== undefined && d3Brush.brushSelection(brushNodes[cur]) !== null) {
            var raw = d3Brush.brushSelection(brushNodes[cur]);
            var yScale = config.dimensions[cur].yscale;
            var scaled = invertByScale(raw, yScale);

            acc[cur] = {
              extent: brush.extent(),
              selection: {
                raw: raw,
                scaled: scaled
              }
            };
          }

          return acc;
        }, {});
      } else {
        //first get all the brush selections
        var brushSelections = {};
        pc.g().selectAll('.brush').each(function (d) {
          brushSelections[d] = d3Selection.select(this);
        });

        // loop over each dimension and update appropriately (if it was passed in through extents)
        Object.keys(config.dimensions).forEach(function (d) {
          if (extents[d] === undefined) {
            return;
          }

          var brush = brushes[d];
          if (brush !== undefined) {
            var dim = config.dimensions[d];
            var yExtent = extents[d].map(dim.yscale);

            //update the extent
            //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
            //we actually don't need this since we are using brush.move below
            //extents set the limits of the brush which means a user will not be able
            //to move or drag the brush beyond the limits set by brush.extent
            //brush.extent([[-15, yExtent[1]], [15, yExtent[0]]]);

            //redraw the brush
            //https://github.com/d3/d3-brush#brush_move
            // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
            brushSelections[d].call(brush).call(brush.move, yExtent.reverse());

            //fire some events
            // brush.event(brushSelections[d]);
          }
        });

        //redraw the chart
        pc.renderBrushed();

        return pc;
      }
    };
  };

  var _this = undefined;

  var brushReset = function brushReset(state, config, pc) {
    return function (dimension) {
      var brushes = state.brushes;


      if (dimension === undefined) {
        config.brushed = false;
        if (pc.g() !== undefined && pc.g() !== null) {
          pc.g().selectAll('.brush').each(function (d) {
            if (brushes[d] !== undefined) {
              d3Selection.select(this).call(brushes[d].move, null);
            }
          });
          pc.renderBrushed();
        }
      } else {
        config.brushed = false;
        if (pc.g() !== undefined && pc.g() !== null) {
          pc.g().selectAll('.brush').each(function (d) {
            if (d !== dimension) return;
            d3Selection.select(this).call(brushes[d].move, null);
            if (typeof brushes[d].type === 'function') {
              brushes[d].event(d3Selection.select(this));
            }
          });
          pc.renderBrushed();
        }
      }
      return _this;
    };
  };

  //https://github.com/d3/d3-brush/issues/10

  // data within extents
  var selected = function selected(state, config, brushGroup) {
    return function () {
      var brushNodes = state.brushNodes;

      var is_brushed = function is_brushed(p) {
        return brushNodes[p] && d3Brush.brushSelection(brushNodes[p]) !== null;
      };

      var actives = Object.keys(config.dimensions).filter(is_brushed);
      var extents = actives.map(function (p) {
        var _brushRange = d3Brush.brushSelection(brushNodes[p]);

        if (typeof config.dimensions[p].yscale.invert === 'function') {
          return [config.dimensions[p].yscale.invert(_brushRange[1]), config.dimensions[p].yscale.invert(_brushRange[0])];
        } else {
          return _brushRange;
        }
      });
      // We don't want to return the full data set when there are no axes brushed.
      // Actually, when there are no axes brushed, by definition, no items are
      // selected. So, let's avoid the filtering and just return false.
      //if (actives.length === 0) return false;

      // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
      if (actives.length === 0) return config.data;

      // test if within range
      var within = {
        date: function date(d, p, dimension) {
          if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
            // if it is ordinal
            return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
          } else {
            return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
          }
        },
        number: function number(d, p, dimension) {
          if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
            // if it is ordinal
            return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
          } else {
            return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
          }
        },
        string: function string(d, p, dimension) {
          return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
        }
      };

      return config.data.filter(function (d) {
        switch (brushGroup.predicate) {
          case 'AND':
            return actives.every(function (p, dimension) {
              return within[config.dimensions[p].type](d, p, dimension);
            });
          case 'OR':
            return actives.some(function (p, dimension) {
              return within[config.dimensions[p].type](d, p, dimension);
            });
          default:
            throw new Error('Unknown brush predicate ' + config.brushPredicate);
        }
      });
    };
  };

  var brushUpdated = function brushUpdated(config, pc, events, args) {
    return function (newSelection) {
      config.brushed = newSelection;
      events.call('brush', pc, config.brushed, args);
      pc.renderBrushed();
    };
  };

  var brushFor = function brushFor(state, config, pc, events, brushGroup) {
    return function (axis, _selector) {
      // handle hidden axes which will not be a property of dimensions
      if (!config.dimensions.hasOwnProperty(axis)) {
        return function () {};
      }

      var brushRangeMax = config.dimensions[axis].type === 'string' ? config.dimensions[axis].yscale.range()[config.dimensions[axis].yscale.range().length - 1] : config.dimensions[axis].yscale.range()[0];

      var _brush = d3Brush.brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

      var convertBrushArguments = function convertBrushArguments(args) {
        var args_array = Array.prototype.slice.call(args);
        var axis = args_array[0];

        var raw = d3Brush.brushSelection(args_array[2][0]) || [];

        // handle hidden axes which will not have a yscale
        var yscale = null;
        if (config.dimensions.hasOwnProperty(axis)) {
          yscale = config.dimensions[axis].yscale;
        }

        // ordinal scales do not have invert
        var scaled = invertByScale(raw, yscale);

        return {
          axis: args_array[0],
          node: args_array[2][0],
          selection: {
            raw: raw,
            scaled: scaled
          }
        };
      };

      _brush.on('start', function () {
        if (d3Selection.event.sourceEvent !== null) {
          events.call('brushstart', pc, config.brushed, convertBrushArguments(arguments));
          if (typeof d3Selection.event.sourceEvent.stopPropagation === 'function') {
            d3Selection.event.sourceEvent.stopPropagation();
          }
        }
      }).on('brush', function () {
        brushUpdated(config, pc, events, convertBrushArguments(arguments))(selected(state, config, brushGroup)());
      }).on('end', function () {
        brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
        events.call('brushend', pc, config.brushed, convertBrushArguments(arguments));
      });

      state.brushes[axis] = _brush;
      state.brushNodes[axis] = _selector.node();

      return _brush;
    };
  };

  var install = function install(state, config, pc, events, brushGroup) {
    return function () {
      if (!pc.g()) {
        pc.createAxes();
      }

      // Add and store a brush for each axis.
      var brush = pc.g().append('svg:g').attr('class', 'brush').each(function (d) {
        d3Selection.select(this).call(brushFor(state, config, pc, events, brushGroup)(d, d3Selection.select(this)));
      });
      brush.selectAll('rect').style('visibility', null).attr('x', -15).attr('width', 30);

      brush.selectAll('rect.background').style('fill', 'transparent');

      brush.selectAll('rect.extent').style('fill', 'rgba(255,255,255,0.25)').style('stroke', 'rgba(0,0,0,0.6)');

      brush.selectAll('.resize rect').style('fill', 'rgba(0,0,0,0.1)');

      pc.brushExtents = brushExtents(state, config, pc);
      pc.brushReset = brushReset(state, config, pc);
      return pc;
    };
  };

  var uninstall = function uninstall(state, pc) {
    return function () {
      if (pc.g() !== undefined && pc.g() !== null) pc.g().selectAll('.brush').remove();

      state.brushes = {};
      delete pc.brushExtents;
      delete pc.brushReset;
    };
  };

  var install1DAxes = function install1DAxes(brushGroup, config, pc, events) {
    var state = {
      brushes: {},
      brushNodes: {}
    };

    brushGroup.modes['1D-axes'] = {
      install: install(state, config, pc, events, brushGroup),
      uninstall: uninstall(state, pc),
      selected: selected(state, config, brushGroup),
      brushState: brushExtents(state, config, pc)
    };
  };

  var drawBrushes = function drawBrushes(brushes, config, pc, axis, selector) {
    var brushSelection = selector.selectAll('.brush').data(brushes, function (d) {
      return d.id;
    });

    brushSelection.enter().insert('g', '.brush').attr('class', 'brush').attr('dimension', axis).attr('id', function (b) {
      return 'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + b.id;
    }).each(function (brushObject) {
      brushObject.brush(d3Selection.select(this));
    });

    brushSelection.each(function (brushObject) {
      d3Selection.select(this).attr('class', 'brush').selectAll('.overlay').style('pointer-events', function () {
        var brush = brushObject.brush;
        if (brushObject.id === brushes.length - 1 && brush !== undefined) {
          return 'all';
        } else {
          return 'none';
        }
      });
    });

    brushSelection.exit().remove();
  };

  // data within extents
  var selected$1 = function selected(state, config, pc, events, brushGroup) {
    var brushes = state.brushes;


    var is_brushed = function is_brushed(p, pos) {
      var axisBrushes = brushes[p];

      for (var i = 0; i < axisBrushes.length; i++) {
        var brush = document.getElementById('brush-' + pos + '-' + i);

        if (brush && d3Brush.brushSelection(brush) !== null) {
          return true;
        }
      }

      return false;
    };

    var actives = Object.keys(config.dimensions).filter(is_brushed);
    var extents = actives.map(function (p) {
      var axisBrushes = brushes[p];

      return axisBrushes.filter(function (d) {
        return !pc.hideAxis().includes(d);
      }).map(function (d, i) {
        return d3Brush.brushSelection(document.getElementById('brush-' + Object.keys(config.dimensions).indexOf(p) + '-' + i));
      }).map(function (d, i) {
        if (d === null || d === undefined) {
          return null;
        } else if (typeof config.dimensions[p].yscale.invert === 'function') {
          return [config.dimensions[p].yscale.invert(d[1]), config.dimensions[p].yscale.invert(d[0])];
        } else {
          return d;
        }
      });
    });

    // We don't want to return the full data set when there are no axes brushed.
    // Actually, when there are no axes brushed, by definition, no items are
    // selected. So, let's avoid the filtering and just return false.
    //if (actives.length === 0) return false;

    // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
    if (actives.length === 0) return config.data;

    // test if within range
    var within = {
      date: function date(d, p, i) {
        var dimExt = extents[i];

        if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
          // if it is ordinal
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = dimExt[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var e = _step.value;

              if (e === null || e === undefined) {
                continue;
              }

              if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
                return true;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          return false;
        } else {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = dimExt[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var _e = _step2.value;

              if (_e === null || _e === undefined) {
                continue;
              }

              if (_e[0] <= d[p] && d[p] <= _e[1]) {
                return true;
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }

          return false;
        }
      },
      number: function number(d, p, i) {
        var dimExt = extents[i];

        if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
          // if it is ordinal
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = dimExt[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var e = _step3.value;

              if (e === null || e === undefined) {
                continue;
              }

              if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
                return true;
              }
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          return false;
        } else {
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = dimExt[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var _e2 = _step4.value;

              if (_e2 === null || _e2 === undefined) {
                continue;
              }

              if (_e2[0] <= d[p] && d[p] <= _e2[1]) {
                return true;
              }
            }
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
              }
            }
          }

          return false;
        }
      },
      string: function string(d, p, i) {
        var dimExt = extents[i];

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = dimExt[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var e = _step5.value;

            if (e === null || e === undefined) {
              continue;
            }

            if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
              return true;
            }
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        return false;
      }
    };

    return config.data.filter(function (d) {
      switch (brushGroup.predicate) {
        case 'AND':
          return actives.every(function (p, i) {
            return within[config.dimensions[p].type](d, p, i);
          });
        case 'OR':
          return actives.some(function (p, i) {
            return within[config.dimensions[p].type](d, p, i);
          });
        default:
          throw new Error('Unknown brush predicate ' + config.brushPredicate);
      }
    });
  };

  var brushUpdated$1 = function brushUpdated(config, pc, events) {
    return function (newSelection) {
      config.brushed = newSelection;
      events.call('brush', pc, config.brushed);
      pc.renderBrushed();
    };
  };

  var newBrush = function newBrush(state, config, pc, events, brushGroup) {
    return function (axis, _selector) {
      var brushes = state.brushes,
          brushNodes = state.brushNodes;


      var brushRangeMax = config.dimensions[axis].type === 'string' ? config.dimensions[axis].yscale.range()[config.dimensions[axis].yscale.range().length - 1] : config.dimensions[axis].yscale.range()[0];

      var brush = d3Brush.brushY().extent([[-15, 0], [15, brushRangeMax]]);
      var id = brushes[axis] ? brushes[axis].length : 0;
      var node = 'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + id;

      if (brushes[axis]) {
        brushes[axis].push({
          id: id,
          brush: brush,
          node: node
        });
      } else {
        brushes[axis] = [{ id: id, brush: brush, node: node }];
      }

      if (brushNodes[axis]) {
        brushNodes[axis].push({ id: id, node: node });
      } else {
        brushNodes[axis] = [{ id: id, node: node }];
      }

      brush.on('start', function () {
        if (d3Selection.event.sourceEvent !== null) {
          events.call('brushstart', pc, config.brushed);
          if (typeof d3Selection.event.sourceEvent.stopPropagation === 'function') {
            d3Selection.event.sourceEvent.stopPropagation();
          }
        }
      }).on('brush', function (e) {
        // record selections
        brushUpdated$1(config, pc, events)(selected$1(state, config, pc, events, brushGroup));
      }).on('end', function () {
        // Figure out if our latest brush has a selection
        var lastBrushID = brushes[axis][brushes[axis].length - 1].id;
        var lastBrush = document.getElementById('brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + lastBrushID);
        var selection = d3Brush.brushSelection(lastBrush);

        if (selection !== undefined && selection !== null && selection[0] !== selection[1]) {
          newBrush(state, config, pc, events, brushGroup)(axis, _selector);

          drawBrushes(brushes[axis], config, pc, axis, _selector);

          brushUpdated$1(config, pc, events)(selected$1(state, config, pc, events, brushGroup));
        } else {
          if (d3Selection.event.sourceEvent && d3Selection.event.sourceEvent.toString() === '[object MouseEvent]' && d3Selection.event.selection === null) {
            pc.brushReset(axis);
          }
        }

        events.call('brushend', pc, config.brushed);
      });

      return brush;
    };
  };

  /**
   *
   * extents are in format of [[2,6], [3,5]]
   *
   * * @param state
   * @param config
   * @param pc
   * @returns {Function}
   */
  var brushExtents$1 = function brushExtents(state, config, pc, events, brushGroup) {
    return function (extents) {
      var brushes = state.brushes;

      var hiddenAxes = pc.hideAxis();

      if (typeof extents === 'undefined') {
        return Object.keys(config.dimensions).filter(function (d) {
          return !hiddenAxes.includes(d);
        }).reduce(function (acc, cur, pos) {
          var axisBrushes = brushes[cur];

          if (axisBrushes === undefined || axisBrushes === null) {
            acc[cur] = [];
          } else {
            acc[cur] = axisBrushes.reduce(function (d, p, i) {
              var raw = d3Brush.brushSelection(document.getElementById('brush-' + pos + '-' + i));

              if (raw) {
                var yScale = config.dimensions[cur].yscale;
                var scaled = invertByScale(raw, yScale);

                d.push({
                  extent: p.brush.extent(),
                  selection: {
                    raw: raw,
                    scaled: scaled
                  }
                });
              }
              return d;
            }, []);
          }

          return acc;
        }, {});
      } else {
        // //first get all the brush selections
        // loop over each dimension and update appropriately (if it was passed in through extents)
        Object.keys(config.dimensions).forEach(function (d, pos) {
          if (extents[d] === undefined || extents[d] === null) {
            return;
          }

          var dim = config.dimensions[d];

          var yExtents = extents[d].map(function (e) {
            return e.map(dim.yscale);
          });

          var _bs = yExtents.map(function (e, j) {
            var _brush = newBrush(state, config, pc, events, brushGroup)(d, d3Selection.select('#brush-group-' + pos));
            //update the extent
            //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
            _brush.extent([[-15, e[1]], [15, e[0]]]);

            return {
              id: j,
              brush: _brush,
              ext: e
            };
          });

          brushes[d] = _bs;

          drawBrushes(_bs, config, pc, d, d3Selection.select('#brush-group-' + pos));

          //redraw the brush
          //https://github.com/d3/d3-brush#brush_move
          // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
          _bs.forEach(function (f, k) {
            d3Selection.select('#brush-' + pos + '-' + k).call(f.brush).call(f.brush.move, f.ext.reverse());
          });
        });

        //redraw the chart
        pc.renderBrushed();

        return pc;
      }
    };
  };

  var _this$1 = undefined;

  var brushReset$1 = function brushReset(state, config, pc) {
    return function (dimension) {
      var brushes = state.brushes;


      if (dimension === undefined) {
        if (pc.g() !== undefined && pc.g() !== null) {
          Object.keys(config.dimensions).forEach(function (d, pos) {
            var axisBrush = brushes[d];

            // hidden axes will be undefined
            if (axisBrush) {
              axisBrush.forEach(function (e, i) {
                var brush = document.getElementById('brush-' + pos + '-' + i);
                if (brush && d3Brush.brushSelection(brush) !== null) {
                  pc.g().select('#brush-' + pos + '-' + i).call(e.brush.move, null);
                }
              });
            }
          });

          pc.renderBrushed();
        }
      } else {
        if (pc.g() !== undefined && pc.g() !== null) {
          var axisBrush = brushes[dimension];
          var pos = Object.keys(config.dimensions).indexOf(dimension);

          if (axisBrush) {
            axisBrush.forEach(function (e, i) {
              var brush = document.getElementById('brush-' + pos + '-' + i);
              if (d3Brush.brushSelection(brush) !== null) {
                pc.g().select('#brush-' + pos + '-' + i).call(e.brush.move, null);

                if (typeof e.event === 'function') {
                  e.event(d3Selection.select('#brush-' + pos + '-' + i));
                }
              }
            });
          }

          pc.renderBrushed();
        }
      }
      return _this$1;
    };
  };

  var brushFor$1 = function brushFor(state, config, pc, events, brushGroup) {
    return function (axis, _selector) {
      var brushes = state.brushes;

      newBrush(state, config, pc, events, brushGroup)(axis, _selector);
      drawBrushes(brushes[axis], config, pc, axis, _selector);
    };
  };

  var install$1 = function install(state, config, pc, events, brushGroup) {
    return function () {
      if (!pc.g()) {
        pc.createAxes();
      }

      var hiddenAxes = pc.hideAxis();

      pc.g().append('svg:g').attr('id', function (d, i) {
        return 'brush-group-' + i;
      }).attr('class', 'brush-group').attr('dimension', function (d) {
        return d;
      }).each(function (d) {
        if (!hiddenAxes.includes(d)) {
          brushFor$1(state, config, pc, events, brushGroup)(d, d3Selection.select(this));
        }
      });

      pc.brushExtents = brushExtents$1(state, config, pc, events, brushGroup);
      pc.brushReset = brushReset$1(state, config, pc);
      return pc;
    };
  };

  var uninstall$1 = function uninstall(state, pc) {
    return function () {
      if (pc.g() !== undefined && pc.g() !== null) pc.g().selectAll('.brush-group').remove();

      state.brushes = {};
      delete pc.brushExtents;
      delete pc.brushReset;
    };
  };

  var install1DMultiAxes = function install1DMultiAxes(brushGroup, config, pc, events) {
    var state = {
      brushes: {},
      brushNodes: {}
    };

    brushGroup.modes['1D-axes-multi'] = {
      install: install$1(state, config, pc, events, brushGroup),
      uninstall: uninstall$1(state, pc),
      selected: selected$1(state, config, brushGroup),
      brushState: brushExtents$1(state, config, pc)
    };
  };

  var uninstall$2 = function uninstall(state, pc) {
    return function () {
      pc.selection.select('svg').select('g#strums').remove();
      pc.selection.select('svg').select('rect#strum-events').remove();
      pc.on('axesreorder.strums', undefined);
      delete pc.brushReset;

      state.strumRect = undefined;
    };
  };

  // test if point falls between lines
  var containmentTest = function containmentTest(strum, width) {
    return function (p) {
      var p1 = [strum.p1[0] - strum.minX, strum.p1[1] - strum.minX],
          p2 = [strum.p2[0] - strum.minX, strum.p2[1] - strum.minX],
          m1 = 1 - width / p1[0],
          b1 = p1[1] * (1 - m1),
          m2 = 1 - width / p2[0],
          b2 = p2[1] * (1 - m2);

      var x = p[0],
          y = p[1],
          y1 = m1 * x + b1,
          y2 = m2 * x + b2;

      return y > Math.min(y1, y2) && y < Math.max(y1, y2);
    };
  };

  var crossesStrum = function crossesStrum(state, config) {
    return function (d, id) {
      var strum = state.strums[id],
          test = containmentTest(strum, state.strums.width(id)),
          d1 = strum.dims.left,
          d2 = strum.dims.right,
          y1 = config.dimensions[d1].yscale,
          y2 = config.dimensions[d2].yscale,
          point = [y1(d[d1]) - strum.minX, y2(d[d2]) - strum.minX];
      return test(point);
    };
  };

  var selected$2 = function selected(brushGroup, state, config) {
    // Get the ids of the currently active strums.
    var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
      return !isNaN(d);
    }),
        brushed = config.data;

    if (ids.length === 0) {
      return brushed;
    }

    var crossTest = crossesStrum(state, config);

    return brushed.filter(function (d) {
      switch (brushGroup.predicate) {
        case 'AND':
          return ids.every(function (id) {
            return crossTest(d, id);
          });
        case 'OR':
          return ids.some(function (id) {
            return crossTest(d, id);
          });
        default:
          throw new Error('Unknown brush predicate ' + config.brushPredicate);
      }
    });
  };

  var removeStrum = function removeStrum(state, pc) {
    var strum = state.strums[state.strums.active],
        svg = pc.selection.select('svg').select('g#strums');

    delete state.strums[state.strums.active];
    svg.selectAll('line#strum-' + strum.dims.i).remove();
    svg.selectAll('circle#strum-' + strum.dims.i).remove();
  };

  var onDragEnd = function onDragEnd(brushGroup, state, config, pc, events) {
    return function () {
      var strum = state.strums[state.strums.active];

      // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
      // considered a drag without move. So we have to deal with that case
      if (strum && strum.p1[0] === strum.p2[0] && strum.p1[1] === strum.p2[1]) {
        removeStrum(state, pc);
      }

      var brushed = selected$2(brushGroup, state, config);
      state.strums.active = undefined;
      config.brushed = brushed;
      pc.renderBrushed();
      events.call('brushend', pc, config.brushed);
    };
  };

  var drawStrum = function drawStrum(brushGroup, state, config, pc, events, strum, activePoint) {
    var _svg = pc.selection.select('svg').select('g#strums'),
        id = strum.dims.i,
        points = [strum.p1, strum.p2],
        _line = _svg.selectAll('line#strum-' + id).data([strum]),
        circles = _svg.selectAll('circle#strum-' + id).data(points),
        _drag = d3Drag.drag();

    _line.enter().append('line').attr('id', 'strum-' + id).attr('class', 'strum');

    _line.attr('x1', function (d) {
      return d.p1[0];
    }).attr('y1', function (d) {
      return d.p1[1];
    }).attr('x2', function (d) {
      return d.p2[0];
    }).attr('y2', function (d) {
      return d.p2[1];
    }).attr('stroke', 'black').attr('stroke-width', 2);

    _drag.on('drag', function (d, i) {
      var ev = d3Selection.event;
      i = i + 1;
      strum['p' + i][0] = Math.min(Math.max(strum.minX + 1, ev.x), strum.maxX);
      strum['p' + i][1] = Math.min(Math.max(strum.minY, ev.y), strum.maxY);
      drawStrum(brushGroup, state, config, pc, events, strum, i - 1);
    }).on('end', onDragEnd(brushGroup, state, config, pc, events));

    circles.enter().append('circle').attr('id', 'strum-' + id).attr('class', 'strum');

    circles.attr('cx', function (d) {
      return d[0];
    }).attr('cy', function (d) {
      return d[1];
    }).attr('r', 5).style('opacity', function (d, i) {
      return activePoint !== undefined && i === activePoint ? 0.8 : 0;
    }).on('mouseover', function () {
      d3Selection.select(this).style('opacity', 0.8);
    }).on('mouseout', function () {
      d3Selection.select(this).style('opacity', 0);
    }).call(_drag);
  };

  var onDrag = function onDrag(brushGroup, state, config, pc, events) {
    return function () {
      var ev = d3Selection.event,
          strum = state.strums[state.strums.active];

      // Make sure that the point is within the bounds
      strum.p2[0] = Math.min(Math.max(strum.minX + 1, ev.x - config.margin.left), strum.maxX);
      strum.p2[1] = Math.min(Math.max(strum.minY, ev.y - config.margin.top), strum.maxY);

      drawStrum(brushGroup, state, config, pc, events, strum, 1);
    };
  };

  var h = function h(config) {
    return config.height - config.margin.top - config.margin.bottom;
  };

  var dimensionsForPoint = function dimensionsForPoint(config, pc, xscale, p) {
    var dims = { i: -1, left: undefined, right: undefined };
    Object.keys(config.dimensions).some(function (dim, i) {
      if (xscale(dim) < p[0]) {
        dims.i = i;
        dims.left = dim;
        dims.right = Object.keys(config.dimensions)[pc.getOrderedDimensionKeys().indexOf(dim) + 1];
        return false;
      }
      return true;
    });

    if (dims.left === undefined) {
      // Event on the left side of the first axis.
      dims.i = 0;
      dims.left = pc.getOrderedDimensionKeys()[0];
      dims.right = pc.getOrderedDimensionKeys()[1];
    } else if (dims.right === undefined) {
      // Event on the right side of the last axis
      dims.i = Object.keys(config.dimensions).length - 1;
      dims.right = dims.left;
      dims.left = pc.getOrderedDimensionKeys()[Object.keys(config.dimensions).length - 2];
    }

    return dims;
  };

  // First we need to determine between which two axes the sturm was started.
  // This will determine the freedom of movement, because a strum can
  // logically only happen between two axes, so no movement outside these axes
  // should be allowed.
  var onDragStart = function onDragStart(state, config, pc, xscale) {
    return function () {
      var p = d3Selection.mouse(state.strumRect.node());

      p[0] = p[0] - config.margin.left;
      p[1] = p[1] - config.margin.top;

      var dims = dimensionsForPoint(config, pc, xscale, p);
      var strum = {
        p1: p,
        dims: dims,
        minX: xscale(dims.left),
        maxX: xscale(dims.right),
        minY: 0,
        maxY: h(config)
      };

      // Make sure that the point is within the bounds
      strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
      strum.p2 = strum.p1.slice();

      state.strums[dims.i] = strum;
      state.strums.active = dims.i;
    };
  };

  var brushReset$2 = function brushReset(brushGroup, state, config, pc, events) {
    return function () {
      var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
        return !isNaN(d);
      });

      ids.forEach(function (d) {
        state.strums.active = d;
        removeStrum(state, pc);
      });
      onDragEnd(brushGroup, state, config, pc, events)();
    };
  };

  // Checks if the first dimension is directly left of the second dimension.
  var consecutive = function consecutive(dimensions) {
    return function (first, second) {
      var keys = Object.keys(dimensions);

      return keys.some(function (d, i) {
        return d === first ? i + i < keys.length && dimensions[i + 1] === second : false;
      });
    };
  };

  var install$2 = function install(brushGroup, state, config, pc, events, xscale) {
    return function () {
      if (pc.g() === undefined || pc.g() === null) {
        pc.createAxes();
      }

      var _drag = d3Drag.drag();

      // Map of current strums. Strums are stored per segment of the PC. A segment,
      // being the area between two axes. The left most area is indexed at 0.
      state.strums.active = undefined;
      // Returns the width of the PC segment where currently a strum is being
      // placed. NOTE: even though they are evenly spaced in our current
      // implementation, we keep for when non-even spaced segments are supported as
      // well.
      state.strums.width = function (id) {
        return state.strums[id] === undefined ? undefined : state.strums[id].maxX - state.strums[id].minX;
      };

      pc.on('axesreorder.strums', function () {
        var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
          return !isNaN(d);
        });

        if (ids.length > 0) {
          // We have some strums, which might need to be removed.
          ids.forEach(function (d) {
            var dims = state.strums[d].dims;
            state.strums.active = d;
            // If the two dimensions of the current strum are not next to each other
            // any more, than we'll need to remove the strum. Otherwise we keep it.
            if (!consecutive(config.dimensions)(dims.left, dims.right)) {
              removeStrum(state, pc);
            }
          });
          onDragEnd(brushGroup, state, config, pc, events)();
        }
      });

      // Add a new svg group in which we draw the strums.
      pc.selection.select('svg').append('g').attr('id', 'strums').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

      // Install the required brushReset function
      pc.brushReset = brushReset$2(brushGroup, state, config, pc, events);

      _drag.on('start', onDragStart(state, config, pc, xscale)).on('drag', onDrag(brushGroup, state, config, pc, events)).on('end', onDragEnd(brushGroup, state, config, pc, events));

      // NOTE: The styling needs to be done here and not in the css. This is because
      //       for 1D brushing, the canvas layers should not listen to
      //       pointer-events._.
      state.strumRect = pc.selection.select('svg').insert('rect', 'g#strums').attr('id', 'strum-events').attr('x', config.margin.left).attr('y', config.margin.top).attr('width', w(config)).attr('height', h(config) + 2).style('opacity', 0).call(_drag);
    };
  };

  var install2DStrums = function install2DStrums(brushGroup, config, pc, events, xscale) {
    var state = {
      strums: {},
      strumRect: {}
    };

    brushGroup.modes['2D-strums'] = {
      install: install$2(brushGroup, state, config, pc, events, xscale),
      uninstall: uninstall$2(state, pc),
      selected: selected$2(brushGroup, state, config),
      brushState: function brushState() {
        return state.strums;
      }
    };
  };

  var uninstall$3 = function uninstall(state, pc) {
    return function () {
      pc.selection.select('svg').select('g#arcs').remove();
      pc.selection.select('svg').select('rect#arc-events').remove();
      pc.on('axesreorder.arcs', undefined);

      delete pc.brushReset;

      state.strumRect = undefined;
    };
  };

  var hypothenuse = function hypothenuse(a, b) {
    return Math.sqrt(a * a + b * b);
  };

  // [0, 2*PI] -> [-PI/2, PI/2]
  var signedAngle = function signedAngle(angle) {
    return angle > Math.PI ? 1.5 * Math.PI - angle : 0.5 * Math.PI - angle;
  };

  /**
   * angles are stored in radians from in [0, 2*PI], where 0 in 12 o'clock.
   * However, one can only select lines from 0 to PI, so we compute the
   * 'signed' angle, where 0 is the horizontal line (3 o'clock), and +/- PI/2
   * are 12 and 6 o'clock respectively.
   */
  var containmentTest$1 = function containmentTest(arc) {
    return function (a) {
      var startAngle = signedAngle(arc.startAngle);
      var endAngle = signedAngle(arc.endAngle);

      if (startAngle > endAngle) {
        var tmp = startAngle;
        startAngle = endAngle;
        endAngle = tmp;
      }

      // test if segment angle is contained in angle interval
      return a >= startAngle && a <= endAngle;
    };
  };

  var crossesStrum$1 = function crossesStrum(state, config) {
    return function (d, id) {
      var arc = state.arcs[id],
          test = containmentTest$1(arc),
          d1 = arc.dims.left,
          d2 = arc.dims.right,
          y1 = config.dimensions[d1].yscale,
          y2 = config.dimensions[d2].yscale,
          a = state.arcs.width(id),
          b = y1(d[d1]) - y2(d[d2]),
          c = hypothenuse(a, b),
          angle = Math.asin(b / c); // rad in [-PI/2, PI/2]
      return test(angle);
    };
  };

  var selected$3 = function selected(brushGroup, state, config) {
    var ids = Object.getOwnPropertyNames(state.arcs).filter(function (d) {
      return !isNaN(d);
    });
    var brushed = config.data;

    if (ids.length === 0) {
      return brushed;
    }

    var crossTest = crossesStrum$1(state, config);

    return brushed.filter(function (d) {
      switch (brushGroup.predicate) {
        case 'AND':
          return ids.every(function (id) {
            return crossTest(d, id);
          });
        case 'OR':
          return ids.some(function (id) {
            return crossTest(d, id);
          });
        default:
          throw new Error('Unknown brush predicate ' + config.brushPredicate);
      }
    });
  };

  var removeStrum$1 = function removeStrum(state, pc) {
    var arc = state.arcs[state.arcs.active],
        svg = pc.selection.select('svg').select('g#arcs');

    delete state.arcs[state.arcs.active];
    state.arcs.active = undefined;
    svg.selectAll('line#arc-' + arc.dims.i).remove();
    svg.selectAll('circle#arc-' + arc.dims.i).remove();
    svg.selectAll('path#arc-' + arc.dims.i).remove();
  };

  var onDragEnd$1 = function onDragEnd(brushGroup, state, config, pc, events) {
    return function () {
      var arc = state.arcs[state.arcs.active];

      // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
      // considered a drag without move. So we have to deal with that case
      if (arc && arc.p1[0] === arc.p2[0] && arc.p1[1] === arc.p2[1]) {
        removeStrum$1(state, pc);
      }

      if (arc) {
        var angle = state.arcs.startAngle(state.arcs.active);

        arc.startAngle = angle;
        arc.endAngle = angle;
        arc.arc.outerRadius(state.arcs.length(state.arcs.active)).startAngle(angle).endAngle(angle);
      }

      state.arcs.active = undefined;
      config.brushed = selected$3(brushGroup, state, config);
      pc.renderBrushed();
      events.call('brushend', pc, config.brushed);
    };
  };

  var drawStrum$1 = function drawStrum(brushGroup, state, config, pc, events, arc, activePoint) {
    var svg = pc.selection.select('svg').select('g#arcs'),
        id = arc.dims.i,
        points = [arc.p2, arc.p3],
        _line = svg.selectAll('line#arc-' + id).data([{ p1: arc.p1, p2: arc.p2 }, { p1: arc.p1, p2: arc.p3 }]),
        circles = svg.selectAll('circle#arc-' + id).data(points),
        _drag = d3Drag.drag(),
        _path = svg.selectAll('path#arc-' + id).data([arc]);

    _path.enter().append('path').attr('id', 'arc-' + id).attr('class', 'arc').style('fill', 'orange').style('opacity', 0.5);

    _path.attr('d', arc.arc).attr('transform', 'translate(' + arc.p1[0] + ',' + arc.p1[1] + ')');

    _line.enter().append('line').attr('id', 'arc-' + id).attr('class', 'arc');

    _line.attr('x1', function (d) {
      return d.p1[0];
    }).attr('y1', function (d) {
      return d.p1[1];
    }).attr('x2', function (d) {
      return d.p2[0];
    }).attr('y2', function (d) {
      return d.p2[1];
    }).attr('stroke', 'black').attr('stroke-width', 2);

    _drag.on('drag', function (d, i) {
      var ev = d3Selection.event;
      i = i + 2;

      arc['p' + i][0] = Math.min(Math.max(arc.minX + 1, ev.x), arc.maxX);
      arc['p' + i][1] = Math.min(Math.max(arc.minY, ev.y), arc.maxY);

      var angle = i === 3 ? state.arcs.startAngle(id) : state.arcs.endAngle(id);

      if (arc.startAngle < Math.PI && arc.endAngle < Math.PI && angle < Math.PI || arc.startAngle >= Math.PI && arc.endAngle >= Math.PI && angle >= Math.PI) {
        if (i === 2) {
          arc.endAngle = angle;
          arc.arc.endAngle(angle);
        } else if (i === 3) {
          arc.startAngle = angle;
          arc.arc.startAngle(angle);
        }
      }

      drawStrum(brushGroup, state, config, pc, events, arc, i - 2);
    }).on('end', onDragEnd$1(brushGroup, state, config, pc, events));

    circles.enter().append('circle').attr('id', 'arc-' + id).attr('class', 'arc');

    circles.attr('cx', function (d) {
      return d[0];
    }).attr('cy', function (d) {
      return d[1];
    }).attr('r', 5).style('opacity', function (d, i) {
      return activePoint !== undefined && i === activePoint ? 0.8 : 0;
    }).on('mouseover', function () {
      d3Selection.select(this).style('opacity', 0.8);
    }).on('mouseout', function () {
      d3Selection.select(this).style('opacity', 0);
    }).call(_drag);
  };

  var onDrag$1 = function onDrag(brushGroup, state, config, pc, events) {
    return function () {
      var ev = d3Selection.event,
          arc = state.arcs[state.arcs.active];

      // Make sure that the point is within the bounds
      arc.p2[0] = Math.min(Math.max(arc.minX + 1, ev.x - config.margin.left), arc.maxX);
      arc.p2[1] = Math.min(Math.max(arc.minY, ev.y - config.margin.top), arc.maxY);
      arc.p3 = arc.p2.slice();
      drawStrum$1(brushGroup, state, config, pc, events, arc, 1);
    };
  };

  // First we need to determine between which two axes the arc was started.
  // This will determine the freedom of movement, because a arc can
  // logically only happen between two axes, so no movement outside these axes
  // should be allowed.
  var onDragStart$1 = function onDragStart(state, config, pc, xscale) {
    return function () {
      var p = d3Selection.mouse(state.strumRect.node());

      p[0] = p[0] - config.margin.left;
      p[1] = p[1] - config.margin.top;

      var dims = dimensionsForPoint(config, pc, xscale, p);
      var arc = {
        p1: p,
        dims: dims,
        minX: xscale(dims.left),
        maxX: xscale(dims.right),
        minY: 0,
        maxY: h(config),
        startAngle: undefined,
        endAngle: undefined,
        arc: d3Shape.arc().innerRadius(0)
      };

      // Make sure that the point is within the bounds
      arc.p1[0] = Math.min(Math.max(arc.minX, p[0]), arc.maxX);
      arc.p2 = arc.p1.slice();
      arc.p3 = arc.p1.slice();

      state.arcs[dims.i] = arc;
      state.arcs.active = dims.i;
    };
  };

  var brushReset$3 = function brushReset(brushGroup, state, config, pc, events) {
    return function () {
      var ids = Object.getOwnPropertyNames(state.arcs).filter(function (d) {
        return !isNaN(d);
      });

      ids.forEach(function (d) {
        state.arcs.active = d;
        removeStrum$1(state, pc);
      });
      onDragEnd$1(brushGroup, state, config, pc, events)();
    };
  };

  // returns angles in [-PI/2, PI/2]
  var angle = function angle(p1, p2) {
    var a = p1[0] - p2[0],
        b = p1[1] - p2[1],
        c = hypothenuse(a, b);

    return Math.asin(b / c);
  };

  var endAngle = function endAngle(state) {
    return function (id) {
      var arc = state.arcs[id];
      if (arc === undefined) {
        return undefined;
      }
      var sAngle = angle(arc.p1, arc.p2),
          uAngle = -sAngle + Math.PI / 2;

      if (arc.p1[0] > arc.p2[0]) {
        uAngle = 2 * Math.PI - uAngle;
      }

      return uAngle;
    };
  };

  var startAngle = function startAngle(state) {
    return function (id) {
      var arc = state.arcs[id];
      if (arc === undefined) {
        return undefined;
      }

      var sAngle = angle(arc.p1, arc.p3),
          uAngle = -sAngle + Math.PI / 2;

      if (arc.p1[0] > arc.p3[0]) {
        uAngle = 2 * Math.PI - uAngle;
      }

      return uAngle;
    };
  };

  var length = function length(state) {
    return function (id) {
      var arc = state.arcs[id];

      if (arc === undefined) {
        return undefined;
      }

      var a = arc.p1[0] - arc.p2[0],
          b = arc.p1[1] - arc.p2[1];

      return hypothenuse(a, b);
    };
  };

  var install$3 = function install(brushGroup, state, config, pc, events, xscale) {
    return function () {
      if (!pc.g()) {
        pc.createAxes();
      }

      var _drag = d3Drag.drag();

      // Map of current arcs. arcs are stored per segment of the PC. A segment,
      // being the area between two axes. The left most area is indexed at 0.
      state.arcs.active = undefined;
      // Returns the width of the PC segment where currently a arc is being
      // placed. NOTE: even though they are evenly spaced in our current
      // implementation, we keep for when non-even spaced segments are supported as
      // well.
      state.arcs.width = function (id) {
        var arc = state.arcs[id];
        return arc === undefined ? undefined : arc.maxX - arc.minX;
      };

      // returns angles in [0, 2 * PI]
      state.arcs.endAngle = endAngle(state);
      state.arcs.startAngle = startAngle(state);
      state.arcs.length = length(state);

      pc.on('axesreorder.arcs', function () {
        var ids = Object.getOwnPropertyNames(arcs).filter(function (d) {
          return !isNaN(d);
        });

        if (ids.length > 0) {
          // We have some arcs, which might need to be removed.
          ids.forEach(function (d) {
            var dims = arcs[d].dims;
            state.arcs.active = d;
            // If the two dimensions of the current arc are not next to each other
            // any more, than we'll need to remove the arc. Otherwise we keep it.
            if (!consecutive(dims)(dims.left, dims.right)) {
              removeStrum$1(state, pc);
            }
          });
          onDragEnd$1(brushGroup, state, config, pc, events)();
        }
      });

      // Add a new svg group in which we draw the arcs.
      pc.selection.select('svg').append('g').attr('id', 'arcs').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

      // Install the required brushReset function
      pc.brushReset = brushReset$3(brushGroup, state, config, pc, events);

      _drag.on('start', onDragStart$1(state, config, pc, xscale)).on('drag', onDrag$1(brushGroup, state, config, pc, events)).on('end', onDragEnd$1(brushGroup, state, config, pc, events));

      // NOTE: The styling needs to be done here and not in the css. This is because
      //       for 1D brushing, the canvas layers should not listen to
      //       pointer-events._.
      state.strumRect = pc.selection.select('svg').insert('rect', 'g#arcs').attr('id', 'arc-events').attr('x', config.margin.left).attr('y', config.margin.top).attr('width', w(config)).attr('height', h(config) + 2).style('opacity', 0).call(_drag);
    };
  };

  var installAngularBrush = function installAngularBrush(brushGroup, config, pc, events, xscale) {
    var state = {
      arcs: {},
      strumRect: {}
    };

    brushGroup.modes['angular'] = {
      install: install$3(brushGroup, state, config, pc, events, xscale),
      uninstall: uninstall$3(state, pc),
      selected: selected$3(brushGroup, state, config),
      brushState: function brushState() {
        return state.arcs;
      }
    };
  };

  // calculate 2d intersection of line a->b with line c->d
  // points are objects with x and y properties
  var intersection = function intersection(a, b, c, d) {
    return {
      x: ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)),
      y: ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x))
    };
  };

  // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
  // (so you can choose to save it to disk, etc.)
  var mergeParcoords = function mergeParcoords(pc) {
    return function (callback) {
      // Retina display, etc.
      var devicePixelRatio = window.devicePixelRatio || 1;

      // Create a canvas element to store the merged canvases
      var mergedCanvas = document.createElement('canvas');

      var foregroundCanvas = pc.canvas.foreground;
      // We will need to adjust for canvas margins to align the svg and canvas
      var canvasMarginLeft = Number(foregroundCanvas.style.marginLeft.replace('px', ''));

      var textTopAdjust = 15;
      var canvasMarginTop = Number(foregroundCanvas.style.marginTop.replace('px', '')) + textTopAdjust;
      var width = (foregroundCanvas.clientWidth + canvasMarginLeft) * devicePixelRatio;
      var height = (foregroundCanvas.clientHeight + canvasMarginTop) * devicePixelRatio;
      mergedCanvas.width = width + 50; // pad so that svg labels at right will not get cut off
      mergedCanvas.height = height + 30; // pad so that svg labels at bottom will not get cut off
      mergedCanvas.style.width = mergedCanvas.width / devicePixelRatio + 'px';
      mergedCanvas.style.height = mergedCanvas.height / devicePixelRatio + 'px';

      // Give the canvas a white background
      var context = mergedCanvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

      // Merge all the canvases
      for (var key in pc.canvas) {
        context.drawImage(pc.canvas[key], canvasMarginLeft * devicePixelRatio, canvasMarginTop * devicePixelRatio, width - canvasMarginLeft * devicePixelRatio, height - canvasMarginTop * devicePixelRatio);
      }

      // Add SVG elements to canvas
      var DOMURL = window.URL || window.webkitURL || window;
      var serializer = new XMLSerializer();
      // axis labels are translated (0,-5) so we will clone the svg
      //   and translate down so the labels are drawn on the canvas
      var svgNodeCopy = pc.selection.select('svg').node().cloneNode(true);
      svgNodeCopy.setAttribute('transform', 'translate(0,' + textTopAdjust + ')');
      svgNodeCopy.setAttribute('height', svgNodeCopy.getAttribute('height') + textTopAdjust);
      // text will need fill attribute since css styles will not get picked up
      //   this is not sophisticated since it doesn't look up css styles
      //   if the user changes
      d3Selection.select(svgNodeCopy).selectAll('text').attr('fill', 'black');
      var svgStr = serializer.serializeToString(svgNodeCopy);

      // Create a Data URI.
      var src = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
      var img = new Image();
      img.onload = function () {
        context.drawImage(img, 0, 0, img.width * devicePixelRatio, img.height * devicePixelRatio);
        if (typeof callback === 'function') {
          callback(mergedCanvas);
        }
      };
      img.src = src;
    };
  };

  var selected$4 = function selected(config, pc) {
    return function () {
      var actives = [];
      var extents = [];
      var ranges = {};
      //get brush selections from each node, convert to actual values
      //invert order of values in array to comply with the parcoords architecture
      if (config.brushes.length === 0) {
        var nodes = pc.g().selectAll('.brush').nodes();
        for (var k = 0; k < nodes.length; k++) {
          if (d3Brush.brushSelection(nodes[k]) !== null) {
            actives.push(nodes[k].__data__);
            var values = [];
            var ranger = d3Brush.brushSelection(nodes[k]);
            if (typeof config.dimensions[nodes[k].__data__].yscale.domain()[0] === 'number') {
              for (var i = 0; i < ranger.length; i++) {
                if (actives.includes(nodes[k].__data__) && config.flipAxes.includes(nodes[k].__data__)) {
                  values.push(config.dimensions[nodes[k].__data__].yscale.invert(ranger[i]));
                } else if (config.dimensions[nodes[k].__data__].yscale() !== 1) {
                  values.unshift(config.dimensions[nodes[k].__data__].yscale.invert(ranger[i]));
                }
              }
              extents.push(values);
              for (var ii = 0; ii < extents.length; ii++) {
                if (extents[ii].length === 0) {
                  extents[ii] = [1, 1];
                }
              }
            } else {
              ranges[nodes[k].__data__] = d3Brush.brushSelection(nodes[k]);
              var dimRange = config.dimensions[nodes[k].__data__].yscale.range();
              var dimDomain = config.dimensions[nodes[k].__data__].yscale.domain();
              for (var j = 0; j < dimRange.length; j++) {
                if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1] && actives.includes(nodes[k].__data__) && config.flipAxes.includes(nodes[k].__data__)) {
                  values.push(dimRange[j]);
                } else if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1]) {
                  values.unshift(dimRange[j]);
                }
              }
              extents.push(values);
              for (var _ii = 0; _ii < extents.length; _ii++) {
                if (extents[_ii].length === 0) {
                  extents[_ii] = [1, 1];
                }
              }
            }
          }
        }
        // test if within range
        var within = {
          date: function date(d, p, dimension) {
            var category = d[p];
            var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
            var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
            return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
          },
          number: function number(d, p, dimension) {
            return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
          },
          string: function string(d, p, dimension) {
            var category = d[p];
            var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
            var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
            return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
          }
        };
        return config.data.filter(function (d) {
          return actives.every(function (p, dimension) {
            return within[config.dimensions[p].type](d, p, dimension);
          });
        });
      } else {
        // need to get data from each brush instead of each axis
        // first must find active axes by iterating through all brushes
        // then go through similiar process as above.
        var multiBrushData = [];

        var _loop = function _loop(idx) {
          var brush = config.brushes[idx];
          var values = [];
          var ranger = brush.extent;
          var actives = [brush.data];
          if (typeof config.dimensions[brush.data].yscale.domain()[0] === 'number') {
            for (var _i = 0; _i < ranger.length; _i++) {
              if (actives.includes(brush.data) && config.flipAxes.includes(brush.data)) {
                values.push(config.dimensions[brush.data].yscale.invert(ranger[_i]));
              } else if (config.dimensions[brush.data].yscale() !== 1) {
                values.unshift(config.dimensions[brush.data].yscale.invert(ranger[_i]));
              }
            }
            extents.push(values);
            for (var _ii2 = 0; _ii2 < extents.length; _ii2++) {
              if (extents[_ii2].length === 0) {
                extents[_ii2] = [1, 1];
              }
            }
          } else {
            ranges[brush.data] = brush.extent;
            var _dimRange = config.dimensions[brush.data].yscale.range();
            var _dimDomain = config.dimensions[brush.data].yscale.domain();
            for (var _j = 0; _j < _dimRange.length; _j++) {
              if (_dimRange[_j] >= ranger[0] && _dimRange[_j] <= ranger[1] && actives.includes(brush.data) && config.flipAxes.includes(brush.data)) {
                values.push(_dimRange[_j]);
              } else if (_dimRange[_j] >= ranger[0] && _dimRange[_j] <= ranger[1]) {
                values.unshift(_dimRange[_j]);
              }
            }
            extents.push(values);
            for (var _ii3 = 0; _ii3 < extents.length; _ii3++) {
              if (extents[_ii3].length === 0) {
                extents[_ii3] = [1, 1];
              }
            }
          }
          var within = {
            date: function date(d, p, dimension) {
              var category = d[p];
              var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
              var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
              return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
            },
            number: function number(d, p, dimension) {
              return extents[idx][0] <= d[p] && d[p] <= extents[idx][1];
            },
            string: function string(d, p, dimension) {
              var category = d[p];
              var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
              var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
              return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
            }
          };

          // filter data, but instead of returning it now,
          // put it into multiBrush data which is returned after
          // all brushes are iterated through.
          var filtered = config.data.filter(function (d) {
            return actives.every(function (p, dimension) {
              return within[config.dimensions[p].type](d, p, dimension);
            });
          });
          for (var z = 0; z < filtered.length; z++) {
            multiBrushData.push(filtered[z]);
          }
          actives = [];
          ranges = {};
        };

        for (var idx = 0; idx < config.brushes.length; idx++) {
          _loop(idx);
        }
        return multiBrushData;
      }
    };
  };

  var brushPredicate = function brushPredicate(brushGroup, config, pc) {
    return function () {
      var predicate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (predicate === null) {
        return brushGroup.predicate;
      }

      predicate = String(predicate).toUpperCase();
      if (predicate !== 'AND' && predicate !== 'OR') {
        throw new Error('Invalid predicate ' + predicate);
      }

      brushGroup.predicate = predicate;
      config.brushed = brushGroup.currentMode().selected();
      pc.renderBrushed();
      return pc;
    };
  };

  var brushMode = function brushMode(brushGroup, config, pc) {
    return function () {
      var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (mode === null) {
        return brushGroup.mode;
      }

      if (pc.brushModes().indexOf(mode) === -1) {
        throw new Error('pc.brushmode: Unsupported brush mode: ' + mode);
      }

      // Make sure that we don't trigger unnecessary events by checking if the mode
      // actually changes.
      if (mode !== brushGroup.mode) {
        // When changing brush modes, the first thing we need to do is clearing any
        // brushes from the current mode, if any.
        if (brushGroup.mode !== 'None') {
          pc.brushReset();
        }

        // Next, we need to 'uninstall' the current brushMode.
        brushGroup.modes[brushGroup.mode].uninstall(pc);
        // Finally, we can install the requested one.
        brushGroup.mode = mode;
        brushGroup.modes[brushGroup.mode].install();
        if (mode === 'None') {
          delete pc.brushPredicate;
        } else {
          pc.brushPredicate = brushPredicate(brushGroup, config, pc);
        }
      }

      return pc;
    };
  };

  /**
   * dimension display names
   *
   * @param config
   * @param d
   * @returns {*}
   */
  var dimensionLabels = function dimensionLabels(config) {
    return function (d) {
      return config.dimensions[d].title ? config.dimensions[d].title : d;
    };
  };

  var flipAxisAndUpdatePCP = function flipAxisAndUpdatePCP(config, pc, axis) {
    return function (dimension) {
      pc.flip(dimension);
      pc.brushReset(dimension);

      // select(this.parentElement)
      pc.selection.select('svg').selectAll('g.axis').filter(function (d) {
        return d === dimension;
      }).transition().duration(config.animationTime).call(axis.scale(config.dimensions[dimension].yscale));
      pc.render();
    };
  };

  var rotateLabels = function rotateLabels(config, pc) {
    if (!config.rotateLabels) return;

    var delta = d3Selection.event.deltaY;
    delta = delta < 0 ? -5 : delta;
    delta = delta > 0 ? 5 : delta;

    config.dimensionTitleRotation += delta;
    pc.svg.selectAll('text.label').attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')');
    d3Selection.event.preventDefault();
  };

  var _this$2 = undefined;

  var updateAxes = function updateAxes(config, pc, position, axis, flags) {
    return function () {
      var animationTime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (animationTime === null) {
        animationTime = config.animationTime;
      }

      var g_data = pc.svg.selectAll('.dimension').data(pc.getOrderedDimensionKeys());
      // Enter
      g_data.enter().append('svg:g').attr('class', 'dimension').attr('transform', function (p) {
        return 'translate(' + position(p) + ')';
      }).style('opacity', 0).append('svg:g').attr('class', 'axis').attr('transform', 'translate(0,0)').each(function (d) {
        var axisElement = d3Selection.select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));

        axisElement.selectAll('path').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');

        axisElement.selectAll('line').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');
      }).append('svg:text').attr('text-anchor', 'middle').attr('class', 'label').attr('x', 0).attr('y', 0).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')').text(dimensionLabels(config)).on('dblclick', flipAxisAndUpdatePCP(config, pc, axis)).on('wheel', rotateLabels(config, pc));

      // Update
      g_data.attr('opacity', 0);
      g_data.select('.axis').transition().duration(animationTime).each(function (d) {
        d3Selection.select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
      });
      g_data.select('.label').transition().duration(animationTime).text(dimensionLabels(config)).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')');

      // Exit
      g_data.exit().remove();

      var g = pc.svg.selectAll('.dimension');
      g.transition().duration(animationTime).attr('transform', function (p) {
        return 'translate(' + position(p) + ')';
      }).style('opacity', 1);

      pc.svg.selectAll('.axis').transition().duration(animationTime).each(function (d) {
        d3Selection.select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
      });

      if (flags.brushable) pc.brushable();
      if (flags.reorderable) pc.reorderable();
      if (pc.brushMode() !== 'None') {
        var mode = pc.brushMode();
        pc.brushMode('None');
        pc.brushMode(mode);
      }
      return _this$2;
    };
  };

  /** adjusts an axis' default range [h()+1, 1] if a NullValueSeparator is set */
  var getRange = function getRange(config) {
    var h = config.height - config.margin.top - config.margin.bottom;

    if (config.nullValueSeparator == 'bottom') {
      return [h + 1 - config.nullValueSeparatorPadding.bottom - config.nullValueSeparatorPadding.top, 1];
    } else if (config.nullValueSeparator == 'top') {
      return [h + 1, 1 + config.nullValueSeparatorPadding.bottom + config.nullValueSeparatorPadding.top];
    }
    return [h + 1, 1];
  };

  var autoscale = function autoscale(config, pc, xscale, ctx) {
    return function () {
      // yscale
      var defaultScales = {
        date: function date(k) {
          var _extent = d3Array.extent(config.data, function (d) {
            return d[k] ? d[k].getTime() : null;
          });
          // special case if single value
          if (_extent[0] === _extent[1]) {
            return d3Scale.scalePoint().domain(_extent).range(getRange(config));
          }
          if (config.flipAxes.includes(k)) {
            _extent = _extent.map(function (val) {
              return tempDate.unshift(val);
            });
          }
          return d3Scale.scaleTime().domain(_extent).range(getRange(config));
        },
        number: function number(k) {
          var _extent = d3Array.extent(config.data, function (d) {
            return +d[k];
          });
          // special case if single value
          if (_extent[0] === _extent[1]) {
            return d3Scale.scalePoint().domain(_extent).range(getRange(config));
          }
          if (config.flipAxes.includes(k)) {
            _extent = _extent.map(function (val) {
              return tempDate.unshift(val);
            });
          }
          return d3Scale.scaleLinear().domain(_extent).range(getRange(config));
        },
        string: function string(k) {
          var counts = {},
              domain = [];
          // Let's get the count for each value so that we can sort the domain based
          // on the number of items for each value.
          config.data.map(function (p) {
            if (p[k] === undefined && config.nullValueSeparator !== 'undefined') {
              return null; // null values will be drawn beyond the horizontal null value separator!
            }
            if (counts[p[k]] === undefined) {
              counts[p[k]] = 1;
            } else {
              counts[p[k]] = counts[p[k]] + 1;
            }
          });
          if (config.flipAxes.includes(k)) {
            domain = Object.getOwnPropertyNames(counts).sort();
          } else {
            var tempArr = Object.getOwnPropertyNames(counts).sort();
            for (var i = 0; i < Object.getOwnPropertyNames(counts).length; i++) {
              domain.push(tempArr.pop());
            }
          }

          //need to create an ordinal scale for categorical data
          var categoricalRange = [];
          if (domain.length === 1) {
            //edge case
            domain = [' ', domain[0], ' '];
          }
          var addBy = getRange(config)[0] / (domain.length - 1);
          for (var j = 0; j < domain.length; j++) {
            if (categoricalRange.length === 0) {
              categoricalRange.push(0);
              continue;
            }
            categoricalRange.push(categoricalRange[j - 1] + addBy);
          }
          return d3Scale.scaleOrdinal().domain(domain).range(categoricalRange);
        }
      };
      Object.keys(config.dimensions).forEach(function (k) {
        if (config.dimensions[k].yscale === undefined || config.dimensions[k].yscale === null) {
          config.dimensions[k].yscale = defaultScales[config.dimensions[k].type](k);
        }
      });

      // xscale
      // add padding for d3 >= v4 default 0.2
      xscale.range([0, w(config)]).padding(0.2);

      // Retina display, etc.
      var devicePixelRatio = window.devicePixelRatio || 1;

      // canvas sizes
      pc.selection.selectAll('canvas').style('margin-top', config.margin.top + 'px').style('margin-left', config.margin.left + 'px').style('width', w(config) + 2 + 'px').style('height', h(config) + 2 + 'px').attr('width', (w(config) + 2) * devicePixelRatio).attr('height', (h(config) + 2) * devicePixelRatio);
      // default styles, needs to be set when canvas width changes
      ctx.foreground.strokeStyle = config.color;
      ctx.foreground.lineWidth = config.lineWidth;
      ctx.foreground.globalCompositeOperation = config.composite;
      ctx.foreground.globalAlpha = config.alpha;
      ctx.foreground.scale(devicePixelRatio, devicePixelRatio);
      ctx.brushed.strokeStyle = config.brushedColor;
      ctx.brushed.lineWidth = config.lineWidth;
      ctx.brushed.globalCompositeOperation = config.composite;
      ctx.brushed.globalAlpha = config.alpha;
      ctx.brushed.scale(devicePixelRatio, devicePixelRatio);
      ctx.highlight.lineWidth = config.highlightedLineWidth;
      ctx.highlight.scale(devicePixelRatio, devicePixelRatio);
      ctx.marked.lineWidth = config.markedLineWidth;
      ctx.marked.shadowColor = config.markedShadowColor;
      ctx.marked.shadowBlur = config.markedShadowBlur;
      ctx.marked.scale(devicePixelRatio, devicePixelRatio);

      return this;
    };
  };

  var brushable = function brushable(config, pc, flags) {
    return function () {
      if (!pc.g()) {
        pc.createAxes();
      }

      var g = pc.g();

      // Add and store a brush for each axis.
      g.append('svg:g').attr('class', 'brush').each(function (d) {
        if (config.dimensions[d] !== undefined) {
          config.dimensions[d]['brush'] = d3Brush.brushY(d3Selection.select(this)).extent([[-15, 0], [15, config.dimensions[d].yscale.range()[0]]]);
          d3Selection.select(this).call(config.dimensions[d]['brush'].on('start', function () {
            if (d3Selection.event.sourceEvent !== null && !d3Selection.event.sourceEvent.ctrlKey) {
              pc.brushReset();
            }
          }).on('brush', function () {
            if (!d3Selection.event.sourceEvent.ctrlKey) {
              pc.brush();
            }
          }).on('end', function () {
            // save brush selection is ctrl key is held
            // store important brush information and
            // the html element of the selection,
            // to make a dummy selection element
            if (d3Selection.event.sourceEvent.ctrlKey) {
              var html = d3Selection.select(this).select('.selection').nodes()[0].outerHTML;
              html = html.replace('class="selection"', 'class="selection dummy' + ' selection-' + config.brushes.length + '"');
              var dat = d3Selection.select(this).nodes()[0].__data__;
              var brush = {
                id: config.brushes.length,
                extent: d3Brush.brushSelection(this),
                html: html,
                data: dat
              };
              config.brushes.push(brush);
              d3Selection.select(d3Selection.select(this).nodes()[0].parentNode).select('.axis').nodes()[0].outerHTML += html;
              pc.brush();
              config.dimensions[d].brush.move(d3Selection.select(this, null));
              d3Selection.select(this).select('.selection').attr('style', 'display:none');
              pc.brushable();
            } else {
              pc.brush();
            }
          }));
          d3Selection.select(this).on('dblclick', function () {
            pc.brushReset(d);
          });
        }
      });

      flags.brushable = true;
      return this;
    };
  };

  var commonScale = function commonScale(config, pc) {
    return function (global, type) {
      var t = type || 'number';
      if (typeof global === 'undefined') {
        global = true;
      }

      // try to autodetect dimensions and create scales
      if (!Object.keys(config.dimensions).length) {
        pc.detectDimensions();
      }
      pc.autoscale();

      // scales of the same type
      var scales = Object.keys(config.dimensions).filter(function (p) {
        return config.dimensions[p].type == t;
      });

      if (global) {
        var _extent = d3Array.extent(scales.map(function (d) {
          return config.dimensions[d].yscale.domain();
        }).reduce(function (cur, acc) {
          return cur.concat(acc);
        }));

        scales.forEach(function (d) {
          config.dimensions[d].yscale.domain(_extent);
        });
      } else {
        scales.forEach(function (d) {
          config.dimensions[d].yscale.domain(d3Array.extent(config.data, function (d) {
            return +d[k];
          }));
        });
      }

      // update centroids
      if (config.bundleDimension !== null) {
        pc.bundleDimension(config.bundleDimension);
      }

      return this;
    };
  };

  var computeRealCentroids = function computeRealCentroids(config, position) {
    return function (row) {
      return Object.keys(config.dimensions).map(function (d) {
        var x = position(d);
        var y = config.dimensions[d].yscale(row[d]);
        return [x, y];
      });
    };
  };

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var isValid = function isValid(d) {
    return d !== null && d !== undefined;
  };

  var applyDimensionDefaults = function applyDimensionDefaults(config, pc) {
    return function (dims) {
      var types = pc.detectDimensionTypes(config.data);
      dims = dims ? dims : Object.keys(types);

      return dims.reduce(function (acc, cur, i) {
        var k = config.dimensions[cur] ? config.dimensions[cur] : {};
        acc[cur] = _extends({}, k, {
          orient: isValid(k.orient) ? k.orient : 'left',
          ticks: isValid(k.ticks) ? k.ticks : 5,
          innerTickSize: isValid(k.innerTickSize) ? k.innerTickSize : 6,
          outerTickSize: isValid(k.outerTickSize) ? k.outerTickSize : 0,
          tickPadding: isValid(k.tickPadding) ? k.tickPadding : 3,
          type: isValid(k.type) ? k.type : types[cur],
          index: isValid(k.index) ? k.index : i
        });

        return acc;
      }, {});
    };
  };

  /**
   * Create static SVG axes with dimension names, ticks, and labels.
   *
   * @param config
   * @param pc
   * @param xscale
   * @param flags
   * @param axis
   * @returns {Function}
   */
  var createAxes = function createAxes(config, pc, xscale, flags, axis) {
    return function () {
      if (pc.g() !== undefined) {
        pc.removeAxes();
      }
      // Add a group element for each dimension.
      pc._g = pc.svg.selectAll('.dimension').data(pc.getOrderedDimensionKeys(), function (d) {
        return d;
      }).enter().append('svg:g').attr('class', 'dimension').attr('transform', function (d) {
        return 'translate(' + xscale(d) + ')';
      });
      // Add an axis and title.
      pc._g.append('svg:g').attr('class', 'axis').attr('transform', 'translate(0,0)').each(function (d) {
        var axisElement = d3Selection.select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));

        axisElement.selectAll('path').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');

        axisElement.selectAll('line').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');
      }).append('svg:text').attr('text-anchor', 'middle').attr('y', 0).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')').attr('x', 0).attr('class', 'label').text(dimensionLabels(config)).on('dblclick', flipAxisAndUpdatePCP(config, pc, axis)).on('wheel', rotateLabels(config, pc));

      if (config.nullValueSeparator === 'top') {
        pc.svg.append('line').attr('x1', 0).attr('y1', 1 + config.nullValueSeparatorPadding.top).attr('x2', w(config)).attr('y2', 1 + config.nullValueSeparatorPadding.top).attr('stroke-width', 1).attr('stroke', '#777').attr('fill', 'none').attr('shape-rendering', 'crispEdges');
      } else if (config.nullValueSeparator === 'bottom') {
        pc.svg.append('line').attr('x1', 0).attr('y1', h(config) + 1 - config.nullValueSeparatorPadding.bottom).attr('x2', w(config)).attr('y2', h(config) + 1 - config.nullValueSeparatorPadding.bottom).attr('stroke-width', 1).attr('stroke', '#777').attr('fill', 'none').attr('shape-rendering', 'crispEdges');
      }

      flags.axes = true;
      return this;
    };
  };

  var _this$3 = undefined;

  //draw dots with radius r on the axis line where data intersects
  var axisDots = function axisDots(config, pc, position) {
    return function (_r) {
      var r = _r || 0.1;
      var ctx = pc.ctx.dots;
      var startAngle = 0;
      var endAngle = 2 * Math.PI;
      ctx.globalAlpha = d3Array.min([1 / Math.pow(config.data.length, 1 / 2), 1]);
      config.data.forEach(function (d) {
        d3Collection.entries(config.dimensions).forEach(function (p, i) {
          ctx.beginPath();
          ctx.arc(position(p), config.dimensions[p.key].yscale(d[p]), r, startAngle, endAngle);
          ctx.stroke();
          ctx.fill();
        });
      });
      return _this$3;
    };
  };

  var applyAxisConfig = function applyAxisConfig(axis, dimension) {
    var axisCfg = void 0;

    switch (dimension.orient) {
      case 'left':
        axisCfg = d3Axis.axisLeft(dimension.yscale);
        break;
      case 'right':
        axisCfg = d3Axis.axisRight(dimension.yscale);
        break;
      case 'top':
        axisCfg = d3Axis.axisTop(dimension.yscale);
        break;
      case 'bottom':
        axisCfg = d3Axis.axisBottom(dimension.yscale);
        break;
      default:
        axisCfg = d3Axis.axisLeft(dimension.yscale);
        break;
    }

    axisCfg.ticks(dimension.ticks).tickValues(dimension.tickValues).tickSizeInner(dimension.innerTickSize).tickSizeOuter(dimension.outerTickSize).tickPadding(dimension.tickPadding).tickFormat(dimension.tickFormat);

    return axisCfg;
  };

  // Jason Davies, http://bl.ocks.org/1341281
  var reorderable = function reorderable(config, pc, xscale, position, dragging, flags) {
    return function () {
      if (pc.g() === undefined) pc.createAxes();
      var g = pc.g();

      g.style('cursor', 'move').call(d3Drag.drag().on('start', function (d) {
        dragging[d] = this.__origin__ = xscale(d);
      }).on('drag', function (d) {
        dragging[d] = Math.min(w(config), Math.max(0, this.__origin__ += d3Selection.event.dx));
        pc.sortDimensions();
        xscale.domain(pc.getOrderedDimensionKeys());
        pc.render();
        g.attr('transform', function (d) {
          return 'translate(' + position(d) + ')';
        });
      }).on('end', function (d) {
        delete this.__origin__;
        delete dragging[d];
        d3Selection.select(this).transition().attr('transform', 'translate(' + xscale(d) + ')');
        pc.render();
        pc.renderMarked();
      }));
      flags.reorderable = true;
      return this;
    };
  };

  // rescale for height, width and margins
  // TODO currently assumes chart is brushable, and destroys old brushes
  var resize = function resize(config, pc, flags, events) {
    return function () {
      // selection size
      pc.selection.select('svg').attr('width', config.width).attr('height', config.height);
      pc.svg.attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

      // FIXME: the current brush state should pass through
      if (flags.brushable) pc.brushReset();

      // scales
      pc.autoscale();

      // axes, destroys old brushes.
      if (pc.g()) pc.createAxes();
      if (flags.brushable) pc.brushable();
      if (flags.reorderable) pc.reorderable();

      events.call('resize', this, {
        width: config.width,
        height: config.height,
        margin: config.margin
      });

      return this;
    };
  };

  // Reorder dimensions, such that the highest value (visually) is on the left and
  // the lowest on the right. Visual values are determined by the data values in
  // the given row.
  var reorder = function reorder(config, pc, xscale) {
    return function (rowdata) {
      var firstDim = pc.getOrderedDimensionKeys()[0];

      pc.sortDimensionsByRowData(rowdata);
      // NOTE: this is relatively cheap given that:
      // number of dimensions < number of data items
      // Thus we check equality of order to prevent rerendering when this is the case.
      var reordered = firstDim !== pc.getOrderedDimensionKeys()[0];

      if (reordered) {
        xscale.domain(pc.getOrderedDimensionKeys());
        var highlighted = config.highlighted.slice(0);
        pc.unhighlight();

        var marked = config.marked.slice(0);
        pc.unmark();

        var g = pc.g();
        g.transition().duration(1500).attr('transform', function (d) {
          return 'translate(' + xscale(d) + ')';
        });
        pc.render();

        // pc.highlight() does not check whether highlighted is length zero, so we do that here.
        if (highlighted.length !== 0) {
          pc.highlight(highlighted);
        }
        if (marked.length !== 0) {
          pc.mark(marked);
        }
      }
    };
  };

  var sortDimensions = function sortDimensions(config, position) {
    return function () {
      var copy = Object.assign({}, config.dimensions);
      var positionSortedKeys = Object.keys(config.dimensions).sort(function (a, b) {
        return position(a) - position(b) === 0 ? 1 : position(a) - position(b);
      });
      config.dimensions = {};
      positionSortedKeys.forEach(function (p, i) {
        config.dimensions[p] = copy[p];
        config.dimensions[p].index = i;
      });
    };
  };

  var sortDimensionsByRowData = function sortDimensionsByRowData(config) {
    return function (rowdata) {
      var copy = Object.assign({}, config.dimensions);
      var positionSortedKeys = Object.keys(config.dimensions).sort(function (a, b) {
        var pixelDifference = config.dimensions[a].yscale(rowdata[a]) - config.dimensions[b].yscale(rowdata[b]);

        // Array.sort is not necessarily stable, this means that if pixelDifference is zero
        // the ordering of dimensions might change unexpectedly. This is solved by sorting on
        // variable name in that case.
        return pixelDifference === 0 ? a.localeCompare(b) : pixelDifference;
      });
      config.dimensions = {};
      positionSortedKeys.forEach(function (p, i) {
        config.dimensions[p] = copy[p];
        config.dimensions[p].index = i;
      });
    };
  };

  var isBrushed = function isBrushed(config, brushGroup) {
    if (config.brushed && config.brushed.length !== config.data.length) return true;

    var object = brushGroup.currentMode().brushState();

    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        return true;
      }
    }
    return false;
  };

  var clear = function clear(config, pc, ctx, brushGroup) {
    return function (layer) {
      ctx[layer].clearRect(0, 0, w(config) + 2, h(config) + 2);

      // This will make sure that the foreground items are transparent
      // without the need for changing the opacity style of the foreground canvas
      // as this would stop the css styling from working
      if (layer === 'brushed' && isBrushed(config, brushGroup)) {
        ctx.brushed.fillStyle = pc.selection.style('background-color');
        ctx.brushed.globalAlpha = 1 - config.alphaOnBrushed;
        ctx.brushed.fillRect(0, 0, w(config) + 2, h(config) + 2);
        ctx.brushed.globalAlpha = config.alpha;
      }
      return this;
    };
  };

  var PRECISION = 1e-6;

  var Matrix = function () {
      function Matrix(elements) {
          classCallCheck(this, Matrix);

          this.setElements(elements);
      }

      createClass(Matrix, [{
          key: "e",
          value: function e(i, j) {
              if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) {
                  return null;
              }
              return this.elements[i - 1][j - 1];
          }
      }, {
          key: "row",
          value: function row(i) {
              if (i > this.elements.length) {
                  return null;
              }
              return new Vector(this.elements[i - 1]);
          }
      }, {
          key: "col",
          value: function col(j) {
              if (this.elements.length === 0) {
                  return null;
              }
              if (j > this.elements[0].length) {
                  return null;
              }
              var col = [],
                  n = this.elements.length;
              for (var i = 0; i < n; i++) {
                  col.push(this.elements[i][j - 1]);
              }
              return new Vector(col);
          }
      }, {
          key: "dimensions",
          value: function dimensions() {
              var cols = this.elements.length === 0 ? 0 : this.elements[0].length;
              return { rows: this.elements.length, cols: cols };
          }
      }, {
          key: "rows",
          value: function rows() {
              return this.elements.length;
          }
      }, {
          key: "cols",
          value: function cols() {
              if (this.elements.length === 0) {
                  return 0;
              }
              return this.elements[0].length;
          }
      }, {
          key: "eql",
          value: function eql(matrix) {
              var M = matrix.elements || matrix;
              if (!M[0] || typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              if (this.elements.length === 0 || M.length === 0) {
                  return this.elements.length === M.length;
              }
              if (this.elements.length !== M.length) {
                  return false;
              }
              if (this.elements[0].length !== M[0].length) {
                  return false;
              }
              var i = this.elements.length,
                  nj = this.elements[0].length,
                  j;
              while (i--) {
                  j = nj;
                  while (j--) {
                      if (Math.abs(this.elements[i][j] - M[i][j]) > PRECISION) {
                          return false;
                      }
                  }
              }
              return true;
          }
      }, {
          key: "dup",
          value: function dup() {
              return new Matrix(this.elements);
          }
      }, {
          key: "map",
          value: function map(fn, context) {
              if (this.elements.length === 0) {
                  return new Matrix([]);
              }
              var els = [],
                  i = this.elements.length,
                  nj = this.elements[0].length,
                  j;
              while (i--) {
                  j = nj;
                  els[i] = [];
                  while (j--) {
                      els[i][j] = fn.call(context, this.elements[i][j], i + 1, j + 1);
                  }
              }
              return new Matrix(els);
          }
      }, {
          key: "isSameSizeAs",
          value: function isSameSizeAs(matrix) {
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              if (this.elements.length === 0) {
                  return M.length === 0;
              }
              return this.elements.length === M.length && this.elements[0].length === M[0].length;
          }
      }, {
          key: "add",
          value: function add(matrix) {
              if (this.elements.length === 0) {
                  return this.map(function (x) {
                      return x;
                  });
              }
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              if (!this.isSameSizeAs(M)) {
                  return null;
              }
              return this.map(function (x, i, j) {
                  return x + M[i - 1][j - 1];
              });
          }
      }, {
          key: "subtract",
          value: function subtract(matrix) {
              if (this.elements.length === 0) {
                  return this.map(function (x) {
                      return x;
                  });
              }
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              if (!this.isSameSizeAs(M)) {
                  return null;
              }
              return this.map(function (x, i, j) {
                  return x - M[i - 1][j - 1];
              });
          }
      }, {
          key: "canMultiplyFromLeft",
          value: function canMultiplyFromLeft(matrix) {
              if (this.elements.length === 0) {
                  return false;
              }
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              // this.columns should equal matrix.rows
              return this.elements[0].length === M.length;
          }
      }, {
          key: "multiply",
          value: function multiply(matrix) {
              if (this.elements.length === 0) {
                  return null;
              }
              if (!matrix.elements) {
                  return this.map(function (x) {
                      return x * matrix;
                  });
              }
              var returnVector = matrix.modulus ? true : false;
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              if (!this.canMultiplyFromLeft(M)) {
                  return null;
              }
              var i = this.elements.length,
                  nj = M[0].length,
                  j;
              var cols = this.elements[0].length,
                  c,
                  elements = [],
                  sum;
              while (i--) {
                  j = nj;
                  elements[i] = [];
                  while (j--) {
                      c = cols;
                      sum = 0;
                      while (c--) {
                          sum += this.elements[i][c] * M[c][j];
                      }
                      elements[i][j] = sum;
                  }
              }
              var M = new Matrix(elements);
              return returnVector ? M.col(1) : M;
          }
      }, {
          key: "minor",
          value: function minor(a, b, c, d) {
              if (this.elements.length === 0) {
                  return null;
              }
              var elements = [],
                  ni = c,
                  i,
                  nj,
                  j;
              var rows = this.elements.length,
                  cols = this.elements[0].length;
              while (ni--) {
                  i = c - ni - 1;
                  elements[i] = [];
                  nj = d;
                  while (nj--) {
                      j = d - nj - 1;
                      elements[i][j] = this.elements[(a + i - 1) % rows][(b + j - 1) % cols];
                  }
              }
              return new Matrix(elements);
          }
      }, {
          key: "transpose",
          value: function transpose() {
              if (this.elements.length === 0) {
                  return new Matrix([]);
              }
              var rows = this.elements.length,
                  i,
                  cols = this.elements[0].length,
                  j;
              var elements = [],
                  i = cols;
              while (i--) {
                  j = rows;
                  elements[i] = [];
                  while (j--) {
                      elements[i][j] = this.elements[j][i];
                  }
              }
              return new Matrix(elements);
          }
      }, {
          key: "isSquare",
          value: function isSquare() {
              var cols = this.elements.length === 0 ? 0 : this.elements[0].length;
              return this.elements.length === cols;
          }
      }, {
          key: "max",
          value: function max() {
              if (this.elements.length === 0) {
                  return null;
              }
              var m = 0,
                  i = this.elements.length,
                  nj = this.elements[0].length,
                  j;
              while (i--) {
                  j = nj;
                  while (j--) {
                      if (Math.abs(this.elements[i][j]) > Math.abs(m)) {
                          m = this.elements[i][j];
                      }
                  }
              }
              return m;
          }
      }, {
          key: "indexOf",
          value: function indexOf(x) {
              if (this.elements.length === 0) {
                  return null;
              }
              var ni = this.elements.length,
                  i,
                  nj = this.elements[0].length,
                  j;
              for (i = 0; i < ni; i++) {
                  for (j = 0; j < nj; j++) {
                      if (this.elements[i][j] === x) {
                          return {
                              i: i + 1,
                              j: j + 1
                          };
                      }
                  }
              }
              return null;
          }
      }, {
          key: "diagonal",
          value: function diagonal() {
              if (!this.isSquare) {
                  return null;
              }
              var els = [],
                  n = this.elements.length;
              for (var i = 0; i < n; i++) {
                  els.push(this.elements[i][i]);
              }
              return new Vector(els);
          }
      }, {
          key: "toRightTriangular",
          value: function toRightTriangular() {
              if (this.elements.length === 0) {
                  return new Matrix([]);
              }
              var M = this.dup(),
                  els;
              var n = this.elements.length,
                  i,
                  j,
                  np = this.elements[0].length,
                  p;
              for (i = 0; i < n; i++) {
                  if (M.elements[i][i] === 0) {
                      for (j = i + 1; j < n; j++) {
                          if (M.elements[j][i] !== 0) {
                              els = [];
                              for (p = 0; p < np; p++) {
                                  els.push(M.elements[i][p] + M.elements[j][p]);
                              }
                              M.elements[i] = els;
                              break;
                          }
                      }
                  }
                  if (M.elements[i][i] !== 0) {
                      for (j = i + 1; j < n; j++) {
                          var multiplier = M.elements[j][i] / M.elements[i][i];
                          els = [];
                          for (p = 0; p < np; p++) {
                              // Elements with column numbers up to an including the number of the
                              // row that we're subtracting can safely be set straight to zero,
                              // since that's the point of this routine and it avoids having to
                              // loop over and correct rounding errors later
                              els.push(p <= i ? 0 : M.elements[j][p] - M.elements[i][p] * multiplier);
                          }
                          M.elements[j] = els;
                      }
                  }
              }
              return M;
          }
      }, {
          key: "determinant",
          value: function determinant() {
              if (this.elements.length === 0) {
                  return 1;
              }
              if (!this.isSquare()) {
                  return null;
              }
              var M = this.toRightTriangular();
              var det = M.elements[0][0],
                  n = M.elements.length;
              for (var i = 1; i < n; i++) {
                  det = det * M.elements[i][i];
              }
              return det;
          }
      }, {
          key: "isSingular",
          value: function isSingular() {
              return this.isSquare() && this.determinant() === 0;
          }
      }, {
          key: "trace",
          value: function trace() {
              if (this.elements.length === 0) {
                  return 0;
              }
              if (!this.isSquare()) {
                  return null;
              }
              var tr = this.elements[0][0],
                  n = this.elements.length;
              for (var i = 1; i < n; i++) {
                  tr += this.elements[i][i];
              }
              return tr;
          }
      }, {
          key: "rank",
          value: function rank() {
              if (this.elements.length === 0) {
                  return 0;
              }
              var M = this.toRightTriangular(),
                  rank = 0;
              var i = this.elements.length,
                  nj = this.elements[0].length,
                  j;
              while (i--) {
                  j = nj;
                  while (j--) {
                      if (Math.abs(M.elements[i][j]) > PRECISION) {
                          rank++;
                          break;
                      }
                  }
              }
              return rank;
          }
      }, {
          key: "augment",
          value: function augment(matrix) {
              if (this.elements.length === 0) {
                  return this.dup();
              }
              var M = matrix.elements || matrix;
              if (typeof M[0][0] === 'undefined') {
                  M = new Matrix(M).elements;
              }
              var T = this.dup(),
                  cols = T.elements[0].length;
              var i = T.elements.length,
                  nj = M[0].length,
                  j;
              if (i !== M.length) {
                  return null;
              }
              while (i--) {
                  j = nj;
                  while (j--) {
                      T.elements[i][cols + j] = M[i][j];
                  }
              }
              return T;
          }
      }, {
          key: "inverse",
          value: function inverse() {
              if (this.elements.length === 0) {
                  return null;
              }
              if (!this.isSquare() || this.isSingular()) {
                  return null;
              }
              var n = this.elements.length,
                  i = n,
                  j;
              var M = this.augment(Matrix.I(n)).toRightTriangular();
              var np = M.elements[0].length,
                  p,
                  els,
                  divisor;
              var inverse_elements = [],
                  new_element;
              // Matrix is non-singular so there will be no zeros on the
              // diagonal. Cycle through rows from last to first.
              while (i--) {
                  // First, normalise diagonal elements to 1
                  els = [];
                  inverse_elements[i] = [];
                  divisor = M.elements[i][i];
                  for (p = 0; p < np; p++) {
                      new_element = M.elements[i][p] / divisor;
                      els.push(new_element);
                      // Shuffle off the current row of the right hand side into the results
                      // array as it will not be modified by later runs through this loop
                      if (p >= n) {
                          inverse_elements[i].push(new_element);
                      }
                  }
                  M.elements[i] = els;
                  // Then, subtract this row from those above it to give the identity matrix
                  // on the left hand side
                  j = i;
                  while (j--) {
                      els = [];
                      for (p = 0; p < np; p++) {
                          els.push(M.elements[j][p] - M.elements[i][p] * M.elements[j][i]);
                      }
                      M.elements[j] = els;
                  }
              }
              return new Matrix(inverse_elements);
          }
      }, {
          key: "round",
          value: function round() {
              return this.map(function (x) {
                  return Math.round(x);
              });
          }
      }, {
          key: "snapTo",
          value: function snapTo(x) {
              return this.map(function (p) {
                  return Math.abs(p - x) <= PRECISION ? x : p;
              });
          }
      }, {
          key: "inspect",
          value: function inspect() {
              var matrix_rows = [];
              var n = this.elements.length;
              if (n === 0) return '[]';
              for (var i = 0; i < n; i++) {
                  matrix_rows.push(new Vector(this.elements[i]).inspect());
              }
              return matrix_rows.join('\n');
          }
      }, {
          key: "setElements",
          value: function setElements(els) {
              var i,
                  j,
                  elements = els.elements || els;
              if (elements[0] && typeof elements[0][0] !== 'undefined') {
                  i = elements.length;
                  this.elements = [];
                  while (i--) {
                      j = elements[i].length;
                      this.elements[i] = [];
                      while (j--) {
                          this.elements[i][j] = elements[i][j];
                      }
                  }
                  return this;
              }
              var n = elements.length;
              this.elements = [];
              for (i = 0; i < n; i++) {
                  this.elements.push([elements[i]]);
              }
              return this;
          }

          //From glUtils.js

      }, {
          key: "flatten",
          value: function flatten() {
              var result = [];
              if (this.elements.length == 0) {
                  return [];
              }

              for (var j = 0; j < this.elements[0].length; j++) {
                  for (var i = 0; i < this.elements.length; i++) {
                      result.push(this.elements[i][j]);
                  }
              }
              return result;
          }

          //From glUtils.js

      }, {
          key: "ensure4x4",
          value: function ensure4x4() {
              if (this.elements.length == 4 && this.elements[0].length == 4) {
                  return this;
              }

              if (this.elements.length > 4 || this.elements[0].length > 4) {
                  return null;
              }

              for (var i = 0; i < this.elements.length; i++) {
                  for (var j = this.elements[i].length; j < 4; j++) {
                      if (i == j) {
                          this.elements[i].push(1);
                      } else {
                          this.elements[i].push(0);
                      }
                  }
              }

              for (var i = this.elements.length; i < 4; i++) {
                  if (i == 0) {
                      this.elements.push([1, 0, 0, 0]);
                  } else if (i == 1) {
                      this.elements.push([0, 1, 0, 0]);
                  } else if (i == 2) {
                      this.elements.push([0, 0, 1, 0]);
                  } else if (i == 3) {
                      this.elements.push([0, 0, 0, 1]);
                  }
              }

              return this;
          }

          //From glUtils.js

      }, {
          key: "make3x3",
          value: function make3x3() {
              if (this.elements.length != 4 || this.elements[0].length != 4) {
                  return null;
              }

              return new Matrix([[this.elements[0][0], this.elements[0][1], this.elements[0][2]], [this.elements[1][0], this.elements[1][1], this.elements[1][2]], [this.elements[2][0], this.elements[2][1], this.elements[2][2]]]);
          }
      }]);
      return Matrix;
  }();

  Matrix.I = function (n) {
      var els = [],
          i = n,
          j;
      while (i--) {
          j = n;
          els[i] = [];
          while (j--) {
              els[i][j] = i === j ? 1 : 0;
          }
      }
      return new Matrix(els);
  };

  Matrix.Diagonal = function (elements) {
      var i = elements.length;
      var M = Matrix.I(i);
      while (i--) {
          M.elements[i][i] = elements[i];
      }
      return M;
  };

  Matrix.Rotation = function (theta, a) {
      if (!a) {
          return new Matrix([[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]]);
      }
      var axis = a.dup();
      if (axis.elements.length !== 3) {
          return null;
      }
      var mod = axis.modulus();
      var x = axis.elements[0] / mod,
          y = axis.elements[1] / mod,
          z = axis.elements[2] / mod;
      var s = Math.sin(theta),
          c = Math.cos(theta),
          t = 1 - c;
      // Formula derived here: http://www.gamedev.net/reference/articles/article1199.asp
      // That proof rotates the co-ordinate system so theta becomes -theta and sin
      // becomes -sin here.
      return new Matrix([[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]]);
  };

  Matrix.RotationX = function (t) {
      var c = Math.cos(t),
          s = Math.sin(t);
      return new Matrix([[1, 0, 0], [0, c, -s], [0, s, c]]);
  };
  Matrix.RotationY = function (t) {
      var c = Math.cos(t),
          s = Math.sin(t);
      return new Matrix([[c, 0, s], [0, 1, 0], [-s, 0, c]]);
  };
  Matrix.RotationZ = function (t) {
      var c = Math.cos(t),
          s = Math.sin(t);
      return new Matrix([[c, -s, 0], [s, c, 0], [0, 0, 1]]);
  };

  Matrix.Random = function (n, m) {
      return Matrix.Zero(n, m).map(function () {
          return Math.random();
      });
  };

  //From glUtils.js
  Matrix.Translation = function (v) {
      if (v.elements.length == 2) {
          var r = Matrix.I(3);
          r.elements[2][0] = v.elements[0];
          r.elements[2][1] = v.elements[1];
          return r;
      }

      if (v.elements.length == 3) {
          var r = Matrix.I(4);
          r.elements[0][3] = v.elements[0];
          r.elements[1][3] = v.elements[1];
          r.elements[2][3] = v.elements[2];
          return r;
      }

      throw "Invalid length for Translation";
  };

  Matrix.Zero = function (n, m) {
      var els = [],
          i = n,
          j;
      while (i--) {
          j = m;
          els[i] = [];
          while (j--) {
              els[i][j] = 0;
          }
      }
      return new Matrix(els);
  };

  Matrix.prototype.toUpperTriangular = Matrix.prototype.toRightTriangular;
  Matrix.prototype.det = Matrix.prototype.determinant;
  Matrix.prototype.tr = Matrix.prototype.trace;
  Matrix.prototype.rk = Matrix.prototype.rank;
  Matrix.prototype.inv = Matrix.prototype.inverse;
  Matrix.prototype.x = Matrix.prototype.multiply;

  var Vector = function () {
      function Vector(elements) {
          classCallCheck(this, Vector);

          this.setElements(elements);
      }

      createClass(Vector, [{
          key: "e",
          value: function e(i) {
              return i < 1 || i > this.elements.length ? null : this.elements[i - 1];
          }
      }, {
          key: "dimensions",
          value: function dimensions() {
              return this.elements.length;
          }
      }, {
          key: "modulus",
          value: function modulus() {
              return Math.sqrt(this.dot(this));
          }
      }, {
          key: "eql",
          value: function eql(vector) {
              var n = this.elements.length;
              var V = vector.elements || vector;
              if (n !== V.length) {
                  return false;
              }
              while (n--) {
                  if (Math.abs(this.elements[n] - V[n]) > PRECISION) {
                      return false;
                  }
              }
              return true;
          }
      }, {
          key: "dup",
          value: function dup() {
              return new Vector(this.elements);
          }
      }, {
          key: "map",
          value: function map(fn, context) {
              var elements = [];
              this.each(function (x, i) {
                  elements.push(fn.call(context, x, i));
              });
              return new Vector(elements);
          }
      }, {
          key: "forEach",
          value: function forEach(fn, context) {
              var n = this.elements.length;
              for (var i = 0; i < n; i++) {
                  fn.call(context, this.elements[i], i + 1);
              }
          }
      }, {
          key: "toUnitVector",
          value: function toUnitVector() {
              var r = this.modulus();
              if (r === 0) {
                  return this.dup();
              }
              return this.map(function (x) {
                  return x / r;
              });
          }
      }, {
          key: "angleFrom",
          value: function angleFrom(vector) {
              var V = vector.elements || vector;
              var n = this.elements.length;
              if (n !== V.length) {
                  return null;
              }
              var dot = 0,
                  mod1 = 0,
                  mod2 = 0;
              // Work things out in parallel to save time
              this.each(function (x, i) {
                  dot += x * V[i - 1];
                  mod1 += x * x;
                  mod2 += V[i - 1] * V[i - 1];
              });
              mod1 = Math.sqrt(mod1);mod2 = Math.sqrt(mod2);
              if (mod1 * mod2 === 0) {
                  return null;
              }
              var theta = dot / (mod1 * mod2);
              if (theta < -1) {
                  theta = -1;
              }
              if (theta > 1) {
                  theta = 1;
              }
              return Math.acos(theta);
          }
      }, {
          key: "isParallelTo",
          value: function isParallelTo(vector) {
              var angle = this.angleFrom(vector);
              return angle === null ? null : angle <= PRECISION;
          }
      }, {
          key: "isAntiparallelTo",
          value: function isAntiparallelTo(vector) {
              var angle = this.angleFrom(vector);
              return angle === null ? null : Math.abs(angle - Math.PI) <= PRECISION;
          }
      }, {
          key: "isPerpendicularTo",
          value: function isPerpendicularTo(vector) {
              var dot = this.dot(vector);
              return dot === null ? null : Math.abs(dot) <= PRECISION;
          }
      }, {
          key: "add",
          value: function add(vector) {
              var V = vector.elements || vector;
              if (this.elements.length !== V.length) {
                  return null;
              }
              return this.map(function (x, i) {
                  return x + V[i - 1];
              });
          }
      }, {
          key: "subtract",
          value: function subtract(vector) {
              var V = vector.elements || vector;
              if (this.elements.length !== V.length) {
                  return null;
              }
              return this.map(function (x, i) {
                  return x - V[i - 1];
              });
          }
      }, {
          key: "multiply",
          value: function multiply(k) {
              return this.map(function (x) {
                  return x * k;
              });
          }
      }, {
          key: "dot",
          value: function dot(vector) {
              var V = vector.elements || vector;
              var product = 0,
                  n = this.elements.length;
              if (n !== V.length) {
                  return null;
              }
              while (n--) {
                  product += this.elements[n] * V[n];
              }
              return product;
          }
      }, {
          key: "cross",
          value: function cross(vector) {
              var B = vector.elements || vector;
              if (this.elements.length !== 3 || B.length !== 3) {
                  return null;
              }
              var A = this.elements;
              return new Vector([A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]]);
          }
      }, {
          key: "max",
          value: function max() {
              var m = 0,
                  i = this.elements.length;
              while (i--) {
                  if (Math.abs(this.elements[i]) > Math.abs(m)) {
                      m = this.elements[i];
                  }
              }
              return m;
          }
      }, {
          key: "indexOf",
          value: function indexOf(x) {
              var index = null,
                  n = this.elements.length;
              for (var i = 0; i < n; i++) {
                  if (index === null && this.elements[i] === x) {
                      index = i + 1;
                  }
              }
              return index;
          }
      }, {
          key: "toDiagonalMatrix",
          value: function toDiagonalMatrix() {
              return Matrix.Diagonal(this.elements);
          }
      }, {
          key: "round",
          value: function round() {
              return this.map(function (x) {
                  return Math.round(x);
              });
          }
      }, {
          key: "snapTo",
          value: function snapTo(x) {
              return this.map(function (y) {
                  return Math.abs(y - x) <= PRECISION ? x : y;
              });
          }
      }, {
          key: "distanceFrom",
          value: function distanceFrom(obj) {
              if (obj.anchor || obj.start && obj.end) {
                  return obj.distanceFrom(this);
              }
              var V = obj.elements || obj;
              if (V.length !== this.elements.length) {
                  return null;
              }
              var sum = 0,
                  part;
              this.each(function (x, i) {
                  part = x - V[i - 1];
                  sum += part * part;
              });
              return Math.sqrt(sum);
          }
      }, {
          key: "liesOn",
          value: function liesOn(line) {
              return line.contains(this);
          }
      }, {
          key: "liesIn",
          value: function liesIn(plane) {
              return plane.contains(this);
          }
      }, {
          key: "rotate",
          value: function rotate(t, obj) {
              var V,
                  R = null,
                  x,
                  y,
                  z;
              if (t.determinant) {
                  R = t.elements;
              }
              switch (this.elements.length) {
                  case 2:
                      {
                          V = obj.elements || obj;
                          if (V.length !== 2) {
                              return null;
                          }
                          if (!R) {
                              R = Matrix.Rotation(t).elements;
                          }
                          x = this.elements[0] - V[0];
                          y = this.elements[1] - V[1];
                          return new Vector([V[0] + R[0][0] * x + R[0][1] * y, V[1] + R[1][0] * x + R[1][1] * y]);
                          break;
                      }
                  case 3:
                      {
                          if (!obj.direction) {
                              return null;
                          }
                          var C = obj.pointClosestTo(this).elements;
                          if (!R) {
                              R = Matrix.Rotation(t, obj.direction).elements;
                          }
                          x = this.elements[0] - C[0];
                          y = this.elements[1] - C[1];
                          z = this.elements[2] - C[2];
                          return new Vector([C[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z, C[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z, C[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z]);
                          break;
                      }
                  default:
                      {
                          return null;
                      }
              }
          }
      }, {
          key: "reflectionIn",
          value: function reflectionIn(obj) {
              if (obj.anchor) {
                  // obj is a plane or line
                  var P = this.elements.slice();
                  var C = obj.pointClosestTo(P).elements;
                  return new Vector([C[0] + (C[0] - P[0]), C[1] + (C[1] - P[1]), C[2] + (C[2] - (P[2] || 0))]);
              } else {
                  // obj is a point
                  var Q = obj.elements || obj;
                  if (this.elements.length !== Q.length) {
                      return null;
                  }
                  return this.map(function (x, i) {
                      return Q[i - 1] + (Q[i - 1] - x);
                  });
              }
          }
      }, {
          key: "to3D",
          value: function to3D() {
              var V = this.dup();
              switch (V.elements.length) {
                  case 3:
                      {
                          break;
                      }
                  case 2:
                      {
                          V.elements.push(0);
                          break;
                      }
                  default:
                      {
                          return null;
                      }
              }
              return V;
          }
      }, {
          key: "inspect",
          value: function inspect() {
              return '[' + this.elements.join(', ') + ']';
          }
      }, {
          key: "setElements",
          value: function setElements(els) {
              this.elements = (els.elements || els).slice();
              return this;
          }

          //From glUtils.js

      }, {
          key: "flatten",
          value: function flatten() {
              return this.elements;
          }
      }]);
      return Vector;
  }();

  Vector.Random = function (n) {
      var elements = [];
      while (n--) {
          elements.push(Math.random());
      }
      return new Vector(elements);
  };

  Vector.Zero = function (n) {
      var elements = [];
      while (n--) {
          elements.push(0);
      }
      return new Vector(elements);
  };

  Vector.prototype.x = Vector.prototype.multiply;
  Vector.prototype.each = Vector.prototype.forEach;

  Vector.i = new Vector([1, 0, 0]);
  Vector.j = new Vector([0, 1, 0]);
  Vector.k = new Vector([0, 0, 1]);

  var computeCentroids = function computeCentroids(config, position, row) {
    var centroids = [];

    var p = Object.keys(config.dimensions);
    var cols = p.length;
    var a = 0.5; // center between axes
    for (var i = 0; i < cols; ++i) {
      // centroids on 'real' axes
      var x = position(p[i]);
      var y = config.dimensions[p[i]].yscale(row[p[i]]);
      centroids.push(new Vector([x, y]));

      // centroids on 'virtual' axes
      if (i < cols - 1) {
        var cx = x + a * (position(p[i + 1]) - x);
        var cy = y + a * (config.dimensions[p[i + 1]].yscale(row[p[i + 1]]) - y);
        if (config.bundleDimension !== null) {
          var leftCentroid = config.clusterCentroids.get(config.dimensions[config.bundleDimension].yscale(row[config.bundleDimension])).get(p[i]);
          var rightCentroid = config.clusterCentroids.get(config.dimensions[config.bundleDimension].yscale(row[config.bundleDimension])).get(p[i + 1]);
          var centroid = 0.5 * (leftCentroid + rightCentroid);
          cy = centroid + (1 - config.bundlingStrength) * (cy - centroid);
        }
        centroids.push(new Vector([cx, cy]));
      }
    }

    return centroids;
  };

  var computeControlPoints = function computeControlPoints(smoothness, centroids) {
    var cols = centroids.length;
    var a = smoothness;
    var cps = [];

    cps.push(centroids[0]);
    cps.push(new Vector([centroids[0].e(1) + a * 2 * (centroids[1].e(1) - centroids[0].e(1)), centroids[0].e(2)]));
    for (var col = 1; col < cols - 1; ++col) {
      var mid = centroids[col];
      var left = centroids[col - 1];
      var right = centroids[col + 1];

      var diff = left.subtract(right);
      cps.push(mid.add(diff.x(a)));
      cps.push(mid);
      cps.push(mid.subtract(diff.x(a)));
    }

    cps.push(new Vector([centroids[cols - 1].e(1) + a * 2 * (centroids[cols - 2].e(1) - centroids[cols - 1].e(1)), centroids[cols - 1].e(2)]));
    cps.push(centroids[cols - 1]);

    return cps;
  };

  // draw single cubic bezier curve

  var singleCurve = function singleCurve(config, position, d, ctx) {
    var centroids = computeCentroids(config, position, d);
    var cps = computeControlPoints(config.smoothness, centroids);

    ctx.moveTo(cps[0].e(1), cps[0].e(2));

    for (var i = 1; i < cps.length; i += 3) {
      if (config.showControlPoints) {
        for (var j = 0; j < 3; j++) {
          ctx.fillRect(cps[i + j].e(1), cps[i + j].e(2), 2, 2);
        }
      }
      ctx.bezierCurveTo(cps[i].e(1), cps[i].e(2), cps[i + 1].e(1), cps[i + 1].e(2), cps[i + 2].e(1), cps[i + 2].e(2));
    }
  };

  // returns the y-position just beyond the separating null value line
  var getNullPosition = function getNullPosition(config) {
    if (config.nullValueSeparator === 'bottom') {
      return h(config) + 1;
    } else if (config.nullValueSeparator === 'top') {
      return 1;
    } else {
      console.log("A value is NULL, but nullValueSeparator is not set; set it to 'bottom' or 'top'.");
    }
    return h(config) + 1;
  };

  var singlePath = function singlePath(config, position, d, ctx) {
    Object.keys(config.dimensions).map(function (p) {
      return [position(p), d[p] === undefined ? getNullPosition(config) : config.dimensions[p].yscale(d[p])];
    }).sort(function (a, b) {
      return a[0] - b[0];
    }).forEach(function (p, i) {
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    });
  };

  // draw single polyline
  var colorPath = function colorPath(config, position, d, ctx) {
    ctx.beginPath();
    if (config.bundleDimension !== null && config.bundlingStrength > 0 || config.smoothness > 0) {
      singleCurve(config, position, d, ctx);
    } else {
      singlePath(config, position, d, ctx);
    }
    ctx.stroke();
  };

  var _functor = function _functor(v) {
    return typeof v === 'function' ? v : function () {
      return v;
    };
  };

  var pathMark = function pathMark(config, ctx, position) {
    return function (d, i) {
      ctx.marked.strokeStyle = _functor(config.color)(d, i);
      return colorPath(config, position, d, ctx.marked);
    };
  };

  var renderMarkedDefault = function renderMarkedDefault(config, pc, ctx, position) {
    return function () {
      pc.clear('marked');

      if (config.marked.length) {
        config.marked.forEach(pathMark(config, ctx, position));
      }
    };
  };

  var renderMarkedQueue = function renderMarkedQueue(config, markedQueue) {
    return function () {
      if (config.marked) {
        markedQueue(config.marked);
      } else {
        markedQueue([]); // This is needed to clear the currently marked items
      }
    };
  };

  var renderMarked = function renderMarked(config, pc, events) {
    return function () {
      if (!Object.keys(config.dimensions).length) pc.detectDimensions();

      pc.renderMarked[config.mode]();
      events.call('render', this);
      return this;
    };
  };

  var pathBrushed = function pathBrushed(config, ctx, position) {
    return function (d, i) {
      if (config.brushedColor !== null) {
        ctx.brushed.strokeStyle = _functor(config.brushedColor)(d, i);
      } else {
        ctx.brushed.strokeStyle = _functor(config.color)(d, i);
      }
      return colorPath(config, position, d, ctx.brushed);
    };
  };

  var renderBrushedDefault = function renderBrushedDefault(config, ctx, position, pc, brushGroup) {
    return function () {
      pc.clear('brushed');

      if (isBrushed(config, brushGroup) && config.brushed !== false) {
        config.brushed.forEach(pathBrushed(config, ctx, position));
      }
    };
  };

  var renderBrushedQueue = function renderBrushedQueue(config, brushGroup, brushedQueue) {
    return function () {
      if (isBrushed(config, brushGroup)) {
        brushedQueue(config.brushed);
      } else {
        brushedQueue([]); // This is needed to clear the currently brushed items
      }
    };
  };

  var renderBrushed = function renderBrushed(config, pc, events) {
    return function () {
      if (!Object.keys(config.dimensions).length) pc.detectDimensions();

      pc.renderBrushed[config.mode]();
      events.call('render', this);
      return this;
    };
  };

  var brushReset$4 = function brushReset(config, pc) {
    return function (dimension) {
      var brushesToKeep = [];
      for (var j = 0; j < config.brushes.length; j++) {
        if (config.brushes[j].data !== dimension) {
          brushesToKeep.push(config.brushes[j]);
        }
      }

      config.brushes = brushesToKeep;
      config.brushed = false;

      if (pc.g() !== undefined) {
        var nodes = pc.g().selectAll('.brush').nodes();
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].__data__ === dimension) {
            // remove all dummy brushes for this axis or the real brush
            d3Selection.select(d3Selection.select(nodes[i]).nodes()[0].parentNode).selectAll('.dummy').remove();
            config.dimensions[dimension].brush.move(d3Selection.select(nodes[i], null));
          }
        }
      }

      return this;
    };
  };

  // a better "typeof" from this post: http://stackoverflow.com/questions/7390426/better-way-to-get-type-of-a-javascript-variable
  var toType = function toType(v) {
    return {}.toString.call(v).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  };

  // this descriptive text should live with other introspective methods
  var toString = function toString(config) {
    return function () {
      return 'Parallel Coordinates: ' + Object.keys(config.dimensions).length + ' dimensions (' + Object.keys(config.data[0]).length + ' total) , ' + config.data.length + ' rows';
    };
  };

  // pairs of adjacent dimensions
  var adjacentPairs = function adjacentPairs(arr) {
    var ret = [];
    for (var i = 0; i < arr.length - 1; i++) {
      ret.push([arr[i], arr[i + 1]]);
    }
    return ret;
  };

  var pathHighlight = function pathHighlight(config, ctx, position) {
    return function (d, i) {
      ctx.highlight.strokeStyle = _functor(config.color)(d, i);
      return colorPath(config, position, d, ctx.highlight);
    };
  };

  // highlight an array of data
  var highlight = function highlight(config, pc, canvas, events, ctx, position) {
    return function () {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (data === null) {
        return config.highlighted;
      }

      config.highlighted = data;
      pc.clear('highlight');
      d3Selection.selectAll([canvas.foreground, canvas.brushed]).classed('faded', true);
      data.forEach(pathHighlight(config, ctx, position));
      events.call('highlight', this, data);
      return this;
    };
  };

  // clear highlighting
  var unhighlight = function unhighlight(config, pc, canvas) {
    return function () {
      config.highlighted = [];
      pc.clear('highlight');
      d3Selection.selectAll([canvas.foreground, canvas.brushed]).classed('faded', false);
      return this;
    };
  };

  // mark an array of data
  var mark = function mark(config, pc, canvas, events, ctx, position) {
    return function () {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (data === null) {
        return config.marked;
      }

      // add array to already marked data
      config.marked = config.marked.concat(data);
      d3Selection.selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', true);
      data.forEach(pathMark(config, ctx, position));
      events.call('mark', this, data);
      return this;
    };
  };

  // clear marked data arrays
  var unmark = function unmark(config, pc, canvas) {
    return function () {
      config.marked = [];
      pc.clear('marked');
      d3Selection.selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', false);
      return this;
    };
  };

  var removeAxes = function removeAxes(pc) {
    return function () {
      pc._g.remove();

      delete pc._g;
      return this;
    };
  };

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
  var render = function render(config, pc, events) {
    return function () {
      // try to autodetect dimensions and create scales
      if (!Object.keys(config.dimensions).length) {
        pc.detectDimensions();
      }
      pc.autoscale();

      pc.render[config.mode]();

      events.call('render', this);
      return this;
    };
  };

  var pathForeground = function pathForeground(config, ctx, position) {
    return function (d, i) {
      ctx.foreground.strokeStyle = _functor(config.color)(d, i);
      return colorPath(config, position, d, ctx.foreground);
    };
  };

  var renderDefault = function renderDefault(config, pc, ctx, position) {
    return function () {
      pc.clear('foreground');
      pc.clear('highlight');

      pc.renderBrushed.default();
      pc.renderMarked.default();

      config.data.forEach(pathForeground(config, ctx, position));
    };
  };

  var renderDefaultQueue = function renderDefaultQueue(config, pc, foregroundQueue) {
    return function () {
      pc.renderBrushed.queue();
      pc.renderMarked.queue();
      foregroundQueue(config.data);
    };
  };

  // try to coerce to number before returning type
  var toTypeCoerceNumbers = function toTypeCoerceNumbers(v) {
    return parseFloat(v) == v && v !== null ? 'number' : toType(v);
  };

  // attempt to determine types of each dimension based on first row of data
  var detectDimensionTypes = function detectDimensionTypes(data) {
    return Object.keys(data[0]).reduce(function (acc, cur) {
      var key = isNaN(Number(cur)) ? cur : parseInt(cur);
      acc[key] = toTypeCoerceNumbers(data[0][cur]);

      return acc;
    }, {});
  };

  var getOrderedDimensionKeys = function getOrderedDimensionKeys(config) {
    return function () {
      return Object.keys(config.dimensions).sort(function (x, y) {
        return d3Array.ascending(config.dimensions[x].index, config.dimensions[y].index);
      });
    };
  };

  var interactive = function interactive(flags) {
    return function () {
      flags.interactive = true;
      return this;
    };
  };

  var shadows = function shadows(flags, pc) {
    return function () {
      flags.shadows = true;
      pc.alphaOnBrushed(0.1);
      pc.render();
      return this;
    };
  };

  /**
   * Setup a new parallel coordinates chart.
   *
   * @param config
   * @param canvas
   * @param ctx
   * @returns {pc} a parcoords closure
   */
  var init = function init(config, canvas, ctx) {
    /**
     * Create the chart within a container. The selector can also be a d3 selection.
     *
     * @param selection a d3 selection
     * @returns {pc} instance for chained api
     */
    var pc = function pc(selection) {
      selection = pc.selection = d3Selection.select(selection);

      config.width = selection.node().clientWidth;
      config.height = selection.node().clientHeight;
      // canvas data layers
      ['dots', 'foreground', 'brushed', 'marked', 'highlight'].forEach(function (layer) {
        canvas[layer] = selection.append('canvas').attr('class', layer).node();
        ctx[layer] = canvas[layer].getContext('2d');
      });

      // svg tick and brush layers
      pc.svg = selection.append('svg').attr('width', config.width).attr('height', config.height).style('font', '14px sans-serif').style('position', 'absolute').append('svg:g').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');
      // for chained api
      return pc;
    };

    // for partial-application style programming
    return pc;
  };

  var flip = function flip(config) {
    return function (d) {
      //__.dimensions[d].yscale.domain().reverse();                               // does not work
      config.dimensions[d].yscale.domain(config.dimensions[d].yscale.domain().reverse()); // works

      return this;
    };
  };

  var detectDimensions = function detectDimensions(pc) {
    return function () {
      pc.dimensions(pc.applyDimensionDefaults());
      return this;
    };
  };

  var scale = function scale(config, pc) {
    return function (d, domain) {
      config.dimensions[d].yscale.domain(domain);
      pc.render.default();
      pc.updateAxes();

      return this;
    };
  };

  var version = "2.2.10";

  var DefaultConfig = {
    data: [],
    highlighted: [],
    marked: [],
    dimensions: {},
    dimensionTitleRotation: 0,
    brushes: [],
    brushed: false,
    brushedColor: null,
    alphaOnBrushed: 0.0,
    lineWidth: 1.4,
    highlightedLineWidth: 3,
    mode: 'default',
    markedLineWidth: 3,
    markedShadowColor: '#ffffff',
    markedShadowBlur: 10,
    rate: 20,
    width: 600,
    height: 300,
    margin: { top: 24, right: 20, bottom: 12, left: 20 },
    nullValueSeparator: 'undefined', // set to "top" or "bottom"
    nullValueSeparatorPadding: { top: 8, right: 0, bottom: 8, left: 0 },
    color: '#069',
    composite: 'source-over',
    alpha: 0.7,
    bundlingStrength: 0.5,
    bundleDimension: null,
    smoothness: 0.0,
    showControlPoints: false,
    hideAxis: [],
    flipAxes: [],
    animationTime: 1100, // How long it takes to flip the axis when you double click
    rotateLabels: false
  };

  var _this$4 = undefined;

  var initState = function initState(userConfig) {
    var config = Object.assign({}, DefaultConfig, userConfig);

    if (userConfig && userConfig.dimensionTitles) {
      console.warn('dimensionTitles passed in userConfig is deprecated. Add title to dimension object.');
      d3Collection.entries(userConfig.dimensionTitles).forEach(function (d) {
        if (config.dimensions[d.key]) {
          config.dimensions[d.key].title = config.dimensions[d.key].title ? config.dimensions[d.key].title : d.value;
        } else {
          config.dimensions[d.key] = {
            title: d.value
          };
        }
      });
    }

    var eventTypes = ['render', 'resize', 'highlight', 'mark', 'brush', 'brushend', 'brushstart', 'axesreorder'].concat(d3Collection.keys(config));

    var events = d3Dispatch.dispatch.apply(_this$4, eventTypes),
        flags = {
      brushable: false,
      reorderable: false,
      axes: false,
      interactive: false,
      debug: false
    },
        xscale = d3Scale.scalePoint(),
        dragging = {},
        axis = d3Axis.axisLeft().ticks(5),
        ctx = {},
        canvas = {};

    var brush = {
      modes: {
        None: {
          install: function install(pc) {}, // Nothing to be done.
          uninstall: function uninstall(pc) {}, // Nothing to be done.
          selected: function selected() {
            return [];
          }, // Nothing to return
          brushState: function brushState() {
            return {};
          }
        }
      },
      mode: 'None',
      predicate: 'AND',
      currentMode: function currentMode() {
        return this.modes[this.mode];
      }
    };

    return {
      config: config,
      events: events,
      eventTypes: eventTypes,
      flags: flags,
      xscale: xscale,
      dragging: dragging,
      axis: axis,
      ctx: ctx,
      canvas: canvas,
      brush: brush
    };
  };

  var computeClusterCentroids = function computeClusterCentroids(config, d) {
    var clusterCentroids = new Map();
    var clusterCounts = new Map();
    // determine clusterCounts
    config.data.forEach(function (row) {
      var scaled = config.dimensions[d].yscale(row[d]);
      if (!clusterCounts.has(scaled)) {
        clusterCounts.set(scaled, 0);
      }
      var count = clusterCounts.get(scaled);
      clusterCounts.set(scaled, count + 1);
    });

    config.data.forEach(function (row) {
      Object.keys(config.dimensions).map(function (p) {
        var scaled = config.dimensions[d].yscale(row[d]);
        if (!clusterCentroids.has(scaled)) {
          var _map = new Map();
          clusterCentroids.set(scaled, _map);
        }
        if (!clusterCentroids.get(scaled).has(p)) {
          clusterCentroids.get(scaled).set(p, 0);
        }
        var value = clusterCentroids.get(scaled).get(p);
        value += config.dimensions[p].yscale(row[p]) / clusterCounts.get(scaled);
        clusterCentroids.get(scaled).set(p, value);
      });
    });

    return clusterCentroids;
  };

  var _this$5 = undefined;

  var without = function without(arr, items) {
    items.forEach(function (el) {
      delete arr[el];
    });
    return arr;
  };

  var sideEffects = function sideEffects(config, ctx, pc, xscale, axis, flags, brushedQueue, markedQueue, foregroundQueue) {
    return d3Dispatch.dispatch.apply(_this$5, Object.keys(config)).on('composite', function (d) {
      ctx.foreground.globalCompositeOperation = d.value;
      ctx.brushed.globalCompositeOperation = d.value;
    }).on('alpha', function (d) {
      ctx.foreground.globalAlpha = d.value;
      ctx.brushed.globalAlpha = d.value;
    }).on('brushedColor', function (d) {
      ctx.brushed.strokeStyle = d.value;
    }).on('width', function (d) {
      return pc.resize();
    }).on('height', function (d) {
      return pc.resize();
    }).on('margin', function (d) {
      return pc.resize();
    }).on('rate', function (d) {
      brushedQueue.rate(d.value);
      markedQueue.rate(d.value);
      foregroundQueue.rate(d.value);
    }).on('dimensions', function (d) {
      config.dimensions = pc.applyDimensionDefaults(Object.keys(d.value));
      xscale.domain(pc.getOrderedDimensionKeys());
      pc.sortDimensions();
      if (flags.interactive) {
        pc.render().updateAxes();
      }
    }).on('bundleDimension', function (d) {
      if (!Object.keys(config.dimensions).length) pc.detectDimensions();
      pc.autoscale();
      if (typeof d.value === 'number') {
        if (d.value < Object.keys(config.dimensions).length) {
          config.bundleDimension = config.dimensions[d.value];
        } else if (d.value < config.hideAxis.length) {
          config.bundleDimension = config.hideAxis[d.value];
        }
      } else {
        config.bundleDimension = d.value;
      }

      config.clusterCentroids = computeClusterCentroids(config, config.bundleDimension);
      if (flags.interactive) {
        pc.render();
      }
    }).on('hideAxis', function (d) {
      pc.brushReset();
      pc.dimensions(pc.applyDimensionDefaults());
      pc.dimensions(without(config.dimensions, d.value));
      pc.render();
    }).on('flipAxes', function (d) {
      if (d.value && d.value.length) {
        d.value.forEach(function (dimension) {
          flipAxisAndUpdatePCP(config, pc, axis)(dimension);
        });
        pc.updateAxes(0);
      }
    });
  };

  var getset = function getset(obj, state, events, side_effects) {
    Object.keys(state).forEach(function (key) {
      obj[key] = function (x) {
        if (!arguments.length) {
          return state[key];
        }
        if (key === 'dimensions' && Object.prototype.toString.call(x) === '[object Array]') {
          console.warn('pc.dimensions([]) is deprecated, use pc.dimensions({})');
          x = obj.applyDimensionDefaults(x);
        }
        var old = state[key];
        state[key] = x;
        side_effects.call(key, obj, { value: x, previous: old });
        events.call(key, obj, { value: x, previous: old });
        return obj;
      };
    });
  };

  // side effects for setters

  var d3_rebind = function d3_rebind(target, source, method) {
    return function () {
      var value = method.apply(source, arguments);
      return value === source ? target : value;
    };
  };

  var _rebind = function _rebind(target, source, method) {
    target[method] = d3_rebind(target, source, source[method]);
    return target;
  };

  var bindEvents = function bindEvents(__, ctx, pc, xscale, flags, brushedQueue, markedQueue, foregroundQueue, events, axis) {
    var side_effects = sideEffects(__, ctx, pc, xscale, axis, flags, brushedQueue, markedQueue, foregroundQueue);

    // create getter/setters
    getset(pc, __, events, side_effects);

    // expose events
    // getter/setter with event firing
    _rebind(pc, events, 'on');

    _rebind(pc, axis, 'ticks', 'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  };

  // misc

  var ParCoords = function ParCoords(userConfig) {
    var state = initState(userConfig);
    var config = state.config,
        events = state.events,
        flags = state.flags,
        xscale = state.xscale,
        dragging = state.dragging,
        axis = state.axis,
        ctx = state.ctx,
        canvas = state.canvas,
        brush = state.brush;


    var pc = init(config, canvas, ctx);

    var position = function position(d) {
      if (xscale.range().length === 0) {
        xscale.range([0, w(config)], 1);
      }
      return dragging[d] == null ? xscale(d) : dragging[d];
    };

    var brushedQueue = renderQueue(pathBrushed(config, ctx, position)).rate(50).clear(function () {
      return pc.clear('brushed');
    });

    var markedQueue = renderQueue(pathMark(config, ctx, position)).rate(50).clear(function () {
      return pc.clear('marked');
    });

    var foregroundQueue = renderQueue(pathForeground(config, ctx, position)).rate(50).clear(function () {
      pc.clear('foreground');
      pc.clear('highlight');
    });

    bindEvents(config, ctx, pc, xscale, flags, brushedQueue, markedQueue, foregroundQueue, events, axis);

    // expose the state of the chart
    pc.state = config;
    pc.flags = flags;

    pc.autoscale = autoscale(config, pc, xscale, ctx);
    pc.scale = scale(config, pc);
    pc.flip = flip(config);
    pc.commonScale = commonScale(config, pc);
    pc.detectDimensions = detectDimensions(pc);
    // attempt to determine types of each dimension based on first row of data
    pc.detectDimensionTypes = detectDimensionTypes;
    pc.applyDimensionDefaults = applyDimensionDefaults(config, pc);
    pc.getOrderedDimensionKeys = getOrderedDimensionKeys(config);

    //Renders the polylines.
    pc.render = render(config, pc, events);
    pc.renderBrushed = renderBrushed(config, pc, events);
    pc.renderMarked = renderMarked(config, pc, events);
    pc.render.default = renderDefault(config, pc, ctx, position);
    pc.render.queue = renderDefaultQueue(config, pc, foregroundQueue);
    pc.renderBrushed.default = renderBrushedDefault(config, ctx, position, pc, brush);
    pc.renderBrushed.queue = renderBrushedQueue(config, brush, brushedQueue);
    pc.renderMarked.default = renderMarkedDefault(config, pc, ctx, position);
    pc.renderMarked.queue = renderMarkedQueue(config, markedQueue);

    pc.compute_real_centroids = computeRealCentroids(config, position);
    pc.shadows = shadows(flags, pc);
    pc.axisDots = axisDots(config, pc, position);
    pc.clear = clear(config, pc, ctx, brush);
    pc.createAxes = createAxes(config, pc, xscale, flags, axis);
    pc.removeAxes = removeAxes(pc);
    pc.updateAxes = updateAxes(config, pc, position, axis, flags);
    pc.applyAxisConfig = applyAxisConfig;
    pc.brushable = brushable(config, pc, flags);
    pc.brushReset = brushReset$4(config, pc);
    pc.selected = selected$4(config, pc);
    pc.reorderable = reorderable(config, pc, xscale, position, dragging, flags);

    // Reorder dimensions, such that the highest value (visually) is on the left and
    // the lowest on the right. Visual values are determined by the data values in
    // the given row.
    pc.reorder = reorder(config, pc, xscale);
    pc.sortDimensionsByRowData = sortDimensionsByRowData(config);
    pc.sortDimensions = sortDimensions(config, position);

    // pairs of adjacent dimensions
    pc.adjacent_pairs = adjacentPairs;
    pc.interactive = interactive(flags);

    // expose internal state
    pc.xscale = xscale;
    pc.ctx = ctx;
    pc.canvas = canvas;
    pc.g = function () {
      return pc._g;
    };

    // rescale for height, width and margins
    // TODO currently assumes chart is brushable, and destroys old brushes
    pc.resize = resize(config, pc, flags, events);

    // highlight an array of data
    pc.highlight = highlight(config, pc, canvas, events, ctx, position);
    // clear highlighting
    pc.unhighlight = unhighlight(config, pc, canvas);

    // mark an array of data
    pc.mark = mark(config, pc, canvas, events, ctx, position);
    // clear marked data
    pc.unmark = unmark(config, pc, canvas);

    // calculate 2d intersection of line a->b with line c->d
    // points are objects with x and y properties
    pc.intersection = intersection;

    // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
    // (so you can choose to save it to disk, etc.)
    pc.mergeParcoords = mergeParcoords(pc);
    pc.brushModes = function () {
      return Object.getOwnPropertyNames(brush.modes);
    };
    pc.brushMode = brushMode(brush, config, pc);

    // install brushes
    install1DAxes(brush, config, pc, events);
    install2DStrums(brush, config, pc, events, xscale);
    installAngularBrush(brush, config, pc, events, xscale);
    install1DMultiAxes(brush, config, pc, events);

    pc.version = version;
    // this descriptive text should live with other introspective methods
    pc.toString = toString(config);
    pc.toType = toType;
    // try to coerce to number before returning type
    pc.toTypeCoerceNumbers = toTypeCoerceNumbers;

    return pc;
  };

  return ParCoords;

})));
//# sourceMappingURL=parcoords.js.map
