---
name: plan-path-reconciliation
description: |
  Use when a plan specifies paths or conventions that don't match the actual repo structure.
  Triggers: plan mentions `data/radios/catalog/*.json` but repo has `data/radios/*.json`,
  validator scripts reference non-existent directories, documentation references wrong paths,
  "file not found" errors when running plan-specified commands. Solves path mismatches
  without destructive refactoring.
---

# Plan Path Reconciliation

## Problem

Plans written without full repo context often specify directory structures or conventions that differ from the canonical layout. Blindly restructuring the repo to match the plan breaks existing code, tests, and documentation.

## Trigger Conditions

- Plan references paths that don't exist (e.g., `data/radios/catalog/` vs actual `data/radios/`)
- Validator scripts fail with "directory not found" or "no files matched"
- Documentation references differ from actual file locations
- CI/CD expects structure A, repo has structure B
- `glob()` or file reads return empty when plan says they should find files

## Solution

### Step 1: Audit Current Reality

```bash
# Find what actually exists
find . -type f -name "*.json" | head -20
ls -la data/
```

Document the canonical existing structure. This is your source of truth.

### Step 2: Preserve Canonical Layout

Do NOT restructure the repo. The existing layout is:
- Already working with current code
- Referenced by tests and CI
- Known to downstream consumers

### Step 3: Add Compatibility Artifacts (Non-Breaking)

If the plan expects `data/radios/catalog/` but you have `data/radios/`:

**Option A: Symlink for compatibility**
```bash
mkdir -p data/radios/catalog
ln -s ../radios/*.json data/radios/catalog/
```

**Option B: Update plan references to match reality**
- Change validator paths from `data/radios/catalog/*.json` to `data/radios/*.json`
- Update documentation to reference actual paths
- This is preferred when no external consumers expect the "plan" paths

### Step 4: Enhance Validators with Coverage Checks

Add a validator that confirms docs and records stay in sync:

```bash
# Example: verify each radio has corresponding docs
for radio in data/radios/*.json; do
  name=$(basename "$radio" .json)
  if [[ ! -f "docs/radios/${name}.md" ]]; then
    echo "Missing doc for: $name"
  fi
done
```

### Step 5: Document the Canonical Structure

Add a brief note to README or a `STRUCTURE.md` file:

```markdown
## Data Layout

- `data/radios/*.json` - Radio catalog records (canonical)
- `docs/radios/*.md` - Radio documentation pages
```

## Verification

- [ ] Existing tests still pass
- [ ] CI/CD pipeline succeeds
- [ ] Validators run without path errors
- [ ] No files were moved or renamed
- [ ] Coverage check catches missing docs/records
- [ ] Documentation reflects actual paths

## Example Commands

```bash
# Audit existing structure
find data -type f -name "*.json" | sort

# Check for orphaned docs (docs without records)
for doc in docs/radios/*.md; do
  name=$(basename "$doc" .md)
  [[ -f "data/radios/${name}.json" ]] || echo "Orphaned doc: $name"
done

# Check for missing docs (records without docs)
for record in data/radios/*.json; do
  name=$(basename "$record" .json)
  [[ -f "docs/radios/${name}.md" ]] || echo "Missing doc: $name"
done
```

## Notes

**Avoid destructive refactors when:**
- Existing code imports from current paths
- Tests assert current structure
- External systems depend on current layout
- No clear migration path exists

**Prefer updating the plan when:**
- Plan is new and not yet implemented
- No external consumers expect the plan's paths
- Changing one config line is easier than restructuring

**The principle:** The repo is the source of truth. Plans are suggestions that must adapt to reality, not the reverse.
