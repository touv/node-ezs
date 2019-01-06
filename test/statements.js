const assert = require('assert');
const from = require('from');
const ezs = require('ezs');

describe('statements', () => {
    it('partition#1', (done) => {
        const res = [];
        from([
            'lorem',
            'Lorem',
            'loren',
            'korem',
            'olrem',
            'toto',
            'titi',
            'truc',
            'lorem',
        ])
            .pipe(ezs('partition', { size: 3 }))
            .on('data', (chunk) => {
                assert(Array.isArray(chunk));
                assert(chunk.length === 3);
            })
            .on('end', () => {
                done();
            });
    });
    it('partition#2', (done) => {
        const res = [];
        from([
            'lorem',
            'Lorem',
            'loren',
            'korem',
            'olrem',
            'toto',
            'titi',
            'truc',
        ])
            .pipe(ezs('partition', { size: 3 }))
            .on('data', (chunk) => {
                assert(Array.isArray(chunk));
                res.push(chunk);
            })
            .on('end', () => {
                assert(res[0].length === 3);
                assert(res[0][0] === 'lorem');
                assert(res[1].length === 3);
                assert(res[1][0] === 'korem');
                assert(res[2].length === 2);
                assert(res[2][0] === 'titi');
                done();
            });
    });
    it('harvest#1', (done) => {
        const res = [];
        from([
            'https://raw.githubusercontent.com/touv/node-ezs/master/package.json',
        ])
            .pipe(ezs('harvest'))
            .on('data', (chunk) => {
                assert(Buffer.isBuffer(chunk));
                assert(JSON.parse(chunk).name === 'ezs');
            })
            .on('end', () => {
                done();
            });
    });
    it('harvest#2', (done) => {
        const res = [];
        let check = true;
        from([
            'https://raw.githubusercontent.com/touv/node-ezs/master/package.no_found',
        ])
            .pipe(ezs('harvest'))
            .on('data', (chunk) => {
                check = false;
            })
            .on('end', () => {
                assert.ok(check);
                done();
            });
    });
});
