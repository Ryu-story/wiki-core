/**
 * pack-dist.mjs — wiki-core 4 패키지를 .tgz 로 pack (publish-like).
 *
 * `pnpm pack` 이 `workspace:*` 를 publish 시점 버전(`^0.1.0` / `0.1.0`)으로 자동 변환.
 * → npm 호환 .tgz 4종이 dist-tarballs/ 에 출력.
 *
 * (a) git submodule 환경 (npm submodule + file: dep) 에서 사용:
 *   "@wiki-core/core": "file:./vendor/wiki-core/dist-tarballs/wiki-core-core-0.1.0.tgz"
 *
 * (b) pnpm sibling 환경에선 .tgz 불필요 (workspace:* 그대로 동작).
 *
 * Cross-platform — node 직접 실행 (shell loop 회피).
 *
 * SPEC: docs/phase4_plugin_guide.md 부록 A-2 A.11
 */

import { execSync } from 'node:child_process';
import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dest = resolve(root, 'dist-tarballs');

const PACKAGES = ['core', 'storage', 'router', 'renderer'];

console.log(`[pack-dist] root=${root}`);
console.log(`[pack-dist] dest=${dest}`);

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const pkg of PACKAGES) {
  const cwd = resolve(root, 'packages', pkg);
  if (!existsSync(cwd)) {
    throw new Error(`packages/${pkg} not found`);
  }
  console.log(`[pack-dist] packing @wiki-core/${pkg}`);
  execSync(`pnpm pack --pack-destination "${dest}"`, {
    cwd,
    stdio: 'inherit',
  });
}

console.log(`[pack-dist] done — 4 tarballs in ${dest}`);
