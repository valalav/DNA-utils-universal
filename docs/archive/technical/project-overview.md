# DNA-utils-universal Project Master Document

**Last Updated**: April 13, 2025

## Project Overview
DNA-utils-universal is a comprehensive suite of tools for genetic genealogy analysis, focusing on Y-chromosome DNA data processing. The project consists of three main components:

1. **str-matcher**: Web application for STR (Short Tandem Repeat) analysis and matching
2. **ftdna_haplo**: Backend service for processing FTDNA haplogroup data and tree information
3. **ystr_predictor**: Machine learning tool to predict haplogroups based on Y-STR markers

## Current Status
- Overall Project Progress: 76%
- str-matcher: 87% complete
- ftdna_haplo: 80% complete
- ystr_predictor: 60% complete

## Component Overview

### str-matcher
A Next.js web application for analyzing and comparing Y-STR markers, providing tools for genetic distance calculation, match filtering, and visualization.

**Key Features**:
- STR profile data import and validation
- Genetic distance calculation
- Match filtering by haplogroup and marker values
- Result visualization and export
- Multi-language support with localization
- Responsive design for desktop and mobile use

### ftdna_haplo
A Node.js backend service for processing Family Tree DNA haplogroup data and Y-chromosome phylogenetic trees.

**Key Features**:
- Integration with FTDNA API
- Y-haplogroup tree processing and analysis
- SNP history tracking
- Stepped search for haplogroup matching
- YFull data integration

### ystr_predictor
A Python-based machine learning tool for predicting Y-DNA haplogroups from STR marker values.

**Key Features**:
- Decision tree-based prediction model
- CSV data import and processing
- FastAPI backend for easy integration
- Training interface for model improvement

## Critical Path

1. Complete core functionality for all components
2. Integrate ystr_predictor with str-matcher for in-app predictions
3. Implement unified authentication system
4. Develop API gateway for service communication
5. Optimize database structure and queries
6. Finalize UI/UX improvements
7. Comprehensive testing and bug fixing
8. Documentation and deployment preparation

## Key Metrics
- Code Coverage: 78%
- Open Issues: 17
- Resolved Issues: 124
- Performance Score: 86/100

## Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, FastAPI, Python
- **Database**: MongoDB, SQLite
- **Machine Learning**: scikit-learn
- **Deployment**: Docker, Kubernetes

## Next Priorities
1. [NEXT] Improve prediction accuracy in ystr_predictor
2. Enhance data visualization in str-matcher
3. Optimize tree navigation in ftdna_haplo
4. Implement comprehensive error handling across all components
5. Add advanced filtering options to str-matcher

## Team Contact
For technical assistance, contact the project coordinator at support@dna-utils.example.com
