// Regression tests for the CI/CD and deploy-time findings from the 2026-05-23 security
// review (plans/2026-05-23-security-review-remediation.md, findings #4, #5, #6).
import { describe, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir, hostname } from 'node:os'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const REPO_ROOT = path.join(__dirname, '..')

const FULL_GIT_SHA = /^[0-9a-f]{40}$/

async function readRepoFile(relativePath: string) {
  return readFile(path.join(REPO_ROOT, relativePath), 'utf8')
}

describe('deploy workflows — third-party actions pinned to a commit SHA (finding #4)', () => {
  test.each(['.github/workflows/deploy.yml', '.github/workflows/check-ghost.yml'])(
    '%s does not reference appleboy/ssh-action via a mutable ref',
    async (workflowPath) => {
      const yaml = await readRepoFile(workflowPath)
      const usesMatches = [...yaml.matchAll(/uses:\s*appleboy\/ssh-action@([^\s]+)/g)]

      for (const match of usesMatches) {
        const ref = match[1]
        expect(ref, `appleboy/ssh-action in ${workflowPath} must be pinned to a full commit SHA, not "${ref}"`).toMatch(FULL_GIT_SHA)
      }
    }
  )
})

describe('index.html — Ghost Portal script pinned to a specific version (finding #5)', () => {
  test('does not fetch @tryghost/portal@latest from jsDelivr', async () => {
    const html = await readRepoFile('index.html')
    expect(html).not.toMatch(/@tryghost\/portal@latest\b/)
  })

  test('pins @tryghost/portal to a specific version when loaded from jsDelivr', async () => {
    const html = await readRepoFile('index.html')
    const match = html.match(/@tryghost\/portal@([^/'"\s]+)/)
    if (!match) return // not loaded from jsDelivr at all (e.g. vendored) — satisfies the plan
    expect(match[1]).toMatch(/^\d/)
  })
})

describe('scripts/check-ghost.sh — no raw production diagnostics in a public job summary (finding #6)', () => {
  test('report omits the real hostname and raw log lines', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts/check-ghost.sh')
    const ghostRoot = await mkdtemp(path.join(tmpdir(), 'check-ghost-security-test-'))

    try {
      await writeFile(
        path.join(ghostRoot, 'config.production.json'),
        JSON.stringify({ mail: { transport: 'SMTP', options: { host: 'smtp.example.com' } } })
      )
      const logDir = path.join(ghostRoot, 'content', 'logs')
      await mkdir(logDir, { recursive: true })
      const secretMarker = 'SECURITY_TEST_MARKER_do-not-leak-this-log-line 500 error at /home/deploy/app/secret-path'
      await writeFile(path.join(logDir, 'ghost.log'), `${secretMarker}\n`)

      const { stdout } = await execFileAsync('bash', [scriptPath], {
        env: { ...process.env, GHOST_ROOT: ghostRoot },
      })

      expect(stdout).not.toContain(secretMarker)
      expect(stdout).not.toContain(hostname())
    } finally {
      await rm(ghostRoot, { recursive: true, force: true })
    }
  }, 15_000)
})
