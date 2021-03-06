import { PassThrough } from 'stream';
import debug from 'debug';

/**
 * Takes an `Object` delegate processing to an external pipeline
 *
 * @param {String} [file] the external pipeline is descrbied in a file
 * @param {String} [script] the external pipeline is descrbied in a sting of characters
 * @param {String} [commands] the external pipeline is descrbied in object
 * @returns {Object}
 */
export default function delegate(data, feed) {
    const { ezs } = this;
    if (this.isFirst()) {
        const file = this.getParam('file');
        const fileContent = ezs.loadScript(file);
        const script = this.getParam('script', fileContent);
        const cmds = ezs.compileScript(script);
        const commands = this.getParam('commands', cmds.get());
        const environment = this.getEnv();

        if (!commands || commands.length === 0) {
            return feed.stop(new Error('Invalid parmeter for delegate'));
        }

        const streams = ezs.compileCommands(commands, environment);
        this.input = new PassThrough({ objectMode: true });

        const output = ezs.createPipeline(this.input, streams)
            .pipe(ezs.catch(e => feed.write(e)))
            .on('error', e => feed.write(e))
            .on('data', d => feed.write(d));

        this.whenFinish = new Promise((resolve) => {
            output.on('end', resolve);
        });
        debug('ezs')(`Delegate first chunk #${this.getIndex()} containing ${Object.keys(data).length || 0} keys`);
        return ezs.writeTo(this.input, data, () => feed.end());
    }
    if (this.isLast()) {
        this.whenFinish
            .then(() => feed.close())
            .catch(e => feed.stop(e));
        return this.input.end();
    }
    debug('ezs')(`Delegate chunk #${this.getIndex()} containing ${Object.keys(data).length || 0} keys`);
    return ezs.writeTo(this.input, data, () => feed.end());
}
