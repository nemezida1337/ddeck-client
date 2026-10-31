var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module.exports = BitBuffer;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module.exports = BitMatrix;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module2 = data.get(row, col);
          if (module2 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module2;
            sameCountCol = 1;
          }
          module2 = data.get(col, row);
          if (module2 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module2;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module.exports = ReedSolomonEncoder;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString2(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module.exports = NumericData;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module.exports = AlphanumericData;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module.exports = ByteData;
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module.exports = KanjiData;
  }
});

// node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js"(exports, module) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module !== "undefined") {
      module.exports = dijkstra;
    }
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// lib/mobile/index.js
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var here = dirname(fileURLToPath(import.meta.url));
var LAYER_MARKER = "data-dsh-remote-layer";
async function readLayer() {
  const candidates = [here, join(here, "mobile")];
  for (const directory of candidates) {
    try {
      const [css, js] = await Promise.all([
        readFile(join(directory, "skin.css"), "utf8"),
        readFile(join(directory, "skin.js"), "utf8")
      ]);
      return { css, js };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("dsh-remote: mobile layer sources are missing (skin.css, skin.js)");
}
function injectLayer(html, layer, language2) {
  const marker = ` ${LAYER_MARKER}="${language2}"`;
  const head = `<style${marker} data-dsh-remote-part="css">${layer.css}</style>`;
  const body = `<script data-dsh-remote-part="js">${layer.js}</script>`;
  let output = html;
  const headIndex = output.indexOf("</head>");
  if (headIndex === -1) {
    output = head + output;
  } else {
    output = `${output.slice(0, headIndex)}${head}${output.slice(headIndex)}`;
  }
  const bodyIndex = output.lastIndexOf("</body>");
  return bodyIndex === -1 ? `${output}${body}` : `${output.slice(0, bodyIndex)}${body}${output.slice(bodyIndex)}`;
}

// vendor/gateway/gateway.ts
import { createHash as createHash2, X509Certificate } from "node:crypto";
import { createSocket } from "node:dgram";
import { lstat, readFile as readFile2, readdir, stat } from "node:fs/promises";
import { homedir, hostname } from "node:os";
import { basename, dirname as dirname2, extname, join as join2, resolve, sep } from "node:path";
import {
  createServer as createHttpServer,
  request as requestHttp
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect } from "node:net";

// vendor/gateway/ip.ts
function isStrictIpv4(value) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^(?:0|[1-9][0-9]{0,2})$/u.test(part)) return false;
    if (Number(part) > 255) return false;
  }
  return true;
}
function countIpv6Groups(labels, allowDottedQuad) {
  let groups = 0;
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    if (label.includes(".")) {
      if (index !== labels.length - 1 || !allowDottedQuad || !isStrictIpv4(label)) return -1;
      groups += 2;
      continue;
    }
    if (!/^[\da-f]{1,4}$/iu.test(label)) return -1;
    groups += 1;
  }
  return groups;
}
function isIP(value) {
  if (typeof value !== "string") return 0;
  if (isStrictIpv4(value)) return 4;
  let text = value;
  const zone = text.indexOf("%");
  if (zone !== -1) {
    const suffix = text.slice(zone + 1);
    if (suffix.length === 0 || suffix.includes("%")) return 0;
    text = text.slice(0, zone);
  }
  if (text.length === 0) return 0;
  const halves = text.split("::");
  if (halves.length > 2) return 0;
  if (halves.length === 1) {
    return countIpv6Groups(text.split(":"), true) === 8 ? 6 : 0;
  }
  const leftText = halves[0];
  const rightText = halves[1];
  const left = leftText === "" ? [] : leftText.split(":");
  const right = rightText === "" ? [] : rightText.split(":");
  const leftGroups = countIpv6Groups(left, false);
  const rightGroups = countIpv6Groups(right, right.length > 0);
  if (leftGroups < 0 || rightGroups < 0) return 0;
  return leftGroups + rightGroups >= 8 ? 0 : 6;
}

// vendor/gateway/gateway.ts
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { createGzip, gzip } from "node:zlib";

// vendor/_stubs.js
var ClientModulePreferenceStore = class {
  constructor() {
  }
  async initialize() {
  }
  snapshot() {
    return { entries: [] };
  }
  async save() {
  }
};
function parseExcludedClientModules() {
  return [];
}
function renderClientModuleRecoveryPage() {
  return "";
}
var MOBILE_COMPAT_PATH = "/mobile-access/compat.js";
function ensureMobileCompatibility() {
  return "";
}
function ensureMobileGatewayMarker() {
  return "";
}
var LEGACY_CUSTOM_ASSET_LIMIT = 0;
var EXTENSION_LIMITS = Object.freeze({ assets: 0, routes: 0, body: 0 });
var MobileExtensionError = class extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
};
function disposeLateExtensionResponse() {
}
function isPreparedJson() {
  return false;
}
function bridgeCompressedWebSocket() {
  throw new Error("dsh-remote: compressed websockets are not supported");
}
function listComputerImages() {
  return [];
}
function readComputerImage() {
  return void 0;
}
function normalizeWebSocketPaths(paths) {
  return Array.isArray(paths) ? paths : [];
}
function resolveHostExecution(value) {
  return { ...value ?? {}, kind: "none" };
}
var Bonjour = class {
  constructor() {
  }
  publish(service, callback) {
    callback?.();
    return { stop() {
    } };
  }
  unpublishAll(callback) {
    callback?.();
  }
  find() {
    return { start() {
    }, stop() {
    } };
  }
  destroy(callback) {
    callback?.();
  }
};

// vendor/qrcode-shim.js
var import_qrcode = __toESM(require_qrcode(), 1);
var import_svg_tag = __toESM(require_svg_tag(), 1);
async function toString(text, options = {}) {
  const symbol = import_qrcode.default.create(text, { errorCorrectionLevel: options.errorCorrectionLevel ?? "M" });
  return import_svg_tag.default.render(symbol, {
    margin: options.margin ?? 1,
    width: options.width,
    color: { light: "#ffffff", dark: "#000000" }
  });
}

// vendor/gateway/access.ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
var AccessError = class extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
    this.name = "AccessError";
  }
  status;
  code;
};
var BoundedRateLimiter = class {
  constructor(limit, windowMs, maximumKeys) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maximumKeys = maximumKeys;
  }
  limit;
  windowMs;
  maximumKeys;
  buckets = /* @__PURE__ */ new Map();
  /** Consume one attempt; unknown keys fail closed when the bounded table is full. */
  take(key, now) {
    for (const [candidate, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(candidate);
    }
    const current = this.buckets.get(key);
    if (current === void 0) {
      if (this.buckets.size >= this.maximumKeys) return false;
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
  /** Discard entries that no longer identify an eligible key in a trusted, finite key set. */
  retainKeys(eligible) {
    for (const key of this.buckets.keys()) {
      if (!eligible.has(key)) this.buckets.delete(key);
    }
  }
  /** Current table size, exposed for bounded-state assertions. */
  get size() {
    return this.buckets.size;
  }
};
function opaqueToken() {
  return randomBytes(32).toString("base64url");
}
function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}
function digestHex(value) {
  return digest(value).toString("hex");
}
function matchesDigest(value, expected) {
  return timingSafeEqual(digest(value), expected);
}
function normalizeLabel(value) {
  const label = (value ?? "Mobile device").normalize("NFC").trim();
  if (label.length < 1 || label.length > 64 || /[\u0000-\u001f\u007f]/u.test(label)) {
    throw new AccessError(400, "invalid_request");
  }
  return label;
}
function publicDevice(device) {
  return Object.freeze({
    id: device.id,
    label: device.label,
    createdAt: device.createdAt,
    expiresAt: device.expiresAt,
    lastSeenAt: device.lastSeenAt,
    ...device.revokedAt === void 0 ? {} : { revokedAt: device.revokedAt }
  });
}
var AccessController = class {
  constructor(store, options) {
    this.store = store;
    this.options = options;
    this.now = options.now ?? Date.now;
    this.pairLimiter = new BoundedRateLimiter(
      options.maxPairingAttempts,
      options.rateLimitWindowMs,
      options.maxRateLimitKeys
    );
  }
  store;
  options;
  now;
  pairLimiter;
  devices = [];
  pairingWindow;
  pairPending = false;
  sessions = /* @__PURE__ */ new Map();
  sessionEndedListeners = /* @__PURE__ */ new Set();
  mutation = Promise.resolve();
  initialized = false;
  closing = false;
  closeTask;
  /** Load and validate digest-only durable state before accepting traffic. */
  async initialize() {
    if (this.initialized || this.closing) throw new Error("access controller cannot be initialized again");
    const snapshot = await this.store.load();
    const devices = snapshot.devices.filter((device) => device.revokedAt === void 0);
    if (devices.length > this.options.maxDevices) throw new Error("device state exceeds configured maxDevices");
    if (devices.length !== snapshot.devices.length) await this.store.save(this.snapshot(devices));
    this.devices = devices;
    this.initialized = true;
  }
  requireInitialized() {
    if (!this.initialized || this.closing) throw new Error("access controller is not available");
  }
  async exclusive(operation) {
    const prior = this.mutation;
    let release;
    this.mutation = new Promise((resolve3) => {
      release = resolve3;
    });
    await prior;
    try {
      return await operation();
    } finally {
      release();
    }
  }
  snapshot(devices) {
    return Object.freeze({ version: 2, devices: Object.freeze([...devices]) });
  }
  nativeIdentity(device) {
    const nativeInstanceId = device.nativeInstanceId ?? this.options.legacyInstanceId ?? this.options.pairingInstanceId;
    return nativeInstanceId === void 0 ? {} : { nativeInstanceId };
  }
  emitSessionEnded(session, reason) {
    const authorization = Object.freeze({
      sessionKey: session.key,
      deviceId: session.deviceId,
      expiresAt: session.expiresAt
    });
    for (const listener of this.sessionEndedListeners) listener(authorization, reason);
  }
  removeSession(key, reason) {
    const session = this.sessions.get(key);
    if (session === void 0) return;
    this.sessions.delete(key);
    this.emitSessionEnded(session, reason);
  }
  pruneSessions(now) {
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) this.removeSession(key, "expired");
    }
  }
  createSession(device, now) {
    this.pruneSessions(now);
    if (this.sessions.size >= this.options.maxSessions) {
      const oldest = [...this.sessions.values()].sort((left, right) => left.createdAt - right.createdAt)[0];
      if (oldest !== void 0) this.removeSession(oldest.key, "evicted");
    }
    const sessionToken = opaqueToken();
    const csrfToken = opaqueToken();
    const key = digestHex(sessionToken);
    const record = Object.freeze({
      key,
      deviceId: device.id,
      csrfDigest: digest(csrfToken),
      createdAt: now,
      expiresAt: Math.min(now + this.options.sessionTtlMs, device.expiresAt)
    });
    this.sessions.set(key, record);
    return Object.freeze({
      ...this.nativeIdentity(device),
      deviceId: device.id,
      sessionToken,
      csrfToken,
      sessionExpiresAt: record.expiresAt
    });
  }
  /** Open one short pairing window and return its one-time secret to a loopback caller only. */
  async openPairing(requestedTtlMs, requestedToken) {
    this.requireInitialized();
    return this.exclusive(async () => {
      const ttl = requestedTtlMs ?? this.options.pairingTtlMs;
      if (!Number.isSafeInteger(ttl) || ttl < 1e4 || ttl > this.options.pairingTtlMs) {
        throw new AccessError(400, "invalid_request");
      }
      if (requestedToken !== void 0 && (requestedToken.length === 0 || requestedToken.length > 512)) {
        throw new AccessError(400, "invalid_request");
      }
      const token = requestedToken ?? opaqueToken();
      const expiresAt = this.now() + ttl;
      this.pairingWindow = Object.freeze({ digest: digest(token), expiresAt });
      return Object.freeze({ token, expiresAt });
    });
  }
  /** Limit invalid guesses by peer without letting them consume a valid one-time secret's admission. */
  rejectPairingAttempt(sourceKey, now) {
    if (!this.pairLimiter.take(sourceKey, now)) throw new AccessError(429, "rate_limited");
    throw new AccessError(401, "authentication_failed");
  }
  /** Consume the pairing window exactly once and persist only the device-token digest. */
  async pair(sourceKey, token, label, fingerprint) {
    if (fingerprint !== void 0 && !/^[a-f\d]{64}$/u.test(fingerprint)) {
      throw new AccessError(400, "bad_request");
    }
    this.requireInitialized();
    const initialNow = this.now();
    const initialWindow = this.pairingWindow;
    if (token.length > 512 || initialWindow === void 0 || initialWindow.expiresAt <= initialNow || !matchesDigest(token, initialWindow.digest)) {
      this.rejectPairingAttempt(sourceKey, initialNow);
    }
    if (this.pairPending) throw new AccessError(429, "rate_limited");
    this.pairPending = true;
    try {
      return await this.exclusive(async () => {
        const now = this.now();
        const window = this.pairingWindow;
        if (window === void 0 || window.expiresAt <= now || !matchesDigest(token, window.digest)) {
          if (window !== void 0 && window.expiresAt <= now) this.pairingWindow = void 0;
          this.rejectPairingAttempt(sourceKey, now);
        }
        this.pairingWindow = void 0;
        const active = this.devices.filter((device2) => device2.revokedAt === void 0 && device2.expiresAt > now);
        if (active.length >= this.options.maxDevices) throw new AccessError(409, "device_limit");
        const deviceToken = opaqueToken();
        const normalizedLabel = normalizeLabel(label);
        const retained = this.devices.filter((candidate) => candidate.revokedAt === void 0 && candidate.expiresAt > now);
        let device = fingerprint === void 0 ? void 0 : retained.find((candidate) => candidate.fingerprint === fingerprint);
        if (device === void 0 && fingerprint !== void 0) {
          const legacy = retained.filter((candidate) => candidate.fingerprint === void 0 && candidate.label === normalizedLabel);
          if (legacy.length === 1) device = legacy[0];
        }
        if (device !== void 0) {
          device = Object.freeze({
            ...device,
            label: normalizedLabel,
            tokenDigest: digestHex(deviceToken),
            lastSeenAt: now,
            expiresAt: now + this.options.deviceTtlMs,
            ...fingerprint === void 0 ? {} : { fingerprint }
          });
        } else {
          if (retained.length >= this.options.maxDevices) throw new AccessError(409, "device_limit");
          device = Object.freeze({
            id: randomBytes(16).toString("hex"),
            label: normalizedLabel,
            tokenDigest: digestHex(deviceToken),
            createdAt: now,
            expiresAt: now + this.options.deviceTtlMs,
            lastSeenAt: now,
            ...this.options.pairingInstanceId === void 0 ? {} : { nativeInstanceId: this.options.pairingInstanceId },
            ...fingerprint === void 0 ? {} : { fingerprint }
          });
        }
        const next = [...retained.filter((candidate) => candidate.id !== device.id), device];
        await this.store.save(this.snapshot(next));
        this.devices = next;
        const session = this.createSession(device, now);
        return Object.freeze({
          ...session,
          deviceToken,
          deviceExpiresAt: device.expiresAt
        });
      });
    } finally {
      this.pairPending = false;
    }
  }
  /**
   * Открыто ли сейчас окно сопряжения.
   *
   * После успешного сопряжения gateway забирает окно; плагин, который держит
   * отображаемый код в кэше, должен узнать об этом и открыть новое окно, иначе
   * панель продолжает показывать уже недействительный QR до истечения TTL.
   *
   * @returns true, если одноразовое окно ещё действительно.
   */
  hasPairingWindow() {
    return this.pairingWindow !== void 0 && this.pairingWindow.expiresAt > this.now();
  }
  /** Exchange a valid persistent device credential for a new short Session. */
  async renew(deviceToken) {
    this.requireInitialized();
    return this.exclusive(async () => {
      const now = this.now();
      const device = this.requireDevice(deviceToken, now);
      const index = this.devices.indexOf(device);
      const updated = Object.freeze({ ...device, lastSeenAt: now });
      const next = [...this.devices];
      next[index] = updated;
      await this.store.save(this.snapshot(next));
      this.devices = next;
      return this.createSession(device, now);
    });
  }
  /** Validate a persistent device credential without consuming a Session slot. */
  async probe(deviceToken) {
    this.requireInitialized();
    return this.exclusive(async () => {
      const now = this.now();
      const device = this.requireDevice(deviceToken, now);
      const index = this.devices.indexOf(device);
      const updated = Object.freeze({ ...device, lastSeenAt: now });
      const next = [...this.devices];
      next[index] = updated;
      await this.store.save(this.snapshot(next));
      this.devices = next;
      return Object.freeze({ ...this.nativeIdentity(device), deviceId: device.id, deviceExpiresAt: device.expiresAt });
    });
  }
  /** Validate a device credential without writing state or opening a Session. */
  authorizeDevice(deviceToken) {
    this.requireInitialized();
    const device = this.requireDevice(deviceToken, this.now());
    return Object.freeze({ ...this.nativeIdentity(device), deviceId: device.id, deviceExpiresAt: device.expiresAt });
  }
  requireDevice(deviceToken, now) {
    if (deviceToken.length > 512) throw new AccessError(401, "authentication_failed");
    const tokenDigest = digest(deviceToken);
    const device = this.devices.find((candidate) => timingSafeEqual(Buffer.from(candidate.tokenDigest, "hex"), tokenDigest));
    if (device === void 0) throw new AccessError(401, "authentication_failed");
    if (device.revokedAt !== void 0) throw new AccessError(401, "device_revoked");
    if (device.expiresAt <= now) throw new AccessError(401, "device_expired");
    return device;
  }
  /** Resolve a short Session Cookie without revealing whether device or Session failed. */
  authorizeSession(sessionToken) {
    this.requireInitialized();
    if (sessionToken.length > 512) throw new AccessError(401, "authentication_failed");
    const now = this.now();
    this.pruneSessions(now);
    const key = digestHex(sessionToken);
    const session = this.sessions.get(key);
    const device = session === void 0 ? void 0 : this.devices.find((candidate) => candidate.id === session.deviceId);
    if (session === void 0 || device === void 0 || device.revokedAt !== void 0 || device.expiresAt <= now) {
      if (session !== void 0) this.removeSession(session.key, "expired");
      throw new AccessError(401, "authentication_failed");
    }
    return Object.freeze({ sessionKey: key, deviceId: session.deviceId, expiresAt: session.expiresAt });
  }
  /** Require the Session-bound anti-CSRF value for an authenticated mutation. */
  assertCsrf(authorization, csrfToken) {
    const session = this.sessions.get(authorization.sessionKey);
    if (session === void 0 || csrfToken === void 0 || csrfToken.length > 512 || !matchesDigest(csrfToken, session.csrfDigest)) {
      throw new AccessError(403, "forbidden");
    }
  }
  /** End one short Session and notify the gateway to abort its attached work. */
  logout(authorization) {
    this.removeSession(authorization.sessionKey, "logout");
  }
  /** Durably delete the device, then end every Session owned by that device. */
  async revokeDevice(deviceId) {
    this.requireInitialized();
    return this.exclusive(async () => {
      const next = this.devices.filter((device) => device.id !== deviceId);
      if (next.length === this.devices.length) return false;
      await this.store.save(this.snapshot(next));
      this.devices = next;
      for (const [key, session] of this.sessions) {
        if (session.deviceId === deviceId) this.removeSession(key, "revoked");
      }
      return true;
    });
  }
  /** Remove every persistent credential and terminate every active Session. */
  async resetDevices() {
    this.requireInitialized();
    await this.exclusive(async () => {
      await this.store.save(this.snapshot([]));
      this.devices = [];
      for (const key of [...this.sessions.keys()]) this.removeSession(key, "revoked");
      this.pairingWindow = void 0;
    });
  }
  /** Safe metadata for the loopback administration surface. */
  listDevices() {
    this.requireInitialized();
    return Object.freeze(this.devices.map(publicDevice));
  }
  /** Pairing status without exposing the one-time secret. */
  pairingStatus() {
    this.requireInitialized();
    const window = this.pairingWindow;
    if (window === void 0 || window.expiresAt <= this.now()) {
      this.pairingWindow = void 0;
      return Object.freeze({ open: false });
    }
    return Object.freeze({ open: true, expiresAt: window.expiresAt });
  }
  /** Subscribe gateway resources to Session logout, expiry, eviction, and device revocation. */
  onSessionEnded(listener) {
    this.sessionEndedListeners.add(listener);
    return () => {
      this.sessionEndedListeners.delete(listener);
    };
  }
  /** Stop new operations, drain durable mutations, then clear volatile credentials. */
  close() {
    if (this.closeTask !== void 0) return this.closeTask;
    this.closing = true;
    this.closeTask = this.finishClose();
    return this.closeTask;
  }
  async finishClose() {
    await this.mutation;
    this.pairingWindow = void 0;
    for (const key of [...this.sessions.keys()]) this.removeSession(key, "expired");
    this.sessionEndedListeners.clear();
    this.initialized = false;
  }
  /** Bounded volatile-state metrics for tests and local status. */
  metrics() {
    return Object.freeze({ sessions: this.sessions.size, rateLimitKeys: this.pairLimiter.size });
  }
};

