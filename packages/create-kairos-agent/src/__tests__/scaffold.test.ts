import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, rm, access } from 'node:fs/promises';
import { scaffoldAgent } from '../scaffold';

const created: string[] = [];

afterEach(async () => {
  for (const dir of created.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = join(tmpdir(), `kairos-scaffold-${Math.random().toString(36).slice(2)}`);
  created.push(dir);
  return dir;
}

describe('scaffoldAgent', () => {
  it('writes all agent files', async () => {
    const dir = tempDir();
    const result = await scaffoldAgent({ name: 'Vega', network: 'mainnet', targetDir: dir });

    expect(result.files).toEqual([
      'character.json',
      'index.ts',
      '.env.example',
      'package.json',
      'tsconfig.json',
    ]);
    for (const file of result.files) {
      await expect(access(join(dir, file))).resolves.toBeUndefined();
    }
  });

  it('renders the character with the given name and network', async () => {
    const dir = tempDir();
    await scaffoldAgent({ name: 'Vega', network: 'mainnet', targetDir: dir });
    const character = JSON.parse(await readFile(join(dir, 'character.json'), 'utf8'));
    expect(character.name).toBe('Vega');
    expect(character.suiNetwork).toBe('mainnet');
    expect(character.plugins).toContain('plugin-sui');
    // Env placeholders must survive into the scaffolded file.
    expect(character.settings.SUI_PRIVATE_KEY).toBe('${SUI_PRIVATE_KEY}');
  });

  it('defaults network to testnet and derives the package name', async () => {
    const dir = tempDir();
    await scaffoldAgent({ name: 'Night Owl', targetDir: dir });
    const character = JSON.parse(await readFile(join(dir, 'character.json'), 'utf8'));
    expect(character.suiNetwork).toBe('testnet');
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('@kairos/agent-night-owl');
  });

  it('rejects an empty name', async () => {
    await expect(scaffoldAgent({ name: '  ', targetDir: tempDir() })).rejects.toThrow(
      /name is required/,
    );
  });
});
