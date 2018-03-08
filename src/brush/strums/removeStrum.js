const removeStrum = (state, pc) => {
  const strum = state.strums[state.strums.active],
    svg = pc.selection.select('svg').select('g#strums');

  delete state.strums[state.strums.active];
  svg.selectAll('line#strum-' + strum.dims.i).remove();
  svg.selectAll('circle#strum-' + strum.dims.i).remove();
};

export default removeStrum;
