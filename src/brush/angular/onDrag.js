import { event, select } from 'd3-selection';
import { drag } from 'd3-drag';
import onDragEnd from './onDragEnd';

const drawStrum = (brushGroup, state, config, pc, events, arc, activePoint) => {
  const svg = pc.selection.select('svg').select('g#arcs'),
    id = arc.dims.i,
    points = [arc.p2, arc.p3],
    _line = svg
      .selectAll('line#arc-' + id)
      .data([{ p1: arc.p1, p2: arc.p2 }, { p1: arc.p1, p2: arc.p3 }]),
    circles = svg.selectAll('circle#arc-' + id).data(points),
    _drag = drag(),
    _path = svg.selectAll('path#arc-' + id).data([arc]);

  _path
    .enter()
    .append('path')
    .attr('id', 'arc-' + id)
    .attr('class', 'arc')
    .style('fill', 'orange')
    .style('opacity', 0.5);

  _path
    .attr('d', arc.arc)
    .attr('transform', 'translate(' + arc.p1[0] + ',' + arc.p1[1] + ')');

  _line
    .enter()
    .append('line')
    .attr('id', 'arc-' + id)
    .attr('class', 'arc');

  _line
    .attr('x1', d => d.p1[0])
    .attr('y1', d => d.p1[1])
    .attr('x2', d => d.p2[0])
    .attr('y2', d => d.p2[1])
    .attr('stroke', 'black')
    .attr('stroke-width', 2);

  _drag
    .on('drag', (d, i) => {
      const ev = event;
      i = i + 2;

      arc['p' + i][0] = Math.min(Math.max(arc.minX + 1, ev.x), arc.maxX);
      arc['p' + i][1] = Math.min(Math.max(arc.minY, ev.y), arc.maxY);

      const angle =
        i === 3 ? state.arcs.startAngle(id) : state.arcs.endAngle(id);

      if (
        (arc.startAngle < Math.PI &&
          arc.endAngle < Math.PI &&
          angle < Math.PI) ||
        (arc.startAngle >= Math.PI &&
          arc.endAngle >= Math.PI &&
          angle >= Math.PI)
      ) {
        if (i === 2) {
          arc.endAngle = angle;
          arc.arc.endAngle(angle);
        } else if (i === 3) {
          arc.startAngle = angle;
          arc.arc.startAngle(angle);
        }
      }

      drawStrum(brushGroup, state, config, pc, events, arc, i - 2);
    })
    .on('end', onDragEnd(brushGroup, state, config, pc, events));

  circles
    .enter()
    .append('circle')
    .attr('id', 'arc-' + id)
    .attr('class', 'arc');

  circles
    .attr('cx', d => d[0])
    .attr('cy', d => d[1])
    .attr('r', 5)
    .style(
      'opacity',
      (d, i) => (activePoint !== undefined && i === activePoint ? 0.8 : 0)
    )
    .on('mouseover', function() {
      select(this).style('opacity', 0.8);
    })
    .on('mouseout', function() {
      select(this).style('opacity', 0);
    })
    .call(_drag);
};

const onDrag = (brushGroup, state, config, pc, events) => () => {
  const ev = event,
    arc = state.arcs[state.arcs.active];

  // Make sure that the point is within the bounds
  arc.p2[0] = Math.min(
    Math.max(arc.minX + 1, ev.x - config.margin.left),
    arc.maxX
  );
  arc.p2[1] = Math.min(Math.max(arc.minY, ev.y - config.margin.top), arc.maxY);
  arc.p3 = arc.p2.slice();
  drawStrum(brushGroup, state, config, pc, events, arc, 1);
};

export default onDrag;
