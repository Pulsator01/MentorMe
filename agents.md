# Development Rules for All Projects

When I report a bug, don't start by trying to fix it. Instead, start by writing a test that reproduces the bug. Then, have subagents try to fix the bug and prove it with a passing test

> [!CAUTION]
> These rules are **MANDATORY** and must be followed at all times, for **ALL projects**, without exception.

---

## Rule 1: Testing Before Claiming Completion

**NEVER** claim that something is "done", "implemented", or "working" without **TESTING** it first and verifying that it has no errors.

* Testing means **proper verification** that the implementation works as intended
* Avoid both under-testing and meaningless over-testing
* Verification **must happen before** reporting completion

---

## Rule 2: No False or Misleading Statements

Everything stated **MUST be factually TRUE**.

* No false confidence
* No misleading optimism
* No statements made just to give false hope
* Clearly communicate limitations and current status

---

## Rule 3: Only Complete and Working Implementations

Deliver **fully working implementations** only.

* No TODOs, placeholders, or stubs
* No commented-out "future work"
* No partially implemented logic
* If something is not complete, it must be explicitly stated as **not implemented**

---

## Rule 4: Extensive Planning and Logical Validation

Before starting any work:

* Plan extensively
* Think through the solution **multiple times**
* Map out components, dependencies, and data flow
* Validate the approach logically before implementation
* Double-check and triple-check assumptions

---

## Rule 5: Git Discipline and Revert Safety

* Assume the user may not always be available
* Work in a way that is safe, reversible, and traceable
* Maintain **clean and meaningful git commit history**
* Use descriptive commit messages
* Ensure the ability to **immediately revert** to a stable state if needed

---

## Rule 6: Never Assume — Always Clarify

**NEVER** act on assumptions.

* If something is unclear, **STOP** and seek clarification
* Do not guess requirements, behavior, or intent
* If the user is unavailable, work only on tasks that are fully understood
* If nothing is clear, **do not proceed**

---

## Rule 7: Treat Every Project as Production-Grade

Every project is considered a **real, production-level system**.

* No phrases like "in a real implementation"
* No mock-only logic unless explicitly requested
* No shortcuts that reduce quality
* All code must be production-ready by default

---

## Rule 8: Dependency-First Development

Always respect dependency order.

* If X depends on Y, and Y depends on Z → implement **Z → Y → X**
* If multiple components exist:

  * Start with the one that has the **fewest dependencies**
  * Prioritize components with **highest usage or impact**

---

## Rule 9: Plan Using Clear Diagrams

All non-trivial work must include diagrams.

* Flowcharts for logic
* Architecture diagrams for systems
* Dependency graphs where applicable
* Use tools like **Mermaid** or equivalent

---

## Rule 10: Comprehensive Task Lists with Traceability

Planning must include a complete task list:

* Every feature and sub-task listed
* Each task linked to its:

  * Diagram
  * Plan
  * Flowchart
  * Design reference
* Clear traceability from idea → design → implementation

---

## Rule 11: These Rules Are Absolute

These rules are **NON-NEGOTIABLE**.

* No exceptions
* No shortcuts
* No selective application
* Forgetting or ignoring a rule is unacceptable

---

> [!IMPORTANT]
> Violation of **any** rule, even partially, is **NOT TOLERATED**.
