---
name: Gemini ReAct JSON parsing
description: Gemini often outputs real newlines inside JSON string values (the "thought" field), making JSON.parse fail silently. Fix required for any ReAct-style agent loop.
---

# Gemini ReAct JSON Parsing Quirk

## The rule
Never rely on bare `JSON.parse` for Gemini ReAct output. Always sanitize first, then fall back to regex extraction.

**Why:** Gemini embeds actual `\n` (newline characters, not the escape sequence) inside the `"thought"` string field when the thought is multi-sentence. This violates the JSON spec and causes `JSON.parse` to return null silently.

**How to apply:** Use a three-layer extraction strategy in any agent runtime:
1. Try code-fence block (```` ```json ... ``` ````), sanitized with char-by-char scanner that escapes bare newlines inside strings.
2. Try outermost `{...}` block, same sanitizer.
3. Regex fallback: extract `"action"` and `"action_input"` individually using balanced-brace traversal.

The `sanitizeJSON(str)` function walks char-by-char tracking `inString` state and replaces bare `\n`, `\r`, `\t` with their escaped forms only when inside a string.

This fix lives in `agent-os.js` → `sanitizeJSON()` + `extractJSON()`.
