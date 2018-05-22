const brushPredicate = (brushGroup, config, pc) => (predicate = null) => {
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

const brushMode = (brushGroup, config, pc) => (mode = null) => {
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

export default brushMode;
