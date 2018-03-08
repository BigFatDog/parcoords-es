const uninstall = (state, pc) => () => {
  pc.selection
    .select('svg')
    .select('g#strums')
    .remove();
  pc.selection
    .select('svg')
    .select('rect#strum-events')
    .remove();
  pc.on('axesreorder.strums', undefined);
  delete pc.brushReset;

  state.strumRect = undefined;
};

export default uninstall;
