import { simpleHash } from '../utils/helpers.js';

const SAVE_KEY = 'gts_save_v2';
const BACKUP_KEY = 'gts_save_v2_bak';
// Obfuscated salt - not crypto secure, just deters casual tampering
const SALT = String.fromCharCode(0x47,0x54,0x53,0x5f,0x73,0x61,0x76,0x65,0x5f,0x73,0x61,0x6c,0x74,0x5f,0x32,0x30,0x32,0x36);

function computeChecksum(dataStr) {
  return simpleHash(dataStr + SALT);
}

function wrap(data) {
  const payload = JSON.stringify(data);
  return { payload, checksum: computeChecksum(payload), v: 2 };
}

function unwrap(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v !== 2 || !raw.payload || !raw.checksum) return null;
  if (computeChecksum(raw.payload) !== raw.checksum) return null;
  try {
    return JSON.parse(raw.payload);
  } catch {
    return null;
  }
}

export class SaveManager {
  static load() {
    for (const key of [SAVE_KEY, BACKUP_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = unwrap(JSON.parse(raw));
        if (data) return data;
      } catch {
        // ignore
      }
    }
    return null;
  }

  static save(data) {
    try {
      const wrapped = wrap(data);
      const json = JSON.stringify(wrapped);
      localStorage.setItem(SAVE_KEY, json);
      localStorage.setItem(BACKUP_KEY, json);
      return true;
    } catch {
      return false;
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      // ignore
    }
  }
}