// vendor/gateway/network.ts
function parseIpv4(address) {
  const parts = address.split(".");
  if (parts.length !== 4) throw new Error(`invalid IPv4 address ${JSON.stringify(address)}`);
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) throw new Error(`invalid IPv4 address ${JSON.stringify(address)}`);
    const octet = Number(part);
    if (octet > 255) throw new Error(`invalid IPv4 address ${JSON.stringify(address)}`);
    value = value << 8n | BigInt(octet);
  }
  return value;
}
function parseIpv6Part(part, address) {
  if (part.includes(".")) {
    const ipv4 = parseIpv4(part);
    return [Number(ipv4 >> 16n & 0xffffn), Number(ipv4 & 0xffffn)];
  }
  if (!/^[\da-f]{1,4}$/iu.test(part)) throw new Error(`invalid IPv6 address ${JSON.stringify(address)}`);
  return [Number.parseInt(part, 16)];
}
function parseIpv6(address) {
  const withoutZone = address.split("%", 1)[0] ?? address;
  if (withoutZone.split("::").length > 2) throw new Error(`invalid IPv6 address ${JSON.stringify(address)}`);
  const [leftText, rightText] = withoutZone.split("::");
  const left = leftText === "" ? [] : leftText.split(":").flatMap((part) => parseIpv6Part(part, address));
  const right = rightText === void 0 || rightText === "" ? [] : rightText.split(":").flatMap((part) => parseIpv6Part(part, address));
  const omitted = 8 - left.length - right.length;
  if (rightText === void 0 ? omitted !== 0 : omitted < 1) {
    throw new Error(`invalid IPv6 address ${JSON.stringify(address)}`);
  }
  const groups = [...left, ...Array.from({ length: omitted }, () => 0), ...right];
  if (groups.length !== 8) throw new Error(`invalid IPv6 address ${JSON.stringify(address)}`);
  return groups.reduce((value, group) => value << 16n | BigInt(group), 0n);
}
function mappedIpv4(address) {
  const match = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/iu.exec(address);
  return match?.[1];
}
function parseIp(address) {
  const unwrapped = address.startsWith("[") && address.endsWith("]") ? address.slice(1, -1) : address;
  const mapped = mappedIpv4(unwrapped);
  if (mapped !== void 0) return { bits: 32, value: parseIpv4(mapped) };
  const version = isIP(unwrapped.split("%", 1)[0] ?? unwrapped);
  if (version === 4) return { bits: 32, value: parseIpv4(unwrapped) };
  if (version === 6) return { bits: 128, value: parseIpv6(unwrapped) };
  throw new Error(`invalid IP address ${JSON.stringify(address)}`);
}
function parseCidr(source) {
  const slash = source.lastIndexOf("/");
  if (slash <= 0 || slash === source.length - 1) throw new Error(`invalid CIDR ${JSON.stringify(source)}`);
  const address = source.slice(0, slash);
  const parsed = parseIp(address);
  const prefixText = source.slice(slash + 1);
  if (!/^\d{1,3}$/u.test(prefixText)) throw new Error(`invalid CIDR ${JSON.stringify(source)}`);
  const prefix = Number(prefixText);
  if (prefix > parsed.bits) throw new Error(`invalid CIDR ${JSON.stringify(source)}`);
  const hostBits = BigInt(parsed.bits - prefix);
  const mask = hostBits === BigInt(parsed.bits) ? 0n : (1n << BigInt(parsed.bits)) - 1n ^ (1n << hostBits) - 1n;
  const network = parsed.value & mask;
  if (network !== parsed.value) {
    throw new Error(`CIDR ${JSON.stringify(source)} has host bits set`);
  }
  return Object.freeze({ bits: parsed.bits, network, prefix, source });
}
function addressAllowed(address, cidrs) {
  if (address === void 0) return false;
  let parsed;
  try {
    parsed = parseIp(address);
  } catch {
    return false;
  }
  return cidrs.some((cidr) => {
    if (cidr.bits !== parsed.bits) return false;
    const hostBits = BigInt(cidr.bits - cidr.prefix);
    const mask = hostBits === BigInt(cidr.bits) ? 0n : (1n << BigInt(cidr.bits)) - 1n ^ (1n << hostBits) - 1n;
    return (parsed.value & mask) === cidr.network;
  });
}
function isLoopbackAddress(address) {
  try {
    const parsed = parseIp(address);
    if (parsed.bits === 32) return parsed.value >> 24n === 127n;
    return parsed.value === 1n;
  } catch {
    return false;
  }
}
var NON_ROUTABLE_IPV4_RANGES = Object.freeze([
  [0x00000000n, 8],
  // "This network" / software scope
  [0x0a000000n, 8],
  // Private-Use (RFC 1918)
  [0x64400000n, 10],
  // Shared address space / CGNAT (RFC 6598)
  [0x7f000000n, 8],
  // Loopback (RFC 1122)
  [0xa9fe0000n, 16],
  // Link-local (RFC 3927)
  [0xac100000n, 12],
  // Private-Use (RFC 1918)
  [0xc0000000n, 24],
  // IETF protocol assignments (RFC 6890)
  [0xc0000200n, 24],
  // Documentation TEST-NET-1 (RFC 5737)
  [0xc01fc400n, 24],
  // AS112-v4 (RFC 7534)
  [0xc034c100n, 24],
  // AMT relay (RFC 7450)
  [0xc0586300n, 24],
  // 6to4 relay anycast, deprecated (RFC 7526)
  [0xc0a80000n, 16],
  // Private-Use (RFC 1918)
  [0xc0af3000n, 24],
  // Direct delegation AS112 (RFC 7535)
  [0xc6120000n, 15],
  // Benchmarking (RFC 2544)
  [0xc6336400n, 24],
  // Documentation TEST-NET-2 (RFC 5737)
  [0xcb007100n, 24],
  // Documentation TEST-NET-3 (RFC 5737)
  [0xe0000000n, 4],
  // Multicast (RFC 1112, incl. MCAST-TEST-NET)
  [0xf0000000n, 4]
  // Reserved for future use + broadcast (RFC 1112)
]);
function parseAuthority(source) {
  if (source.trim() !== source || source.length === 0 || /[/?#@\\]/u.test(source)) {
    throw new Error(`invalid public authority ${JSON.stringify(source)}`);
  }
  let url;
  try {
    url = new URL(`https://${source}`);
  } catch {
    throw new Error(`invalid public authority ${JSON.stringify(source)}`);
  }
  if (url.username !== "" || url.password !== "" || url.pathname !== "/" || url.search !== "" || url.hash !== "") {
    throw new Error(`invalid public authority ${JSON.stringify(source)}`);
  }
  const explicitPort = /\]:\d+$/u.test(source) || !source.startsWith("[") && /:\d+$/u.test(source);
  const hostname2 = url.hostname.toLowerCase();
  const port = explicitPort ? Number(url.port === "" ? 443 : url.port) : void 0;
  if (port !== void 0 && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error(`invalid public authority ${JSON.stringify(source)}`);
  }
  return port === void 0 ? Object.freeze({ hostname: hostname2 }) : Object.freeze({ hostname: hostname2, port });
}
function formatHostname(hostname2) {
  return hostname2.includes(":") && !hostname2.startsWith("[") ? `[${hostname2}]` : hostname2;
}
function resolveAuthority(spec, listenerPort) {
  return `${formatHostname(spec.hostname)}:${String(spec.port ?? listenerPort)}`;
}
var RequestTrustPolicy = class {
  constructor(specs, listenerPort, cidrs, tls) {
    this.cidrs = cidrs;
    this.scheme = tls ? "https" : "http";
    this.authorities = new Set(specs.map((spec) => resolveAuthority(spec, listenerPort).toLowerCase()));
    this.origins = new Set([...this.authorities].map(
      (authority) => new URL(`${this.scheme}://${authority}`).origin.toLowerCase()
    ));
  }
  cidrs;
  authorities;
  origins;
  scheme;
  /** Validate the exact Host header after WHATWG authority normalization. */
  acceptsHost(header) {
    return this.canonicalHost(header) !== void 0;
  }
  /** Return the canonical accepted Host authority, otherwise undefined. */
  canonicalHost(header) {
    if (header === void 0 || /[/?#@\\]/u.test(header)) return void 0;
    let normalized;
    try {
      const parsed = new URL(`${this.scheme}://${header}`);
      if (parsed.pathname !== "/" || parsed.username !== "" || parsed.password !== "") return void 0;
      normalized = resolveAuthority({
        hostname: parsed.hostname,
        port: Number(parsed.port || (this.scheme === "https" ? "443" : "80"))
      }, 80).toLowerCase();
    } catch {
      return void 0;
    }
    return this.authorities.has(normalized) ? normalized : void 0;
  }
  /** Validate an exact same-scheme browser Origin. */
  acceptsOrigin(header) {
    return this.canonicalOrigin(header) !== void 0;
  }
  /** Return the canonical accepted Origin, otherwise undefined. */
  canonicalOrigin(header) {
    if (header === void 0) return void 0;
    let normalized;
    for (const part of header.split(",")) {
      const trimmed = part.trim();
      if (trimmed === "undefined") continue;
      let candidate;
      try {
        const parsed = new URL(trimmed);
        if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "" || parsed.username !== "" || parsed.password !== "") {
          return void 0;
        }
        candidate = parsed.origin.toLowerCase();
      } catch {
        return void 0;
      }
      if (!this.origins.has(candidate) || normalized !== void 0) return void 0;
      normalized = candidate;
    }
    return normalized;
  }
};

// vendor/gateway/local-admin-host.ts
var DESKTOP_ADMIN_HEADER = "x-dsh-mobile-desktop-admin";
var DESKTOP_ADMIN_MARKER = "dsh-app://app";
function unwrapBrackets(hostname2) {
  return hostname2.startsWith("[") && hostname2.endsWith("]") ? hostname2.slice(1, -1) : hostname2;
}
function parseIpv42(hostname2) {
  const parts = hostname2.split(".");
  if (parts.length !== 4) return void 0;
  const octets = [];
  for (const part of parts) {
    if (!/^(?:0|[1-9]\d{0,2})$/u.test(part)) return void 0;
    const value = Number(part);
    if (value > 255) return void 0;
    octets.push(value);
  }
  return octets;
}
function isLoopbackIpv4(octets) {
  return octets[0] === 127;
}
function isPrivateIpv4(octets) {
  return octets[0] === 10 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 || octets[0] === 192 && octets[1] === 168;
}
function isLinkLocalIpv4(octets) {
  return octets[0] === 169 && octets[1] === 254;
}
function isLocalAdminHostname(hostname2) {
  const host = unwrapBrackets(hostname2).trim().toLowerCase();
  if (host === "localhost" || host === "::1") return true;
  const octets = parseIpv42(host);
  if (octets === void 0) return false;
  return isLoopbackIpv4(octets) || isPrivateIpv4(octets) || isLinkLocalIpv4(octets);
}

// vendor/gateway/http-security.ts
var DEVICE_COOKIE = "dsh_ma_device";
var SESSION_COOKIE = "dsh_ma_session";
var CSRF_COOKIE = "dsh_ma_csrf";
var CSRF_HEADER = "x-dsh-mobile-csrf";
var LOCAL_ADMIN_PREFIX = "/api/mobile-access";
var AUTH_PREFIX = "/mobile-access";
var WS_PATHS = /* @__PURE__ */ new Set([
  "/api/events.mux",
  "/api/events.host",
  "/api/remote.mux",
  // DSH desktop UI's sidebar terminal (renderer-v2) upgrades through this
  // exact path with a session query string; it is a first-party DSH surface.
  "/sidebar/ws/terminal"
]);
var HttpError = class extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
    this.name = "HttpError";
  }
  status;
  code;
};
function parseRequestTarget(raw) {
  if (raw === void 0 || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f\u007f]/u.test(raw)) {
    throw new HttpError(400, "bad_request");
  }
  let parsed;
  let decodedPathname;
  try {
    parsed = new URL(raw, "http://gateway.invalid");
    decodedPathname = decodeURIComponent(parsed.pathname);
  } catch {
    throw new HttpError(400, "bad_request");
  }
  if (decodedPathname.includes("\\") || decodedPathname.startsWith("//") || /[\u0000-\u001f\u007f]/u.test(decodedPathname)) {
    throw new HttpError(400, "bad_request");
  }
  return Object.freeze({ raw, pathname: parsed.pathname, decodedPathname, search: parsed.search });
}
var PROXIED_FRAME_SRC = "frame-src 'self' blob: https: http:";
function setSecurityHeaders(response, tls, framing = "gateway") {
  const proxied = framing === "proxied";
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    // A proxied GUI is frameable by ITS OWN origin only (its preview routes and
    // the sidebar's page routes); every third-party origin stays refused, so
    // clickjacking protection is unchanged for the gateway's own documents.
    proxied ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    // `frame-src` has no allow-by-default: the sidebar browser tab embeds
    // cross-origin pages, which only an explicit frame-src admits.
    ...proxied ? [PROXIED_FRAME_SRC] : []
  ].join("; "));
  const microphone = proxied ? "microphone=(self)" : "microphone=()";
  response.setHeader("Permissions-Policy", `camera=(), ${microphone}, geolocation=(), payment=(), usb=()`);
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", proxied ? "SAMEORIGIN" : "DENY");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (tls) response.setHeader("Strict-Transport-Security", "max-age=31536000");
}
function sendJson(response, status, value, tls) {
  if (response.headersSent || response.destroyed) return;
  setSecurityHeaders(response, tls);
  const body = `${JSON.stringify(value)}
`;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}
function sendFailure(response, status, code, tls) {
  sendJson(response, status, { error: code }, tls);
}
async function readJsonObject(request, maximumBytes) {
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new HttpError(415, "unsupported_media_type");
  const declared = request.headers["content-length"];
  if (declared !== void 0) {
    if (!/^\d+$/u.test(declared) || Number(declared) > maximumBytes) throw new HttpError(413, "payload_too_large");
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maximumBytes) throw new HttpError(413, "payload_too_large");
    chunks.push(buffer);
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "bad_request");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new HttpError(400, "bad_request");
  return parsed;
}
function cookie(name, value, options) {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${String(Math.max(0, Math.floor(options.maxAgeSeconds)))}`,
    "SameSite=Strict",
    "Priority=High"
  ];
  if (options.tls) parts.push("Secure");
  if (options.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}
function assertExternalTrust(request, policy, requireOrigin) {
  if (!addressAllowed(request.socket.remoteAddress, policy.cidrs) || !policy.acceptsHost(request.headers.host)) {
    throw new HttpError(403, "forbidden");
  }
  const origin = request.headers.origin;
  if (origin !== void 0 && !policy.acceptsOrigin(origin)) throw new HttpError(403, "forbidden");
  const site = request.headers["sec-fetch-site"];
  if (site !== void 0 && site !== "same-origin" && site !== "same-site" && site !== "cross-site" && site !== "none") throw new HttpError(403, "forbidden");
  const ours = (request.url ?? "").startsWith("/api/directoryPicker/");
  if (requireOrigin && !ours && !policy.acceptsOrigin(origin)) throw new HttpError(403, "forbidden");
}
function localAuthority(header) {
  if (header === void 0 || /[/?#@\\]/u.test(header)) return void 0;
  try {
    const url = new URL(`http://${header}`);
    if (url.pathname !== "/" || url.username !== "" || url.password !== "") return void 0;
    return { hostname: url.hostname, authority: url.host.toLowerCase() };
  } catch {
    return void 0;
  }
}
function assertLocalAdminTrust(request, requireBrowserOrigin, authenticateDesktop = () => false) {
  if (request.socket.remoteAddress === void 0 || !isLoopbackAddress(request.socket.remoteAddress)) {
    throw new HttpError(403, "forbidden");
  }
  const host = localAuthority(request.headers.host);
  if (host === void 0 || !isLocalAdminHostname(host.hostname)) {
    throw new HttpError(403, "forbidden");
  }
  const site = request.headers["sec-fetch-site"];
  if (site !== void 0 && site !== "same-origin" && site !== "none") throw new HttpError(403, "forbidden");
  const origin = request.headers.origin;
  if (origin !== void 0) {
    try {
      const parsed = new URL(origin);
      if (parsed.host.toLowerCase() !== host.authority || parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new HttpError(403, "forbidden");
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(403, "forbidden");
    }
  }
  const desktopForward = site === void 0 && request.headers[DESKTOP_ADMIN_HEADER] === DESKTOP_ADMIN_MARKER;
  if (requireBrowserOrigin && origin === void 0 && !(desktopForward && authenticateDesktop())) {
    throw new HttpError(403, "forbidden");
  }
  if (requireBrowserOrigin && site !== void 0 && site !== "same-origin") {
    throw new HttpError(403, "forbidden");
  }
}

// vendor/gateway/browser-auth-cookies.ts
var HOST_SESSION_COOKIE = "__Host-dsh_ma_session";
var HOST_CSRF_COOKIE = "__Host-dsh_ma_csrf";
var HOST_DEVICE_COOKIE = "__Host-dsh_ma_device_id";
var AUTH_COOKIE_NAMES = /* @__PURE__ */ new Set([
  SESSION_COOKIE,
  DEVICE_COOKIE,
  CSRF_COOKIE,
  HOST_SESSION_COOKIE,
  HOST_CSRF_COOKIE,
  HOST_DEVICE_COOKIE
]);
function browserAuthCookies(header) {
  if (header === void 0) return /* @__PURE__ */ new Map();
  if (header.length > 8192) throw new HttpError(401, "authentication_failed");
  const cookies = /* @__PURE__ */ new Map();
  for (const part of header.split(";")) {
    const equals = part.indexOf("=");
    if (equals <= 0) continue;
    const name = part.slice(0, equals).trim();
    if (!AUTH_COOKIE_NAMES.has(name)) continue;
    const values = cookies.get(name) ?? [];
    cookies.set(name, values);
    const value = part.slice(equals + 1).trim();
    if (!/^[\w\-.~+/=]{1,512}$/u.test(value) || values.includes(value)) continue;
    values.push(value);
  }
  return cookies;
}
function authenticatedCookie(values, authenticate, accepts = () => true) {
  let selected;
  for (const value of values) {
    let result;
    try {
      result = authenticate(value);
    } catch (error) {
      if (error instanceof AccessError && error.status === 401) continue;
      throw error;
    }
    if (!accepts(result)) continue;
    if (selected !== void 0) throw new HttpError(401, "authentication_failed");
    selected = { value, result };
  }
  if (selected === void 0) throw new HttpError(401, "authentication_failed");
  return selected;
}

// vendor/gateway/auth-failure-log.ts
var LOG_INTERVAL_MS = 3e4;
var MAX_LOGGED_ORIGIN_LENGTH = 512;
function requestPathCategory(path) {
  switch (path) {
    case "/":
    case "/index.html":
    case "/api/session/prompt":
    case "/api/events.mux":
    case "/api/events.host":
    case "/api/remote.mux":
    case "/mobile-access/compat.js":
    case "/mobile-access/mobile-layout.js":
    case "/mobile-access/custom.js":
    case "/mobile-access/custom.css":
    case "/mobile-access/client-modules":
    case "/mobile-access/events":
      return path;
    default:
      if (path.startsWith("/api/")) return "/api/*";
      if (path.startsWith("/mobile-access/extensions/")) return "/mobile-access/extensions/*";
      if (path.startsWith("/mobile-access/")) return "/mobile-access/*";
      return "/*";
  }
}
function requestMethod(method) {
  switch (method) {
    case "GET":
    case "HEAD":
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
    case "OPTIONS":
      return method;
    default:
      return "OTHER";
  }
}
function requestEntry(kind, status, request, path, canonicalOrigin, authorization) {
  let sessionCookie = false;
  let csrfCookies = 0;
  for (const cookie2 of (request.headers.cookie ?? "").split(";")) {
    const equals = cookie2.indexOf("=");
    if (equals < 0) continue;
    const name = cookie2.slice(0, equals).trim();
    if (name === SESSION_COOKIE || name === HOST_SESSION_COOKIE) sessionCookie = true;
    if (name === CSRF_COOKIE || name === HOST_CSRF_COOKIE) csrfCookies += 1;
  }
  const site = request.headers["sec-fetch-site"];
  return {
    kind,
    status,
    method: requestMethod(request.method),
    path: requestPathCategory(path),
    sessionCookie,
    csrfHeader: request.headers[CSRF_HEADER] !== void 0,
    csrfCookies,
    ...canonicalOrigin === void 0 || canonicalOrigin.length > MAX_LOGGED_ORIGIN_LENGTH ? {} : { origin: canonicalOrigin },
    ...site === "same-origin" || site === "same-site" || site === "cross-site" || site === "none" ? { site } : {},
    ...authorization === void 0 ? {} : { device: authorization.deviceId.slice(0, 8) }
  };
}
var AuthFailureRecorder = class {
  constructor(observe, now = () => performance.now(), reportObserverFailure = () => {
    process.emitWarning("Mobile access authentication diagnostics could not be recorded", { code: "DSH_MOBILE_AUTH_LOG_FAILED" });
  }) {
    this.observe = observe;
    this.now = now;
    this.reportObserverFailure = reportObserverFailure;
  }
  observe;
  now;
  reportObserverFailure;
  windows = {
    authorize: { nextLogAt: 0, suppressed: 0 },
    csrf: { nextLogAt: 0, suppressed: 0 }
  };
  observerFailureReported = false;
  /** Record a trusted-request rejection without changing its authentication result or retrying it. */
  record(kind, status, request, path, canonicalOrigin, authorization) {
    if (this.observe === void 0) return;
    const now = this.now();
    const window = this.windows[kind];
    if (now < window.nextLogAt) {
      window.suppressed = Math.min(Number.MAX_SAFE_INTEGER, window.suppressed + 1);
      return;
    }
    const suppressed = window.suppressed;
    window.nextLogAt = now + LOG_INTERVAL_MS;
    window.suppressed = 0;
    try {
      this.observe({
        ...requestEntry(kind, status, request, path, canonicalOrigin, authorization),
        ...suppressed === 0 ? {} : { suppressed }
      });
    } catch (observerError) {
      void observerError;
      if (this.observerFailureReported) return;
      this.observerFailureReported = true;
      try {
        this.reportObserverFailure();
      } catch (reporterError) {
        void reporterError;
      }
    }
  }
};

// vendor/gateway/http-cache.ts
var ENTITY_TAG = /^[\t ]*(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")[\t ]*$/u;
var ENTITY_TAG_LIST_ITEM = /(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"/gu;
function matchesIfNoneMatch(field, etag) {
  if (field === void 0) return false;
  const current = ENTITY_TAG.exec(etag)?.[1];
  if (current === void 0) return false;
  if (/^[\t ]*\*[\t ]*$/u.test(field)) return true;
  let cursor = 0;
  let count = 0;
  let matches = false;
  for (const item of field.matchAll(ENTITY_TAG_LIST_ITEM)) {
    const gap = field.slice(cursor, item.index);
    if (!(count === 0 ? /^[\t ,]*$/u : /^[\t ]*,[\t ,]*$/u).test(gap)) return false;
    const opaque = item[0].startsWith("W/") ? item[0].slice(2) : item[0];
    if (opaque === current) matches = true;
    cursor = item.index + item[0].length;
    count++;
  }
  return count > 0 && /^[\t ,]*$/u.test(field.slice(cursor)) && matches;
}
function weakenEntityTag(etag) {
  const opaque = etag === void 0 ? void 0 : ENTITY_TAG.exec(etag)?.[1];
  return opaque === void 0 ? void 0 : `W/${opaque}`;
}

// vendor/gateway/version.ts
import { createRequire } from "node:module";
var manifest = createRequire(import.meta.url)("../package.json");
var DSH_MOBILE_VERSION = typeof manifest.version === "string" ? manifest.version : "unknown";
var MINIMUM_ANDROID_APP_VERSION = "0.9.0-beta";
var MOBILE_METADATA_VERSION = 1;

// vendor/gateway/auth-pages.ts
var COPY = {
  en: {
    lang: "en",
    pairTitle: "Pair DSH mobile access",
    pairHeading: "Pair this device",
    pairingCode: "Pairing code",
    deviceName: "Device name",
    pair: "Pair",
    pairing: "Pairing\u2026",
    pairingCodeHint: "Use the 43-character pairing code shown on the computer. Keys starting with dsh1. or dsh2. are for the Android app.",
    invalidPairingCode: "Enter the 43-character pairing code from the current pairing window on the computer.",
    appKeyNotCode: "This is an Android app key. Use it in the app, or copy the browser pairing code from the computer.",
    pairFailed: "Pairing failed. Check the code or generate a new one on the computer.",
    pairingExpired: "The pairing code is invalid or has expired. Generate a new code on the computer and try again.",
    pairingLimited: "Too many pairing attempts. Wait a moment and try again.",
    deviceLimit: "The paired-device limit has been reached. Remove an unused device and generate a new pairing code on the computer.",
    unavailable: "The computer is unavailable. Check the connection and try again.",
    reconnectTitle: "Reconnect DSH mobile access",
    reconnectHeading: "Reconnect this device",
    restoring: "Restoring the secure Session\u2026",
    noLongerPaired: "This device is no longer paired. Open pairing on the computer, then pair it again.",
    openPairing: "Open pairing"
  },
  zh: {
    lang: "zh-CN",
    pairTitle: "\u914D\u5BF9 DSH \u79FB\u52A8\u8BBF\u95EE",
    pairHeading: "\u914D\u5BF9\u6B64\u8BBE\u5907",
    pairingCode: "\u914D\u5BF9\u7801",
    deviceName: "\u8BBE\u5907\u540D\u79F0",
    pair: "\u914D\u5BF9",
    pairing: "\u6B63\u5728\u914D\u5BF9\u2026",
    pairingCodeHint: "\u8BF7\u8F93\u5165\u7535\u8111\u7AEF\u663E\u793A\u7684 43 \u4F4D\u914D\u5BF9\u7801\u3002\u4EE5 dsh1. \u6216 dsh2. \u5F00\u5934\u7684\u5BC6\u94A5\u7528\u4E8E Android App\u3002",
    invalidPairingCode: "\u8BF7\u8F93\u5165\u7535\u8111\u7AEF\u5F53\u524D\u914D\u5BF9\u7A97\u53E3\u4E2D\u7684 43 \u4F4D\u914D\u5BF9\u7801\u3002",
    appKeyNotCode: "\u8FD9\u662F Android App \u5BC6\u94A5\u3002\u8BF7\u5728 App \u4E2D\u4F7F\u7528\uFF0C\u6216\u56DE\u5230\u7535\u8111\u7AEF\u590D\u5236\u6D4F\u89C8\u5668\u914D\u5BF9\u7801\u3002",
    pairFailed: "\u914D\u5BF9\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8F93\u5165\u6216\u5728\u7535\u8111\u7AEF\u91CD\u65B0\u751F\u6210\u914D\u5BF9\u7801\u3002",
    pairingExpired: "\u914D\u5BF9\u7801\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u7535\u8111\u7AEF\u91CD\u65B0\u751F\u6210\u540E\u91CD\u8BD5\u3002",
    pairingLimited: "\u914D\u5BF9\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002",
    deviceLimit: "\u5DF2\u8FBE\u5230\u914D\u5BF9\u8BBE\u5907\u4E0A\u9650\uFF0C\u8BF7\u5728\u7535\u8111\u7AEF\u79FB\u9664\u4E0D\u9700\u8981\u7684\u8BBE\u5907\u540E\u91CD\u65B0\u751F\u6210\u914D\u5BF9\u7801\u3002",
    unavailable: "\u7535\u8111\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
    reconnectTitle: "\u91CD\u65B0\u8FDE\u63A5 DSH \u79FB\u52A8\u8BBF\u95EE",
    reconnectHeading: "\u91CD\u65B0\u8FDE\u63A5\u6B64\u8BBE\u5907",
    restoring: "\u6B63\u5728\u6062\u590D\u5B89\u5168\u4F1A\u8BDD\u2026",
    noLongerPaired: "\u6B64\u8BBE\u5907\u5DF2\u4E0D\u5728\u914D\u5BF9\u5217\u8868\u4E2D\u3002\u8BF7\u5728\u7535\u8111\u7AEF\u6253\u5F00\u914D\u5BF9\uFF0C\u7136\u540E\u91CD\u65B0\u914D\u5BF9\u3002",
    openPairing: "\u6253\u5F00\u914D\u5BF9\u9875\u9762"
  },
  it: {
    lang: "it-IT",
    pairTitle: "Abbina accesso mobile DSH",
    pairHeading: "Abbina questo dispositivo",
    pairingCode: "Codice di abbinamento",
    deviceName: "Nome dispositivo",
    pair: "Abbina",
    pairing: "Abbinamento\u2026",
    pairingCodeHint: "Usa il codice di abbinamento di 43 caratteri mostrato sul computer. Le chiavi che iniziano con dsh1. o dsh2. sono per l\u2019app Android.",
    invalidPairingCode: "Inserisci il codice di 43 caratteri dalla finestra di abbinamento attuale sul computer.",
    appKeyNotCode: "Questa \xE8 una chiave per l\u2019app Android. Usala nell\u2019app oppure copia il codice di abbinamento per il browser dal computer.",
    pairFailed: "Abbinamento non riuscito. Controlla il codice o generane uno nuovo sul computer.",
    pairingExpired: "Il codice non \xE8 valido o \xE8 scaduto. Genera un nuovo codice sul computer e riprova.",
    pairingLimited: "Troppi tentativi di abbinamento. Attendi un momento e riprova.",
    deviceLimit: "\xC8 stato raggiunto il limite di dispositivi abbinati. Rimuovi un dispositivo inutilizzato e genera un nuovo codice sul computer.",
    unavailable: "Il computer non \xE8 disponibile. Controlla la connessione e riprova.",
    reconnectTitle: "Riconnetti accesso mobile DSH",
    reconnectHeading: "Riconnetti questo dispositivo",
    restoring: "Ripristino della sessione sicura\u2026",
    noLongerPaired: "Questo dispositivo non \xE8 pi\xF9 abbinato. Apri l\u2019abbinamento sul computer e ripeti la procedura.",
    openPairing: "Apri abbinamento"
  }
};
function resolveAuthPageLocale(header) {
  const values = header?.split(",").map((value, index) => {
    const [language2, ...parameters] = value.split(";");
    const quality = parameters.find((parameter) => parameter.trim().toLowerCase().startsWith("q="));
    const parsedQuality = quality === void 0 ? 1 : Number(quality.trim().slice(2));
    return {
      language: language2?.trim().toLowerCase() ?? "",
      quality: Number.isFinite(parsedQuality) ? Math.max(0, Math.min(1, parsedQuality)) : 0,
      index
    };
  }).filter((value) => value.quality > 0).sort((left, right) => right.quality - left.quality || left.index - right.index).map((value) => value.language) ?? [];
  for (const value of values) {
    if (value.startsWith("zh")) return "zh";
    if (value.startsWith("it")) return "it";
    if (value.startsWith("en")) return "en";
  }
  return "en";
}
function renderPairPage(locale) {
  const copy = COPY[locale];
  return `<!doctype html>
<html lang="${copy.lang}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>input,textarea{font-size:16px}</style>
<title>${copy.pairTitle}</title>
<main>
  <h1>${copy.pairHeading}</h1>
  <form id="pair-form">
    <label>${copy.pairingCode} <input id="pair-token" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" aria-describedby="pair-token-hint pair-status" required></label>
    <p id="pair-token-hint">${copy.pairingCodeHint}</p>
    <label>${copy.deviceName} <input id="device-label" maxlength="64" autocomplete="off"></label>
    <button type="submit">${copy.pair}</button>
    <output id="pair-status" aria-live="polite"></output>
  </form>
</main>
<script src="/mobile-access/pair.js" defer></script>
</html>
`;
}
function renderPairScript(locale) {
  const copy = COPY[locale];
  return `(() => {
  const form = document.getElementById('pair-form')
  const token = document.getElementById('pair-token')
  const label = document.getElementById('device-label')
  const status = document.getElementById('pair-status')
  const submit = form.querySelector('button[type="submit"]')
  let submitting = false
  const fragment = new URLSearchParams(location.hash.slice(1))
  const supplied = fragment.get('token')
  history.replaceState(null, '', location.pathname)
  if (supplied) token.value = supplied
  token.addEventListener('input', () => {
    token.removeAttribute('aria-invalid')
    if (!submitting) status.value = ''
  })
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submitting) return
    const code = token.value.trim()
    token.removeAttribute('aria-invalid')
    if (/^dsh[12]\\./u.test(code) || !/^[A-Za-z0-9_-]{43}$/u.test(code)) {
      status.value = /^dsh[12]\\./u.test(code)
        ? ${JSON.stringify(copy.appKeyNotCode)} : ${JSON.stringify(copy.invalidPairingCode)}
      token.setAttribute('aria-invalid', 'true')
      token.focus()
      return
    }
    submitting = true
    submit.disabled = true
    status.value = ${JSON.stringify(copy.pairing)}
    try {
      const response = await fetch('/mobile-access/auth/pair', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: code, label: label.value || undefined }),
      })
      if (!response.ok) {
        if (token.value.trim() !== code) { status.value = ''; return }
        status.value = response.status === 401 ? ${JSON.stringify(copy.pairingExpired)}
          : response.status === 429 ? ${JSON.stringify(copy.pairingLimited)}
          : response.status === 409 ? ${JSON.stringify(copy.deviceLimit)}
          : response.status >= 500 ? ${JSON.stringify(copy.unavailable)}
          : ${JSON.stringify(copy.pairFailed)}
        if (response.status === 401) token.setAttribute('aria-invalid', 'true')
        return
      }
      location.replace('/')
    } catch {
      status.value = token.value.trim() === code ? ${JSON.stringify(copy.unavailable)} : ''
    } finally {
      submitting = false
      submit.disabled = false
    }
  })
})()
`;
}
function renderLoginPage(locale) {
  const copy = COPY[locale];
  return `<!doctype html>
<html lang="${copy.lang}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${copy.reconnectTitle}</title>
<main>
  <h1>${copy.reconnectHeading}</h1>
  <p id="login-progress" aria-live="polite">${copy.restoring}</p>
  <section id="login-failed" hidden>
    <p>${copy.noLongerPaired}</p>
    <a href="/mobile-access/pair">${copy.openPairing}</a>
  </section>
</main>
<script src="/mobile-access/login.js" defer></script>
</html>
`;
}
function renderLoginScript(locale) {
  const copy = COPY[locale];
  return `(() => {
  const candidate = new URL(location.href).searchParams.get('return')
  let returnPath = '/'
  if (candidate && candidate.startsWith('/')) {
    try {
      const resolved = new URL(candidate, location.origin)
      const pathname = decodeURIComponent(resolved.pathname)
      if (resolved.origin === location.origin && pathname !== '/mobile-access'
        && !pathname.startsWith('/mobile-access/') && !pathname.includes('\\\\')) {
        returnPath = resolved.pathname + resolved.search + resolved.hash
      }
    } catch {
      // Malformed untrusted return targets keep the safe root default.
    }
  }
  fetch('/mobile-access/auth/renew', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }).then((response) => {
    if (response.ok) {
      location.replace(returnPath)
      return
    }
    document.getElementById('login-progress').hidden = true
    document.getElementById('login-failed').hidden = false
  }).catch(() => {
    document.getElementById('login-progress').textContent = ${JSON.stringify(copy.unavailable)}
  })
})()
`;
}

// vendor/gateway/gateway.ts
var MAX_CONTROL_BODY_BYTES = 16 * 1024;
var MAX_HEADER_BYTES = 16 * 1024;
var DISCOVERY_QUERY = Buffer.from("DSH_MOBILE_DISCOVER_V1", "ascii");
var DISCOVERY_PROTOCOL = 1;
var DISCOVERY_INTERVAL_MS = 3e3;
var MDNS_SERVICE_TYPE = "dsh-mobile";
var MOBILE_LAYOUT_MODULE = "@deepseek-ai/dsh-client-ui-layout";
var MOBILE_LAYOUT_PATH = `${AUTH_PREFIX}/mobile-layout.js`;
var MOBILE_BOOT_BATCH_PREFIX = `${AUTH_PREFIX}/mobile-boot/`;
var MAX_MOBILE_BOOT_BATCH_BYTES = 32 * 1024 * 1024;
var MAX_MOBILE_BOOT_ENTRY_BYTES = 8 * 1024 * 1024;
var MOBILE_BOOT_CHUNK_BYTES = 16 * 1024 * 1024;
var MOBILE_BOOT_SEPARATOR_BYTES = 3;
var MOBILE_BOOT_SIZE_CACHE_TTL_MS = 3e4;
var MOBILE_BOOT_SIZE_PROBE_HEADER = "x-dsh-mobile-size-probe";
var MAX_MOBILE_BOOT_BATCHES = 8;
var MOBILE_BOOT_UPSTREAM_ATTEMPTS = 4;
var MOBILE_BOOT_RETRY_DELAY_MS = 150;
function upstreamPluginBundleUrl(source, upstreamOrigin) {
  if (!source.startsWith("/plugins/") && !source.startsWith("plugins/") || source.includes("#")) return void 0;
  try {
    const target = new URL(source, new URL("/", upstreamOrigin));
    if (target.origin !== upstreamOrigin.origin || !target.pathname.startsWith("/plugins/")) return void 0;
    return target;
  } catch {
    return void 0;
  }
}
var TRANSIENT_UPSTREAM_ERROR_CODES = /* @__PURE__ */ new Set([
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETDOWN",
  "ENETRESET",
  "ENETUNREACH",
  "ETIMEDOUT",
  "ERR_STREAM_PREMATURE_CLOSE"
]);
var UPSTREAM_AUTH_REFRESH_MARGIN_MS = 6e4;
var UPSTREAM_COOKIE_PAIR = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+=[\x21-\x3A\x3C-\x7E]*$/u;
var CUSTOM_STYLE_FALLBACK = "/* Add mobile overrides in the DSH home mobile-access/mobile.css file. */\n";
var CUSTOM_SCRIPT_FALLBACK = "window.dshMobile?.register(() => undefined)\n";
var EXTENSION_CHANGE_POLL_MS = 2e3;
var EXTENSION_EVENT_HEARTBEAT_MS = 15e3;
var MOBILE_CLIENT_MODULE = "dsh-mobile";
var CONNECTION_MODULE = "@deepseek-ai/dsh-client-connection";
var RUNTIME_MODULE = "@deepseek-ai/dsh-client-runtime";
var RENDERER_MODULE = "@deepseek-ai/dsh-client-ui-renderer";
var SIDEBAR_MODULE = "@deepseek-ai/dsh-client-ui-sidebar";
var SETTINGS_MODULE = "@deepseek-ai/dsh-client-ui-settings";
var API_GATEWAY_MODULE = "@deepseek-ai/dsh-api-gateway";
var API_REMOTES_MODULE = "@deepseek-ai/dsh-api-remotes";
var MOBILE_BOOT_CORE_MODULES = /* @__PURE__ */ new Set([
  MOBILE_CLIENT_MODULE,
  MOBILE_LAYOUT_MODULE,
  CONNECTION_MODULE,
  RUNTIME_MODULE,
  RENDERER_MODULE,
  SIDEBAR_MODULE,
  SETTINGS_MODULE,
  API_GATEWAY_MODULE,
  API_REMOTES_MODULE
]);
var MOBILE_LAYOUT_DEPENDENCY_PROFILES = Object.freeze([
  Object.freeze({
    slots: RUNTIME_MODULE,
    dependencies: Object.freeze([RUNTIME_MODULE, "@deepseek-ai/dsh-client-ui-theme"])
  }),
  Object.freeze({
    slots: RENDERER_MODULE,
    dependencies: Object.freeze([
      "@deepseek-ai/dsh-client-locale",
      RENDERER_MODULE,
      "@deepseek-ai/dsh-client-ui-session",
      "@deepseek-ai/dsh-client-ui-theme"
    ])
  })
]);
function mobileCsrfFetchBootstrap(cookieName) {
  return `(()=>{const nativeFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const source=input instanceof Request?input:undefined;const method=String(init?.method??source?.method??'GET').toUpperCase();if(method==='GET'||method==='HEAD')return nativeFetch(input,init);const raw=typeof input==='string'?input:input instanceof URL?input.href:source?.url;if(raw===undefined||new URL(raw,location.href).origin!==location.origin)return nativeFetch(input,init);const headers=new Headers(init?.headers??source?.headers);if(!headers.has(${JSON.stringify(CSRF_HEADER)})){const prefix=${JSON.stringify(`${cookieName}=`)};const values=[...new Set(document.cookie.split(';').map(value=>value.trim()).filter(value=>value.startsWith(prefix)).map(value=>value.slice(prefix.length)))];if(values.length===1)headers.set(${JSON.stringify(CSRF_HEADER)},values[0])}return nativeFetch(input,{...init,headers})};})();`;
}
var MOBILE_AUTHENTICATED_TRANSPORT_BOOTSTRAP = `(()=>{if(window.__DSH_TRANSPORT__!==undefined)throw new Error('DSH Mobile cannot replace an existing transport override');window.__DSH_TRANSPORT__={fetch:(input,init)=>window.fetch(input,init),ownsHost:true},window.__DSH_FILE_UPLOAD__={fetch:(input,init)=>window.fetch(input,init)}})();`;
var MOBILE_GATEWAY_REACHABILITY_BOOTSTRAP = `(()=>{
  const view=globalThis;
  const port=view.navigator;
  const nativeFetch=typeof view.fetch==='function'?view.fetch.bind(view):undefined;
  let reachable=true;
  let checking=false;
  let replaying=false;
  let disposed=false;
  let epoch=0;
  let retryTimer;
  let activeController;
  const clearRetry=()=>{if(retryTimer!==undefined){view.clearTimeout(retryTimer);retryTimer=undefined}};
  const scheduleRetry=()=>{if(!disposed&&!reachable&&retryTimer===undefined){retryTimer=view.setTimeout(()=>{retryTimer=undefined;check()},5000)}};
  const check=()=>{
    if(checking||disposed||nativeFetch===undefined)return;
    checking=true;
    const current=++epoch;
    const controller=new AbortController();
    activeController=controller;
    const timer=view.setTimeout(()=>controller.abort(),2000);
    void nativeFetch('/mobile-access/health',{cache:'no-store',credentials:'same-origin',signal:controller.signal})
      .then(response=>response.ok,()=>false)
      .then(ok=>{
        if(disposed||current!==epoch)return;
        if(ok){
          const wasOffline=!reachable;
          reachable=true;
          clearRetry();
          if(wasOffline)view.dispatchEvent(new Event('online'));
          return;
        }
        const wasOnline=reachable;
        reachable=false;
        if(wasOnline){
          replaying=true;
          try{view.dispatchEvent(new Event('offline'))}finally{replaying=false}
        }
        scheduleRetry();
      })
      .finally(()=>{view.clearTimeout(timer);activeController=undefined;checking=false});
  };
  if(port!==undefined&&typeof Object.defineProperty==='function'){
    try{Object.defineProperty(port,'onLine',{configurable:true,get:()=>reachable})}catch{/* A frozen navigator retains its native value. */}
  }
  if(typeof view.addEventListener==='function'){
    view.addEventListener('offline',event=>{if(replaying||nativeFetch===undefined)return;event.stopImmediatePropagation();check()},true);
    view.addEventListener('online',()=>{++epoch;reachable=true;clearRetry()},true);
    view.addEventListener('pagehide',()=>{disposed=true;++epoch;clearRetry();activeController?.abort()},true);
  }
})();`;
var gzipBuffer = promisify(gzip);
function ensureMobileViewport(html) {
  const viewport = /<meta\b(?=[^>]*\bname\s*=\s*["']viewport["'])[^>]*>/iu;
  const match = viewport.exec(html);
  if (match === null) {
    const head = /<head\b[^>]*>/iu.exec(html);
    if (head?.index === void 0) return html;
    const position = head.index + head[0].length;
    return `${html.slice(0, position)}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${html.slice(position)}`;
  }
  if (/\bviewport-fit\s*=\s*cover\b/iu.test(match[0])) return html;
  const content = /\bcontent\s*=\s*(["'])(.*?)\1/iu;
  const next = content.test(match[0]) ? match[0].replace(content, (_whole, quote, value) => `content=${quote}${value},viewport-fit=cover${quote}`) : match[0].replace(/\s*\/?>$/u, ' content="width=device-width,initial-scale=1,viewport-fit=cover">');
  return `${html.slice(0, match.index)}${next}${html.slice(match.index + match[0].length)}`;
}
function orderAuthenticatedSettings(entries, slotsProvider) {
  const mobile = entries.filter((entry) => entry !== null && typeof entry === "object" && entry.id === MOBILE_CLIENT_MODULE);
  const settings = entries.filter((entry) => entry !== null && typeof entry === "object" && entry.id === SETTINGS_MODULE);
  if (mobile.length === 0 || settings.length === 0) return false;
  if (mobile.length !== 1 || settings.length !== 1) throw new Error("upstream DSH mobile settings graph is ambiguous");
  if (!Array.isArray(mobile[0]?.inject) || !mobile[0].inject.includes(CONNECTION_MODULE) || !mobile[0].inject.includes(SIDEBAR_MODULE)) {
    throw new Error("dsh-mobile client has unsupported dependencies");
  }
  if (!Array.isArray(settings[0]?.inject)) {
    throw new Error("upstream DSH settings module has unsupported dependencies");
  }
  const remoteSettings = !settings[0].inject.includes(CONNECTION_MODULE);
  if (remoteSettings) {
    if (!settings[0].inject.includes(API_REMOTES_MODULE) || slotsProvider !== RENDERER_MODULE) {
      throw new Error("upstream DSH settings module has unsupported dependencies");
    }
    const remotes = entries.filter((entry) => entry !== null && typeof entry === "object" && entry.id === API_REMOTES_MODULE);
    const gateway = entries.filter((entry) => entry !== null && typeof entry === "object" && entry.id === API_GATEWAY_MODULE);
    if (remotes.length !== 1 || !Array.isArray(remotes[0]?.inject) || !remotes[0].inject.includes(API_GATEWAY_MODULE) || gateway.length !== 1 || !Array.isArray(gateway[0]?.inject) || !gateway[0].inject.includes(CONNECTION_MODULE)) {
      throw new Error("upstream DSH settings Remote graph has unsupported dependencies");
    }
    if (!gateway[0].inject.includes(MOBILE_CLIENT_MODULE)) gateway[0].inject = [...gateway[0].inject, MOBILE_CLIENT_MODULE];
  }
  mobile[0].inject = [CONNECTION_MODULE, slotsProvider];
  if (!settings[0].inject.includes(MOBILE_CLIENT_MODULE)) settings[0].inject = [...settings[0].inject, MOBILE_CLIENT_MODULE];
  return remoteSettings;
}
function revisionedMobileBatchPath(entries) {
  const key = createHash2("sha256").update(DSH_MOBILE_VERSION).update(JSON.stringify(entries)).digest("hex");
  return { key, path: `${MOBILE_BOOT_BATCH_PREFIX}${key}.js` };
}
var ExcludedClientModulesError = class extends Error {
  constructor(message) {
    super(`excludedClientModules: ${message}`);
  }
};
var ClientModuleConflictError = class extends HttpError {
  detail;
  constructor(detail) {
    super(409, "excluded_client_modules_invalid");
    this.detail = detail.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/(?:https?:\/\/|[a-z]:[\\/])\S+/giu, "[redacted]").slice(0, 512);
  }
};
function requiredClientModule(entry, phase) {
  return MOBILE_BOOT_CORE_MODULES.has(entry.id) || entry.immediately === true || phase !== "application";
}
function clientModuleDependencies(entry) {
  const dependencies = /* @__PURE__ */ new Set();
  for (const [field, edges] of [["inject", entry.inject], ["external", entry.external]]) {
    if (edges !== void 0 && (!Array.isArray(edges) || edges.some((id) => typeof id !== "string"))) {
      throw new ExcludedClientModulesError(`upstream module ${entry.id} has malformed ${field} dependencies`);
    }
    for (const dependency of edges ?? []) dependencies.add(dependency.endsWith("/client") ? dependency.slice(0, -"/client".length) : dependency);
  }
  return Object.freeze([...dependencies]);
}
function clientModulePhases(entries, batches) {
  const phases = /* @__PURE__ */ new Map();
  for (const batch of batches) {
    for (const id of batch.entries) {
      if (phases.has(id)) throw new ExcludedClientModulesError(`upstream module ${id} belongs to multiple batches`);
      phases.set(id, batch.phase);
    }
  }
  for (const entry of entries) {
    if (!phases.has(entry.id)) throw new ExcludedClientModulesError(`upstream module ${entry.id} belongs to no batch`);
  }
  return phases;
}
function describeMobileClientModules(html) {
  const plan = parseMobileBootPlan(html);
  const ids = new Set(plan.entries.map((entry) => entry.id));
  const phases = plan.batches === void 0 ? /* @__PURE__ */ new Map() : clientModulePhases(plan.entries, plan.batches);
  return Object.freeze(plan.entries.map((entry) => Object.freeze({
    id: entry.id,
    required: requiredClientModule(entry, phases.get(entry.id)),
    dependencies: Object.freeze(clientModuleDependencies(entry).filter((id) => ids.has(id)))
  })));
}
function excludeMobileBootEntries(entries, batches, excludedIds) {
  if (excludedIds.length === 0) return;
  const excluded = new Set(excludedIds);
  if (excluded.size !== excludedIds.length) throw new ExcludedClientModulesError("duplicate module ids");
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const phases = clientModulePhases(entries, batches);
  for (const id of excluded) {
    const entry = byId.get(id);
    if (entry === void 0) throw new ExcludedClientModulesError(`module ${id} is not installed in this DSH client graph`);
    if (requiredClientModule(entry, phases.get(id))) {
      throw new ExcludedClientModulesError(`module ${id} is required for mobile boot or belongs to a bootstrap batch`);
    }
  }
  for (const entry of entries) {
    if (excluded.has(entry.id)) continue;
    for (const packageId of clientModuleDependencies(entry)) {
      if (excluded.has(packageId)) {
        throw new ExcludedClientModulesError(`module ${entry.id} still depends on excluded module ${packageId}; exclude the dependent too or keep ${packageId}`);
      }
    }
  }
  entries.splice(0, entries.length, ...entries.filter((entry) => !excluded.has(entry.id)));
  for (const batch of batches) batch.entries = batch.entries.filter((id) => !excluded.has(id));
  batches.splice(0, batches.length, ...batches.filter((batch) => batch.entries.length > 0));
}
function parseMobileBootPlan(html, excludedClientModules2 = []) {
  const assignment = /(?:window\.__DSH_BOOT__|globalThis\["__DSH_BOOT__"\])\s*=\s*/u.exec(html);
  if (assignment?.index === void 0) throw new Error("upstream DSH index has no boot manifest");
  const replaceStart = assignment.index;
  const valueStart = replaceStart + assignment[0].length;
  const scriptEnd = html.indexOf("</script>", valueStart);
  if (scriptEnd < 0) throw new Error("upstream DSH boot manifest script is incomplete");
  const source = html.slice(valueStart, scriptEnd).trim().replace(/;$/u, "");
  const parsed = JSON.parse(source);
  if (typeof parsed.rev !== "string" || !Array.isArray(parsed.entries)) {
    throw new Error("upstream DSH boot manifest is malformed");
  }
  const entries = parsed.entries;
  const layout = entries.filter((entry) => entry !== null && typeof entry === "object" && entry.id === MOBILE_LAYOUT_MODULE);
  if (layout.length !== 1 || typeof layout[0]?.url !== "string" || typeof layout[0].rev !== "string") {
    throw new Error("upstream DSH boot manifest has no unique layout module");
  }
  if (!Array.isArray(layout[0].inject)) {
    throw new Error("upstream DSH layout module has unsupported dependencies");
  }
  const dependencyProfile = MOBILE_LAYOUT_DEPENDENCY_PROFILES.find((profile) => profile.dependencies.every((dependency) => layout[0]?.inject?.includes(dependency)));
  if (dependencyProfile === void 0) throw new Error("upstream DSH layout module has unsupported dependencies");
  layout[0].url = MOBILE_LAYOUT_PATH;
  layout[0].rev = `dsh-mobile-layout-${DSH_MOBILE_VERSION}`;
  const parsedBatches = parsed.batches;
  if (parsedBatches === void 0) {
    if (excludedClientModules2.length > 0) {
      throw new ExcludedClientModulesError("this DSH version has no batched boot manifest; disable exclusions or update DSH");
    }
    return Object.freeze({
      parsed,
      entries,
      slotProvider: dependencyProfile.slots,
      assignment: assignment[0],
      replaceStart,
      replaceEnd: scriptEnd
    });
  }
  if (!Array.isArray(parsedBatches)) throw new Error("upstream DSH boot manifest batches are malformed");
  const batches = parsedBatches;
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  if (entryById.size !== entries.length) throw new Error("upstream DSH boot manifest has duplicate entries");
  const layoutBatches = [];
  for (const batch of batches) {
    if (batch === null || typeof batch !== "object" || batch.phase !== "bootstrap" && batch.phase !== "application" || typeof batch.url !== "string" || typeof batch.rev !== "string" || !Array.isArray(batch.entries) || batch.entries.length === 0 || batch.entries.some((id) => typeof id !== "string" || !entryById.has(id))) {
      throw new Error("upstream DSH boot manifest batches are malformed");
    }
    if (batch.entries.includes(MOBILE_LAYOUT_MODULE)) layoutBatches.push(batch);
  }
  if (layoutBatches.length !== 1 || layoutBatches[0]?.phase !== "application") {
    throw new Error("upstream DSH boot manifest has no unique application layout batch");
  }
  const layoutBatch = layoutBatches[0];
  const originalApplicationBatches = batches.filter((batch) => batch.phase === "application").map((batch) => ({ ...batch, entries: [...batch.entries] }));
  excludeMobileBootEntries(entries, batches, excludedClientModules2);
  const affectedBatchUrls = new Set(originalApplicationBatches.filter((batch) => batch.entries.some((id) => excludedClientModules2.includes(id))).map((batch) => batch.url));
  const rewrittenBatchEntries = batches.filter((batch) => batch === layoutBatch || batch.phase === "application" && affectedBatchUrls.has(batch.url)).map((batch) => ({
    batch,
    entries: [...batch.entries].sort((left, right) => left < right ? -1 : left > right ? 1 : 0).map((id) => {
      const entry = entryById.get(id);
      if (entry === void 0 || typeof entry.url !== "string" || typeof entry.rev !== "string") {
        throw new Error("upstream DSH boot manifest batches are malformed");
      }
      return Object.freeze({ id, url: entry.url, rev: entry.rev });
    })
  }));
  const planEntries = rewrittenBatchEntries.find((candidate) => candidate.batch === layoutBatch)?.entries;
  if (planEntries === void 0) throw new Error("upstream DSH boot manifest lost the application layout batch");
  return Object.freeze({
    parsed,
    entries,
    batches,
    slotProvider: dependencyProfile.slots,
    assignment: assignment[0],
    replaceStart,
    replaceEnd: scriptEnd,
    layoutBatch,
    planEntries,
    originalApplicationBatches,
    rewrittenBatchEntries
  });
}
function splitMobileBootBatch(entries, sizes, passThrough) {
  const rows = [];
  const plans = [];
  let chunk;
  const flush = () => {
    if (chunk === void 0 || chunk.entries.length === 0) return;
    const revision = revisionedMobileBatchPath(chunk.entries);
    rows.push({ phase: "application", url: revision.path, rev: revision.key, entries: chunk.ids });
    plans.push(Object.freeze({ key: revision.key, path: revision.path, entries: Object.freeze(chunk.entries) }));
    chunk = void 0;
  };
  for (const entry of entries) {
    const size = sizes.get(entry.url);
    const oversized = passThrough.has(entry.url) || size !== void 0 && size >= MAX_MOBILE_BOOT_ENTRY_BYTES;
    if (oversized && entry.id !== MOBILE_LAYOUT_MODULE) {
      rows.push({ phase: "application", url: entry.url, rev: entry.rev, entries: [entry.id] });
      continue;
    }
    const bytes = (size ?? 0) + MOBILE_BOOT_SEPARATOR_BYTES;
    if (chunk !== void 0 && chunk.entries.length > 0 && chunk.bytes + bytes > MOBILE_BOOT_CHUNK_BYTES) flush();
    chunk ??= { ids: [], entries: [], bytes: 0 };
    chunk.ids.push(entry.id);
    chunk.entries.push(entry);
    chunk.bytes += bytes;
  }
  flush();
  return { plans, rows };
}
function escapeMobilePreloadAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function mobileApplicationPreload(url) {
  return `<link rel="preload" as="script" href="${escapeMobilePreloadAttribute(url)}">`;
}
function preloadAttribute(tag, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu").exec(tag);
  return match?.[1] ?? match?.[2];
}
function rewriteMobileApplicationPreloads(html, replacements) {
  if (replacements.size === 0) return html;
  const escaped = new Map([...replacements].map(([url, markup]) => [escapeMobilePreloadAttribute(url), markup]));
  return html.replace(/<link\b[^>]*>/giu, (tag) => {
    const rel = preloadAttribute(tag, "rel");
    if (!rel?.split(/\s+/u).includes("preload") || preloadAttribute(tag, "as") !== "script") return tag;
    return escaped.get(preloadAttribute(tag, "href") ?? "") ?? tag;
  });
}
function rewriteMobileIndexWithBatch(html, options = {}) {
  const plan = parseMobileBootPlan(html, options.excludedClientModules);
  const remoteSettings = orderAuthenticatedSettings(plan.entries, plan.slotProvider);
  let batches = [];
  let preloadReplacements = /* @__PURE__ */ new Map();
  if (plan.batches !== void 0 && plan.rewrittenBatchEntries !== void 0) {
    const rewrites = plan.rewrittenBatchEntries.map(({ batch, entries }) => ({
      batch,
      split: splitMobileBootBatch(entries, options.sizes ?? /* @__PURE__ */ new Map(), options.passThrough ?? /* @__PURE__ */ new Set())
    }));
    if (rewrites.reduce((count, item) => count + item.split.plans.length, 0) > MAX_MOBILE_BOOT_BATCHES) {
      throw new Error(`upstream DSH mobile boot requires more than ${String(MAX_MOBILE_BOOT_BATCHES)} merged batches`);
    }
    for (const { batch, split } of rewrites) {
      const at = plan.batches.indexOf(batch);
      if (at < 0) throw new Error("upstream DSH boot manifest lost an application batch");
      plan.batches.splice(at, 1, ...split.rows);
      batches = [...batches, ...split.plans];
    }
    for (const original of plan.originalApplicationBatches ?? []) {
      const replacement2 = rewrites.find((item) => item.batch.url === original.url);
      preloadReplacements.set(
        original.url,
        replacement2 === void 0 ? plan.batches.some((batch) => batch.url === original.url) ? mobileApplicationPreload(original.url) : "" : replacement2.split.rows.map((row) => mobileApplicationPreload(row.url)).join("")
      );
    }
    batches = Object.freeze(batches);
    plan.parsed.rev = createHash2("sha256").update(JSON.stringify({ entries: plan.entries, batches: plan.batches })).digest("hex").slice(0, 16);
  }
  const transportBootstrap = remoteSettings ? MOBILE_AUTHENTICATED_TRANSPORT_BOOTSTRAP : "";
  const replacement = `${MOBILE_GATEWAY_REACHABILITY_BOOTSTRAP}${transportBootstrap}${mobileCsrfFetchBootstrap(options.csrfCookie ?? CSRF_COOKIE)}window.__DSH_MOBILE_FRONTEND__="dedicated";${plan.assignment}${JSON.stringify(plan.parsed)};`;
  const rewritten = `${html.slice(0, plan.replaceStart)}${replacement}${html.slice(plan.replaceEnd)}`;
  return Object.freeze({
    html: ensureMobileGatewayMarker(ensureMobileViewport(ensureMobileCompatibility(rewriteMobileApplicationPreloads(rewritten, preloadReplacements)))),
    batches
  });
}
var ByteLimitTransform = class extends Transform {
  constructor(maximum) {
    super();
    this.maximum = maximum;
  }
  maximum;
  total = 0;
  _transform(chunk, encoding, callback) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.total += buffer.length;
    if (this.total > this.maximum) {
      callback(new HttpError(413, "payload_too_large"));
      return;
    }
    callback(null, buffer);
  }
};
function stripIpv6Brackets(hostname2) {
  return hostname2.startsWith("[") && hostname2.endsWith("]") ? hostname2.slice(1, -1) : hostname2;
}
function parsePemCertificates(contents, source) {
  const text = contents.toString("utf8");
  const pattern = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu;
  const blocks = text.match(pattern) ?? [];
  if (blocks.length === 0 || text.replace(pattern, "").trim() !== "") {
    throw new Error(`${source} must contain only PEM certificates`);
  }
  return blocks.map((pem) => {
    let certificate;
    try {
      certificate = new X509Certificate(pem);
    } catch (error) {
      throw new Error(`${source} contains an invalid certificate`, { cause: error });
    }
    return Object.freeze({ pem: `${pem}
`, certificate });
  });
}
function validateServerChain(chain) {
  const now = Date.now();
  for (const [index, entry] of chain.entries()) {
    if (Date.parse(entry.certificate.validFrom) > now || Date.parse(entry.certificate.validTo) <= now) {
      throw new Error("TLS certificate chain contains a certificate that is not currently valid");
    }
    if (index === 0) continue;
    if (entry.certificate.subject === entry.certificate.issuer && entry.certificate.verify(entry.certificate.publicKey)) {
      throw new Error("TLS server certificate chain must not include a self-signed root");
    }
    const child = chain[index - 1].certificate;
    if (!entry.certificate.ca || !child.checkIssued(entry.certificate) || !child.verify(entry.certificate.publicKey)) {
      throw new Error("TLS server certificate chain is not an ordered leaf-to-intermediate chain");
    }
  }
}
async function tlsOptions(config) {
  if (config.tls.mode === "disabled") throw new Error("TLS options requested for a disabled listener");
  const [certFile, key, additionalChainFile] = await Promise.all([
    readFile2(config.tls.certFile),
    readFile2(config.tls.keyFile),
    config.tls.caFile === void 0 ? Promise.resolve(void 0) : readFile2(config.tls.caFile)
  ]);
  const chain = [
    ...parsePemCertificates(certFile, "tls.certFile"),
    ...additionalChainFile === void 0 ? [] : parsePemCertificates(additionalChainFile, "tls.caFile")
  ];
  validateServerChain(chain);
  const leaf = chain[0].certificate;
  for (const authority of config.authorities) {
    const hostname2 = stripIpv6Brackets(authority.hostname);
    const match = isIP(hostname2) === 0 ? leaf.checkHost(hostname2) : leaf.checkIP(hostname2);
    if (match === void 0) throw new Error(`TLS certificate does not cover configured authority ${hostname2}`);
  }
  return {
    cert: chain.map((entry) => entry.pem).join(""),
    key,
    requestCert: false,
    minVersion: "TLSv1.2",
    maxHeaderSize: MAX_HEADER_BYTES
  };
}
function websocketAccept(key) {
  return createHash2("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "ascii").digest("base64");
}
function headerValue(headers, name) {
  const value = headers[name];
  return Array.isArray(value) ? void 0 : value;
}
function hasToken(header, token) {
  return header?.split(",").some((value) => value.trim().toLowerCase() === token) ?? false;
}
function rejectUpgrade(socket, status, code) {
  if (socket.destroyed) return;
  const body = `${JSON.stringify({ error: code })}
`;
  socket.end([
    `HTTP/1.1 ${String(status)} ${status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request"}`,
    "Connection: close",
    "Cache-Control: no-store",
    "Content-Type: application/json; charset=utf-8",
    "Referrer-Policy: no-referrer",
    "X-Content-Type-Options: nosniff",
    `Content-Length: ${String(Buffer.byteLength(body))}`,
    "",
    body
  ].join("\r\n"));
}
function sanitizeRequestHeaders(request, upstream) {
  const headers = {
    host: upstream.host
  };
  if (request.headers.origin !== void 0) headers.origin = upstream.origin;
  if (request.headers["sec-fetch-site"] !== void 0) headers["sec-fetch-site"] = "same-origin";
  const allowed = [
    "accept",
    "accept-encoding",
    "accept-language",
    "content-encoding",
    "content-length",
    "content-type",
    "if-match",
    "if-modified-since",
    "if-none-match",
    "if-range",
    "if-unmodified-since",
    "range",
    "user-agent"
  ];
  for (const name of allowed) {
    const value = request.headers[name];
    if (value !== void 0) headers[name] = value;
  }
  return headers;
}
var BLOCKED_RESPONSE_HEADERS = /* @__PURE__ */ new Set([
  "alt-svc",
  "cache-control",
  "connection",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "expires",
  "keep-alive",
  "nel",
  "permissions-policy",
  "pragma",
  "proxy-authenticate",
  "referrer-policy",
  "report-to",
  "reporting-endpoints",
  "server",
  "set-cookie",
  "strict-transport-security",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-content-type-options",
  "x-frame-options",
  "x-powered-by"
]);
function sanitizeResponseHeaders(headers, upstream) {
  const clean = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (value === void 0 || BLOCKED_RESPONSE_HEADERS.has(lower) || lower.startsWith("access-control-")) continue;
    if (lower === "location" && typeof value === "string") {
      try {
        const location = new URL(value, upstream);
        clean.location = location.origin === upstream.origin ? `${location.pathname}${location.search}${location.hash}` : value;
      } catch {
        continue;
      }
      continue;
    }
    clean[lower] = value;
  }
  return clean;
}
function acceptsGzip(header) {
  if (header === void 0) return false;
  let wildcard;
  for (const entry of header.split(",")) {
    const [rawName, ...parameters] = entry.split(";");
    const name = rawName?.trim().toLowerCase();
    if (name === void 0 || name === "") continue;
    let quality = 1;
    for (const parameter of parameters) {
      const match = /^\s*q\s*=\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*$/iu.exec(parameter);
      if (match !== null) quality = Number(match[1]);
    }
    if (name === "gzip") return quality > 0;
    if (name === "*") wildcard = quality > 0;
  }
  return wildcard ?? false;
}
function isCompressibleContentType(value) {
  const contentType = Array.isArray(value) ? value[0] : value;
  if (contentType === void 0) return false;
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mediaType.startsWith("text/") || /^(?:application\/(?:javascript|json|xml|x-javascript)|image\/svg\+xml)$/u.test(mediaType);
}
function canCompressResponse(request, response) {
  const pathname = request.url?.split("?", 1)[0] ?? "";
  const compressibleRequest = (request.method === "GET" || request.method === "HEAD") && (pathname.startsWith("/plugins/") || pathname.startsWith("/assets/"));
  return compressibleRequest && response.statusCode === 200 && request.headers.range === void 0 && response.headers["content-range"] === void 0 && response.headers["content-encoding"] === void 0 && isCompressibleContentType(response.headers["content-type"]);
}
function revisionedStaticCacheControl(request, statusCode) {
  if (request.method !== "GET" && request.method !== "HEAD") return void 0;
  if (statusCode !== 200 && statusCode !== 304) return void 0;
  let target;
  try {
    target = new URL(request.url ?? "/", "https://dsh-mobile.invalid");
  } catch {
    return void 0;
  }
  const revision = target.searchParams.get("rev");
  const hasRevision = revision !== null && /^[a-z0-9_-]{4,128}$/iu.test(revision);
  const hashedAsset = /^\/assets\/.*-[a-z0-9_-]{8,}\.[a-z0-9]+$/iu.test(target.pathname);
  if (!(target.pathname.startsWith("/plugins/") && hasRevision) && !(target.pathname.startsWith("/assets/") && (hasRevision || hashedAsset))) return void 0;
  return "private, max-age=31536000, immutable";
}
function addVaryAcceptEncoding(headers) {
  const existing = headers.vary;
  const rawValues = Array.isArray(existing) ? existing.map((value) => String(value)) : existing === void 0 ? [] : [String(existing)];
  const values = rawValues.flatMap((value) => value.split(",").map((part) => part.trim()).filter(Boolean));
  if (!values.some((value) => value.toLowerCase() === "accept-encoding")) values.push("Accept-Encoding");
  headers.vary = values.join(", ");
}
function mapError(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof AccessError) return new HttpError(error.status, error.code);
  if (error instanceof MobileExtensionError) return new HttpError(error.status, error.code);
  return new HttpError(500, "internal_error");
}
function requestAbortedError() {
  const error = new Error("request aborted");
  error.name = "AbortError";
  return error;
}
function isTransientUpstreamError(error) {
  if (!(error instanceof Error)) return false;
  const code = error.code;
  return typeof code === "string" && TRANSIENT_UPSTREAM_ERROR_CODES.has(code);
}
function upstreamTimeoutError() {
  const error = new Error("upstream timeout");
  error.code = "ETIMEDOUT";
  return error;
}
function waitForAbortableDelay(delayMs, signal) {
  if (signal.aborted) return Promise.reject(requestAbortedError());
  return new Promise((resolve3, reject) => {
    const aborted = () => {
      clearTimeout(timer);
      reject(requestAbortedError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve3();
    }, delayMs);
    signal.addEventListener("abort", aborted, { once: true });
  });
}
function waitForRequestTask(task, signal) {
  if (signal.aborted) return Promise.reject(requestAbortedError());
  return new Promise((resolve3, reject) => {
    const aborted = () => {
      reject(requestAbortedError());
    };
    signal.addEventListener("abort", aborted, { once: true });
    void task.then(
      (value) => {
        signal.removeEventListener("abort", aborted);
        resolve3(value);
      },
      (error) => {
        signal.removeEventListener("abort", aborted);
        reject(error);
      }
    );
  });
}
function discoveryDeviceName() {
  const value = hostname().trim().replaceAll(/[\u0000-\u001f\u007f]/gu, "");
  return (value === "" ? "DeepSeek Harness" : value).slice(0, 63);
}
function discoveryMdnsHost(instanceId) {
  const label = hostname().toLowerCase().replaceAll(/[^a-z0-9-]/gu, "-").replaceAll(/^-+|-+$/gu, "").slice(0, 40);
  return `${label === "" ? "dsh" : label}-${instanceId.slice(0, 8)}.local`;
}
function discoveryBroadcastTargets(cidrs) {
  const targets = /* @__PURE__ */ new Set(["255.255.255.255"]);
  for (const cidr of cidrs) {
    if (cidr.bits !== 32 || cidr.prefix >= 32) continue;
    const hostBits = BigInt(32 - cidr.prefix);
    const broadcast = cidr.network | (1n << hostBits) - 1n;
    targets.add([24n, 16n, 8n, 0n].map((shift) => Number(broadcast >> shift & 0xffn)).join("."));
  }
  return [...targets];
}
function guardUpgradeSocket(socket) {
  socket.on("error", () => {
    if (!socket.destroyed) socket.destroy();
  });
}
function discoveryFailure(error) {
  const code = error instanceof Error && typeof error.code === "string" ? error.code : "unknown";
  return Object.freeze({ code, message: error instanceof Error ? error.message : String(error) });
}
function extensionTarget(pathname) {
  const prefix = `${AUTH_PREFIX}/extensions`;
  if (pathname === prefix || pathname === `${prefix}/` || pathname === `${prefix}/manifest`) return { kind: "manifest" };
  if (pathname === `${prefix}/events`) return { kind: "events" };
  if (!pathname.startsWith(`${prefix}/`)) return void 0;
  const parts = pathname.slice(prefix.length + 1).split("/");
  const id = parts.shift();
  if (id === void 0 || !/^[a-z][a-z0-9-]{0,63}$/u.test(id)) return void 0;
  const leaf = parts.shift();
  if (leaf === "mobile.js" && parts.length === 0) return { kind: "script", id };
  if (leaf === "mobile.css" && parts.length === 0) return { kind: "style", id };
  if (leaf === "assets" && parts.length > 0) return { kind: "asset", id, path: parts.join("/") };
  if (leaf === "actions" && parts.length === 1 && /^[a-z][a-z0-9-]{0,63}$/u.test(parts[0])) return { kind: "action", id, action: parts[0] };
  if (leaf === "routes") return { kind: "route", id, path: `/${parts.join("/")}`.replace(/\/{2,}/gu, "/") };
  return void 0;
}
var EXTENSION_GENERATION_HEADER = "x-dsh-mobile-extension-generation";
function extensionGeneration(value) {
  if (value === void 0) return void 0;
  if (!/^[a-f\d]{64}$/u.test(value)) throw new HttpError(400, "invalid_extension_generation");
  return value;
}
function mobileBootBatchKey(pathname) {
  const match = new RegExp(`^${MOBILE_BOOT_BATCH_PREFIX.replaceAll("/", "\\/")}([a-f\\d]{64})\\.js$`, "u").exec(pathname);
  return match?.[1];
}
function assertBoundedContentLength(request, maximum) {
  const declared = request.headers["content-length"];
  if (declared !== void 0 && (!/^\d+$/u.test(declared) || Number(declared) > maximum)) {
    throw new HttpError(413, "payload_too_large");
  }
}
async function readBoundedBody(request, maximum) {
  assertBoundedContentLength(request, maximum);
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maximum) throw new HttpError(413, "payload_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
function extensionRequestHeaders(headers) {
  const allowed = /* @__PURE__ */ new Set(["accept", "content-type", "content-length", "content-range", "range", "if-none-match", "if-modified-since"]);
  const output = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!allowed.has(name) || typeof value !== "string") continue;
    output[name] = value;
  }
  return Object.freeze(output);
}
function extensionContentType(path) {
  const type = {
    ".css": "text/css; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
  }[extname(path).toLowerCase()];
  return type ?? "application/octet-stream";
}
var MobileAccessGateway = class {
  constructor(config, store, extensions, upstreamAuthenticatedUrl, extraWebSocketPaths, blockedUpgradeLog, onDiscoveryDegraded, clientModulePreferences, authFailureLog) {
    this.config = config;
    this.extensions = extensions;
    this.upstreamAuthenticatedUrl = upstreamAuthenticatedUrl;
    this.extraWebSocketPaths = extraWebSocketPaths;
    this.blockedUpgradeLog = blockedUpgradeLog;
    this.onDiscoveryDegraded = onDiscoveryDegraded;
    this.authFailures = new AuthFailureRecorder(authFailureLog);
    this.clientModulePreferences = clientModulePreferences ?? new ClientModulePreferenceStore(
      join2(dirname2(config.stateFile), `${basename(config.stateFile)}.client-modules.json`),
      config.excludedClientModules
    );
    this.listenerTlsEnabled = config.tls.mode === "provided";
    this.tlsEnabled = config.publicTls;
    this.access = new AccessController(store, {
      pairingInstanceId: config.instanceId,
      ...config.legacyInstanceId === void 0 ? {} : { legacyInstanceId: config.legacyInstanceId },
      pairingTtlMs: config.pairingTtlMs,
      deviceTtlMs: config.deviceTtlMs,
      sessionTtlMs: config.sessionTtlMs,
      maxDevices: config.maxDevices,
      maxSessions: config.maxSessions,
      rateLimitWindowMs: config.rateLimitWindowMs,
      maxPairingAttempts: config.maxPairingAttempts,
      maxRateLimitKeys: config.maxRateLimitKeys
    });
    const renewLimit = Math.min(100, config.maxPairingAttempts * 4);
    const probeLimit = Math.min(1e3, config.maxDevices * 4);
    this.renewFailureLimiter = new BoundedRateLimiter(renewLimit, config.rateLimitWindowMs, config.maxRateLimitKeys);
    this.renewDeviceLimiter = new BoundedRateLimiter(renewLimit, config.rateLimitWindowMs, config.maxDevices);
    this.probeFailureLimiter = new BoundedRateLimiter(probeLimit, config.rateLimitWindowMs, config.maxRateLimitKeys);
    this.probeDeviceLimiter = new BoundedRateLimiter(probeLimit, config.rateLimitWindowMs, config.maxDevices);
    this.removeSessionListener = this.access.onSessionEnded((authorization, reason) => {
      if (reason === "revoked") {
        const cleanup = this.clientModulePreferences.removeDevice(authorization.deviceId).catch(() => {
          process.emitWarning("Unable to remove revoked device client preferences", { code: "DSH_MOBILE_PREFERENCE_CLEANUP_FAILED" });
        });
        this.clientModuleRevocations.add(cleanup);
        void cleanup.finally(() => this.clientModuleRevocations.delete(cleanup));
        if (!this.pendingDeviceRevocations.has(authorization.deviceId)) {
          this.pendingDeviceRevocations.add(authorization.deviceId);
          this.broadcastDeviceRevoked(authorization.deviceId);
        }
        setImmediate(() => {
          this.abortSessionResources(authorization.sessionKey);
          this.pendingDeviceRevocations.delete(authorization.deviceId);
        });
      } else {
        this.abortSessionResources(authorization.sessionKey);
      }
    });
    this.removeExtensionContentListener = this.extensions?.onContentChanged(() => {
      this.broadcastExtensionChange();
    }) ?? (() => void 0);
  }
  config;
  extensions;
  upstreamAuthenticatedUrl;
  extraWebSocketPaths;
  blockedUpgradeLog;
  onDiscoveryDegraded;
  access;
  listenerTlsEnabled;
  tlsEnabled;
  policy;
  server;
  discoverySocket;
  discoveryTimer;
  /**
   * Why broadcast discovery is unavailable, if it is. Windows keeps separate TCP and
   * UDP port-exclusion tables, so the port the OS handed the TCP listener can be
   * refused for UDP. That degradation is survivable but must stay observable: without
   * it, "the phone cannot find this computer" has no diagnosable cause on the host.
   */
  discoveryError;
  mdnsError;
  /** Names of the bundled mobile assets that could not be read, if any. */
  mobileAssetError;
  lastModuleExclusionError;
  bonjour;
  pairingCaCertificate;
  listenerPort;
  connectedSockets = /* @__PURE__ */ new Set();
  activeRequests = /* @__PURE__ */ new Map();
  activeWebSockets = /* @__PURE__ */ new Map();
  mobileBootBatches = /* @__PURE__ */ new Map();
  /** Cached upstream bundle byte sizes (HEAD probes), keyed by resource URL. */
  bootEntrySizeCache = /* @__PURE__ */ new Map();
  extensionEventListeners = /* @__PURE__ */ new Set();
  extensionEventRevision = 0;
  taskEventListeners = /* @__PURE__ */ new Set();
  deviceEventListeners = /* @__PURE__ */ new Map();
  pendingDeviceRevocations = /* @__PURE__ */ new Set();
  extensionChangeTimer;
  extensionChangeTask;
  legacyCustomDigest = "";
  upstreamCookie;
  upstreamCookieExpiresAt = 0;
  upstreamCookieTask;
  upstreamAuthRequest;
  nextOperationId = 1;
  closing = false;
  started = false;
  closeTask;
  removeSessionListener;
  removeExtensionContentListener;
  renewFailureLimiter;
  renewDeviceLimiter;
  renewInFlight = /* @__PURE__ */ new Set();
  probeFailureLimiter;
  probeDeviceLimiter;
  probeInFlight = /* @__PURE__ */ new Set();
  clientModulePreferences;
  clientModuleOperations = /* @__PURE__ */ new Set();
  clientModuleTasks = /* @__PURE__ */ new Set();
  clientModuleRevocations = /* @__PURE__ */ new Set();
  authFailures;
  /** Initialize durable state, validate TLS, and bind the externally reachable listener. */
  async start() {
    if (this.started || this.server !== void 0) throw new Error("mobile-access gateway cannot be started twice");
    this.started = true;
    await this.access.initialize();
    try {
      await this.clientModulePreferences.initialize();
      if (this.config.pairingCaFile !== void 0) {
        const certificate = new X509Certificate(await readFile2(this.config.pairingCaFile));
        const fingerprint = certificate.fingerprint256.replaceAll(":", "").toLowerCase();
        if (!certificate.ca || certificate.subject !== certificate.issuer || !certificate.verify(certificate.publicKey) || fingerprint !== this.config.instanceId) {
          throw new Error("pairingCaFile must be the self-signed CA identified by instanceId");
        }
        this.pairingCaCertificate = certificate.raw.toString("base64");
      }
      const missingAssets = [];
      for (const [label, file] of [
        ["compatibility", this.config.mobileCompatibilityFile],
        ["layout", this.config.mobileLayoutFile]
      ]) {
        if (!(await lstat(file).catch(() => void 0))?.isFile()) missingAssets.push(label);
      }
      this.mobileAssetError = missingAssets.length === 0 ? void 0 : `mobile_assets_missing_${missingAssets.join("_")}`;
      const handler = (request, response) => {
        void this.handleExternalRequest(request, response).catch((error) => {
          const mapped = mapError(error);
          if (response.headersSent) response.destroy();
          else sendFailure(response, mapped.status, mapped.code, this.tlsEnabled);
        });
      };
      const server = this.listenerTlsEnabled ? createHttpsServer(await tlsOptions(this.config), handler) : createHttpServer({ maxHeaderSize: MAX_HEADER_BYTES }, handler);
      this.server = server;
      server.maxHeadersCount = 64;
      server.maxConnections = this.config.maxConnections;
      server.headersTimeout = 1e4;
      server.requestTimeout = this.config.upstreamTimeoutMs;
      server.keepAliveTimeout = 5e3;
      server.on("connection", (socket) => {
        if (this.connectedSockets.size >= this.config.maxConnections) {
          socket.destroy();
          return;
        }
        this.connectedSockets.add(socket);
        socket.on("error", () => {
          socket.destroy();
        });
        socket.once("close", () => {
          this.connectedSockets.delete(socket);
        });
      });
      server.on("connect", (_request, socket) => {
        socket.destroy();
      });
      server.on("upgrade", (request, socket, head) => {
        const client = socket;
        guardUpgradeSocket(client);
        void this.handleUpgrade(request, client, head).catch((error) => {
          const mapped = mapError(error);
          rejectUpgrade(client, mapped.status, mapped.code);
        });
      });
      server.on("clientError", (_error, socket) => {
        rejectUpgrade(socket, 400, "bad_request");
      });
      await new Promise((resolve3, reject) => {
        const failed = (error) => {
          reject(error);
        };
        server.once("error", failed);
        server.listen(this.config.listenPort, this.config.listenHost, () => {
          server.off("error", failed);
          resolve3();
        });
      });
      const address = server.address();
      if (address === null || typeof address === "string") throw new Error("gateway listener has no TCP address");
      this.listenerPort = address.port;
      this.policy = new RequestTrustPolicy(
        this.config.authorities,
        address.port,
        this.config.allowedCidrs,
        this.tlsEnabled
      );
      if (this.config.discovery) await this.startDiscovery(address.port);
      await this.pollLegacyCustomChanges();
      this.extensionChangeTimer = setInterval(() => {
        void this.pollLegacyCustomChanges();
      }, EXTENSION_CHANGE_POLL_MS);
      this.extensionChangeTimer.unref();
    } catch (error) {
      await this.closeFailedStart();
      throw error;
    }
  }
  /** Install a newly signed provided leaf for future TLS handshakes without dropping sessions. */
  async refreshProvidedTls() {
    if (!this.listenerTlsEnabled || this.config.tls.mode !== "provided") {
      throw new Error("gateway does not terminate provided TLS");
    }
    const server = this.server;
    if (server === void 0 || !this.started || this.closing) throw new Error("gateway is not running");
    const options = await tlsOptions(this.config);
    if (this.server !== server || this.closing) throw new Error("gateway is not running");
    server.setSecureContext(options);
  }
  async startDiscovery(port) {
    const socket = createSocket("udp4");
    this.discoverySocket = socket;
    const announcement = this.discoveryAnnouncement(port);
    let binding = true;
    socket.on("error", (error) => {
      if (!binding) this.recordBroadcastFailure(error, true);
    });
    const sendAnnouncement = (targetPort, address) => {
      if (this.closing || this.discoveryError !== void 0) return;
      try {
        socket.send(announcement, targetPort, address, (error) => {
          if (error !== null) this.recordBroadcastFailure(error, true);
        });
      } catch (error) {
        this.recordBroadcastFailure(error, true);
      }
    };
    socket.on("message", (message, remote) => {
      if (this.closing || this.discoveryError !== void 0 || !message.equals(DISCOVERY_QUERY) || !addressAllowed(remote.address, this.config.allowedCidrs)) return;
      sendAnnouncement(remote.port, remote.address);
    });
    const bindHost = isIP(this.config.listenHost) === 4 && isLoopbackAddress(this.config.listenHost) ? this.config.listenHost : "0.0.0.0";
    const bound = await new Promise((resolve3) => {
      const onBindError = (error) => {
        socket.off("error", onBindError);
        this.recordBroadcastFailure(error, false);
        resolve3(false);
      };
      socket.once("error", onBindError);
      try {
        socket.bind(port, bindHost, () => {
          socket.off("error", onBindError);
          binding = false;
          try {
            socket.setBroadcast(true);
            resolve3(true);
          } catch (error) {
            this.recordBroadcastFailure(error, true);
            resolve3(false);
          }
        });
      } catch (error) {
        onBindError(error);
      }
    });
    if (bound && this.discoveryError === void 0) {
      const announce = () => {
        for (const target of discoveryBroadcastTargets(this.config.allowedCidrs)) {
          sendAnnouncement(port, target);
        }
      };
      announce();
      if (this.discoveryError === void 0) {
        this.discoveryTimer = setInterval(announce, DISCOVERY_INTERVAL_MS);
        this.discoveryTimer.unref();
      }
    } else {
      this.discoverySocket = void 0;
      try {
        socket.close();
      } catch {
      }
    }
    const deviceName = discoveryDeviceName();
    const onMdnsError = (error) => {
      this.recordMdnsFailure(error);
    };
    const bonjour = new Bonjour({ disableIPv6: true }, onMdnsError);
    this.bonjour = bonjour;
    const mdns = bonjour.server.mdns;
    mdns.on("error", onMdnsError);
    bonjour.publish({
      name: `${deviceName} (${this.config.instanceId.slice(0, 8)})`,
      type: MDNS_SERVICE_TYPE,
      protocol: "tcp",
      port,
      host: discoveryMdnsHost(this.config.instanceId),
      disableIPv6: true,
      txt: {
        deviceName,
        origin: this.address().origin,
        instanceId: this.config.instanceId,
        protocol: String(DISCOVERY_PROTOCOL)
      }
    });
  }
  reportDiscoveryDegraded(source, code) {
    try {
      this.onDiscoveryDegraded?.(source, code);
    } catch (error) {
      process.emitWarning(`DSH Mobile could not log ${source} discovery error: ${String(error)}`, {
        code: "DSH_MOBILE_DISCOVERY_LOG_FAILED"
      });
    }
  }
  recordBroadcastFailure(error, notify) {
    if (this.closing || this.discoveryError !== void 0) return;
    this.discoveryError = discoveryFailure(error);
    if (this.discoveryTimer !== void 0) clearInterval(this.discoveryTimer);
    this.discoveryTimer = void 0;
    if (notify) this.reportDiscoveryDegraded("broadcast", this.discoveryError.code);
  }
  recordMdnsFailure(error) {
    if (this.closing || this.mdnsError !== void 0) return;
    this.mdnsError = discoveryFailure(error);
    this.reportDiscoveryDegraded("mdns", this.mdnsError.code);
  }
  discoveryAnnouncement(port) {
    return Buffer.from(JSON.stringify({
      deviceName: discoveryDeviceName(),
      origin: this.address().origin,
      port,
      protocol: DISCOVERY_PROTOCOL,
      instanceId: this.config.instanceId
    }), "utf8");
  }
  async closeFailedStart() {
    if (this.extensionChangeTimer !== void 0) clearInterval(this.extensionChangeTimer);
    this.extensionChangeTimer = void 0;
    this.removeExtensionContentListener();
    if (this.discoveryTimer !== void 0) clearInterval(this.discoveryTimer);
    this.discoveryTimer = void 0;
    await this.closeBonjour();
    this.discoverySocket?.close();
    this.discoverySocket = void 0;
    for (const socket of this.connectedSockets) socket.destroy();
    const server = this.server;
    this.server = void 0;
    if (server?.listening === true) {
      await new Promise((resolve3) => {
        server.close(() => resolve3());
      });
    }
    await this.access.close();
  }
  async closeBonjour() {
    const bonjour = this.bonjour;
    this.bonjour = void 0;
    if (bonjour === void 0) return;
    await new Promise((resolve3) => {
      bonjour.unpublishAll(() => {
        bonjour.destroy(() => resolve3());
      });
    });
  }
  /** Actual bound address, available after start and safe for loopback status output. */
  address() {
    if (this.listenerPort === void 0 || this.policy === void 0) throw new Error("gateway is not listening");
    const origin = this.policy.origins.values().next().value;
    if (origin === void 0) throw new Error("gateway has no public authority");
    return Object.freeze({ host: this.config.listenHost, port: this.listenerPort, origin });
  }
  /**
   * Report which discovery channels this gateway actually owns.
   *
   * Broadcast discovery degrades on its own when its UDP port cannot be bound, so
   * callers need to tell "discovery is off" from "discovery was never attempted".
   * mDNS is published independently and is unaffected by that failure.
   */
  discoveryStatus() {
    return Object.freeze({
      broadcast: this.discoverySocket !== void 0 && this.discoveryTimer !== void 0,
      mdns: this.bonjour !== void 0 && this.mdnsError === void 0,
      ...this.discoveryError === void 0 ? {} : { errorCode: `discovery_broadcast_${this.discoveryError.code}` },
      ...this.mdnsError === void 0 ? {} : { mdnsErrorCode: `discovery_mdns_${this.mdnsError.code}` },
      // A bundled asset that is missing would otherwise only show up as a 503 on a
      // subresource the served page still references.
      ...this.mobileAssetError === void 0 ? {} : { mobileAssetsErrorCode: this.mobileAssetError }
    });
  }
  requirePolicy() {
    if (this.policy === void 0 || this.closing) throw new HttpError(503, "unavailable");
    return this.policy;
  }
  authorize(request) {
    const cookies = browserAuthCookies(request.headers.cookie);
    const name = this.tlsEnabled && cookies.has(HOST_SESSION_COOKIE) ? HOST_SESSION_COOKIE : SESSION_COOKIE;
    return authenticatedCookie(cookies.get(name) ?? [], (token) => this.access.authorizeSession(token)).result;
  }
  requireCsrf(request, authorization) {
    const value = headerValue(request.headers, CSRF_HEADER);
    this.access.assertCsrf(authorization, value);
  }
  setSessionCookies(response, result, now) {
    const maxAge = (result.sessionExpiresAt - now) / 1e3;
    response.setHeader("Set-Cookie", [
      cookie(SESSION_COOKIE, result.sessionToken, { tls: this.tlsEnabled, httpOnly: true, path: "/", maxAgeSeconds: maxAge }),
      cookie(CSRF_COOKIE, result.csrfToken, { tls: this.tlsEnabled, httpOnly: false, path: "/", maxAgeSeconds: maxAge }),
      ...this.tlsEnabled ? [
        cookie(HOST_SESSION_COOKIE, result.sessionToken, { tls: true, httpOnly: true, path: "/", maxAgeSeconds: maxAge }),
        cookie(HOST_CSRF_COOKIE, result.csrfToken, { tls: true, httpOnly: false, path: "/", maxAgeSeconds: maxAge })
      ] : []
    ]);
  }
  setBrowserDeviceBinding(response, deviceId, deviceExpiresAt) {
    if (!this.tlsEnabled) return;
    const existing = response.getHeader("Set-Cookie");
    response.setHeader("Set-Cookie", [...existing, cookie(HOST_DEVICE_COOKIE, deviceId, {
      tls: true,
      httpOnly: true,
      path: "/",
      maxAgeSeconds: (deviceExpiresAt - Date.now()) / 1e3
    })]);
  }
  /** Separate malformed or invalid requests from device-authenticated work without trusting forwarded addresses. */
  async withDeviceRequest(request, failureLimiter, deviceLimiter, inFlight, validate, operation) {
    let device;
    try {
      device = await validate();
    } catch (error) {
      if ((error instanceof HttpError || error instanceof AccessError) && error.status >= 400 && error.status < 500 && !failureLimiter.take(request.socket.remoteAddress ?? "unknown", Date.now())) {
        throw new HttpError(429, "rate_limited");
      }
      throw error;
    }
    if (inFlight.has(device.deviceId)) throw new HttpError(429, "rate_limited");
    const now = Date.now();
    const activeIds = new Set(this.access.listDevices().filter((candidate) => candidate.revokedAt === void 0 && candidate.expiresAt > now).map((candidate) => candidate.id));
    deviceLimiter.retainKeys(activeIds);
    if (!deviceLimiter.take(device.deviceId, now)) throw new HttpError(429, "rate_limited");
    inFlight.add(device.deviceId);
    try {
      return await operation(device);
    } finally {
      inFlight.delete(device.deviceId);
    }
  }
  async handlePair(request, response) {
    const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
    if (typeof body.token !== "string" || body.label !== void 0 && typeof body.label !== "string") {
      throw new HttpError(400, "bad_request");
    }
    const result = await this.access.pair(request.socket.remoteAddress ?? "unknown", body.token, body.label);
    const now = Date.now();
    this.setSessionCookies(response, result, now);
    const sessionCookies = response.getHeader("Set-Cookie");
    response.setHeader("Set-Cookie", [
      ...sessionCookies,
      cookie(DEVICE_COOKIE, result.deviceToken, {
        tls: this.tlsEnabled,
        httpOnly: true,
        path: "/mobile-access/auth/renew",
        maxAgeSeconds: (result.deviceExpiresAt - now) / 1e3
      })
    ]);
    this.setBrowserDeviceBinding(response, result.deviceId, result.deviceExpiresAt);
    sendJson(response, 201, {
      paired: true,
      deviceId: result.deviceId,
      csrfToken: result.csrfToken,
      sessionExpiresAt: result.sessionExpiresAt
    }, this.tlsEnabled);
  }
  async handleRenew(request, response) {
    await this.withDeviceRequest(
      request,
      this.renewFailureLimiter,
      this.renewDeviceLimiter,
      this.renewInFlight,
      async () => {
        await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
        const cookies = browserAuthCookies(request.headers.cookie);
        const bindings = this.tlsEnabled ? cookies.get(HOST_DEVICE_COOKIE) : void 0;
        if (bindings !== void 0 && bindings.length !== 1) throw new HttpError(401, "authentication_failed");
        const device = authenticatedCookie(
          cookies.get(DEVICE_COOKIE) ?? [],
          (token) => this.access.authorizeDevice(token),
          (candidate) => bindings === void 0 || candidate.deviceId === bindings[0]
        );
        return { deviceId: device.result.deviceId, token: device.value, credential: device.result };
      },
      async (selected) => {
        const result = await this.access.renew(selected.token);
        this.setSessionCookies(response, result, Date.now());
        this.setBrowserDeviceBinding(response, result.deviceId, selected.credential.deviceExpiresAt);
        sendJson(response, 200, {
          renewed: true,
          deviceId: result.deviceId,
          csrfToken: result.csrfToken,
          sessionExpiresAt: result.sessionExpiresAt
        }, this.tlsEnabled);
      }
    );
  }
  /** CA-backed entries retain their pin; public entries project the authenticated credential's identity. */
  nativeResponseInstanceId(result) {
    return this.config.pairingCaFile === void 0 ? result.nativeInstanceId ?? this.config.instanceId : this.config.instanceId;
  }
  async handleNativePair(request, response) {
    const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
    if (typeof body.token !== "string" || body.label !== void 0 && typeof body.label !== "string" || body.fingerprint !== void 0 && typeof body.fingerprint !== "string") {
      throw new HttpError(400, "bad_request");
    }
    if (typeof body.fingerprint === "string" && !/^[a-f\d]{64}$/u.test(body.fingerprint)) {
      throw new HttpError(400, "bad_request");
    }
    const result = await this.access.pair(
      request.socket.remoteAddress ?? "unknown",
      body.token,
      body.label,
      body.fingerprint
    );
    sendJson(response, 201, {
      instanceId: this.nativeResponseInstanceId(result),
      deviceId: result.deviceId,
      deviceToken: result.deviceToken,
      deviceExpiresAt: result.deviceExpiresAt,
      sessionToken: result.sessionToken,
      csrfToken: result.csrfToken,
      sessionExpiresAt: result.sessionExpiresAt
    }, this.tlsEnabled);
  }
  async handleNativeRenew(request, response) {
    await this.withDeviceRequest(
      request,
      this.renewFailureLimiter,
      this.renewDeviceLimiter,
      this.renewInFlight,
      async () => {
        const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
        if (typeof body.deviceToken !== "string") throw new HttpError(400, "bad_request");
        return { deviceId: this.access.authorizeDevice(body.deviceToken).deviceId, token: body.deviceToken };
      },
      async (selected) => {
        const result = await this.access.renew(selected.token);
        sendJson(response, 200, {
          instanceId: this.nativeResponseInstanceId(result),
          deviceId: result.deviceId,
          sessionToken: result.sessionToken,
          csrfToken: result.csrfToken,
          sessionExpiresAt: result.sessionExpiresAt
        }, this.tlsEnabled);
      }
    );
  }
  async handleNativeProbe(request, response) {
    await this.withDeviceRequest(
      request,
      this.probeFailureLimiter,
      this.probeDeviceLimiter,
      this.probeInFlight,
      async () => {
        const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
        if (typeof body.deviceToken !== "string") throw new HttpError(400, "bad_request");
        return { deviceId: this.access.authorizeDevice(body.deviceToken).deviceId, token: body.deviceToken };
      },
      async (selected) => {
        const result = await this.access.probe(selected.token);
        sendJson(response, 200, {
          instanceId: this.nativeResponseInstanceId(result),
          deviceId: result.deviceId,
          deviceExpiresAt: result.deviceExpiresAt
        }, this.tlsEnabled);
      }
    );
  }
  async handleLogout(request, response) {
    await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
    const authorization = this.authorize(request);
    this.requireCsrf(request, authorization);
    this.access.logout(authorization);
    response.setHeader("Set-Cookie", [
      cookie(SESSION_COOKIE, "", { tls: this.tlsEnabled, httpOnly: true, path: "/", maxAgeSeconds: 0 }),
      cookie(CSRF_COOKIE, "", { tls: this.tlsEnabled, httpOnly: false, path: "/", maxAgeSeconds: 0 }),
      ...this.tlsEnabled ? [
        cookie(HOST_SESSION_COOKIE, "", { tls: true, httpOnly: true, path: "/", maxAgeSeconds: 0 }),
        cookie(HOST_CSRF_COOKIE, "", { tls: true, httpOnly: false, path: "/", maxAgeSeconds: 0 })
      ] : []
    ]);
    sendJson(response, 200, { loggedOut: true }, this.tlsEnabled);
  }
  async handleExternalRequest(request, response) {
    const target = parseRequestTarget(request.url);
    const policy = this.requirePolicy();
    const isMutation = request.method !== "GET" && request.method !== "HEAD";
    assertExternalTrust(request, policy, isMutation);
    if (target.decodedPathname === LOCAL_ADMIN_PREFIX || target.decodedPathname.startsWith(`${LOCAL_ADMIN_PREFIX}/`)) {
      throw new HttpError(404, "not_found");
    }
    const DSH_REMOTE_ADMIN_PREFIX = "/dsh-remote";
    if (target.decodedPathname === DSH_REMOTE_ADMIN_PREFIX || target.decodedPathname.startsWith(`${DSH_REMOTE_ADMIN_PREFIX}/`)) {
      throw new HttpError(404, "not_found");
    }
    if (request.method === "TRACE" || request.method === "CONNECT") throw new HttpError(405, "method_not_allowed");
    if (target.search === "" && request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/health`) {
      sendJson(response, 200, { ok: true }, this.tlsEnabled);
      return;
    }
    if (target.search === "" && request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/metadata`) {
      sendJson(response, 200, {
        version: MOBILE_METADATA_VERSION,
        pluginVersion: DSH_MOBILE_VERSION,
        minimumAndroidAppVersion: MINIMUM_ANDROID_APP_VERSION,
        discoveryProtocol: DISCOVERY_PROTOCOL
      }, this.tlsEnabled);
      return;
    }
    if (target.search === "" && request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/discovery`) {
      sendJson(response, 200, {
        deviceName: discoveryDeviceName(),
        origin: this.address().origin,
        port: this.address().port,
        protocol: DISCOVERY_PROTOCOL,
        instanceId: this.config.instanceId
      }, this.tlsEnabled);
      return;
    }
    if (target.search === "" && request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/ca.cer`) {
      if (this.pairingCaCertificate === void 0) throw new HttpError(404, "not_found");
      const body = Buffer.from(this.pairingCaCertificate, "base64");
      setSecurityHeaders(response, this.tlsEnabled);
      response.writeHead(200, {
        "Content-Type": "application/pkix-cert",
        "Content-Length": body.length,
        "Cache-Control": "no-store"
      });
      response.end(body);
      return;
    }
    if (target.search === "" && request.method === "GET" && (target.decodedPathname === `${AUTH_PREFIX}/pair` || target.decodedPathname === `${AUTH_PREFIX}/pair.js`)) {
      if (!this.access.pairingStatus().open) throw new HttpError(404, "not_found");
      const languageHeader = request.headers["accept-language"];
      const locale = resolveAuthPageLocale(typeof languageHeader === "string" ? languageHeader : void 0);
      setSecurityHeaders(response, this.tlsEnabled);
      response.setHeader("Vary", "Accept-Language");
      const body = target.decodedPathname.endsWith(".js") ? renderPairScript(locale) : renderPairPage(locale);
      response.writeHead(200, {
        "Content-Type": target.decodedPathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
      });
      response.end(body);
      return;
    }
    if (request.method === "GET" && (target.decodedPathname === `${AUTH_PREFIX}/login` || target.decodedPathname === `${AUTH_PREFIX}/login.js`)) {
      if (target.decodedPathname.endsWith(".js") && target.search !== "") throw new HttpError(400, "bad_request");
      const languageHeader = request.headers["accept-language"];
      const locale = resolveAuthPageLocale(typeof languageHeader === "string" ? languageHeader : void 0);
      setSecurityHeaders(response, this.tlsEnabled);
      response.setHeader("Vary", "Accept-Language");
      const body = target.decodedPathname.endsWith(".js") ? renderLoginScript(locale) : renderLoginPage(locale);
      response.writeHead(200, {
        "Content-Type": target.decodedPathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
      });
      response.end(body);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/pair`) {
      await this.handlePair(request, response);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/renew`) {
      await this.handleRenew(request, response);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/native-pair`) {
      await this.handleNativePair(request, response);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/native-renew`) {
      await this.handleNativeRenew(request, response);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/native-probe`) {
      await this.handleNativeProbe(request, response);
      return;
    }
    if (target.search === "" && request.method === "POST" && target.decodedPathname === `${AUTH_PREFIX}/auth/logout`) {
      await this.handleLogout(request, response);
      return;
    }
    const computerImages = request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/computer-images`;
    const computerImage = request.method === "GET" && target.decodedPathname === `${AUTH_PREFIX}/computer-image`;
    const clientModules = target.decodedPathname === `${AUTH_PREFIX}/client-modules`;
    const requestedExtension = extensionTarget(target.decodedPathname);
    const requestedMobileBootBatch = mobileBootBatchKey(target.decodedPathname);
    const customAsset = request.method === "GET" || request.method === "HEAD" ? target.decodedPathname === `${AUTH_PREFIX}/custom.css` ? {
      file: this.config.customCssFile,
      contentType: "text/css; charset=utf-8",
      fallback: CUSTOM_STYLE_FALLBACK
    } : target.decodedPathname === `${AUTH_PREFIX}/custom.js` ? {
      file: this.config.customScriptFile,
      contentType: "text/javascript; charset=utf-8",
      fallback: CUSTOM_SCRIPT_FALLBACK
    } : target.decodedPathname === MOBILE_LAYOUT_PATH ? {
      file: this.config.mobileLayoutFile,
      contentType: "text/javascript; charset=utf-8",
      fallback: void 0
    } : target.decodedPathname === MOBILE_COMPAT_PATH ? {
      file: this.config.mobileCompatibilityFile,
      contentType: "text/javascript; charset=utf-8",
      fallback: void 0
    } : void 0 : void 0;
    if (customAsset === void 0 && requestedMobileBootBatch === void 0 && !computerImages && !computerImage && !clientModules && extensionTarget(target.decodedPathname) === void 0 && (target.decodedPathname === AUTH_PREFIX || target.decodedPathname.startsWith(`${AUTH_PREFIX}/`))) {
      throw new HttpError(404, "not_found");
    }
    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(request.method ?? "") && requestedExtension?.kind !== "route") {
      throw new HttpError(405, "method_not_allowed");
    }
    let authorization;
    try {
      authorization = this.authorize(request);
    } catch (error) {
      const mapped = mapError(error);
      this.authFailures.record("authorize", mapped.status, request, target.decodedPathname, policy.canonicalOrigin(request.headers.origin));
      const acceptsHtml2 = request.headers.accept?.split(",").some((value) => value.trim().split(";", 1)[0] === "text/html") ?? false;
      const topLevel = request.method === "GET" && acceptsHtml2 && (request.headers["sec-fetch-dest"] === void 0 || request.headers["sec-fetch-dest"] === "document") && target.decodedPathname !== "/api" && !target.decodedPathname.startsWith("/api/");
      if (mapped.status === 401 && topLevel) {
        const returnPath = target.raw.length <= 2048 ? target.raw : "/";
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(302, {
          Location: `${AUTH_PREFIX}/login?return=${encodeURIComponent(returnPath)}`,
          "Content-Length": 0
        });
        response.end();
        return;
      }
      throw error;
    }
    const sameOrigin = request.headers["sec-fetch-site"] === "same-origin";
    if (isMutation && !sameOrigin) {
      try {
        this.requireCsrf(request, authorization);
      } catch (error) {
        this.authFailures.record("csrf", mapError(error).status, request, target.decodedPathname, policy.canonicalOrigin(request.headers.origin), authorization);
        throw error;
      }
    }
    if (clientModules) {
      if (target.search !== "") throw new HttpError(400, "bad_request");
      if (request.method !== "GET" && request.method !== "POST") throw new HttpError(405, "method_not_allowed");
      const operation = this.allocateRequest(authorization, response, {});
      const onClose = () => {
        operation.abort();
        operation.release();
      };
      response.once("close", onClose);
      try {
        let kind = "describe";
        let excluded;
        if (request.method === "POST") {
          const body = await readJsonObject(request, this.config.maxBodyBytes);
          const keys = Object.keys(body);
          if (keys.length !== 1) throw new HttpError(400, "bad_request");
          if (keys[0] === "reset" && body.reset === true) kind = "reset";
          else if (keys[0] === "excludedClientModules") {
            kind = "configure";
            excluded = body.excludedClientModules;
          } else throw new HttpError(400, "bad_request");
        }
        const view = await this.clientModulePreferenceOperation(kind, excluded, authorization.deviceId, operation.signal);
        operation.signal.throwIfAborted();
        sendJson(response, 200, view, this.tlsEnabled);
      } catch (error) {
        if (operation.signal.aborted) return;
        if (error instanceof ClientModuleConflictError) sendJson(response, 409, { error: error.code, detail: error.detail }, this.tlsEnabled);
        else throw error;
      } finally {
        response.removeListener("close", onClose);
        operation.release();
      }
      return;
    }
    const extension = requestedExtension;
    if (extension !== void 0) {
      await this.handleExtensionRequest(extension, target, request, response, authorization);
      return;
    }
    if (requestedMobileBootBatch !== void 0) {
      await this.serveMobileBootBatch(requestedMobileBootBatch, request, response, authorization);
      return;
    }
    if (customAsset !== void 0) {
      const operation = this.allocateRequest(authorization, response, {});
      try {
        let body;
        let mtime;
        try {
          body = await readFile2(customAsset.file, { signal: operation.signal });
          try {
            const fileStat = await stat(customAsset.file);
            mtime = fileStat.mtime;
          } catch {
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          if (customAsset.fallback === void 0) throw new HttpError(503, "mobile_frontend_unavailable");
          body = Buffer.from(customAsset.fallback);
        }
        if (body.byteLength > LEGACY_CUSTOM_ASSET_LIMIT) throw new HttpError(413, "payload_too_large");
        const etag = `"${createHash2("sha256").update(body).digest("hex")}"`;
        const responseHeaders = { ETag: etag };
        if (mtime !== void 0) responseHeaders["Last-Modified"] = mtime.toUTCString();
        if (matchesIfNoneMatch(headerValue(request.headers, "if-none-match"), etag)) {
          setSecurityHeaders(response, this.tlsEnabled);
          response.writeHead(304, responseHeaders);
          response.end();
          return;
        }
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(200, {
          ...responseHeaders,
          "Content-Type": customAsset.contentType,
          "Content-Length": body.byteLength
        });
        if (request.method === "HEAD") response.end();
        else response.end(body);
        return;
      } finally {
        operation.release();
      }
    }
    if (computerImages) {
      const operation = this.allocateRequest(authorization, response, {});
      try {
        const query = new URL(target.raw, this.address().origin).searchParams;
        sendJson(response, 200, await listComputerImages(query.get("path"), operation.signal), this.tlsEnabled);
        return;
      } finally {
        operation.release();
      }
    }
    if (computerImage) {
      const operation = this.allocateRequest(authorization, response, {});
      try {
        const query = new URL(target.raw, this.address().origin).searchParams;
        const image = await readComputerImage(query.get("path"), operation.signal);
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(200, {
          "Content-Type": image.contentType,
          "Content-Length": image.body.byteLength,
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.name)}`
        });
        response.end(image.body);
        return;
      } finally {
        operation.release();
      }
    }
    const stockFrontend = new URL(target.raw, this.address().origin).searchParams.get("frontend") === "stock";
    const acceptsHtml = request.headers.accept?.split(",").some((value) => value.trim().split(";", 1)[0] === "text/html") ?? false;
    const frontendDocument = target.decodedPathname === "/" || target.decodedPathname === "/index.html";
    if (target.decodedPathname.startsWith("/api/directoryPicker/")) {
      await this.serveDirectoryPicker(request, response, target.decodedPathname);
      return;
    }
    if (request.method === "GET" && target.decodedPathname === "/m" && acceptsHtml) {
      await this.proxyOwnMobilePage(request, response, authorization);
      return;
    }
    if (request.method === "GET" && frontendDocument && acceptsHtml) {
      setSecurityHeaders(response, this.tlsEnabled);
      response.writeHead(302, { Location: "/m", "Cache-Control": "no-store" });
      response.end();
      return;
    }
    if (stockFrontend && target.decodedPathname === "/") request.url = "/";
    await this.proxyHttp(request, response, authorization);
  }
  async handleExtensionRequest(targetInfo, target, request, response, authorization) {
    const extensions = this.extensions;
    if (extensions === void 0) throw new HttpError(404, "not_found");
    if (targetInfo.kind === "events") {
      if (request.method !== "GET" || target.search !== "") throw new HttpError(request.method === "GET" ? 400 : 405, request.method === "GET" ? "bad_request" : "method_not_allowed");
      this.openExtensionEventStream(request, response, authorization);
      return;
    }
    if (targetInfo.kind === "manifest") {
      if (request.method !== "GET" && request.method !== "HEAD") throw new HttpError(405, "method_not_allowed");
      const operation = this.allocateRequest(authorization, response, {});
      try {
        operation.signal.throwIfAborted();
        const customRevision = async (file, fallback) => {
          let source;
          try {
            source = await readFile2(file, { signal: operation.signal });
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
            source = Buffer.from(fallback);
          }
          if (source.byteLength > LEGACY_CUSTOM_ASSET_LIMIT) throw new HttpError(413, "payload_too_large");
          return createHash2("sha256").update(source).digest("hex");
        };
        const [scriptRevision, styleRevision] = await Promise.all([
          customRevision(this.config.customScriptFile, CUSTOM_SCRIPT_FALLBACK),
          customRevision(this.config.customCssFile, CUSTOM_STYLE_FALLBACK)
        ]);
        const body = Buffer.from(JSON.stringify({
          protocol: 1,
          extensions: extensions.manifest(),
          legacy: { scriptRevision, styleRevision }
        }));
        const etag = `"${createHash2("sha256").update(body).update(extensions.contentDigest()).digest("hex")}"`;
        if (matchesIfNoneMatch(headerValue(request.headers, "if-none-match"), etag)) {
          setSecurityHeaders(response, this.tlsEnabled);
          response.writeHead(304, { ETag: etag });
          response.end();
          return;
        }
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.byteLength, ETag: etag });
        if (request.method === "HEAD") response.end();
        else response.end(body);
        return;
      } finally {
        operation.release();
      }
    }
    if (targetInfo.kind === "script" || targetInfo.kind === "style" || targetInfo.kind === "asset") {
      if (request.method !== "GET" && request.method !== "HEAD") throw new HttpError(405, "method_not_allowed");
      const generation = extensionGeneration(new URLSearchParams(target.search).get("generation") ?? void 0);
      const operation = this.allocateRequest(authorization, response, {});
      try {
        const file = targetInfo.kind === "script" ? await extensions.readClientFile(targetInfo.id, "script", operation.signal, generation) : targetInfo.kind === "style" ? await extensions.readClientFile(targetInfo.id, "style", operation.signal, generation) : await extensions.readAsset(targetInfo.id, targetInfo.path ?? "", operation.signal, generation);
        const etag = `"${file.digest}"`;
        if (matchesIfNoneMatch(headerValue(request.headers, "if-none-match"), etag)) {
          setSecurityHeaders(response, this.tlsEnabled);
          response.writeHead(304, { ETag: etag });
          response.end();
          return;
        }
        const contentType = targetInfo.kind === "script" ? "text/javascript; charset=utf-8" : targetInfo.kind === "style" ? "text/css; charset=utf-8" : extensionContentType(targetInfo.path ?? "");
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(200, { "Content-Type": contentType, "Content-Length": file.body.byteLength, ETag: etag });
        if (request.method === "HEAD") response.end();
        else response.end(file.body);
        return;
      } finally {
        operation.release();
      }
    }
    if (targetInfo.kind === "action") {
      if (request.method !== "POST") throw new HttpError(405, "method_not_allowed");
      const maximum = 1024 * 1024;
      assertBoundedContentLength(request, maximum);
      const generation = extensionGeneration(headerValue(request.headers, EXTENSION_GENERATION_HEADER));
      const operation = this.allocateRequest(authorization, response, {});
      const abort = new AbortController();
      response.once("close", () => {
        operation.release();
        abort.abort();
      });
      const generationSignal = extensions.signal(targetInfo.id, generation);
      const onGenerationAbort = () => {
        abort.abort();
        if (!response.destroyed) response.destroy();
      };
      generationSignal?.addEventListener("abort", onGenerationAbort, { once: true });
      try {
        const body = await readJsonObject(request, maximum);
        const result = await extensions.invoke(targetInfo.id, targetInfo.action, body, { signal: abort.signal, deviceId: authorization.deviceId }, generation);
        if (isPreparedJson(result)) {
          if (result.bytes.byteLength > 4 * 1024 * 1024) throw new MobileExtensionError("extension_result_too_large", "extension result is too large", 500);
          if (!response.headersSent && !response.destroyed) {
            const body2 = Buffer.concat([result.bytes, Buffer.from("\n")]);
            setSecurityHeaders(response, this.tlsEnabled);
            response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body2.byteLength });
            response.end(body2);
          }
        } else {
          let serialized;
          try {
            serialized = Buffer.from(JSON.stringify(result));
          } catch {
            throw new MobileExtensionError("extension_failed", "extension action failed", 500);
          }
          if (serialized.byteLength > 4 * 1024 * 1024) throw new MobileExtensionError("extension_result_too_large", "extension result is too large", 500);
          sendJson(response, 200, result, this.tlsEnabled);
        }
      } finally {
        generationSignal?.removeEventListener("abort", onGenerationAbort);
        abort.abort();
        operation.release();
      }
      return;
    }
    if (targetInfo.kind === "route") {
      const method = request.method ?? "GET";
      if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new HttpError(405, "method_not_allowed");
      const hasBody = method !== "GET" && method !== "HEAD";
      if (hasBody) assertBoundedContentLength(request, this.config.maxBodyBytes);
      const generation = extensionGeneration(headerValue(request.headers, EXTENSION_GENERATION_HEADER));
      const operation = this.allocateRequest(authorization, response, {});
      const abort = new AbortController();
      response.once("close", () => {
        operation.release();
        abort.abort();
      });
      const generationSignal = extensions.signal(targetInfo.id, generation);
      const onGenerationAbort = () => {
        abort.abort();
        if (!response.destroyed) response.destroy();
      };
      generationSignal?.addEventListener("abort", onGenerationAbort, { once: true });
      try {
        const body = hasBody ? await readBoundedBody(request, this.config.maxBodyBytes) : Buffer.alloc(0);
        const parsed = new URL(target.raw, this.address().origin);
        const routeRequest = {
          method,
          pathname: targetInfo.path,
          query: parsed.searchParams,
          headers: extensionRequestHeaders(request.headers),
          body,
          signal: abort.signal,
          deviceId: authorization.deviceId
        };
        const result = await extensions.route(targetInfo.id, method, targetInfo.path, routeRequest, generation);
        await this.sendExtensionResponse(response, result, request.method === "HEAD");
      } finally {
        generationSignal?.removeEventListener("abort", onGenerationAbort);
        abort.abort();
        operation.release();
      }
    }
  }
  async sendExtensionResponse(response, result, head) {
    try {
      const status = result.status ?? 200;
      if (!Number.isSafeInteger(status) || status < 200 || status > 599) {
        throw new MobileExtensionError("invalid_route_response", "extension returned an invalid HTTP status", 500);
      }
      const contentType = result.contentType ?? "application/octet-stream";
      if (contentType.length > 1024 || !/^[\x20-\x7e]+$/u.test(contentType) || !/^[\w!#$&+.^-]+\/[\w!#$&+.^-]+(?:;[\x20-\x7e]*)?$/u.test(contentType)) {
        throw new MobileExtensionError("invalid_route_response", "extension returned an invalid content type", 500);
      }
      const safeHeaders = {};
      for (const [name, value] of Object.entries(result.headers ?? {})) {
        if (!/^(?:content-disposition|cache-control|etag)$/iu.test(name) || /[\r\n]/u.test(value)) continue;
        safeHeaders[name] = value;
      }
      setSecurityHeaders(response, this.tlsEnabled);
      if (typeof result.body === "string" || result.body instanceof Uint8Array) {
        const body = typeof result.body === "string" ? Buffer.from(result.body) : Buffer.from(result.body);
        if (body.byteLength > 4 * 1024 * 1024) throw new MobileExtensionError("extension_result_too_large", "extension response is too large", 500);
        response.writeHead(status, { ...safeHeaders, "Content-Type": contentType, "Content-Length": body.byteLength });
        if (head) response.end();
        else response.end(body);
        return;
      }
      response.writeHead(status, { ...safeHeaders, "Content-Type": contentType });
      if (head) {
        result.body.destroy();
        response.end();
        return;
      }
    } catch (error) {
      disposeLateExtensionResponse(result);
      throw error;
    }
    await pipeline(result.body, new ByteLimitTransform(4 * 1024 * 1024), response);
  }
  /** Exchange DSH's process-local launch token for an authority-bound cookie kept inside this gateway. */
  async upstreamCookieHeader() {
    if (this.upstreamAuthenticatedUrl === void 0) return void 0;
    if (this.upstreamCookie !== void 0 && this.upstreamCookieExpiresAt > Date.now() + UPSTREAM_AUTH_REFRESH_MARGIN_MS) {
      return this.upstreamCookie;
    }
    if (this.upstreamCookieTask !== void 0) return this.upstreamCookieTask;
    const task = this.exchangeUpstreamCookie();
    this.upstreamCookieTask = task;
    try {
      return await task;
    } finally {
      if (this.upstreamCookieTask === task) this.upstreamCookieTask = void 0;
    }
  }
  async exchangeUpstreamCookie() {
    const authenticatedUrl = this.upstreamAuthenticatedUrl;
    if (authenticatedUrl === void 0) throw new HttpError(502, "upstream_unavailable");
    let target;
    try {
      target = new URL(authenticatedUrl);
    } catch {
      throw new HttpError(502, "upstream_unavailable");
    }
    if (target.origin !== this.config.upstreamOrigin.origin || target.pathname !== "/" || target.hash !== "" || target.search === "") {
      throw new HttpError(502, "upstream_unavailable");
    }
    try {
      const proxied = await new Promise((resolve3, reject) => {
        const upstreamRequest = requestHttp({
          protocol: "http:",
          hostname: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
          port: Number(this.config.upstreamOrigin.port),
          method: "GET",
          path: `${target.pathname}${target.search}`,
          headers: {
            host: this.config.upstreamOrigin.host,
            accept: "text/html",
            "accept-encoding": "identity",
            "sec-fetch-mode": "same-origin"
          },
          agent: false
        });
        this.upstreamAuthRequest = upstreamRequest;
        upstreamRequest.setTimeout(this.config.upstreamTimeoutMs, () => {
          upstreamRequest.destroy(new HttpError(504, "upstream_timeout"));
        });
        upstreamRequest.once("response", resolve3);
        upstreamRequest.once("error", reject);
        upstreamRequest.end();
      });
      await new Promise((resolve3, reject) => {
        proxied.once("end", resolve3);
        proxied.once("error", reject);
        proxied.resume();
      });
      const setCookie = proxied.headers["set-cookie"]?.[0];
      const pair = setCookie?.split(";", 1)[0];
      const maxAgeText = setCookie === void 0 ? void 0 : /(?:^|;\s*)Max-Age=(\d+)(?:;|$)/iu.exec(setCookie)?.[1];
      const maxAgeSeconds = maxAgeText === void 0 ? Number.NaN : Number(maxAgeText);
      const expiresAt = Date.now() + maxAgeSeconds * 1e3;
      if (proxied.statusCode !== 303 || pair === void 0 || pair.length > 4096 || !UPSTREAM_COOKIE_PAIR.test(pair) || !Number.isSafeInteger(expiresAt) || maxAgeSeconds <= 0) {
        throw new HttpError(502, "upstream_unavailable");
      }
      this.upstreamCookie = pair;
      this.upstreamCookieExpiresAt = expiresAt;
      return pair;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, "upstream_unavailable");
    } finally {
      this.upstreamAuthRequest?.destroy();
      this.upstreamAuthRequest = void 0;
    }
  }
  /** List installed modules and resolve the next-open selection.
   * @param deviceId - Authenticated device identity; omitted for computer defaults.
   * @param callerSignal - Cancels catalog fetching when the admin request closes.
   * @returns The installed catalog and effective module selection.
   */
  describeClientModules(deviceId, callerSignal) {
    return this.clientModulePreferenceOperation("describe", void 0, deviceId, callerSignal);
  }
  /** Persist a validated device override or computer default.
   * @param excluded - Untrusted module IDs to validate against the current boot graph.
   * @param deviceId - Authenticated device identity; omitted for computer defaults.
   * @param callerSignal - Cancels fetching and validation, not an atomic write already started.
   * @returns The catalog and saved selection without reloading clients.
   */
  configureClientModules(excluded, deviceId, callerSignal) {
    return this.clientModulePreferenceOperation("configure", excluded, deviceId, callerSignal);
  }
  /** Reset one override without reloading connected clients.
   * @param deviceId - Authenticated device identity; omitted to reset computer defaults.
   * @param callerSignal - Cancels fetching and validation, not an atomic write already started.
   * @returns The catalog and inherited selection.
   */
  resetClientModules(deviceId, callerSignal) {
    return this.clientModulePreferenceOperation("reset", void 0, deviceId, callerSignal);
  }
  async clientModulePreferenceOperation(kind, excluded, deviceId, callerSignal) {
    if (this.closing || !this.started) throw new HttpError(503, "unavailable");
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (callerSignal?.aborted === true) controller.abort();
    callerSignal?.addEventListener("abort", abort, { once: true });
    this.clientModuleOperations.add(controller);
    const task = (async () => {
      let html = "";
      const validate = async (selection2) => {
        html = (await this.fetchAuthenticatedUpstreamIndex(controller.signal)).html;
        try {
          parseMobileBootPlan(html, selection2);
        } catch (error) {
          if (error instanceof ExcludedClientModulesError) throw new ClientModuleConflictError(error.message);
          throw new HttpError(502, "upstream_unavailable");
        }
        controller.signal.throwIfAborted();
      };
      let selection;
      if (kind === "configure") {
        let ids;
        try {
          ids = parseExcludedClientModules(excluded);
        } catch {
          throw new HttpError(400, "excluded_client_modules_invalid");
        }
        selection = await this.clientModulePreferences.configure(ids, deviceId, validate);
      } else if (kind === "reset") selection = await this.clientModulePreferences.reset(deviceId, validate);
      else {
        html = (await this.fetchAuthenticatedUpstreamIndex(controller.signal)).html;
        selection = await this.clientModulePreferences.read(deviceId);
      }
      controller.signal.throwIfAborted();
      try {
        const plan = parseMobileBootPlan(html);
        return Object.freeze({
          entries: describeMobileClientModules(html),
          ...selection,
          ...plan.batches === void 0 ? { excludedClientModules: Object.freeze([]), defaultExcludedClientModules: Object.freeze([]) } : {},
          reloadRequired: true
        });
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(502, "upstream_unavailable");
      }
    })();
    this.clientModuleTasks.add(task);
    try {
      return await task;
    } finally {
      callerSignal?.removeEventListener("abort", abort);
      this.clientModuleOperations.delete(controller);
      this.clientModuleTasks.delete(task);
    }
  }
  async fetchAuthenticatedUpstreamIndex(signal, incoming, upstreamPath) {
    signal.throwIfAborted();
    let upstreamRequest;
    const abort = () => {
      upstreamRequest?.destroy(requestAbortedError());
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      const headers = incoming === void 0 ? { host: this.config.upstreamOrigin.host, accept: "text/html", "accept-encoding": "identity" } : sanitizeRequestHeaders(incoming, this.config.upstreamOrigin);
      const upstreamCookie = await waitForRequestTask(this.upstreamCookieHeader(), signal);
      signal.throwIfAborted();
      if (upstreamCookie !== void 0) headers.cookie = upstreamCookie;
      headers["accept-encoding"] = "identity";
      delete headers["if-none-match"];
      delete headers["if-modified-since"];
      const proxied = await new Promise((resolve3, reject) => {
        upstreamRequest = requestHttp({
          protocol: "http:",
          hostname: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
          port: Number(this.config.upstreamOrigin.port),
          method: "GET",
          path: upstreamPath ?? incoming?.url ?? "/",
          headers,
          agent: false
        });
        upstreamRequest.setTimeout(this.config.upstreamTimeoutMs, () => {
          upstreamRequest?.destroy(new HttpError(504, "upstream_timeout"));
        });
        upstreamRequest.once("response", resolve3);
        upstreamRequest.once("error", reject);
        upstreamRequest.end();
      });
      if (proxied.statusCode !== 200) throw new HttpError(502, "upstream_unavailable");
      const chunks = [];
      let bytes = 0;
      for await (const chunk of proxied) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > 4 * 1024 * 1024) throw new HttpError(502, "upstream_unavailable");
        chunks.push(buffer);
      }
      signal.throwIfAborted();
      return { html: Buffer.concat(chunks).toString("utf8"), headers: proxied.headers };
    } catch (error) {
      if (signal.aborted || error instanceof HttpError) throw error;
      throw new HttpError(502, "upstream_unavailable");
    } finally {
      signal.removeEventListener("abort", abort);
      upstreamRequest?.destroy();
    }
  }
  async proxyMobileIndex(request, response, authorization, stockFrontend = false) {
    const holder = {};
    const operation = this.allocateRequest(authorization, response, holder);
    const onClose = () => {
      operation.abort();
      operation.release();
    };
    response.once("close", onClose);
    try {
      const index = await this.fetchAuthenticatedUpstreamIndex(operation.signal, request);
      let body;
      if (stockFrontend) body = Buffer.from(ensureMobileGatewayMarker(index.html));
      else {
        const preference = await this.clientModulePreferences.read(authorization.deviceId);
        const excludedClientModules2 = preference.excludedClientModules;
        try {
          const html = index.html;
          const plan = parseMobileBootPlan(html, excludedClientModules2);
          const options = plan.rewrittenBatchEntries === void 0 ? { excludedClientModules: excludedClientModules2 } : { ...await this.resolveMobileBootSizes(plan.rewrittenBatchEntries.flatMap((batch) => batch.entries), operation.signal), excludedClientModules: excludedClientModules2 };
          const cookies = browserAuthCookies(request.headers.cookie);
          const csrfCookie = this.tlsEnabled && cookies.has(HOST_SESSION_COOKIE) ? HOST_CSRF_COOKIE : CSRF_COOKIE;
          const rewritten = rewriteMobileIndexWithBatch(html, { ...options, csrfCookie });
          for (const batch of rewritten.batches) this.rememberMobileBootBatch(batch);
          body = Buffer.from(rewritten.html);
        } catch (error) {
          if (error instanceof ExcludedClientModulesError) {
            const detail = error.message.replace(/[\r\n]/gu, " ").slice(0, 512);
            if (detail !== this.lastModuleExclusionError) {
              this.lastModuleExclusionError = detail;
              process.emitWarning(detail, { code: "DSH_MOBILE_MODULE_EXCLUSION_INVALID" });
            }
            if (preference.source === "device" || preference.source === "computer") {
              operation.signal.throwIfAborted();
              const locale = resolveAuthPageLocale(headerValue(request.headers, "accept-language"));
              const recovery = Buffer.from(renderClientModuleRecoveryPage(locale));
              setSecurityHeaders(response, this.tlsEnabled);
              response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": recovery.byteLength });
              response.end(recovery);
              return;
            }
            sendJson(response, 409, { error: "excluded_client_modules_invalid", detail }, this.tlsEnabled);
            return;
          }
          throw new HttpError(502, "upstream_unavailable");
        }
      }
      operation.signal.throwIfAborted();
      const headers = sanitizeResponseHeaders(index.headers, this.config.upstreamOrigin);
      delete headers["content-length"];
      delete headers["content-encoding"];
      delete headers.etag;
      setSecurityHeaders(response, this.tlsEnabled, "proxied");
      const chosen = requested === "ru" || requested === "en";
      response.writeHead(200, {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.byteLength,
        ...chosen ? { "Set-Cookie": `dshm_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax` } : {}
      });
      response.end(body);
    } catch (error) {
      holder.request?.destroy();
      if (error instanceof HttpError) throw error;
      if (response.headersSent) response.destroy();
      else throw new HttpError(502, "upstream_unavailable");
    } finally {
      response.removeListener("close", onClose);
      operation.release();
    }
  }
  /**
   * Serve our own mobile document: the harness index with our layer injected.
   *
   * Why not rewrite the index wholesale: the harness's client bundle *is* the
   * conversation surface, and replacing it means reimplementing chats, tools and
   * streaming against DSH's API. What we replace is the layer around it — which is where
   * every measured defect lived.
   */
  async proxyOwnMobilePage(request, response, authorization) {
    const holder = {};
    const operation = this.allocateRequest(authorization, response, holder);
    const onClose = () => {
      operation.abort();
      operation.release();
    };
    response.once("close", onClose);
    try {
      const index = await this.fetchAuthenticatedUpstreamIndex(operation.signal, request, "/");
      const layer = await readLayer();
      const requested2 = new URL(request.url ?? "/", "http://localhost").searchParams.get("lang");
      const remembered = /(?:^|;\s*)dshm_lang=(ru|en)/u.exec(headerValue(request.headers, "cookie") ?? "")?.[1];
      const language2 = requested2 === "ru" || requested2 === "en" ? requested2 : remembered ?? (/^\s*ru\b/iu.test(headerValue(request.headers, "accept-language")) ? "ru" : "en");
      const body = Buffer.from(injectLayer(index.html, layer, language2));
      operation.signal.throwIfAborted();
      const headers = sanitizeResponseHeaders(index.headers, this.config.upstreamOrigin);
      delete headers["content-length"];
      delete headers["content-encoding"];
      delete headers.etag;
      setSecurityHeaders(response, this.tlsEnabled, "proxied");
      const chosen = requested2 === "ru" || requested2 === "en";
      response.writeHead(200, {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.byteLength,
        ...chosen ? { "Set-Cookie": `dshm_lang=${language2}; Path=/; Max-Age=31536000; SameSite=Lax` } : {}
      });
      response.end(body);
    } catch (error) {
      holder.request?.destroy();
      process.emitWarning(`dsh-remote /m failed: ${error instanceof Error ? error.message : String(error)}`, { code: "DSH_REMOTE_M_FAILED" });
      if (error instanceof HttpError) throw error;
      if (response.headersSent) response.destroy();
      else throw new HttpError(502, "upstream_unavailable");
    } finally {
      response.removeListener("close", onClose);
      operation.release();
    }
  }
  /**
   * Отвечает на запросы выбора каталога от телефона.
   *
   * Формат ответа взят из контракта DSH: `{path, home, crumbs, entries, truncated}`.
   * Аргумент приходит по-разному в зависимости от версии транспорта, поэтому и `{path}`,
   * и `{args:[path]}`, и пустое тело понимаются одинаково — начинаем с домашнего каталога.
   */
  /**
   * Отвечает на запросы выбора каталога от телефона.
   *
   * Транспорт клиента — не fetch и не XHR, а собственный RPC: запрос приходит как
   * `{type:'client-request', rpcId, method, payload}`, ответ обязан быть
   * `{type:'server-response', rpcId, result:{ok:true, value}}`. Без этого конверта клиент
   * отвечает «invalid server-response envelope» — так и было на первой попытке.
   */
  async serveDirectoryPicker(request, response, pathname) {
    const home = homedir();
    const body = await readJsonObject(request, 64 * 1024).catch(() => ({}));
    const envelope = body;
    const rpcId = typeof envelope.rpcId === "string" ? envelope.rpcId : void 0;
    const payload = envelope.payload ?? {};
    const argsPath = payload.args?.path;
    const candidate = typeof argsPath === "string" ? argsPath : typeof payload.path === "string" ? payload.path : typeof envelope.path === "string" ? envelope.path : Array.isArray(envelope.args) && typeof envelope.args[0] === "string" ? envelope.args[0] : home;
    const target = candidate.startsWith("~") ? join2(home, candidate.slice(1)) : candidate;
    const resolved = resolve(target);
    const reply = (value, status = 200) => {
      const wrapped = { type: "server-response", rpcId: rpcId ?? "unknown", result: { ok: true, value } };
      response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(wrapped));
    };
    if (pathname === "/api/directoryPicker/list") {
      let entries = [];
      let truncated = false;
      try {
        const dirents = await readdir(resolved, { withFileTypes: true });
        const directories = dirents.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => ({ name: entry.name, path: join2(resolved, entry.name), hidden: entry.name.startsWith(".") })).sort((a, b) => a.name.localeCompare(b.name));
        truncated = directories.length > 500;
        entries = directories.slice(0, 500);
      } catch {
      }
      const crumbs = [{ name: "Home", path: home, hidden: false }];
      const relative = resolved.startsWith(home) ? resolved.slice(home.length).split(sep).filter(Boolean) : [];
      let cursor = home;
      for (const part of relative) {
        cursor = join2(cursor, part);
        crumbs.push({ name: part, path: cursor, hidden: part.startsWith(".") });
      }
      reply({ path: resolved, home, crumbs, entries, truncated });
      return;
    }
    if (pathname === "/api/directoryPicker/pick" || pathname === "/api/directoryPicker/createDirectory") {
      reply(null);
      return;
    }
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not_found" }));
  }
  rememberMobileBootBatch(plan) {
    const existing = this.mobileBootBatches.get(plan.key);
    this.mobileBootBatches.delete(plan.key);
    this.mobileBootBatches.set(plan.key, existing ?? { plan });
    while (this.mobileBootBatches.size > MAX_MOBILE_BOOT_BATCHES) {
      const oldest = this.mobileBootBatches.keys().next().value;
      if (oldest === void 0) break;
      this.mobileBootBatches.get(oldest)?.assembly?.controller.abort();
      this.mobileBootBatches.delete(oldest);
    }
  }
  /**
   * Determine which layout-batch entries can share a merged boot batch and which
   * must pass through. An entry at or above the per-entry cap, or one whose size
   * could not be probed, keeps its own upstream `/plugins` row: a merged batch
   * cannot carry it, and an unknown bundle must not risk the whole batch.
   */
  async resolveMobileBootSizes(planEntries, signal) {
    const sizes = /* @__PURE__ */ new Map();
    const passThrough = /* @__PURE__ */ new Set();
    const candidates = planEntries.filter((entry) => entry.id !== MOBILE_LAYOUT_MODULE && upstreamPluginBundleUrl(entry.url, this.config.upstreamOrigin) !== void 0);
    let cursor = 0;
    const worker = async () => {
      while (cursor < candidates.length) {
        signal?.throwIfAborted();
        const index = cursor++;
        const source = candidates[index].url;
        const size = await this.upstreamBundleSize(source, signal);
        if (size === void 0 || size >= MAX_MOBILE_BOOT_ENTRY_BYTES) passThrough.add(source);
        else sizes.set(source, size);
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, candidates.length) }, worker));
    return { sizes, passThrough };
  }
  /**
   * Measure one upstream bundle by reading its body. The upstream serves
   * `/plugins` bundles as chunked streams without a Content-Length, so a probe
   * counts bytes; it aborts instantly past the per-entry cap. Measurements are
   * cached for a short window.
   */
  async upstreamBundleSize(source, signal) {
    signal?.throwIfAborted();
    const target = upstreamPluginBundleUrl(source, this.config.upstreamOrigin);
    if (target === void 0) return void 0;
    const cached = this.bootEntrySizeCache.get(source);
    if (cached !== void 0 && Date.now() - cached.at < MOBILE_BOOT_SIZE_CACHE_TTL_MS) return cached.size;
    let upstreamRequest;
    const abort = () => {
      upstreamRequest?.destroy(requestAbortedError());
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const upstreamCookie = signal === void 0 ? await this.upstreamCookieHeader() : await waitForRequestTask(this.upstreamCookieHeader(), signal);
      signal?.throwIfAborted();
      const proxied = await new Promise((resolve3, reject) => {
        upstreamRequest = requestHttp({
          protocol: "http:",
          hostname: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
          port: Number(this.config.upstreamOrigin.port),
          method: "GET",
          path: `${target.pathname}${target.search}`,
          headers: {
            host: this.config.upstreamOrigin.host,
            accept: "text/javascript",
            "accept-encoding": "identity",
            [MOBILE_BOOT_SIZE_PROBE_HEADER]: "1",
            ...upstreamCookie === void 0 ? {} : { cookie: upstreamCookie }
          },
          agent: false
        });
        upstreamRequest.setTimeout(this.config.upstreamTimeoutMs, () => {
          upstreamRequest?.destroy(upstreamTimeoutError());
        });
        upstreamRequest.once("response", resolve3);
        upstreamRequest.once("error", reject);
        upstreamRequest.end();
      });
      if (proxied.statusCode !== 200) {
        proxied.resume();
        return void 0;
      }
      const size = await new Promise((resolve3, reject) => {
        let bytes = 0;
        proxied.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_MOBILE_BOOT_ENTRY_BYTES) {
            proxied.destroy();
            resolve3(void 0);
          }
        });
        proxied.once("end", () => resolve3(bytes));
        proxied.once("error", reject);
      });
      if (size === void 0) return void 0;
      this.bootEntrySizeCache.set(source, { size, at: Date.now() });
      return size;
    } catch (error) {
      if (signal?.aborted === true) throw error;
      return void 0;
    } finally {
      signal?.removeEventListener("abort", abort);
      upstreamRequest?.destroy();
    }
  }
  async serveMobileBootBatch(key, request, response, authorization) {
    if (request.method !== "GET" && request.method !== "HEAD") throw new HttpError(405, "method_not_allowed");
    const stored = this.mobileBootBatches.get(key);
    if (stored === void 0) throw new HttpError(404, "not_found");
    const operation = this.allocateRequest(authorization, response, {});
    response.once("close", operation.abort);
    try {
      const layoutStat = await stat(this.config.mobileLayoutFile);
      if (stored.body === void 0 || stored.etag === void 0 || stored.layoutMtimeMs !== layoutStat.mtimeMs) {
        operation.signal.throwIfAborted();
        const assembly = stored.assembly ?? this.startMobileBootBatchAssembly(stored, layoutStat.mtimeMs);
        await waitForRequestTask(assembly.task, operation.signal);
      }
      const compressed = acceptsGzip(request.headers["accept-encoding"]);
      const assembled = stored.body;
      if (assembled === void 0) throw new HttpError(502, "upstream_unavailable");
      const body = compressed ? stored.gzipBody ??= await gzipBuffer(assembled) : assembled;
      const etag = `"${compressed ? `${stored.etag}-gzip` : stored.etag}"`;
      const headers = {
        "Content-Type": "text/javascript; charset=utf-8",
        "Content-Length": body.byteLength,
        "Cache-Control": "private, no-cache",
        ETag: etag
      };
      if (compressed) headers["Content-Encoding"] = "gzip";
      addVaryAcceptEncoding(headers);
      if (matchesIfNoneMatch(headerValue(request.headers, "if-none-match"), etag)) {
        setSecurityHeaders(response, this.tlsEnabled);
        response.writeHead(304, { ETag: etag, "Cache-Control": "private, no-cache", Vary: String(headers.vary) });
        response.end();
        return;
      }
      setSecurityHeaders(response, this.tlsEnabled);
      response.writeHead(200, headers);
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch (error) {
      if (error.code === "ENOENT") throw new HttpError(503, "mobile_frontend_unavailable");
      throw error;
    } finally {
      response.removeListener("close", operation.abort);
      operation.release();
    }
  }
  startMobileBootBatchAssembly(stored, layoutMtimeMs) {
    const controller = new AbortController();
    const task = (async () => {
      const body = await this.assembleMobileBootBatch(stored.plan, controller.signal);
      stored.body = body;
      delete stored.gzipBody;
      stored.etag = createHash2("sha256").update(body).digest("hex");
      stored.layoutMtimeMs = layoutMtimeMs;
      return body;
    })();
    const assembly = Object.freeze({ controller, task });
    stored.assembly = assembly;
    void task.then(
      () => {
        if (stored.assembly === assembly) delete stored.assembly;
      },
      () => {
        if (stored.assembly === assembly) delete stored.assembly;
      }
    );
    return assembly;
  }
  async assembleMobileBootBatch(plan, signal) {
    const bodies = new Array(plan.entries.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < plan.entries.length) {
        const index = cursor++;
        const entry = plan.entries[index];
        bodies[index] = entry.id === MOBILE_LAYOUT_MODULE ? await readFile2(this.config.mobileLayoutFile, { signal }) : await this.readUpstreamClientBundleWithRetry(entry.url, signal);
        if (bodies[index].byteLength > MAX_MOBILE_BOOT_ENTRY_BYTES) throw new HttpError(502, "upstream_unavailable");
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, plan.entries.length) }, worker));
    const total = bodies.reduce((bytes, body) => bytes + body.byteLength + MOBILE_BOOT_SEPARATOR_BYTES, 0);
    if (total > MAX_MOBILE_BOOT_BATCH_BYTES) throw new HttpError(502, "upstream_unavailable");
    return Buffer.concat(bodies.flatMap((body) => [body, Buffer.from("\n;\n")]));
  }
  /**
   * Read one upstream bundle, retrying transient connection failures.
   *
   * Assembling a batch fans out over every client entry, and the upstream
   * resets a fraction of those connections before sending a byte
   * (`read ECONNRESET`, recv=0) — randomly, on any entry, at any concurrency.
   * A single such reset used to fail the whole batch with 502
   * `upstream_unavailable`, surfacing in the browser as "bundle script
   * /mobile-access/mobile-boot/<hash>.js failed to load". Retrying recovers
   * every observed reset; a genuine upstream error still fails.
   */
  async readUpstreamClientBundleWithRetry(source, signal) {
    for (let attempt = 1; attempt <= MOBILE_BOOT_UPSTREAM_ATTEMPTS; attempt++) {
      signal.throwIfAborted();
      try {
        return await this.readUpstreamClientBundle(source, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        if (!isTransientUpstreamError(error)) throw error;
        if (attempt === MOBILE_BOOT_UPSTREAM_ATTEMPTS) throw new HttpError(502, "upstream_unavailable");
        await waitForAbortableDelay(MOBILE_BOOT_RETRY_DELAY_MS * attempt, signal);
      }
    }
    throw new HttpError(502, "upstream_unavailable");
  }
  async readUpstreamClientBundle(source, signal) {
    signal.throwIfAborted();
    const target = upstreamPluginBundleUrl(source, this.config.upstreamOrigin);
    if (target === void 0) throw new HttpError(502, "upstream_unavailable");
    let upstreamRequest;
    const aborted = () => {
      upstreamRequest?.destroy(new Error("request aborted"));
    };
    signal.addEventListener("abort", aborted, { once: true });
    try {
      const upstreamCookie = await this.upstreamCookieHeader();
      signal.throwIfAborted();
      const proxied = await new Promise((resolve3, reject) => {
        upstreamRequest = requestHttp({
          protocol: "http:",
          hostname: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
          port: Number(this.config.upstreamOrigin.port),
          method: "GET",
          path: `${target.pathname}${target.search}`,
          headers: {
            host: this.config.upstreamOrigin.host,
            accept: "text/javascript",
            "accept-encoding": "identity",
            ...upstreamCookie === void 0 ? {} : { cookie: upstreamCookie }
          },
          agent: false
        });
        upstreamRequest.setTimeout(this.config.upstreamTimeoutMs, () => {
          upstreamRequest?.destroy(upstreamTimeoutError());
        });
        upstreamRequest.once("response", resolve3);
        upstreamRequest.once("error", reject);
        upstreamRequest.end();
      });
      if ((proxied.statusCode ?? 502) !== 200) throw new HttpError(502, "upstream_unavailable");
      const chunks = [];
      let bytes = 0;
      for await (const chunk of proxied) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_MOBILE_BOOT_ENTRY_BYTES) throw new HttpError(502, "upstream_unavailable");
        chunks.push(buffer);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (signal.aborted || isTransientUpstreamError(error)) throw error;
      throw new HttpError(502, "upstream_unavailable");
    } finally {
      signal.removeEventListener("abort", aborted);
      upstreamRequest?.destroy();
    }
  }
  allocateRequest(authorization, response, upstream) {
    if (this.closing || response.destroyed || response.writableEnded) throw requestAbortedError();
    if (this.activeRequests.size >= this.config.maxActiveRequests) throw new HttpError(429, "busy");
    const id = this.nextOperationId++;
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      upstream.request?.destroy();
      if (!response.destroyed) response.destroy();
    };
    const timer = setTimeout(abort, Math.max(1, authorization.expiresAt - Date.now()));
    timer.unref();
    this.activeRequests.set(id, Object.freeze({ ...authorization, abort, timer }));
    return {
      id,
      signal: controller.signal,
      abort,
      release: () => {
        const entry = this.activeRequests.get(id);
        if (entry !== void 0) clearTimeout(entry.timer);
        this.activeRequests.delete(id);
      }
    };
  }
  /**
   * Proxy one request, retrying transient failures for plugin and asset GETs.
   * Only bodyless GETs can be replayed, before response headers reach the client.
   * One request slot and cancellation signal cover attempts and backoff together.
   * API requests and requests with bodies are forwarded once.
   */
  async proxyHttp(request, response, authorization) {
    const declared = request.headers["content-length"];
    if (declared !== void 0 && (!/^\d+$/u.test(declared) || Number(declared) > this.config.maxBodyBytes)) {
      throw new HttpError(413, "payload_too_large");
    }
    const replayable = request.method === "GET" && request.headers["transfer-encoding"] === void 0 && (declared === void 0 || Number(declared) === 0) && (request.url?.split("?", 1)[0]?.startsWith("/plugins/") === true || request.url?.split("?", 1)[0]?.startsWith("/assets/") === true);
    const holder = {};
    const operation = this.allocateRequest(authorization, response, holder);
    const onClose = () => {
      operation.release();
      operation.abort();
    };
    response.once("close", onClose);
    if (replayable) request.resume();
    try {
      const attempts = replayable ? MOBILE_BOOT_UPSTREAM_ATTEMPTS : 1;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        operation.signal.throwIfAborted();
        try {
          await this.proxyHttpOnce(request, response, holder, operation.signal, replayable);
          return;
        } catch (error) {
          if (operation.signal.aborted || response.destroyed) return;
          if (response.headersSent) {
            response.destroy();
            return;
          }
          if (error instanceof HttpError || !isTransientUpstreamError(error)) {
            throw error instanceof HttpError ? error : new HttpError(502, "upstream_unavailable");
          }
          if (attempt === attempts) throw new HttpError(502, "upstream_unavailable");
          await waitForAbortableDelay(MOBILE_BOOT_RETRY_DELAY_MS * attempt, operation.signal);
        }
      }
    } catch (error) {
      if (!operation.signal.aborted) throw error;
    } finally {
      response.removeListener("close", onClose);
      operation.release();
    }
  }
  async proxyHttpOnce(request, response, holder, signal, replayable) {
    let bodyDone;
    try {
      const upstreamHeaders = sanitizeRequestHeaders(request, this.config.upstreamOrigin);
      if (request.headers["transfer-encoding"] !== void 0) {
        upstreamHeaders["transfer-encoding"] = request.headers["transfer-encoding"];
      }
      const upstreamCookie = await this.upstreamCookieHeader();
      signal.throwIfAborted();
      if (upstreamCookie !== void 0) upstreamHeaders.cookie = upstreamCookie;
      const upstreamResponse = new Promise((resolve3, reject) => {
        const upstreamRequest = requestHttp({
          protocol: "http:",
          hostname: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
          port: Number(this.config.upstreamOrigin.port),
          method: request.method,
          path: request.url,
          headers: upstreamHeaders,
          agent: false
        });
        holder.request = upstreamRequest;
        upstreamRequest.setTimeout(this.config.upstreamTimeoutMs, () => {
          upstreamRequest.destroy(new HttpError(504, "upstream_timeout"));
        });
        const pathname = parseRequestTarget(request.url).decodedPathname;
        if (pathname === "/api" || pathname.startsWith("/api/")) {
          upstreamRequest.once("finish", () => {
            upstreamRequest.setTimeout(this.config.upstreamApiTimeoutMs);
          });
        }
        upstreamRequest.once("response", resolve3);
        upstreamRequest.once("error", reject);
        if (replayable) upstreamRequest.end();
        else {
          bodyDone = pipeline(request, new ByteLimitTransform(this.config.maxBodyBytes), upstreamRequest);
          void bodyDone.catch(reject);
        }
      });
      const proxied = await upstreamResponse;
      setSecurityHeaders(response, this.tlsEnabled, "proxied");
      const headers = sanitizeResponseHeaders(proxied.headers, this.config.upstreamOrigin);
      const statusCode = proxied.statusCode ?? 502;
      const cacheControl = revisionedStaticCacheControl(request, statusCode);
      if (cacheControl !== void 0) headers["cache-control"] = cacheControl;
      const compressible = canCompressResponse(request, proxied);
      const compressed = compressible && acceptsGzip(request.headers["accept-encoding"]);
      if (compressible) addVaryAcceptEncoding(headers);
      if (compressed) {
        delete headers["accept-ranges"];
        delete headers["content-length"];
        const etag = weakenEntityTag(proxied.headers.etag);
        if (etag === void 0) delete headers.etag;
        else headers.etag = etag;
        headers["content-encoding"] = "gzip";
      } else if (statusCode === 304 && (request.method === "GET" || request.method === "HEAD") && request.headers.range === void 0 && (request.url?.split("?", 1)[0]?.startsWith("/plugins/") === true || request.url?.split("?", 1)[0]?.startsWith("/assets/") === true)) {
        if (proxied.headers["content-encoding"] === void 0 && acceptsGzip(request.headers["accept-encoding"])) {
          delete headers["content-length"];
          delete headers["accept-ranges"];
          const etag = weakenEntityTag(proxied.headers.etag);
          if (etag === void 0) delete headers.etag;
          else headers.etag = etag;
        }
        addVaryAcceptEncoding(headers);
      }
      response.writeHead(statusCode, headers);
      await Promise.all([
        bodyDone,
        compressed && request.method !== "HEAD" ? pipeline(proxied, createGzip(), response) : pipeline(proxied, response)
      ]);
    } catch (error) {
      holder.request?.destroy();
      await bodyDone?.catch(() => void 0);
      if (error instanceof HttpError) throw error;
      if (response.headersSent) response.destroy();
      throw error;
    } finally {
      delete holder.request;
    }
  }
  abortSessionResources(sessionKey) {
    for (const request of this.activeRequests.values()) {
      if (request.sessionKey === sessionKey) request.abort();
    }
    for (const socket of this.activeWebSockets.values()) {
      if (socket.sessionKey === sessionKey) {
        socket.client.destroy();
        socket.upstream.destroy();
      }
    }
  }
  broadcastExtensionChange() {
    if (this.closing) return;
    this.extensionEventRevision += 1;
    for (const listener of this.extensionEventListeners) listener(this.extensionEventRevision);
  }
  /** Fan a completed task to every phone holding this gateway's event stream. */
  broadcastTaskEvent(event) {
    if (this.closing) return;
    const payload = JSON.stringify({ sessionId: String(event.sessionId), turn: Number(event.turn) || 0 });
    for (const listener of this.taskEventListeners) listener(payload);
  }
  /** Notify only the device whose persistent credential was revoked by the Host. */
  broadcastDeviceRevoked(deviceId) {
    const listeners = this.deviceEventListeners.get(deviceId);
    if (listeners === void 0) return;
    const payload = JSON.stringify({ reason: "device_revoked" });
    for (const listener of [...listeners]) listener(payload);
  }
  pollLegacyCustomChanges() {
    if (this.extensionChangeTask !== void 0) return this.extensionChangeTask;
    const digestFile = async (path, fallback) => {
      try {
        const info = await stat(path);
        if (!info.isFile() || info.size > LEGACY_CUSTOM_ASSET_LIMIT) return `invalid:${String(info.size)}:${String(info.mtimeMs)}`;
        return createHash2("sha256").update(await readFile2(path)).digest("hex");
      } catch (error) {
        if (error.code === "ENOENT") return createHash2("sha256").update(fallback).digest("hex");
        return `error:${String(error.code ?? "unknown")}`;
      }
    };
    const task = Promise.all([
      digestFile(this.config.customScriptFile, CUSTOM_SCRIPT_FALLBACK),
      digestFile(this.config.customCssFile, CUSTOM_STYLE_FALLBACK)
    ]).then((parts) => {
      const next = createHash2("sha256").update(parts.join("|")).digest("hex");
      if (this.legacyCustomDigest !== "" && next !== this.legacyCustomDigest) this.broadcastExtensionChange();
      this.legacyCustomDigest = next;
    }).finally(() => {
      if (this.extensionChangeTask === task) this.extensionChangeTask = void 0;
    });
    this.extensionChangeTask = task;
    return task;
  }
  openExtensionEventStream(request, response, authorization) {
    const operation = this.allocateRequest(authorization, response, {});
    let closed = false;
    let heartbeat;
    const close = () => {
      if (closed) return;
      closed = true;
      if (heartbeat !== void 0) clearInterval(heartbeat);
      this.extensionEventListeners.delete(send);
      this.taskEventListeners.delete(sendTask);
      const deviceListeners2 = this.deviceEventListeners.get(authorization.deviceId);
      deviceListeners2?.delete(sendDevice);
      if (deviceListeners2?.size === 0) this.deviceEventListeners.delete(authorization.deviceId);
      request.removeListener("aborted", close);
      response.removeListener("close", close);
      operation.release();
    };
    const send = (revision) => {
      if (closed || response.destroyed || response.writableEnded) return;
      response.write(`id: ${String(revision)}
event: extensions-changed
data: {"revision":${String(revision)}}

`);
    };
    const sendTask = (payload) => {
      if (closed || response.destroyed || response.writableEnded) return;
      response.write(`event: task-notify
data: ${payload}

`);
    };
    const sendDevice = (payload) => {
      if (closed || response.destroyed || response.writableEnded) return;
      response.write(`event: device-revoked
data: ${payload}

`);
    };
    setSecurityHeaders(response, this.tlsEnabled);
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    response.write("retry: 2000\n: ready\n\n");
    this.extensionEventListeners.add(send);
    this.taskEventListeners.add(sendTask);
    const deviceListeners = this.deviceEventListeners.get(authorization.deviceId) ?? /* @__PURE__ */ new Set();
    deviceListeners.add(sendDevice);
    this.deviceEventListeners.set(authorization.deviceId, deviceListeners);
    heartbeat = setInterval(() => {
      if (!closed && !response.destroyed && !response.writableEnded) response.write(": heartbeat\n\n");
    }, EXTENSION_EVENT_HEARTBEAT_MS);
    heartbeat.unref();
    request.once("aborted", close);
    response.once("close", close);
  }
  async readUpgradeResponse(upstream, expectedAccept) {
    return new Promise((resolve3, reject) => {
      let buffer = Buffer.alloc(0);
      const failed = (error) => {
        cleanup();
        reject(error);
      };
      const closed = () => {
        cleanup();
        reject(new Error("upstream closed during WebSocket handshake"));
      };
      const data = (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) {
          if (buffer.length >= MAX_HEADER_BYTES) failed(new Error("upstream WebSocket headers are too large"));
          return;
        }
        if (end + 4 > MAX_HEADER_BYTES) {
          failed(new Error("upstream WebSocket headers are too large"));
          return;
        }
        cleanup();
        const lines = buffer.subarray(0, end).toString("latin1").split("\r\n");
        if (lines.shift() !== "HTTP/1.1 101 Switching Protocols") {
          reject(new Error("upstream refused WebSocket upgrade"));
          return;
        }
        const selected = /* @__PURE__ */ new Map();
        for (const line of lines) {
          const colon = line.indexOf(":");
          if (colon <= 0) {
            reject(new Error("upstream returned malformed WebSocket headers"));
            return;
          }
          const name = line.slice(0, colon).trim().toLowerCase();
          const value = line.slice(colon + 1).trim();
          if (selected.has(name)) {
            reject(new Error("upstream returned duplicate WebSocket headers"));
            return;
          }
          selected.set(name, value);
        }
        if (selected.get("upgrade")?.toLowerCase() !== "websocket" || !hasToken(selected.get("connection"), "upgrade") || selected.get("sec-websocket-accept") !== expectedAccept) {
          reject(new Error("upstream returned an invalid WebSocket handshake"));
          return;
        }
        const output = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${expectedAccept}`
        ];
        const protocol = selected.get("sec-websocket-protocol");
        const extensions = selected.get("sec-websocket-extensions");
        if (protocol !== void 0) output.push(`Sec-WebSocket-Protocol: ${protocol}`);
        if (extensions !== void 0) output.push(`Sec-WebSocket-Extensions: ${extensions}`);
        output.push("Referrer-Policy: no-referrer", "X-Content-Type-Options: nosniff", "", "");
        resolve3({ header: output.join("\r\n"), remainder: buffer.subarray(end + 4) });
      };
      const cleanup = () => {
        upstream.off("data", data);
        upstream.off("error", failed);
        upstream.off("close", closed);
      };
      upstream.on("data", data);
      upstream.once("error", failed);
      upstream.once("close", closed);
    });
  }
  /** Snapshot of rejected upgrade paths for the approval UI (newest first). */
  blockedUpgradePathReport() {
    return this.blockedUpgradeLog?.report() ?? [];
  }
  async handleUpgrade(request, client, head) {
    const target = parseRequestTarget(request.url);
    const policy = this.requirePolicy();
    assertExternalTrust(request, policy, false);
    if (!policy.acceptsOrigin(request.headers.origin)) throw new HttpError(403, "forbidden");
    const upgradeAllowed = WS_PATHS.has(target.decodedPathname) || (this.extraWebSocketPaths?.has(target.decodedPathname) ?? false);
    if (!upgradeAllowed) {
      this.blockedUpgradeLog?.record(target.decodedPathname);
      throw new HttpError(404, "not_found");
    }
    if (request.method !== "GET" || headerValue(request.headers, "upgrade")?.toLowerCase() !== "websocket" || !hasToken(headerValue(request.headers, "connection"), "upgrade")) {
      throw new HttpError(400, "bad_request");
    }
    const key = headerValue(request.headers, "sec-websocket-key");
    if (key === void 0 || headerValue(request.headers, "sec-websocket-version") !== "13") {
      throw new HttpError(400, "bad_request");
    }
    let decodedKey;
    try {
      decodedKey = Buffer.from(key, "base64");
    } catch {
      throw new HttpError(400, "bad_request");
    }
    if (decodedKey.length !== 16 || decodedKey.toString("base64") !== key) throw new HttpError(400, "bad_request");
    let authorization = this.authorize(request);
    if (this.activeWebSockets.size >= this.config.maxWebSockets) throw new HttpError(429, "busy");
    const upstreamCookie = await this.upstreamCookieHeader();
    if (client.destroyed) return;
    authorization = this.authorize(request);
    if (this.activeWebSockets.size >= this.config.maxWebSockets) throw new HttpError(429, "busy");
    const compressed = this.config.websocketCompression.paths.includes(target.decodedPathname);
    const upstream = connect({
      host: stripIpv6Brackets(this.config.upstreamOrigin.hostname),
      port: Number(this.config.upstreamOrigin.port)
    });
    client.pause();
    const id = this.nextOperationId++;
    const closeBoth = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("error", closeBoth);
    upstream.on("error", closeBoth);
    const timer = setTimeout(closeBoth, Math.max(1, authorization.expiresAt - Date.now()));
    timer.unref();
    const record = Object.freeze({ ...authorization, client, upstream, timer });
    this.activeWebSockets.set(id, record);
    const cleanup = () => {
      if (compressed && (!client.destroyed || !upstream.destroyed)) return;
      const active = this.activeWebSockets.get(id);
      if (active !== void 0) clearTimeout(active.timer);
      this.activeWebSockets.delete(id);
    };
    client.once("close", () => {
      if (!compressed) upstream.destroy();
      cleanup();
    });
    upstream.once("close", () => {
      if (!compressed) client.destroy();
      cleanup();
    });
    upstream.setTimeout(this.config.upstreamTimeoutMs, closeBoth);
    try {
      if (compressed) {
        const upstreamTarget = new URL(this.config.upstreamOrigin.href);
        const compressionTarget = upstreamTarget;
        compressionTarget.pathname = target.pathname;
        compressionTarget.search = target.search;
        await bridgeCompressedWebSocket(
          request,
          client,
          upstream,
          head,
          compressionTarget,
          upstreamCookie,
          this.config.websocketCompression,
          this.config.upstreamTimeoutMs
        );
        return;
      }
      await new Promise((resolve3, reject) => {
        const connected = () => {
          upstream.off("error", failed);
          resolve3();
        };
        const failed = (error) => {
          upstream.off("connect", connected);
          reject(error);
        };
        upstream.once("connect", connected);
        upstream.once("error", failed);
      });
      const requestLines = [
        `GET ${target.raw} HTTP/1.1`,
        `Host: ${this.config.upstreamOrigin.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Origin: ${this.config.upstreamOrigin.origin}`,
        "Sec-Fetch-Site: same-origin",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13"
      ];
      if (upstreamCookie !== void 0) requestLines.push(`Cookie: ${upstreamCookie}`);
      const protocol = headerValue(request.headers, "sec-websocket-protocol");
      const extensions = headerValue(request.headers, "sec-websocket-extensions");
      if (protocol !== void 0) requestLines.push(`Sec-WebSocket-Protocol: ${protocol}`);
      if (extensions !== void 0) requestLines.push(`Sec-WebSocket-Extensions: ${extensions}`);
      requestLines.push("", "");
      upstream.write(requestLines.join("\r\n"));
      if (head.length > 0) upstream.write(head);
      const handshake = await this.readUpgradeResponse(upstream, websocketAccept(key));
      upstream.setTimeout(0);
      client.write(handshake.header);
      if (handshake.remainder.length > 0) client.write(handshake.remainder);
      upstream.pipe(client);
      client.pipe(upstream);
      client.resume();
    } catch (error) {
      closeBoth();
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, "upstream_unavailable");
    }
  }
  /** Loopback-only DSH WebServer route for opening pairing and managing devices. */
  localAdminRoute(prefix = LOCAL_ADMIN_PREFIX, authenticateDesktop) {
    return {
      kind: "prefix",
      path: prefix,
      handler: async (request, response) => {
        try {
          const target = parseRequestTarget(request.url);
          const mutation = request.method === "POST";
          assertLocalAdminTrust(request, mutation, () => authenticateDesktop?.(request) === true);
          if (target.search !== "") throw new HttpError(400, "bad_request");
          if (request.method === "GET" && target.decodedPathname === `${prefix}/status`) {
            sendJson(response, 200, {
              gateway: this.address(),
              pairing: this.access.pairingStatus(),
              deviceCount: this.access.listDevices().length,
              resources: {
                connections: this.connectedSockets.size,
                activeRequests: this.activeRequests.size,
                webSockets: this.activeWebSockets.size
              },
              discovery: this.discoveryStatus()
            }, false);
            return;
          }
          if (request.method === "GET" && target.decodedPathname === `${prefix}/devices`) {
            sendJson(response, 200, { devices: this.access.listDevices() }, false);
            return;
          }
          if (request.method === "POST" && target.decodedPathname === `${prefix}/pairing/open`) {
            const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
            if (body.ttlMs !== void 0 && typeof body.ttlMs !== "number") throw new HttpError(400, "bad_request");
            const opened = await this.access.openPairing(body.ttlMs);
            const requiresRemoteCa = this.config.pairingCaFile !== void 0 && !this.config.discovery;
            const appKey = `dsh${requiresRemoteCa ? "2" : "1"}.${this.config.instanceId}.${opened.token}`;
            const fragment = requiresRemoteCa ? `key=${appKey}` : `instance=${this.config.instanceId}&token=${opened.token}`;
            const pairUrl = `${this.address().origin}/mobile-access/pair#${fragment}`;
            const appPairUrl = pairUrl;
            let qrSvg = "";
            try {
              qrSvg = await toString(appPairUrl, { type: "svg", margin: 1 });
            } catch {
            }
            sendJson(response, 201, {
              ...opened,
              appKey,
              pairUrl,
              appPairUrl,
              qrSvg
            }, false);
            return;
          }
          if (request.method === "POST" && target.decodedPathname === `${prefix}/devices/revoke`) {
            const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
            if (typeof body.deviceId !== "string" || !/^[a-f\d]{32}$/u.test(body.deviceId)) {
              throw new HttpError(400, "bad_request");
            }
            const revoked = await this.access.revokeDevice(body.deviceId);
            if (!revoked) throw new HttpError(404, "not_found");
            await this.clientModulePreferences.removeDevice(body.deviceId).catch(() => {
              process.emitWarning("Unable to remove revoked device client preferences", { code: "DSH_MOBILE_PREFERENCE_CLEANUP_FAILED" });
            });
            sendJson(response, 200, { revoked: true }, false);
            return;
          }
          if (request.method === "POST" && target.decodedPathname === `${prefix}/devices/reset`) {
            const body = await readJsonObject(request, MAX_CONTROL_BODY_BYTES);
            if (body.confirm !== true) throw new HttpError(400, "bad_request");
            const removed = this.access.listDevices().map((device) => device.id);
            await this.access.resetDevices();
            await this.clientModulePreferences.removeDevices(removed).catch(() => {
              process.emitWarning("Unable to remove revoked device client preferences", { code: "DSH_MOBILE_PREFERENCE_CLEANUP_FAILED" });
            });
            sendJson(response, 200, { reset: true }, false);
            return;
          }
          throw new HttpError(404, "not_found");
        } catch (error) {
          const mapped = mapError(error);
          if (response.headersSent) response.destroy();
          else sendFailure(response, mapped.status, mapped.code, false);
        }
      }
    };
  }
  /** Close listeners and abort all accepted work before resolving teardown. */
  async close() {
    if (this.closeTask !== void 0) return this.closeTask;
    this.closeTask = this.performClose();
    return this.closeTask;
  }
  async performClose() {
    this.closing = true;
    for (const controller of this.clientModuleOperations) controller.abort();
    if (this.extensionChangeTimer !== void 0) clearInterval(this.extensionChangeTimer);
    this.extensionChangeTimer = void 0;
    this.removeExtensionContentListener();
    this.upstreamAuthRequest?.destroy();
    this.upstreamAuthRequest = void 0;
    this.removeSessionListener();
    this.pendingDeviceRevocations.clear();
    const accessClose = this.access.close();
    for (const stored of this.mobileBootBatches.values()) stored.assembly?.controller.abort();
    for (const request of this.activeRequests.values()) request.abort();
    for (const websocket of this.activeWebSockets.values()) {
      websocket.client.destroy();
      websocket.upstream.destroy();
    }
    for (const socket of this.connectedSockets) socket.destroy();
    if (this.discoveryTimer !== void 0) clearInterval(this.discoveryTimer);
    this.discoveryTimer = void 0;
    await this.closeBonjour();
    const discoverySocket = this.discoverySocket;
    this.discoverySocket = void 0;
    if (discoverySocket !== void 0) {
      await new Promise((resolve3) => {
        discoverySocket.close(() => resolve3());
      });
    }
    const server = this.server;
    this.server = void 0;
    if (server !== void 0 && server.listening) {
      server.closeAllConnections();
      await new Promise((resolve3) => {
        server.close(() => resolve3());
      });
    }
    await accessClose;
    await Promise.allSettled(this.clientModuleTasks);
    await Promise.allSettled(this.clientModuleRevocations);
    this.activeRequests.clear();
    this.activeWebSockets.clear();
    this.connectedSockets.clear();
    this.policy = void 0;
    this.listenerPort = void 0;
  }
  /** Safe metadata helper for direct loopback integrations. */
  devices() {
    return this.access.listDevices();
  }
  /** Status shown by the loopback mobile-access control card. */
  extensionStatus() {
    return this.extensions?.status() ?? { loaded: 0, failed: 0 };
  }
};

// vendor/gateway/storage.ts
import { lstat as lstat2, mkdir, readFile as readFile3, rename, rm, writeFile } from "node:fs/promises";
import { basename as basename2, dirname as dirname3, join as join3 } from "node:path";
import { randomBytes as randomBytes2 } from "node:crypto";

// vendor/gateway/private-file.ts
import { chmod } from "node:fs/promises";
import { win32 } from "node:path";
import { performance as performance2 } from "node:perf_hooks";

// vendor/gateway/exec-file.ts
import { execFile } from "node:child_process";
function execFileText(file, args, options = {}) {
  return new Promise((resolve3, reject) => {
    execFile(file, [...args], { windowsHide: true, ...options, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(error);
        return;
      }
      if (typeof stdout !== "string" || typeof stderr !== "string") {
        reject(new Error("subprocess returned invalid text output"));
        return;
      }
      resolve3({ stdout, stderr });
    });
  });
}

