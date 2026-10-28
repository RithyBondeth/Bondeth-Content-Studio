import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * A small zip writer, so bundles need no extra dependency. Videos and images
 * are already compressed, so they're stored as they are; text files are
 * deflated. Everything is built in memory, which is fine for a few videos,
 * but zip files over 4 GB (which need the ZIP64 format) aren't supported.
 */

export type ZipEntry = {
  /** Path inside the zip, with "/" between folders. */
  name: string;
  data: Uint8Array;
  /** Defaults to true for files that aren't already compressed. */
  compress?: boolean;
  /** Defaults to now. */
  modified?: Date;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** The CRC-32 checksum zip files use to check each file. */
export const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** Zip stores times in the old MS-DOS format, to the nearest 2 seconds. */
const dosDateTime = (date: Date) => {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
};

const ALREADY_COMPRESSED = /\.(mp4|mov|m4a|mp3|png|jpe?g|webp|gif|zip)$/i;
const MAX_ZIP_BYTES = 0xffffffff;

export const createZip = (entries: ZipEntry[]): Buffer => {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.data);
    const shouldCompress =
      entry.compress ?? !ALREADY_COMPRESSED.test(entry.name);
    const deflated = shouldCompress ? deflateRawSync(raw) : null;
    // Only keep the compressed copy if it's actually smaller.
    const useDeflate = deflated !== null && deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const { time, date } = dosDateTime(entry.modified ?? new Date());
    // Bit 11: the file name is UTF-8.
    const flags = 0x0800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed to extract
    header.writeUInt16LE(flags, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(body.length, 20);
    header.writeUInt32LE(raw.length, 24);
    header.writeUInt16LE(name.length, 28);
    // Extra field, comment, disk number, and attributes stay 0.
    header.writeUInt32LE(offset, 42);

    locals.push(local, name, body);
    central.push(header, name);
    offset += local.length + name.length + body.length;
    if (offset > MAX_ZIP_BYTES) {
      throw new Error("This bundle is over 4 GB, too big for a zip file.");
    }
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, ...central, end]);
};

/**
 * Reads a zip made by createZip (stored or deflated files, no ZIP64), for
 * restoring backups. Every file's checksum is checked.
 */
export const readZip = (zip: Buffer): ZipEntry[] => {
  let end = -1;
  for (
    let i = zip.length - 22;
    i >= Math.max(0, zip.length - 22 - 65535);
    i--
  ) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("That isn't a zip file.");
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);

  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) {
      throw new Error("The zip file is damaged.");
    }
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const localOffset = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;

    const dataStart =
      localOffset +
      30 +
      zip.readUInt16LE(localOffset + 26) +
      zip.readUInt16LE(localOffset + 28);
    const body = zip.subarray(dataStart, dataStart + size);
    const data =
      method === 8
        ? inflateRawSync(body)
        : method === 0
          ? Buffer.from(body)
          : null;
    if (!data) throw new Error(`${name} uses an unsupported compression.`);
    if (crc32(data) !== crc) throw new Error(`${name} is damaged.`);
    entries.push({ name, data });
  }
  return entries;
};
