import assert from "node:assert/strict";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { crc32, createZip } from "./zip";

/** Reads a zip back through its central directory, the way unzip tools do. */
const readZip = (zip: Buffer) => {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50);
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const offset = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    assert.equal(zip.readUInt32LE(offset), 0x04034b50);
    const start = offset + 30 + zip.readUInt16LE(offset + 26);
    const body = zip.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(body) : body;
    assert.equal(crc32(data), crc, `checksum for ${name}`);
    files[name] = data.toString("utf8");
    at += 46 + nameLength;
  }
  return files;
};

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("files come back out of the zip unchanged", () => {
  const text = "Hello, zip! ".repeat(50);
  const zip = createZip([
    { name: "post.txt", data: Buffer.from(text) },
    { name: "clip.mp4", data: Buffer.from("not really a video") },
    { name: "ថ្ងៃ.txt", data: Buffer.from("Khmer name") },
    { name: "empty.txt", data: new Uint8Array() },
  ]);
  assert.deepEqual(readZip(zip), {
    "post.txt": text,
    "clip.mp4": "not really a video",
    "ថ្ងៃ.txt": "Khmer name",
    "empty.txt": "",
  });
  // Repetitive text is deflated; the video is stored as it is.
  assert.ok(zip.length < text.length);
});
