# Agent Note: Outcome-bound capability composition

Status: implemented

English | [中文](2026-08-20-outcome-bound-capability-composition.zh.md)

## Problem

Capabilities previously named outcomes and attached provider tools, but did not state what inputs, resources, execution entry point, approval, or evaluation made an outcome operational. Selecting a capability exposed every attached tool, so a local third-party plugin could not be scoped precisely to one promised result.

## Decision

Each capability outcome can declare non-secret inputs, required resource slots, a tool or exported workflow entry point, approval mode, and evaluation asset ids. Selection may pin one outcome. The session records that outcome and exposes core Harness tools, global attachments, and attachments mapped to the selected outcome; tools mapped only to another outcome are denied both immediately and after resume.

Multiple capabilities may remain configured and ready concurrently, but each conversation selects exactly one ready capability and outcome before its first turn. The composer exposes that selection directly, persists it in the session, and locks it after conversation work begins. The capability cards report whether they are disabled, need setup, are ready, or are active in the current conversation.

Cordis bundles remain the extension unit. The local profile installs npm, Git, private-SSH, or absolute-path bundles and activates their declared patch after restart. Hyperlake CLI/MCP is the built-in governed adapter. dbt-style and customer-owned bundles contribute tools, resource discovery, knowledge, workflows, or evaluations through the same registry and are attached from the capability Tools view. Provider identity and local/platform routing remain in Advanced configuration.

The Web UI presents Overview, Outcomes, Resources, Tools, Knowledge & Assets, Workflows, Evaluations, Access, and Advanced views. Outcomes use structured fields instead of a pipe-delimited capability editor.

Resource setup begins from each declared slot. The UI filters installed providers by compatible resource type, discovers already-authorized resources, and attaches and binds a selected opaque id in one action. The Hyperlake adapter contributes discovery for Hyperlake clusters, SaaS Lake environments, deployed agents, semantic-model projects, governed services, and monitors. It registers its MCP tools as a non-removable installation-wide attachment; credentials and target authorization remain in the Hyperlake CLI and target services. A free-form resource editor remains for additional plugin context that has no discovery provider.

## Verification

Pack tests cover outcome-specific tool visibility, durable selection provenance, installation-wide attachments, and binding cleanup. Adapter tests cover the built-in resource providers and shared Hyperlake tool registration. Component tests cover structured creation, composer selection, guided discovery and binding, workflow presentation, tool attachment, and plugin installation.

## Alternatives considered

**Make every installed plugin available to every capability.** Rejected because installation is not a grant of contextual relevance and broad visibility makes tool choice less predictable.

**Create Rails records or a separate marketplace service for local plugins.** Rejected because the requested extension path is local and Cordis already owns profile installation, activation, and contribution discovery.

**Encode the complete outcome contract in free-form description text.** Rejected because the runtime could neither validate references nor enforce outcome-specific tool visibility.

**Activate every ready capability in every conversation.** Rejected because overlapping outcomes and resource bindings would make target selection ambiguous. Readiness belongs to deployment configuration; activation belongs to one conversation.

**Ask users to transcribe resource ids, endpoints, or credentials into a generic form.** Rejected because installed adapters can discover authorized resources through their existing secure configuration. Opaque provider ids preserve that authority boundary and avoid duplicating secrets.

## Consequences

Capabilities now describe executable results and can encapsulate Hyperlake plus third-party plugins without moving credentials or execution through Rails. A conversation gains an explicit, durable operating context and resource setup no longer requires understanding provider internals. Plugin entry points still rely on their underlying runtime for authorization and action approval; capability metadata narrows composition but does not replace target-system policy. Installed tools that do not identify themselves as shared or capability attachments remain visible and are labeled as outside capability management rather than being falsely presented as restricted.
