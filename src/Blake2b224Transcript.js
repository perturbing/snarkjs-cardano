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
import { blake2b } from "@noble/hashes/blake2b";

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
            throw new Error("Blake2b224Transcript: No data to generate a transcript");
        }

        let nPolynomials = 0;
        let nScalars = 0;

        this.data.forEach(element => POLYNOMIAL === element.type ? nPolynomials++ : nScalars++);

        let buffer = new Uint8Array(nScalars * this.Fr.n8 + nPolynomials * this.G1.F.n8 );
        let offset = 0;

        for (let i = 0; i < this.data.length; i++) {
            if (POLYNOMIAL === this.data[i].type) {
                this.G1.toRprCompressed(buffer, offset, this.data[i].data);
                const point = this.G1.toAffine(this.data[i].data);
                const pointInv = this.G1.toAffine(this.G1.neg(this.data[i].data));
                const y = this.G1.toObject(point)[1];
                const yInv = this.G1.toObject(pointInv)[1];
                let mask = 0b00000000;
                if (this.G1.isZero(this.data[i].data)) {
                    mask = 0b11000000;
                } else if (y < yInv) {
                    mask = 0b10000000;
                } else {
                    mask = 0b10100000;
                }
                buffer[offset] = buffer[offset] | mask;
                offset += this.G1.F.n8;
            } else {
                this.Fr.toRprBE(buffer, offset, this.data[i].data);
                offset += this.Fr.n8;
            }
        }

        const digest = blake2b(buffer, { dkLen: 28 });

        if (logger) {
            logger.debug("Blake2b224Transcript: buffer = " + buffer.toString());
            logger.debug("length of buffer = " + buffer.length);
            logger.debug("hash = " + digest);
        }

        const value = Scalar.fromRprBE(digest);
        return this.Fr.e(value);
    }
}
