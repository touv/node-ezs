import assert from 'assert';
import ezs from '../src';
import Commands from '../src/commands';

describe('analsye commands', () => {
    it('with simple pipeline', (done) => {
        const commands = `
            [use]
            plugin = test/locals

            [increment]
            step = 1

            [increment?single]
            step = 2

            [increment?detachable]
            step = 3

            [increment]
            step = 3

        `;
        const commandsParsed = ezs.parseString(commands);
        const cmdp = new Commands(commandsParsed);
        const commandsAnalysed = cmdp.analyse();
        assert.equal(commandsAnalysed.length, 3);
        assert.equal(commandsAnalysed[0].cmds.length, 3);
        assert.equal(commandsAnalysed[1].cmds.length, 2);
        done();
    });
    it('with simple pipeline', (done) => {
        const commands = `

            [package:increment]
            step = 1

            [package:increment?single]
            step = 2

            [assign?detachable]
            step = 3

            [assign]
            step = 3

        `;
        const commandsParsed = ezs.parseString(commands);
        assert.equal(commandsParsed[0].use, 'package');
        assert.equal(commandsParsed[1].use, 'package');
        assert.equal(commandsParsed[2].use, '');
        assert.equal(commandsParsed[3].use, '');
        done();
    });

    /**/
});
