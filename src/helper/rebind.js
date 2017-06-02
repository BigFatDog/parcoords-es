const d3_rebind = (target, source, method)=> {
    return function() {
        let value = method.apply(source, arguments);
        return value === source ? target : value;
    };
}

const _rebind =  (target, source, method)=> {
    target[method] = d3_rebind(target, source, source[method]);
    return target;
}

export default _rebind;