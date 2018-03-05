const scale = config=> function(d, domain) {
    config.dimensions[d].yscale.domain(domain);

    return this;
};

export default scale;