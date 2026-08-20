# Agent Note: Outcome-bound capability composition

Status: implemented

English | [中文](2026-08-20-outcome-bound-capability-composition.zh.md)

## Problem

Capabilities previously named outcomes and attached provider tools, but did not state what inputs, resources, execution entry point, approval, or evaluation made an outcome operational. Selecting a capability exposed every attached tool, so a local third-party plugin could not be scoped precisely to one promised result.

## Decision

Each capability outcome can declare non-secret inputs, required resource slots, a tool or exported workflow entry point, approval mode, and evaluation asset ids. Selection may pin one outcome. The session records that outcome and exposes core Harness tools, global attachments, and attachments mapped to the selected outcome; tools mapped only to another outcome are denied both immediately and after resume.

Cordis bundles remain the extension unit. The local profile installs npm, Git, private-SSH, or absolute-path bundles and activates their declared patch after restart. Hyperlake CLI/MCP is the built-in governed adapter. dbt-style and customer-owned bundles contribute tools, resource discovery, knowledge, workflows, or evaluations through the same registry and are attached from the capability Tools view. Provider identity and local/platform routing remain in Advanced configuration.

The Web UI presents Overview, Outcomes, Resources, Tools, Knowledge & Assets, Workflows, Evaluations, Access, and Advanced views. Outcomes use structured fields instead of a pipe-delimited capability editor.

## Verification

Pack tests cover outcome-specific tool visibility and durable selection provenance. Component tests cover structured creation, outcome-pinned use, workflow presentation, tool attachment, and plugin installation. The focused suites contain 21 passing tests.

## Alternatives considered

**Make every installed plugin available to every capability.** Rejected because installation is not a grant of contextual relevance and broad visibility makes tool choice less predictable.

**Create Rails records or a separate marketplace service for local plugins.** Rejected because the requested extension path is local and Cordis already owns profile installation, activation, and contribution discovery.

**Encode the complete outcome contract in free-form description text.** Rejected because the runtime could neither validate references nor enforce outcome-specific tool visibility.

## Consequences

Capabilities now describe executable results and can encapsulate Hyperlake plus third-party plugins without moving credentials or execution through Rails. Plugin entry points still rely on their underlying runtime for authorization and action approval; capability metadata narrows composition but does not replace target-system policy.
