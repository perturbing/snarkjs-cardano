/*
    Copyright 2022 iden3 association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

import {Scalar} from "ffjavascript";
import jsSha3 from "js-sha3";
var blake2b = require('blake2b-wasm');

const POLYNOMIAL = 0;
const SCALAR = 1;

export class Blake2b224Transcript {
    constructor(curve) {
        this.G1 = curve.G1;
        this.Fr = curve.Fr;

        this.reset();
    }

    reset() {
        this.data = [];
    }

    addPolCommitment(polynomialCommitment) {
        this.data.push({type: POLYNOMIAL, data: polynomialCommitment});
    }

    addScalar(scalar) {
        this.data.push({type: SCALAR, data: scalar});
    }

    getChallenge(logger) {
        if(0 === this.data.length) {
            throw new Error("Keccak256Transcript: No data to generate a transcript");
        }

        let nPolynomials = 0;
        let nScalars = 0;

        this.data.forEach(element => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);

        let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8 );
        let offset = 0;

        for (let i = 0; i < this.data.length; i++) {
            if (POLYNOMIAL === this.data[i].type) {
                // Add the compressed x coordinate of the buffer
                this.G1.toRprCompressed(buffer, offset, this.data[i].data);
                // convert to affine
                const point = this.G1.toAffine(this.data[i].data);
                // convert to affine and negate
                const pointInv = this.G1.toAffine(this.G1.neg(this.data[i].data));
                // get the y coordinate
                const y = this.G1.toObject(point)[1];
                // get the y coordinate of the negated point
                const yInv = this.G1.toObject(pointInv)[1];
                // define an empty the mask
                let mask = 0b00000000;
                // check if the point is the point at infinity
                // and set the mask accordingly
                if (this.G1.isZero(this.data[i].data)) {
                    mask = 0b11000000;
                } else if (y < yInv) {
                    mask = 0b10000000;
                } else {
                    mask = 0b10100000;
                }
                const byte = buffer[offset];
                const newByte = byte | mask;
                buffer[offset] = newByte;
                offset += this.G1.F.n8;
            } else {
                this.Fr.toRprBE(buffer, offset, this.data[i].data);
                offset += this.Fr.n8;
            }
        }
        
        if (logger) {
            var hash = blake2b(28);
            hash.update(buffer);
            logger.debug("Blake2b224Transcript: buffer = " + buffer.toString());
            logger.debug("length of buffer = " + buffer.length);
            logger.debug("hash = " + new Uint8Array(hash.digest()));
        }

        var hashDigest = blake2b(28).update(buffer);
        const value = Scalar.fromRprBE(new Uint8Array(hashDigest.digest()));
        return this.Fr.e(value);
    }
}