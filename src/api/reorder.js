// Reorder dimensions, such that the highest value (visually) is on the left and
// the lowest on the right. Visual values are determined by the data values in
// the given row.
const reorder = (config, pc, xscale) => rowdata => {
  const firstDim = pc.getOrderedDimensionKeys()[0];

  pc.sortDimensionsByRowData(rowdata);
  // NOTE: this is relatively cheap given that:
  // number of dimensions < number of data items
  // Thus we check equality of order to prevent rerendering when this is the case.
  const reordered = firstDim !== pc.getOrderedDimensionKeys()[0];

  if (reordered) {
    xscale.domain(pc.getOrderedDimensionKeys());
    const highlighted = config.highlighted.slice(0);
    pc.unhighlight();

    const marked = config.marked.slice(0);
    pc.unmark();

    const g = pc.g();
    g.transition()
      .duration(1500)
      .attr('transform', d => 'translate(' + xscale(d) + ')');
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

export default reorder;
