'use strict';

/**
 * phashUtils.js
 * ─────────────
 * Perceptual-hash (pHash) utilities for duplicate-image detection.
 *
 * Exports:
 *   generatePHash(imagePath) → Promise<string>   — hex pHash of the image
 *   hammingDistance(h1, h2)  → number            — bit-level difference
 *   checkDuplicate(newHash, storedHashes) → { isDuplicate, reason }
 */

const imghash = require('imghash');

// ─── 1. pHash Generation ────────────────────────────────────────────────────

/**
 * Generate a perceptual hash for a local image file.
 * Returns a hex string (typically 16 chars = 64-bit hash).
 *
 * @param {string} imagePath  Absolute or relative path to the image file.
 * @returns {Promise<string>} Hex pHash string.
 */
async function generatePHash(imagePath) {
  // imghash.hash defaults to a 16-char hex string (64-bit DCT hash)
  const hash = await imghash.hash(imagePath);
  return hash;
}

// ─── 2. Hamming Distance ────────────────────────────────────────────────────

/**
 * Compute the Hamming distance between two hex pHash strings.
 * Converts each pair of hex characters to a byte and XORs them,
 * then counts the set bits — no string-to-BigInt needed.
 *
 * @param {string} hash1  Hex pHash string.
 * @param {string} hash2  Hex pHash string.
 * @returns {number} Number of differing bits (0 = identical).
 */
function hammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) {
    throw new Error(`pHash length mismatch: ${hash1.length} vs ${hash2.length}`);
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i += 2) {
    // Parse two hex chars as a single byte for each hash
    const byte1 = parseInt(hash1.substring(i, i + 2), 16);
    const byte2 = parseInt(hash2.substring(i, i + 2), 16);
    let xor = byte1 ^ byte2;

    // Brian Kernighan's bit-count — zero iterations on identical bytes
    while (xor) {
      distance++;
      xor &= xor - 1;
    }
  }

  return distance;
}

// ─── 3. Duplicate Validation ────────────────────────────────────────────────

const THRESHOLD_EXACT   = 0;  // bit distance ≤ 0  → exact duplicate
const THRESHOLD_SIMILAR = 5;  // bit distance ≤ 5  → similar / cheating

/**
 * Check whether a new pHash collides with any stored pHash.
 * Stops at the first match to avoid unnecessary iterations.
 *
 * @param {string}   newHash      The pHash of the freshly uploaded image.
 * @param {string[]} storedHashes Array of pHash strings already in the DB for this step.
 * @returns {{ isDuplicate: boolean, reason?: string }}
 */
function checkDuplicate(newHash, storedHashes) {
  for (const stored of storedHashes) {
    // Skip malformed/missing stored hashes gracefully
    if (!stored || stored.length !== newHash.length) continue;

    const dist = hammingDistance(newHash, stored);

    if (dist <= THRESHOLD_EXACT) {
      return { isDuplicate: true, reason: 'Duplicate submission' };
    }

    if (dist <= THRESHOLD_SIMILAR) {
      return { isDuplicate: true, reason: 'Similar image detected (possible cheating)' };
    }
  }

  return { isDuplicate: false };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { generatePHash, hammingDistance, checkDuplicate };
