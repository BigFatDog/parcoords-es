const _functor = v => (typeof v === 'function' ? v : () => v);

export default _functor;