// vendor/gateway/private-file.ts
var userSidTask;
function commandFailureDetails(error) {
  if (error === null || typeof error !== "object") return {};
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(error);
  } catch (_error) {
    return {};
  }
  const code = descriptors.code?.value;
  const signal = descriptors.signal?.value;
  const killed = descriptors.killed?.value;
  return {
    ...code === null || typeof code === "number" && Number.isSafeInteger(code) || typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/u.test(code) ? { code } : {},
    ...signal === null || typeof signal === "string" && /^SIG[A-Z0-9]{1,16}$/u.test(signal) ? { signal } : {},
    ...typeof killed === "boolean" ? { killed } : {}
  };
}
var PrivateFilePermissionError = class extends Error {
  constructor(stage, elapsedMs, error) {
    const details = commandFailureDetails(error);
    const fields = [
      ...details.code === void 0 ? [] : [`code=${String(details.code)}`],
      ...details.signal === void 0 ? [] : [`signal=${String(details.signal)}`],
      ...details.killed === void 0 ? [] : [`killed=${String(details.killed)}`]
    ];
    const summary = `Windows private-file ${stage} failed after ${String(elapsedMs)} ms${fields.length === 0 ? "" : ` (${fields.join(", ")})`}`;
    const cause = Object.assign(new Error("Windows permission operation failed"), details);
    super(summary, { cause });
    this.stage = stage;
    this.elapsedMs = elapsedMs;
    this.name = "PrivateFilePermissionError";
    this.code = details.code;
    this.signal = details.signal;
    this.killed = details.killed;
  }
  stage;
  elapsedMs;
  code;
  signal;
  killed;
};
async function permissionOperation(stage, operation) {
  const started = performance2.now();
  try {
    return await operation();
  } catch (error) {
    throw new PrivateFilePermissionError(stage, Math.max(0, Math.round(performance2.now() - started)), error);
  }
}
function windowsSystemTool(name) {
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (systemRoot === void 0 || !win32.isAbsolute(systemRoot)) {
    throw Object.assign(new Error("Windows system root is unavailable"), { code: "WINDOWS_SYSTEM_ROOT_UNAVAILABLE" });
  }
  return win32.join(systemRoot, "System32", name);
}
async function currentWindowsUserSid() {
  userSidTask ??= permissionOperation("sid-query", async () => {
    const { stdout } = await execFileText(windowsSystemTool("whoami.exe"), ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 1e4
    });
    const match = /,"(S-\d(?:-\d+)+)"\s*$/u.exec(stdout.trim());
    if (match?.[1] === void 0) throw Object.assign(new Error("unable to resolve the current Windows user SID"), { code: "WINDOWS_USER_SID_INVALID" });
    return match[1];
  }).catch((error) => {
    userSidTask = void 0;
    throw error;
  });
  return userSidTask;
}
async function restrictPrivateFile(file, mode = 384) {
  await chmod(file, mode);
  if (process.platform !== "win32") return;
  const userSid = await currentWindowsUserSid();
  await permissionOperation("acl-apply", () => execFileText(windowsSystemTool("icacls.exe"), [
    file,
    "/inheritance:r",
    "/grant:r",
    `*${userSid}:(F)`,
    "*S-1-5-18:(F)",
    "*S-1-5-32-544:(F)",
    "/remove:g",
    "*S-1-1-0",
    "*S-1-5-11",
    "*S-1-5-32-545"
  ], { encoding: "utf8", windowsHide: true, timeout: 1e4 }));
}

