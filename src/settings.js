import os from 'os';

const settings = {
    highWaterMark: {
        object: 16,
        bytes: 16384,
    },
    nShards: os.cpus().length,
    encoding: 'gzip',
    servePath: process.cwd(),
    cache: {
        root: os.tmpdir(),
        dir: '/ezs',
        files: 100,
        size: '1 GB',
        check: 10,
    },
    port: 31976,
};

export default settings;
