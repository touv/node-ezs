export default class Feed {
    constructor(push, done, stop, index) {
        this.push = push;
        this.done = done;
        this.stop = stop;
    }
    write(something) {
        if (something !== undefined) {
            this.push(something);
        }
    }
    end() {
        this.done();
    }
    send(something) {
        this.write(something);
        this.end();
    }
    close() {
        this.write(null);
        this.end();
    }
    stop(withError) {
        this.stop(withError);
    }
}
