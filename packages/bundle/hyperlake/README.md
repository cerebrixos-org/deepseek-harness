# `@cerebrixos/superharness-base`

English | [中文](README.zh.md)

This bundle adds the portable Hyperlake pack registry, the Data Engineering capability, and the read-only Capability Library to a DeepSeek Harness profile. It stores no credentials. The profile layer adds the Hyperlake adapter that supplies governed access to customer resources.

## Model Experience

### Capability composition

#### What the model sees

The fixed discovery, validation, and asset tools contributed by `@cerebrixos/superharness-packs`, plus the concise Data Engineering operating guidance. The Capability Library itself contributes no model input.

#### Token effect

The Data Engineering prompt adds a small fixed prefix. Later tool calls and results add data-dependent tokens.

#### KV Cache effect

The bundle adds the registry's fixed tool schemas and stable Data Engineering guidance.

## Known Limitations and Deferred Work

- The Capability Library reports current provider availability; resource binding and installation actions are intentionally deferred.
