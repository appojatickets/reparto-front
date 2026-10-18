import { spawnSync } from 'node:child_process';
const api = process.env.VITE_API_URL ?? 'https://reparto-back.onrender.com';
if (new URL(api).protocol !== 'https:') throw new Error('Android requiere una API HTTPS');
const commit = process.env.GITHUB_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_API_URL: api, VERCEL_GIT_COMMIT_SHA: commit } });
process.exit(result.status ?? 1);
