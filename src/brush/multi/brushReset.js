import { select } from 'd3-selection';

const brushReset = (state, config, pc) => () => {
  const { brushes } = state;

    config.brushed = false;
    if (pc.g()) {
        pc.g().selectAll('.brush')
            .each(function(d) {
                select(this).call(
                    brushes[d].clear()
                );
            });
        pc.renderBrushed();
    }
    return this;
};

export default brushReset;
