import {keys} from "d3-collection";

const render = (config, pc, events) => function() {
    // try to autodetect dimensions and create scales
    if (!keys(config.dimensions).length) {
        pc.detectDimensions();
    }
    pc.autoscale();

    pc.render[config.mode]();

    events.call('render', this);
    return this;
}

export default render;