import { brushSelection, brushY } from 'd3-brush';
import { event, select } from 'd3-selection';

const brushable = (config, pc, flags) =>
  function() {
    if (!pc.g()) {
      pc.createAxes();
    }

    const g = pc.g();

    // Add and store a brush for each axis.
    g.append('svg:g')
      .attr('class', 'brush')
      .each(function(d) {
        if (config.dimensions[d] !== undefined) {
          config.dimensions[d]['brush'] = brushY(select(this)).extent([
            [-15, 0],
            [15, config.dimensions[d].yscale.range()[0]],
          ]);
          select(this).call(
            config.dimensions[d]['brush']
              .on('start', function() {
                if (event.sourceEvent !== null && !event.sourceEvent.ctrlKey) {
                  pc.brushReset();
                }
              })
              .on('brush', function() {
                if (!event.sourceEvent.ctrlKey) {
                  pc.brush();
                }
              })
              .on('end', function() {
                // save brush selection is ctrl key is held
                // store important brush information and
                // the html element of the selection,
                // to make a dummy selection element
                if (event.sourceEvent.ctrlKey) {
                  let html = select(this)
                    .select('.selection')
                    .nodes()[0].outerHTML;
                  html = html.replace(
                    'class="selection"',
                    'class="selection dummy' +
                      ' selection-' +
                      config.brushes.length +
                      '"'
                  );
                  let dat = select(this).nodes()[0].__data__;
                  let brush = {
                    id: config.brushes.length,
                    extent: brushSelection(this),
                    html: html,
                    data: dat,
                  };
                  config.brushes.push(brush);
                  select(select(this).nodes()[0].parentNode)
                    .select('.axis')
                    .nodes()[0].outerHTML += html;
                  pc.brush();
                  config.dimensions[d].brush.move(select(this, null));
                  select(this)
                    .select('.selection')
                    .attr('style', 'display:none');
                  pc.brushable();
                } else {
                  pc.brush();
                }
              })
          );
          select(this).on('dblclick', function() {
            pc.brushReset(d);
          });
        }
      });

    flags.brushable = true;
    return this;
  };

export default brushable;
