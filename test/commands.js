import assert from 'assert';
import { Readable }  from 'stream';
import ezs from '../src';
import Commands from '../src/commands';

const { M_SINGLE, M_DISPATCH, M_NORMAL, M_CONDITIONAL } = ezs.constants;

describe('analsye commands', () => {
    it('with simple pipeline', (done) => {
        const commands = `
            [use]
            plugin = test/locals

            [increment]
            step = 1

            [increment?single]
            step = 2


            [increment?${M_DISPATCH}]
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

    /**/
});