// vendor/gateway/storage.ts
function assertInteger(value, name) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`device state ${name} must be a non-negative integer`);
  }
}
function parseDevice(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("device state contains an invalid device");
  const record = value;
  if (typeof record.id !== "string" || !/^[a-f\d]{32}$/u.test(record.id)) throw new Error("device state contains an invalid id");
  if (typeof record.label !== "string" || record.label.length < 1 || record.label.length > 64 || /[\u0000-\u001f\u007f]/u.test(record.label)) {
    throw new Error("device state contains an invalid label");
  }
  if (typeof record.tokenDigest !== "string" || !/^[a-f\d]{64}$/u.test(record.tokenDigest)) {
    throw new Error("device state contains an invalid credential digest");
  }
  if (record.nativeInstanceId !== void 0 && (typeof record.nativeInstanceId !== "string" || !/^[a-f\d]{64}$/u.test(record.nativeInstanceId))) {
    throw new Error("device state contains an invalid native instance id");
  }
  if (record.fingerprint !== void 0 && (typeof record.fingerprint !== "string" || !/^[a-f\d]{64}$/u.test(record.fingerprint))) {
    throw new Error("device state contains an invalid device fingerprint");
  }
  assertInteger(record.createdAt, "createdAt");
  assertInteger(record.expiresAt, "expiresAt");
  assertInteger(record.lastSeenAt, "lastSeenAt");
  if (record.revokedAt !== void 0) assertInteger(record.revokedAt, "revokedAt");
  if (record.expiresAt <= record.createdAt || record.lastSeenAt < record.createdAt) {
    throw new Error("device state contains inconsistent timestamps");
  }
  return Object.freeze({
    id: record.id,
    label: record.label,
    tokenDigest: record.tokenDigest,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt,
    ...record.nativeInstanceId === void 0 ? {} : { nativeInstanceId: record.nativeInstanceId },
    ...record.fingerprint === void 0 ? {} : { fingerprint: record.fingerprint },
    ...record.revokedAt === void 0 ? {} : { revokedAt: record.revokedAt }
  });
}
function parseDeviceSnapshot(value, maximumDevices = 256) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("device state must be an object");
  const snapshot = value;
  if (snapshot.version !== 1 && snapshot.version !== 2 || !Array.isArray(snapshot.devices) || snapshot.devices.length > maximumDevices) {
    throw new Error("device state has an unsupported version or device count");
  }
  const devices = snapshot.devices.map(parseDevice);
  if (new Set(devices.map((device) => device.id)).size !== devices.length || new Set(devices.map((device) => device.tokenDigest)).size !== devices.length) {
    throw new Error("device state contains duplicate device identities");
  }
  return Object.freeze({ version: snapshot.version, devices: Object.freeze(devices) });
}
function snapshotForSave(snapshot, maximumDevices) {
  const validated = parseDeviceSnapshot(snapshot, maximumDevices);
  return Object.freeze({ version: 2, devices: validated.devices });
}
var JsonDeviceStore = class {
  constructor(file, maximumDevices = 256) {
    this.file = file;
    this.maximumDevices = maximumDevices;
  }
  file;
  maximumDevices;
  async load() {
    let stat2;
    try {
      stat2 = await lstat2(this.file);
    } catch (error) {
      if (error.code === "ENOENT") return Object.freeze({ version: 1, devices: Object.freeze([]) });
      throw error;
    }
    if (!stat2.isFile() || stat2.isSymbolicLink() || stat2.size > 1024 * 1024) {
      throw new Error("device state must be a regular file no larger than 1 MiB");
    }
    await restrictPrivateFile(this.file);
    let parsed;
    try {
      parsed = JSON.parse(await readFile3(this.file, "utf8"));
    } catch (error) {
      throw new Error("device state is not valid JSON", { cause: error });
    }
    return parseDeviceSnapshot(parsed, this.maximumDevices);
  }
  async save(snapshot) {
    const validated = snapshotForSave(snapshot, this.maximumDevices);
    const directory = dirname3(this.file);
    await mkdir(directory, { recursive: true, mode: 448 });
    try {
      const current = await lstat2(this.file);
      if (!current.isFile() || current.isSymbolicLink()) throw new Error("device state target must remain a regular file");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const temporary = join3(directory, `.${basename2(this.file)}.${randomBytes2(12).toString("hex")}.tmp`);
    try {
      await writeFile(temporary, `${JSON.stringify(validated)}
`, { encoding: "utf8", flag: "wx", mode: 384 });
      await rename(temporary, this.file);
      await restrictPrivateFile(this.file);
    } catch (error) {
      try {
        await rm(temporary, { force: true });
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "device state write and temporary cleanup both failed");
      }
      throw error;
    }
  }
};

