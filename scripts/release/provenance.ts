import { Buffer } from 'node:buffer'

export interface GitHubProvenanceExpectation {
  readonly gitCommit: string
  readonly integrity: string
  readonly name: string
  readonly repository: string
  readonly version: string
  readonly workflowPath: string
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function sha512Hex(integrity: string): string | undefined {
  const match = /^sha512-(.+)$/.exec(integrity)
  if (match?.[1] === undefined) return undefined
  return Buffer.from(match[1], 'base64').toString('hex')
}

function subjectMatches(statement: Record<string, unknown>, expected: GitHubProvenanceExpectation): boolean {
  const digest = sha512Hex(expected.integrity)
  if (digest === undefined || !Array.isArray(statement.subject)) return false
  return statement.subject.some((candidate) => {
    const subject = record(candidate)
    const subjectDigest = record(subject?.digest)
    if (typeof subject?.name !== 'string' || subjectDigest?.sha512 !== digest) return false
    if (!subject.name.startsWith('pkg:npm/')) return false
    return decodeURIComponent(subject.name.slice('pkg:npm/'.length)) === `${expected.name}@${expected.version}`
  })
}

function predicateMatches(statement: Record<string, unknown>, expected: GitHubProvenanceExpectation): boolean {
  const predicate = record(statement.predicate)
  const buildDefinition = record(predicate?.buildDefinition)
  const externalParameters = record(buildDefinition?.externalParameters)
  const workflow = record(externalParameters?.workflow)
  const dependencies = buildDefinition?.resolvedDependencies
  if (workflow?.repository !== `https://github.com/${expected.repository}`) return false
  if (workflow.path !== expected.workflowPath) return false
  if (!Array.isArray(dependencies)) return false
  return dependencies.some(candidate => record(record(candidate)?.digest)?.gitCommit === expected.gitCommit)
}

/** Verify that an npm SLSA envelope binds a package tarball to this exact GitHub build. */
export function hasMatchingGitHubProvenance(
  response: unknown,
  expected: GitHubProvenanceExpectation,
): boolean {
  const attestations = record(response)?.attestations
  if (!Array.isArray(attestations)) return false
  return attestations.some((candidate) => {
    const attestation = record(candidate)
    if (attestation?.predicateType !== 'https://slsa.dev/provenance/v1') return false
    const bundle = record(attestation.bundle)
    const envelope = record(bundle?.dsseEnvelope)
    if (typeof envelope?.payload !== 'string') return false
    try {
      const statement = record(JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8')))
      return statement !== undefined
        && subjectMatches(statement, expected)
        && predicateMatches(statement, expected)
    } catch {
      return false
    }
  })
}
