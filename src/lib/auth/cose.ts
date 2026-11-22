/**
 * Just enough CBOR and COSE to verify a CIP-30 / CIP-95 signData result:
 * a COSE_Sign1 signature plus a COSE_Key holding the Ed25519 public key.
 * Server-only. Rejects anything unusual rather than guessing.
 */

import { createPublicKey, verify } from 'node:crypto';

type Cbor = number | bigint | boolean | null | Uint8Array | string | Cbor[] | Map<Cbor, Cbor> | { tag: number; value: Cbor };

class Reader {
  private i = 0;
  constructor(private readonly b: Uint8Array) {}

  private byte(): number {
    if (this.i >= this.b.length) throw new Error('CBOR ended early');
    return this.b[this.i++];
  }

  private length(info: number): number {
    if (info < 24) return info;
    let n = 0;
    const bytes = info === 24 ? 1 : info === 25 ? 2 : info === 26 ? 4 : info === 27 ? 8 : -1;
    if (bytes < 0) throw new Error('Indefinite-length CBOR is not supported here');
    for (let k = 0; k < bytes; k++) n = n * 256 + this.byte();
    if (!Number.isSafeInteger(n)) throw new Error('CBOR length too large');
    return n;
  }

  private take(n: number): Uint8Array {
    if (this.i + n > this.b.length) throw new Error('CBOR ended early');
    const out = this.b.subarray(this.i, this.i + n);
    this.i += n;
    return out;
  }

  read(depth = 0): Cbor {
    if (depth > 16) throw new Error('CBOR nested too deeply');
    const first = this.byte();
    const major = first >> 5;
    const info = first & 31;
    switch (major) {
      case 0:
        return this.length(info);
      case 1:
        return -1 - this.length(info);
      case 2:
        return this.take(this.length(info));
      case 3:
        return Buffer.from(this.take(this.length(info))).toString('utf8');
      case 4: {
        const n = this.length(info);
        const arr: Cbor[] = [];
        for (let k = 0; k < n; k++) arr.push(this.read(depth + 1));
        return arr;
      }
      case 5: {
        const n = this.length(info);
        const map = new Map<Cbor, Cbor>();
        for (let k = 0; k < n; k++) map.set(this.read(depth + 1), this.read(depth + 1));
        return map;
      }
      case 6:
        return { tag: this.length(info), value: this.read(depth + 1) };
      default:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new Error('Unsupported CBOR simple value');
    }
  }

  done(): boolean {
    return this.i === this.b.length;
  }
}

export function decodeCbor(bytes: Uint8Array): Cbor {
  const r = new Reader(bytes);
  const value = r.read();
  if (!r.done()) throw new Error('Trailing bytes after CBOR value');
  return value;
}

function head(major: number, n: number): Buffer {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  if (n < 65536) return Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
  const b = Buffer.alloc(5);
  b[0] = (major << 5) | 26;
  b.writeUInt32BE(n, 1);
  return b;
}

/** COSE Sig_structure for COSE_Sign1 with empty external AAD (RFC 8152 §4.4). */
function sigStructure(protectedRaw: Uint8Array, payload: Uint8Array): Buffer {
  const context = Buffer.from('Signature1', 'utf8');
  return Buffer.concat([
    head(4, 4),
    head(3, context.length),
    context,
    head(2, protectedRaw.length),
    Buffer.from(protectedRaw),
    head(2, 0),
    head(2, payload.length),
    Buffer.from(payload),
  ]);
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function isBytes(v: Cbor | undefined): v is Uint8Array {
  return v instanceof Uint8Array;
}

export interface VerifiedSignature {
  publicKey: Buffer;
  payload: Buffer;
  /** The "address" protected header, when the wallet sets one (CIP-30/95 do) */
  address: Buffer | null;
}

/**
 * Verifies a signData result. Returns the signer's key, the signed payload and
 * the address header; throws with a reason when anything doesn't check out.
 */
export function verifyDataSignature(signatureHex: string, keyHex: string): VerifiedSignature {
  let sign1 = decodeCbor(Buffer.from(signatureHex, 'hex'));
  if (typeof sign1 === 'object' && sign1 !== null && 'tag' in sign1 && !Array.isArray(sign1) && !(sign1 instanceof Map) && !(sign1 instanceof Uint8Array)) {
    if (sign1.tag !== 18) throw new Error('Not a COSE_Sign1 signature');
    sign1 = sign1.value;
  }
  if (!Array.isArray(sign1) || sign1.length !== 4) throw new Error('Not a COSE_Sign1 signature');
  const [protectedRaw, unprotected, payload, signature] = sign1;
  if (!isBytes(protectedRaw) || !(unprotected instanceof Map) || !isBytes(payload) || !isBytes(signature)) throw new Error('Malformed COSE_Sign1');
  if (unprotected.get('hashed') === true) throw new Error('Hashed payloads are not accepted; sign the message itself');
  if (signature.length !== 64) throw new Error('Not an Ed25519 signature');

  const headers = protectedRaw.length ? decodeCbor(protectedRaw) : new Map();
  if (!(headers instanceof Map)) throw new Error('Malformed COSE protected header');
  if (headers.get(1) !== -8) throw new Error('Signature algorithm must be EdDSA');
  const address = headers.get('address');

  const coseKey = decodeCbor(Buffer.from(keyHex, 'hex'));
  if (!(coseKey instanceof Map)) throw new Error('Malformed COSE_Key');
  const x = coseKey.get(-2);
  if (coseKey.get(1) !== 1 || !isBytes(x) || x.length !== 32) throw new Error('COSE_Key must be an Ed25519 (OKP) public key');

  const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(x)]), format: 'der', type: 'spki' });
  if (!verify(null, sigStructure(protectedRaw, payload), key, Buffer.from(signature))) throw new Error('Signature does not verify');
  return { publicKey: Buffer.from(x), payload: Buffer.from(payload), address: isBytes(address) ? Buffer.from(address) : null };
}