// vendor/gateway/config.ts
import { dirname as dirname4, isAbsolute, join as join4, resolve as resolve2 } from "node:path";
import { createHash as createHash3 } from "node:crypto";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var Config = {};
function integer(value, name, fallback, minimum, maximum) {
  const resolved = value ?? fallback;
  if (typeof resolved !== "number" || !Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw new Error(`${name} must be an integer from ${String(minimum)} through ${String(maximum)}`);
  }
  return resolved;
}
function parseWebSocketCompression(raw) {
  if (raw !== void 0 && (typeof raw !== "object" || raw === null || Array.isArray(raw))) {
    throw new Error("websocketCompression must be an object");
  }
  const value = raw ?? {};
  const maxMessageBytes = integer(value.maxMessageBytes, "websocketCompression.maxMessageBytes", 32 * 1024 * 1024, 1024, 256 * 1024 * 1024);
  const maxQueuedBytes = integer(value.maxQueuedBytes, "websocketCompression.maxQueuedBytes", 64 * 1024 * 1024, 1024, 256 * 1024 * 1024);
  if (maxQueuedBytes < maxMessageBytes + 14) throw new Error("websocketCompression.maxQueuedBytes must cover maxMessageBytes and the frame header");
  return Object.freeze({
    paths: Object.freeze(normalizeWebSocketPaths(value.paths ?? [])),
    maxMessageBytes,
    maxQueuedBytes,
    thresholdBytes: integer(value.thresholdBytes, "websocketCompression.thresholdBytes", 1024, 0, maxMessageBytes),
    concurrencyLimit: integer(value.concurrencyLimit, "websocketCompression.concurrencyLimit", 4, 1, 32),
    level: integer(value.level, "websocketCompression.level", 3, 0, 9)
  });
}
function stringArray(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${name} must be a non-empty string array`);
  }
  return value;
}
function absoluteFile(value, name) {
  if (typeof value !== "string" || value.length === 0 || !isAbsolute(value)) {
    throw new Error(`${name} must be an absolute file path`);
  }
  return resolve2(value);
}
function excludedClientModules(value) {
  if (value === void 0) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || id.length === 0 || id.trim() !== id)) {
    throw new Error("excludedClientModules must be an array of exact, non-empty client module ids");
  }
  const ids = value;
  if (new Set(ids).size !== ids.length) throw new Error("excludedClientModules must not contain duplicate ids");
  return Object.freeze([...ids]);
}
function parseUpstream(value) {
  const source = value ?? "http://127.0.0.1:3080";
  if (typeof source !== "string") throw new Error("upstreamOrigin must be a string");
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("upstreamOrigin must be an HTTP loopback origin");
  }
  if (url.protocol !== "http:" || !isLoopbackAddress(url.hostname) || url.username !== "" || url.password !== "" || url.pathname !== "/" || url.search !== "" || url.hash !== "" || url.port === "") {
    throw new Error("upstreamOrigin must be an HTTP loopback origin with an explicit port and no path or credentials");
  }
  return url;
}
function parsePublicOrigin(value) {
  if (value === void 0) return void 0;
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error("publicOrigin must be an HTTPS origin");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("publicOrigin must be an HTTPS origin");
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.pathname !== "/" || url.search !== "" || url.hash !== "") {
    throw new Error("publicOrigin must be an HTTPS origin with no path or credentials");
  }
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") {
    throw new Error("publicOrigin must name a reachable host");
  }
  return Object.freeze({
    authority: parseAuthority(url.host),
    port: Number(url.port || "443")
  });
}
function parseTls(value, listenHost) {
  if (value !== void 0 && (value === null || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("tls must be an object");
  }
  const mode = value?.mode ?? "provided";
  if (value?.mode === null || mode !== "provided" && mode !== "disabled") throw new Error("tls.mode must be provided or disabled");
  if (mode === "disabled") {
    if (!isLoopbackAddress(listenHost)) throw new Error("TLS may be disabled only on an IP loopback listener");
    return Object.freeze({ mode });
  }
  return Object.freeze({
    mode,
    certFile: absoluteFile(value?.certFile, "tls.certFile"),
    keyFile: absoluteFile(value?.keyFile, "tls.keyFile"),
    ...value?.caFile === void 0 ? {} : { caFile: absoluteFile(value.caFile, "tls.caFile") }
  });
}
function parseGatewayConfig(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("mobile-access config must be an object");
  const value = raw;
  const publicOrigin = parsePublicOrigin(value.publicOrigin);
  if (publicOrigin !== void 0 && value.listenPort !== void 0) {
    throw new Error("publicOrigin cannot be combined with listenPort");
  }
  if (publicOrigin !== void 0 && value.publicAuthorities !== void 0) {
    throw new Error("publicOrigin cannot be combined with publicAuthorities");
  }
  const listenHost = value.listenHost ?? (publicOrigin === void 0 ? "127.0.0.1" : "0.0.0.0");
  if (isIP(listenHost) === 0) throw new Error("listenHost must be an IP literal");
  const listenPort = publicOrigin?.port ?? integer(value.listenPort, "listenPort", 3443, 0, 65535);
  const upstreamOrigin = parseUpstream(value.upstreamOrigin);
  const tls = parseTls(value.tls, listenHost);
  if (publicOrigin !== void 0 && tls.mode !== "provided") {
    throw new Error("publicOrigin requires TLS");
  }
  let authorities;
  if (publicOrigin !== void 0) {
    authorities = [publicOrigin.authority];
  } else {
    let authoritySources = value.publicAuthorities;
    if (authoritySources === void 0 || authoritySources.length === 0) {
      if (!isLoopbackAddress(listenHost)) throw new Error("publicAuthorities is required for a non-loopback listener");
      authoritySources = [listenHost];
    }
    authorities = authoritySources.map(parseAuthority);
  }
  for (const authority of authorities) {
    if (listenPort === 0 && authority.port !== void 0) {
      throw new Error("explicit public authority ports require a non-zero listenPort");
    }
    if (authority.port !== void 0 && listenPort !== 0 && authority.port !== listenPort) {
      throw new Error("every explicit public authority port must equal listenPort");
    }
  }
  if (new Set(authorities.map((entry) => `${entry.hostname}:${String(entry.port ?? listenPort)}`)).size !== authorities.length) {
    throw new Error("publicAuthorities must not contain duplicates");
  }
  const cidrSources = value.allowedCidrs ?? (isLoopbackAddress(listenHost) ? ["127.0.0.0/8", "::1/128"] : void 0);
  const allowedCidrs = stringArray(cidrSources, "allowedCidrs").map(parseCidr);
  if (new Set(allowedCidrs.map((entry) => `${String(entry.bits)}:${entry.network.toString(16)}:${String(entry.prefix)}`)).size !== allowedCidrs.length) {
    throw new Error("allowedCidrs must not contain duplicates");
  }
  const deviceTtlMs = integer(value.deviceTtlMs, "deviceTtlMs", 90 * 24 * 60 * 6e4, 6e4, 366 * 24 * 60 * 6e4);
  const sessionTtlMs = integer(value.sessionTtlMs, "sessionTtlMs", 8 * 60 * 6e4, 3e4, 24 * 60 * 6e4);
  if (sessionTtlMs > deviceTtlMs) throw new Error("sessionTtlMs must not exceed deviceTtlMs");
  return Object.freeze({
    listenHost,
    hostExecution: resolveHostExecution(value.hostExecution),
    listenPort,
    upstreamOrigin,
    authorities: Object.freeze(authorities),
    allowedCidrs: Object.freeze(allowedCidrs),
    stateFile: absoluteFile(value.stateFile, "stateFile"),
    extensionsDir: join4(dirname4(absoluteFile(value.stateFile, "stateFile")), "extensions"),
    customCssFile: value.customCssFile === void 0 ? join4(dirname4(absoluteFile(value.stateFile, "stateFile")), "mobile.css") : absoluteFile(value.customCssFile, "customCssFile"),
    customScriptFile: value.customScriptFile === void 0 ? join4(dirname4(absoluteFile(value.stateFile, "stateFile")), "mobile.js") : absoluteFile(value.customScriptFile, "customScriptFile"),
    mobileLayoutFile: value.mobileLayoutFile === void 0 ? fileURLToPath2(new URL("./mobile-layout.js", import.meta.url)) : absoluteFile(value.mobileLayoutFile, "mobileLayoutFile"),
    mobileCompatibilityFile: value.mobileCompatibilityFile === void 0 ? fileURLToPath2(new URL("./mobile-compat.js", import.meta.url)) : absoluteFile(value.mobileCompatibilityFile, "mobileCompatibilityFile"),
    excludedClientModules: excludedClientModules(value.excludedClientModules),
    websocketCompression: parseWebSocketCompression(value.websocketCompression),
    instanceId: value.instanceId === void 0 ? createHash3("sha256").update(absoluteFile(value.stateFile, "stateFile")).digest("hex") : /^[a-f\d]{64}$/u.test(value.instanceId) ? value.instanceId : (() => {
      throw new Error("instanceId must be a lowercase SHA-256 value");
    })(),
    ...value.pairingCaFile === void 0 ? {} : { pairingCaFile: absoluteFile(value.pairingCaFile, "pairingCaFile") },
    tls,
    publicTls: tls.mode === "provided",
    // dsh-remote: выключено. Обнаружение нужно клиенту, который слушает широковещание;
    // наш телефон узнаёт адрес из QR-кода. В upstream здесь жёсткая `true`.
    discovery: false,
    pairingTtlMs: integer(value.pairingTtlMs, "pairingTtlMs", 12e4, 1e4, 6e5),
    deviceTtlMs,
    sessionTtlMs,
    maxDevices: integer(value.maxDevices, "maxDevices", 32, 1, 256),
    maxSessions: integer(value.maxSessions, "maxSessions", 64, 1, 1024),
    maxConnections: integer(value.maxConnections, "maxConnections", 64, 1, 1024),
    maxActiveRequests: integer(value.maxActiveRequests, "maxActiveRequests", 32, 1, 1024),
    maxWebSockets: integer(value.maxWebSockets, "maxWebSockets", 16, 1, 256),
    maxBodyBytes: integer(value.maxBodyBytes, "maxBodyBytes", 160 * 1024 * 1024, 1024, 256 * 1024 * 1024),
    upstreamTimeoutMs: integer(value.upstreamTimeoutMs, "upstreamTimeoutMs", 3e4, 1e3, 3e5),
    upstreamApiTimeoutMs: integer(value.upstreamApiTimeoutMs, "upstreamApiTimeoutMs", 0, 0, 2147483647),
    rateLimitWindowMs: integer(value.rateLimitWindowMs, "rateLimitWindowMs", 6e4, 1e3, 36e5),
    maxPairingAttempts: integer(value.maxPairingAttempts, "maxPairingAttempts", 8, 1, 100),
    maxRateLimitKeys: integer(value.maxRateLimitKeys, "maxRateLimitKeys", 256, 1, 4096)
  });
}
export {
  AccessController,
  Config,
  JsonDeviceStore,
  MobileAccessGateway,
  parseGatewayConfig
};
