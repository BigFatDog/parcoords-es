const uninstall = (state, pc) => () => {
  pc.selection
    .select('svg')
    .select('g#arcs')
    .remove();
  pc.selection
    .select('svg')
    .select('rect#arc-events')
    .remove();
  pc.on('axesreorder.arcs', undefined);

  delete pc.brushReset;

  state.strumRect = undefined;
};

export default uninstall;
