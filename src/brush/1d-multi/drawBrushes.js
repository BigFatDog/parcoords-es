import { select } from 'd3-selection';

const drawBrushes = (brushes, config, pc, axis, selector) => {
  const brushSelection = selector.selectAll('.brush').data(brushes, d => d.id);

  brushSelection
    .enter()
    .insert('g', '.brush')
    .attr('class', 'brush')
    .attr('dimension', axis)
    .attr(
      'id',
      b => 'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + b.id
    )
    .each(function(brushObject) {
      brushObject.brush(select(this));
    });

  brushSelection.each(function(brushObject) {
    select(this)
      .attr('class', 'brush')
      .selectAll('.overlay')
      .style('pointer-events', function() {
        const brush = brushObject.brush;
        if (brushObject.id === brushes.length - 1 && brush !== undefined) {
          return 'all';
        } else {
          return 'none';
        }
      });
  });

  brushSelection.exit().remove();
};

export default drawBrushes;
