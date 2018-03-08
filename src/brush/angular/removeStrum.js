const removeStrum = (state, pc) => {
  const arc = state.arcs[state.arcs.active],
    svg = pc.selection.select('svg').select('g#arcs');

  delete state.arcs[state.arcs.active];
  state.arcs.active = undefined;
  svg.selectAll('line#arc-' + arc.dims.i).remove();
  svg.selectAll('circle#arc-' + arc.dims.i).remove();
  svg.selectAll('path#arc-' + arc.dims.i).remove();
};

export default removeStrum;
