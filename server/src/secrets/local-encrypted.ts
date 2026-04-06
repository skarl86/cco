import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SecretsProvider {
  get(name: string): string | null;
  set(name: string, value: string): void;
  delete(name: string): void;
  list(): string[];
}

interface EncryptedValue {
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
}

type Vault = Record<string, EncryptedValue>;

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/** Validate secret name: alphanumeric, underscore, hyphen, 1-128 chars */
const VALID_NAME_RE = /^[a-zA-Z0-9_\-]{1,128}$/;

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function loadOrCreateMasterKey(keyPath: string): Buffer {
  ensureDir(path.dirname(keyPath));

  if (fs.existsSync(keyPath)) {
    const hex = fs.readFileSync(keyPath, 'utf-8').trim();
    return Buffer.from(hex, 'hex');
  }

  const keyBytes = randomBytes(KEY_LENGTH);
  fs.writeFileSync(keyPath, keyBytes.toString('hex'), { mode: 0o600 });
  return keyBytes;
}

/**
 * Derive an encryption key from the master key using HMAC-SHA256.
 * The master key is already 32 bytes of random entropy.
 * HMAC adds domain separation without the cost overhead of scrypt.
 */
function deriveKey(masterKey: Buffer): Buffer {
  return createHmac('sha256', masterKey).update('cco-vault-encryption-key-v1').digest();
}

function encrypt(plaintext: string, key: Buffer): EncryptedValue {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

function decrypt(entry: EncryptedValue, key: Buffer): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(entry.iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(entry.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(entry.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}

function loadVault(vaultPath: string): Vault {
  if (!fs.existsSync(vaultPath)) {
    return Object.create(null) as Vault;
  }
  const raw = fs.readFileSync(vaultPath, 'utf-8');
  const parsed = JSON.parse(raw) as Vault;
  // Use null-prototype object to prevent prototype pollution
  const safe = Object.create(null) as Vault;
  for (const key of Object.keys(parsed)) {
    safe[key] = parsed[key];
  }
  return safe;
}

function saveVault(vaultPath: string, vault: Vault): void {
  ensureDir(path.dirname(vaultPath));
  fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), { mode: 0o600 });
}

export function createLocalEncryptedSecrets(options?: {
  readonly secretsDir?: string;
}): SecretsProvider {
  const secretsDir = options?.secretsDir ?? path.join(os.homedir(), '.cco', 'secrets');
  const keyPath = path.join(secretsDir, 'master.key');
  const vaultPath = path.join(secretsDir, 'vault.json');

  const masterKey = loadOrCreateMasterKey(keyPath);
  const derivedKey = deriveKey(masterKey);

  return {
    get(name) {
      const vault = loadVault(vaultPath);
      if (!Object.prototype.hasOwnProperty.call(vault, name)) return null;
      return decrypt(vault[name], derivedKey);
    },

    set(name, value) {
      if (!VALID_NAME_RE.test(name)) {
        throw new Error('Secret name must be 1-128 alphanumeric, underscore, or hyphen characters');
      }
      const vault = loadVault(vaultPath);
      vault[name] = encrypt(value, derivedKey);
      saveVault(vaultPath, vault);
    },

    delete(name) {
      const vault = loadVault(vaultPath);
      if (!Object.prototype.hasOwnProperty.call(vault, name)) return;
      delete vault[name];
      saveVault(vaultPath, vault);
    },

    list() {
      const vault = loadVault(vaultPath);
      return Object.keys(vault);
    },
  };
}
