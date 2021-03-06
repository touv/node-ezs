import merge from 'merge2';
import debug from 'debug';
import {
    inspectServers,
    connectServer,
} from '../client';

/**
 * Takes an `Object` dispatch processing to an external pipeline in one or more servers
 *
 * @param {String} [server] servers to dispatch data
 * @param {String} [file] the external pipeline is descrbied in a file
 * @param {String} [script] the external pipeline is descrbied in a sting of characters
 * @param {String} [commands] the external pipeline is descrbied in object
 * @returns {Object}
 */
export default function dispatch(data, feed) {
    const { ezs } = this;
    if (this.isFirst()) {
        this.lastIndex = 0;
        const file = this.getParam('file');
        const fileContent = ezs.loadScript(file);
        const script = this.getParam('script', fileContent);
        const cmds = ezs.compileScript(script);
        const commands = this.getParam('commands', cmds.get());
        const environment = this.getEnv();
        const servers = inspectServers(this.getParam('server', []), commands, environment);

        if (!servers || servers.length === 0 || !commands || commands.length === 0) {
            return feed.stop(new Error('Invalid parmeter for dispatch'));
        }
        const handles = servers.map(connectServer(ezs));
        this.ins = handles.map(h => h[0]);
        this.outs = handles.map(h => h[1]);
        const funnel = merge(this.outs, ezs.objectMode())
            .on('queueDrain', () => {
                funnel.destroy();
            })
            .on('error', e => feed.write(e))
            .on('data', d => feed.write(d));
        this.whenFinish = new Promise((resolve) => {
            funnel.on('close', resolve);
        });
    }
    if (this.isLast()) {
        this.whenFinish
            .then(() => feed.close())
            .catch(e => feed.stop(e));
        this.ins.forEach(handle => handle.end());
    } else {
        if (this.lastIndex >= this.ins.length) {
            this.lastIndex = 0;
        }
        debug('ezs')(`Write chunk #${this.getIndex()} containing ${Object.keys(data).length || 0} keys into handle #${this.lastIndex + 1}/${this.ins.length}`);
        const check = ezs.writeTo(this.ins[this.lastIndex], data, () => feed.end());
        if (!check) {
            this.lastIndex += 1;
        }
    }
    return 1;
}
