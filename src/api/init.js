import {select} from "d3-selection";

const init = state => selection => {
    selection = init.selection = select(selection);
    const { config, canvas, ctx } = state;

    state = {
        ...state,
        config: {
            ...state.config,
            width: selection.node().clientWidth,
            height: selection.node().clientHeight
        }
    }

    // canvas data layers
    ['marks', 'foreground', 'brushed', 'highlight'].forEach((layer)=> {
        canvas[layer] = selection
            .append('canvas')
            .attr('class', layer)
            .node();
        ctx[layer] = canvas[layer].getContext('2d');
    });

    // svg tick and brush layers
    init.svg = selection
        .append('svg')
        .attr('width', config.width)
        .attr('height', config.height)
        .style('font', '14px sans-serif')
        .style('position', 'absolute')

        .append('svg:g')
        .attr(
            'transform',
            'translate(' + config.margin.left + ',' + config.margin.top + ')'
        );

    return init;
};

export default init;