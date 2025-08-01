# AI Development Guidelines

**Last Updated**: April 13, 2025

## Overview
This document outlines guidelines and best practices for AI-assisted development on the DNA-utils-universal project. These instructions are specifically crafted for AI assistants working on code generation, refactoring, and documentation tasks.

## Development Principles

### Code Modifications
1. **Direct File Modification** - Always modify files directly using appropriate functions like `edit_file` and `write_file`
2. **Atomic Changes** - Make focused changes to address specific issues rather than large refactorings
3. **Code Consistency** - Follow the existing code style and patterns in each component
4. **Documentation** - Add inline documentation for all new code and update existing documentation
5. **Testing** - Include test cases or testing instructions for new functionality

### Project Structure
Respect the existing project structure:
- **str-matcher** - Next.js web application (TypeScript/React)
- **ftdna_haplo** - Node.js backend services
- **ystr_predictor** - Python-based ML service

### Technology-Specific Guidelines

#### TypeScript/React (str-matcher)
- Use functional components with hooks
- Maintain type safety with proper interfaces and types
- Follow React best practices for state management
- Use the existing utility functions for common operations
- Utilize the components library for UI elements

#### Node.js (ftdna_haplo)
- Follow modular design patterns
- Use async/await for asynchronous operations
- Implement proper error handling
- Maintain backward compatibility with existing APIs
- Document API changes

#### Python (ystr_predictor)
- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Document functions using docstrings
- Implement proper error handling
- Use the established ML pipeline structure

### Task Workflow
When working on tasks:
1. Analyze the current state of relevant files
2. Understand dependencies and potential impacts
3. Implement changes directly in the files
4. Update related documentation
5. Update task status in the appropriate progress files

## Best Practices for AI Development

### Code Generation
- Generate complete, runnable code
- Include error handling for edge cases
- Add comments explaining complex logic
- Follow established patterns from existing code

### Code Analysis
- When analyzing code, identify:
  - Potential bugs or inefficiencies
  - Opportunities for improvement
  - Dependencies and side effects
  - Documentation gaps

### Documentation
- Use Markdown for all documentation
- Follow the templates in 01_GUIDELINES.md
- Include examples where appropriate
- Update related documents when implementing changes

### Progress Tracking
- Update CURRENT_TASKS.md with task status changes
- Update component-specific progress documents
- Maintain accurate progress percentages

## Machine Learning Development

### Model Improvements
- Document model architecture changes
- Record metrics before and after changes
- Save model training parameters
- Implement proper validation procedures
- Consider interpretability and transparency

### Data Processing
- Document data cleaning and preprocessing steps
- Implement data validation
- Handle missing or invalid data gracefully
- Consider data privacy implications

## Closing Notes
These guidelines are meant to ensure consistency and quality across the project. When in doubt, prioritize maintainability, readability, and alignment with project goals.
