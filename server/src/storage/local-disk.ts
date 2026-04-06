import fs from 'node:fs';
import path from 'node:path';

export interface StorageProvider {
  write(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export function createLocalDiskStorage(baseDir: string): StorageProvider {
  fs.mkdirSync(baseDir, { recursive: true });
  const resolvedBase = path.resolve(baseDir) + path.sep;

  const resolvePath = (key: string): string => {
    const resolved = path.resolve(baseDir, key);
    // Use path.sep suffix to prevent prefix collisions (e.g., /storage-extra/)
    if (!resolved.startsWith(resolvedBase)) {
      throw new Error('Invalid key: path traversal detected');
    }
    // Reject symlinks to prevent symlink attacks
    try {
      const stat = fs.lstatSync(resolved);
      if (stat.isSymbolicLink()) {
        throw new Error('Invalid key: symlink not allowed');
      }
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    return resolved;
  };

  return {
    async write(key, data) {
      const filePath = resolvePath(key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, data);
    },
    async read(key) {
      return fs.readFileSync(resolvePath(key));
    },
    async delete(key) {
      const filePath = resolvePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    },
    async exists(key) {
      return fs.existsSync(resolvePath(key));
    },
  };
}
