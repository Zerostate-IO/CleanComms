---
name: cleancomms-plan-safekeeping
description: |
  Enforces the 'Plan Safekeeping' requirement for the CleanComms project. 
  Use when modifying implementation files that have corresponding entries in .sisyphus/plans.
  Ensures that implementation and planning remain synchronized in the same commit.
---

# CleanComms Plan Safekeeping

## Problem
In complex agentic workflows, implementation can easily diverge from the project's structured plans. If implementation changes are committed without updating the corresponding plan files, the project's roadmap becomes inaccurate, leading to confusion and potential rework.

## Context / Trigger Conditions
- **Project**: CleanComms
- **Directory**: `.sisyphus/plans/`
- **Action**: Any modification to the codebase that implements, changes, or removes a feature described in a plan file.

## Solution
1. **Identify the Plan**: Locate the relevant plan file in `.sisyphus/plans/` that corresponds to the work being performed.
2. **Update the Plan**: As implementation progresses, update the plan file to reflect the current state (e.g., marking tasks as complete, updating descriptions, or adding new sub-tasks).
3. **Atomic Commit**: Include both the implementation changes and the updated plan file in the **same git commit**.
4. **Documentation**: Reference the plan update in the commit message (e.g., `feat(core): implement X and update plan`).

## Verification
- Check that the commit contains both implementation files and the relevant `.sisyphus/plans/*.md` file.
- Ensure the plan file accurately reflects the work performed in the implementation files.

## Example
If you are implementing a new `CAT` control feature:
1. Modify `internal/rig/cat.go`.
2. Update `.sisyphus/plans/hardware-orchestration.md` to mark the CAT control task as complete.
3. Commit both files: `git add internal/rig/cat.go .sisyphus/plans/hardware-orchestration.md && git commit -m "feat(rig): implement CAT control and update plan"`

## Notes
- This requirement is explicitly stated in the project's `CONTRIBUTING.md`.
- Pull requests that fail to synchronize implementation and planning may be rejected by maintainers.
