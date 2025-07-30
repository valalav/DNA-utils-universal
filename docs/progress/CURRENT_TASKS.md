# Current Tasks

**Last Updated**: April 13, 2025

## High Priority Tasks

### 1. Machine Learning Model Improvement
**Status**: [NEXT]
**Component**: ystr_predictor
**Dependencies**: None

#### Description
Improve the prediction accuracy of the ystr_predictor model by implementing feature importance analysis and hyperparameter tuning. The current model has a baseline accuracy of 83.5% that needs improvement for edge cases and rare haplogroups. Based on the detailed analysis in `ml_model_analysis.md`, we need to focus on integrating the strengths of all three existing approaches (TreeHaploPredictor, EnsemblePredictor, and ExplainablePredictor).

#### Acceptance Criteria
- Implement feature importance analysis to identify key STR markers using SHAP values
- Add hyperparameter tuning for the tree-based models using Optuna
- Increase overall prediction accuracy from 83.5% to at least 88.5%
- Improve handling of rare haplogroups with limited training data using synthetic samples
- Add comprehensive cross-validation with stratification by haplogroup
- Implement confidence scoring for predictions to identify uncertain cases
- Integrate model explanations into the API response
- Document the improvements, model parameters, and feature importance rankings

#### Notes
The current implementation uses three different approaches: hierarchical (TreeHaploPredictor), ensemble (EnsemblePredictor), and explainable (ExplainablePredictor). We need to create a unified approach that combines the strengths of all three:

1. Hierarchical structure from TreeHaploPredictor
2. Multiple algorithm ensemble from EnsemblePredictor
3. Explainability and hyperparameter tuning from ExplainablePredictor

Refer to `docs/progress/ml_model_analysis.md` for detailed model analysis and specific improvement recommendations.

---

### 2. Data Visualization Enhancement
**Status**: [WIP]
**Component**: str-matcher
**Priority**: High
**Dependencies**: None

#### Description
Enhance the data visualization components in str-matcher to provide more insightful and interactive ways to understand genetic relationships. This includes improvements to the matches table, adding network visualizations, and better haplogroup distribution charts.

#### Acceptance Criteria
- Implement interactive network graph for match visualization
- Add hierarchical clustering of matches based on genetic distance
- Create haplogroup distribution charts
- Implement marker frequency analysis visualization
- Ensure all visualizations are responsive and work on mobile devices

---

### 3. API Gateway Implementation
**Status**: [BLOCKED]
**Component**: All
**Priority**: High
**Dependencies**: Authentication Service

#### Description
Implement an API gateway to unify access to all services (str-matcher, ftdna_haplo, ystr_predictor) and provide consistent authentication, rate limiting, and logging.

#### Acceptance Criteria
- Unified endpoint for all service APIs
- Consistent authentication across all services
- Rate limiting to prevent abuse
- Logging and monitoring
- Documentation of API endpoints

#### Notes
Blocked pending completion of the authentication service refactoring.

---

## Medium Priority Tasks

### 4. Optimize Database Queries
**Status**: [WIP]
**Component**: ftdna_haplo
**Priority**: Medium
**Dependencies**: None

#### Description
Optimize database queries in the ftdna_haplo service to improve performance, especially for large phylogenetic trees and historical data.

#### Acceptance Criteria
- Implement indexing for frequently queried fields
- Rewrite inefficient queries
- Add query caching where appropriate
- Benchmark and document performance improvements

---

### 5. Enhanced Error Handling
**Status**: [POSTPONED]
**Component**: All
**Priority**: Medium
**Dependencies**: API Gateway

#### Description
Implement comprehensive error handling across all components, with consistent error codes, messages, and recovery strategies.

#### Acceptance Criteria
- Define error taxonomy and codes
- Implement graceful degradation for service failures
- Add user-friendly error messages
- Implement error logging and monitoring
- Document error handling approach

---

## Low Priority Tasks

### 6. Documentation Update
**Status**: [WIP]
**Component**: All
**Priority**: Low
**Dependencies**: None

#### Description
Update and expand documentation for all components, including API docs, user guides, and developer documentation.

#### Acceptance Criteria
- Update API documentation
- Create user guides for each component
- Document deployment and configuration
- Add troubleshooting guides
- Create developer onboarding documentation

---

### 7. UI/UX Refinements
**Status**: [COMPLETED]
**Component**: str-matcher
**Priority**: Low
**Dependencies**: Data Visualization Enhancement

#### Description
Refine the user interface and experience of the str-matcher application to improve usability, accessibility, and visual appeal.

#### Acceptance Criteria
- ✅ Conduct usability testing
- ✅ Implement accessibility improvements
- ✅ Refine color scheme and visual design
- ✅ Optimize mobile experience
- ✅ Add guided tutorials for new users

#### Completion Notes
The UI was modernized with the following improvements:
- Updated color scheme with more vibrant primary and accent colors
- Improved component styling with rounded corners, better shadows, and consistent spacing
- Enhanced form controls with better focus states and transitions
- Improved mobile responsiveness
- Better visual hierarchy with refined typography and spacing
- Smooth animations and transitions for interactive elements
- Improved accessibility with better contrast and focus indicators
