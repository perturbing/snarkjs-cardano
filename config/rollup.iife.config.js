import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import virtual from "@rollup/plugin-virtual";
import replace from "@rollup/plugin-replace";
import visualizer from "rollup-plugin-visualizer";
// Needed by fastfile
import { O_TRUNC, O_CREAT, O_RDWR, O_EXCL, O_RDONLY } from "constants";

const empty = "export default {}";

// Browser stub for blake2b-wasm: ceremony/CLI functions are never called in-browser,
// but the module must resolve so the IIFE bundle doesn't leave dangling require() calls.
// Basic update/digest is implemented via @noble/hashes for any code path that IS reached
// (e.g. Blake2b224Transcript — though that now imports @noble/hashes directly).
const blake2bStub = `
import { blake2b as _noble_blake2b } from "@noble/hashes/blake2b";
function Blake2b(digestLen) {
  const chunks = [];
  return {
    update(data) { chunks.push(data instanceof Uint8Array ? data : new Uint8Array(data)); return this; },
    digest() {
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const buf = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }
      return _noble_blake2b(buf, { dkLen: digestLen });
    },
    setPartialHash() { throw new Error("blake2b setPartialHash not supported in browser"); },
    getPartialHash() { throw new Error("blake2b getPartialHash not supported in browser"); },
  };
}
export default Blake2b;
`;

// We create a stub with these constants instead of including the entire constants definition
const constants = `
export const O_TRUNC = ${O_TRUNC};
export const O_CREAT = ${O_CREAT};
export const O_RDWR = ${O_RDWR};
export const O_EXCL = ${O_EXCL};
export const O_RDONLY = ${O_RDONLY}
`;

export default {
    input: "main.js",
    output: {
        file: "build/snarkjs.js",
        format: "iife",
        sourcemap: "inline",
        globals: {
            os: "null"
        },
        name: "snarkjs"
    },
    plugins: [
        virtual({
            fs: empty,
            os: empty,
            crypto: empty,
            readline: empty,
            ejs: empty,
            events: empty,
            stream: empty,
            util: empty,
            constants: constants,
            "blake2b-wasm": blake2bStub,
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            exportConditions: ["browser", "default", "module", "require"]
        }),
        commonJS(),
        replace({
            // The current default is false, but they are changing it next version
            preventAssignment: false,
            "process.browser": !!process.env.BROWSER
        }),
        visualizer(),
    ]
};
