# IntelliPrep AI – Resume Category Classifier Evaluation Report

**Generated**: 2026-11-09 12:22:20 UTC

**Dataset**: Updated Resume Dataset (`UpdatedResumeDataSet.csv`)

**Total Records**: 962 | **Classes**: 25

## 1. Executive Summary

A multiclass text classification pipeline was built and trained using Scikit-Learn to automatically categorize candidate resumes into 25 engineering and professional roles. The pipeline leverages sublinear TF-IDF unigram/bigram tokenization followed by L2-regularized multinomial Logistic Regression.

| Metric | Score |
| :--- | :--- |
| **Overall Accuracy** | **98.96%** |
| **Weighted Precision** | **99.04%** |
| **Weighted Recall** | **98.96%** |
| **Weighted F1-Score** | **98.97%** |
| **Macro F1-Score** | **98.70%** |

## 2. Dataset Split & Class Distribution

- **Train Set**: 769 samples (80.0%)
- **Test Set**: 193 samples (20.0%)
- **Stratification**: Preserved class ratios across all 25 categories.

### Per-Category Class Distribution

| Category | Total Count | Test Samples | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Advocate | 20 | 4 | 1.00 | 1.00 | 1.00 |
| Arts | 36 | 7 | 1.00 | 1.00 | 1.00 |
| Automation Testing | 26 | 5 | 0.80 | 0.80 | 0.80 |
| Blockchain | 40 | 8 | 1.00 | 1.00 | 1.00 |
| Business Analyst | 28 | 6 | 1.00 | 1.00 | 1.00 |
| Civil Engineer | 24 | 5 | 1.00 | 1.00 | 1.00 |
| Data Science | 40 | 8 | 1.00 | 1.00 | 1.00 |
| Database | 33 | 7 | 1.00 | 1.00 | 1.00 |
| DevOps Engineer | 55 | 11 | 1.00 | 0.91 | 0.95 |
| DotNet Developer | 28 | 5 | 1.00 | 1.00 | 1.00 |
| ETL Developer | 40 | 8 | 1.00 | 1.00 | 1.00 |
| Electrical Engineering | 30 | 6 | 0.86 | 1.00 | 0.92 |
| HR | 44 | 9 | 1.00 | 1.00 | 1.00 |
| Hadoop | 42 | 8 | 1.00 | 1.00 | 1.00 |
| Health and fitness | 30 | 6 | 1.00 | 1.00 | 1.00 |
| Java Developer | 84 | 17 | 1.00 | 1.00 | 1.00 |
| Mechanical Engineer | 40 | 8 | 1.00 | 1.00 | 1.00 |
| Network Security Engineer | 25 | 5 | 1.00 | 1.00 | 1.00 |
| Operations Manager | 40 | 8 | 1.00 | 1.00 | 1.00 |
| PMO | 30 | 6 | 1.00 | 1.00 | 1.00 |
| Python Developer | 48 | 10 | 1.00 | 1.00 | 1.00 |
| SAP Developer | 24 | 5 | 1.00 | 1.00 | 1.00 |
| Sales | 40 | 8 | 1.00 | 1.00 | 1.00 |
| Testing | 70 | 14 | 1.00 | 1.00 | 1.00 |
| Web Designing | 45 | 9 | 1.00 | 1.00 | 1.00 |

## 3. Detailed Classification Report

```text
                           precision    recall  f1-score   support

                 Advocate       1.00      1.00      1.00         4
                     Arts       1.00      1.00      1.00         7
       Automation Testing       0.80      0.80      0.80         5
               Blockchain       1.00      1.00      1.00         8
         Business Analyst       1.00      1.00      1.00         6
           Civil Engineer       1.00      1.00      1.00         5
             Data Science       1.00      1.00      1.00         8
                 Database       1.00      1.00      1.00         7
          DevOps Engineer       1.00      0.91      0.95        11
         DotNet Developer       1.00      1.00      1.00         5
            ETL Developer       1.00      1.00      1.00         8
   Electrical Engineering       0.86      1.00      0.92         6
                       HR       1.00      1.00      1.00         9
                   Hadoop       1.00      1.00      1.00         8
       Health and fitness       1.00      1.00      1.00         6
           Java Developer       1.00      1.00      1.00        17
      Mechanical Engineer       1.00      1.00      1.00         8
Network Security Engineer       1.00      1.00      1.00         5
       Operations Manager       1.00      1.00      1.00         8
                      PMO       1.00      1.00      1.00         6
         Python Developer       1.00      1.00      1.00        10
            SAP Developer       1.00      1.00      1.00         5
                    Sales       1.00      1.00      1.00         8
                  Testing       1.00      1.00      1.00        14
            Web Designing       1.00      1.00      1.00         9

                 accuracy                           0.99       193
                macro avg       0.99      0.99      0.99       193
             weighted avg       0.99      0.99      0.99       193
```

## 4. Confusion Matrix (25x25)

Classes: `Advocate, Arts, Automation Testing, Blockchain, Business Analyst, Civil Engineer, Data Science, Database, DevOps Engineer, DotNet Developer, ETL Developer, Electrical Engineering, HR, Hadoop, Health and fitness, Java Developer, Mechanical Engineer, Network Security Engineer, Operations Manager, PMO, Python Developer, SAP Developer, Sales, Testing, Web Designing`

```json
[[4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9]]
```

## 5. Architectural Boundaries & Usage Guidelines

- **Advisory Categorization Only**: The model predicts resume professional role categorization. It does **not** evaluate candidate competence, predict interview success, or determine hiring decisions.
- **Deterministic Skill Matching Preserved**: Real-time keyword overlap matching against canonical taxonomies in `skillTaxonomy.js` remains intact and independent.
- **Deterministic PDF Extraction Preserved**: The binary `%PDF-` validation and `unpdf` text extraction remains the primary document ingestion pipeline.
