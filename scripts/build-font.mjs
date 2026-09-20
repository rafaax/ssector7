import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const SRC = process.argv[2] ?? 'source/mono.ttf';
const OUT = process.argv[3] ?? 'src/assets/font.json';

const GLYPHS = new Set(' abcdefghijklmnopqrstuvwxyz0123456789-.,:/()&+');

const font = opentype.parse(toArrayBuffer(readFileSync(SRC)));
const data = convert(font, GLYPHS);

writeFileSync(OUT, JSON.stringify(data));

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`${SRC} (${kb(readFileSync(SRC).length)}) -> ${OUT} (${kb(readFileSync(OUT).length)})`);
console.log(`${Object.keys(data.glyphs).length} glifos, familia "${data.familyName}"`);

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function convert(font, keep) {
  const round = Math.round;
  const glyphs = {};
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72);

  const glyphIndexMap = font.encoding.cmap.glyphIndexMap;

  for (const unicode of Object.keys(glyphIndexMap)) {
    const char = String.fromCodePoint(Number(unicode));
    if (!keep.has(char)) continue;

    const glyph = font.glyphs.glyphs[glyphIndexMap[unicode]];
    const token = {
      ha: round(glyph.advanceWidth * scale),
      x_min: round(glyph.xMin * scale),
      x_max: round(glyph.xMax * scale),
      o: '',
    };

    for (const command of glyph.path.commands) {
      const type = command.type.toLowerCase() === 'c' ? 'b' : command.type.toLowerCase();
      token.o += `${type} `;

      if (command.x !== undefined && command.y !== undefined) {
        token.o += `${round(command.x * scale)} ${round(command.y * scale)} `;
      }
      if (command.x1 !== undefined && command.y1 !== undefined) {
        token.o += `${round(command.x1 * scale)} ${round(command.y1 * scale)} `;
      }
      if (command.x2 !== undefined && command.y2 !== undefined) {
        token.o += `${round(command.x2 * scale)} ${round(command.y2 * scale)} `;
      }
    }

    glyphs[char] = token;
  }

  return {
    glyphs,
    familyName: font.getEnglishName('fullName'),
    ascender: round(font.ascender * scale),
    descender: round(font.descender * scale),
    underlinePosition: font.tables.post.underlinePosition,
    underlineThickness: font.tables.post.underlineThickness,
    boundingBox: {
      xMin: font.tables.head.xMin,
      xMax: font.tables.head.xMax,
      yMin: font.tables.head.yMin,
      yMax: font.tables.head.yMax,
    },
    resolution: 1000,
  };
}
