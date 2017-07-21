const fix = (input, ...args) => {
    if (args.length === 1) {
        return args[0];
    }
    return args;
};

export default {
    fix,
};
