# Documentation Guidelines

## Document Structure
All documentation should follow a consistent structure:

1. **Header**: Document title and last update date
2. **Summary**: Brief overview of the document's purpose
3. **Main Content**: Detailed information organized in sections
4. **Progress Metrics**: Quantifiable measurements of progress
5. **Next Steps**: Clearly defined action items for future work

## Progress Tracking
Track progress using the following format:

```
## Progress Metrics
- Overall Progress: [X]% complete
- [Component]: [X]% complete
- [Component]: [X]% complete
```

## Task Status Indicators
Use the following status indicators for tasks:

- `[NEXT]` - Task is the next priority
- `[WIP]` - Work in progress
- `[DONE]` - Task completed
- `[BLOCKED]` - Task blocked by dependency
- `[POSTPONED]` - Task postponed for later

## Commit Messages
Commit messages should follow this format:
`[Component] Brief description of changes`

Example: `[Data] Add preprocessing for FTDNA data format`

## Technical Documentation
Technical documentation should include:

1. Function signatures
2. Input/output specifications
3. Dependencies
4. Usage examples
5. Error handling approaches

## Review Process
All documentation should be reviewed for:

1. Accuracy
2. Completeness
3. Clarity
4. Consistency
5. Actionability

## Templates

### Task Template
```markdown
## [Task Name]
**Status**: [NEXT|WIP|DONE|BLOCKED|POSTPONED]
**Priority**: [High|Medium|Low]
**Assigned**: [Assignee]
**Dependencies**: [List of dependencies]

### Description
[Detailed description of the task]

### Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

### Notes
[Additional information]
```

### Progress Report Template
```markdown
## Progress Report: [Date]
**Component**: [Component Name]
**Progress**: [X]% complete

### Completed This Period
- [Task 1]
- [Task 2]

### In Progress
- [Task 3]
- [Task 4]

### Blockers
- [Blocker 1]
- [Blocker 2]

### Next Steps
- [Step 1]
- [Step 2]
```
