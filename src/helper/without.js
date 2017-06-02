const without = (arr, items)=> {
    items.forEach( (el)=> {
        delete arr[el];
    });
    return arr;
};

export default without;