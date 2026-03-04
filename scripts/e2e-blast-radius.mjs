#!/usr/bin/env node
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const run = args.includes('--run')
const baseArg = args.find((arg) => !arg.startsWith('--'))
const baseRef = baseArg || process.env.E2E_BASE_REF || 'origin/main'

const groupToSpecs = {
  auth: ['e2e/auth.spec.ts'],
  landing: ['e2e/landing.spec.ts'],
  listen: ['e2e/listen.spec.ts'],
  watch: ['e2e/watch.spec.ts'],
  navigation: ['e2e/navigation.spec.ts'],
  pages: ['e2e/pages.spec.ts'],
  regression: ['e2e/regression.spec.ts'],
}

const patternToGroups = [
  { pattern: /^src\/Connect\.tsx$/, groups: ['auth'] },
  { pattern: /^src\/Listen\.tsx$/, groups: ['listen'] },
  { pattern: /^src\/Watch\.tsx$/, groups: ['watch'] },
  { pattern: /^src\/Mission\.tsx$/, groups: ['pages'] },
  { pattern: /^src\/App\.tsx$/, groups: ['landing', 'navigation'] },
  { pattern: /^src\/router\//, groups: ['navigation', 'pages'] },
  { pattern: /^src\/components\//, groups: ['landing', 'navigation', 'pages', 'auth', 'listen', 'watch'] },
  { pattern: /^src\/styles\//, groups: ['landing', 'navigation', 'pages', 'auth', 'listen', 'watch'] },
  { pattern: /^src\/index\.css$/, groups: ['landing', 'navigation', 'pages', 'auth', 'listen', 'watch'] },
  { pattern: /^src\/utils\/subscription\.ts$/, groups: ['listen', 'auth', 'regression'] },
  { pattern: /^src\/utils\/memberSession\.ts$/, groups: ['listen', 'auth', 'regression'] },
  { pattern: /^src\/utils\/audioHelpers\.ts$/, groups: ['listen', 'regression'] },
  { pattern: /^src\/utils\/soundcloudTracks\.ts$/, groups: ['listen', 'regression'] },
  { pattern: /^src\/config\/tracks\.ts$/, groups: ['listen', 'regression'] },
  { pattern: /^server\.js$/, groups: ['auth', 'listen', 'watch', 'landing', 'regression'] },
  { pattern: /^e2e\//, groups: ['auth', 'landing', 'listen', 'watch', 'navigation', 'pages', 'regression'] },
  { pattern: /^playwright\.config/, groups: ['auth', 'landing', 'listen', 'watch', 'navigation', 'pages', 'regression'] },
]

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim()
}

function getChangedFiles() {
  try {
    const output = sh(`git diff --name-only ${baseRef}...HEAD`)
    if (!output) return []
    return output.split('\n').filter(Boolean)
  } catch {
    const fallback = sh('git diff --name-only HEAD~1...HEAD')
    return fallback ? fallback.split('\n').filter(Boolean) : []
  }
}

function inferGroups(files) {
  const groupSet = new Set()

  for (const file of files) {
    for (const rule of patternToGroups) {
      if (rule.pattern.test(file)) {
        for (const group of rule.groups) groupSet.add(group)
      }
    }
  }

  if (groupSet.size === 0 && files.length > 0) {
    groupSet.add('regression')
  }

  return [...groupSet].sort()
}

const changedFiles = getChangedFiles()
const groups = inferGroups(changedFiles)
const specs = [...new Set(groups.flatMap((group) => groupToSpecs[group] || []))].sort()

console.log(`Base ref: ${baseRef}`)
console.log(`Changed files: ${changedFiles.length}`)
if (changedFiles.length > 0) {
  for (const file of changedFiles) console.log(`  - ${file}`)
}

console.log(`\nSelected groups (${groups.length}): ${groups.join(', ') || '(none)'}`)
console.log(`Spec files (${specs.length}):`)
for (const spec of specs) console.log(`  - ${spec}`)

if (!specs.length) {
  console.log('\nNo matching spec files detected. Nothing to run.')
  process.exit(0)
}

const cmd = `NODE_OPTIONS="--import tsx" playwright test ${specs.join(' ')} --config=playwright.config.cjs`
console.log(`\nSuggested command:\n${cmd}`)

if (run) {
  console.log('\nRunning blast-radius E2E suite...')
  execSync(cmd, { stdio: 'inherit' })
}
