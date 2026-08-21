import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { hasMatchingGitHubProvenance, type GitHubProvenanceExpectation } from './provenance.ts'

const expected: GitHubProvenanceExpectation = {
  gitCommit: 'abc123',
  integrity: `sha512-${Buffer.from('published tarball').toString('base64')}`,
  name: '@cerebrixos/example',
  repository: 'cerebrixos-org/deepseek-harness',
  version: '0.1.3',
  workflowPath: '.github/workflows/release-superharness.yml',
}

function response(overrides: {
  commit?: string
  digest?: string
  packageName?: string
  repository?: string
  version?: string
  workflowPath?: string
} = {}): unknown {
  const statement = {
    subject: [{
      name: `pkg:npm/${encodeURIComponent(overrides.packageName ?? expected.name)}@${overrides.version ?? expected.version}`,
      digest: { sha512: overrides.digest ?? Buffer.from('published tarball').toString('hex') },
    }],
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            repository: overrides.repository ?? `https://github.com/${expected.repository}`,
            path: overrides.workflowPath ?? expected.workflowPath,
          },
        },
        resolvedDependencies: [{ digest: { gitCommit: overrides.commit ?? expected.gitCommit } }],
      },
    },
  }
  return {
    attestations: [{
      predicateType: 'https://slsa.dev/provenance/v1',
      bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(statement)).toString('base64') } },
    }],
  }
}

describe('hasMatchingGitHubProvenance', () => {
  it('accepts an exact package, digest, repository, workflow, and commit match', () => {
    expect(hasMatchingGitHubProvenance(response(), expected)).toBe(true)
  })

  it.each([
    ['commit', { commit: 'different' }],
    ['digest', { digest: Buffer.from('different').toString('hex') }],
    ['package', { packageName: '@cerebrixos/other' }],
    ['version', { version: '0.1.2' }],
    ['repository', { repository: 'https://github.com/other/repository' }],
    ['workflow', { workflowPath: '/.github/workflows/other.yml' }],
  ])('rejects a different %s', (_label, overrides) => {
    expect(hasMatchingGitHubProvenance(response(overrides), expected)).toBe(false)
  })

  it('rejects malformed attestation data', () => {
    expect(hasMatchingGitHubProvenance({ attestations: [{ predicateType: 'https://slsa.dev/provenance/v1' }] }, expected))
      .toBe(false)
  })
})
