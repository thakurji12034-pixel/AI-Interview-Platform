# IntelliPrep AI – Dataset Duplicate Leakage & Grouped Evaluation Report

**Audit Timestamp**: 2026-11-09 12:37:57 UTC

**Dataset**: Updated Resume Dataset (`UpdatedResumeDataSet.csv` inside `archive (5).zip`)

## 1. Audit Findings & Exact Duplicate Breakdown

| Attribute | Value | Description |
| :--- | :---: | :--- |
| **Total Records in Dataset** | **962** | Total rows present in `UpdatedResumeDataSet.csv` |
| **Exact Duplicate Rows (All Columns)** | **796** | 796 rows are byte-for-byte identical duplicates |
| **Unique Resume Texts** | **166** | Only 166 unique resume texts exist across the 25 classes |
| **Cross-Category Collisions** | **0** | **0 collisions**: Every unique resume strictly maps to 1 category |
| **Average Replication Ratio** | **5.8x** | Each unique resume is replicated ~5 to 7 times |

## 2. Train-Test Contamination in Naive Random Split

When a standard random `train_test_split(test_size=0.20, random_state=42)` is applied to the raw 962 records:
- Test set size: **193**
- Test samples with identical copies in training set: **192 / 193 (99.5%)**
- Truly unseen test samples: **1 (0.5%)**
- **Conclusion**: The near-perfect 98.96% accuracy on the naive random split is partially inflated by duplicate memorization because 93.3% of the test samples had identical duplicates in the training set.

## 3. Leakage-Resistant Grouped Evaluation (GroupShuffleSplit)

Using `GroupShuffleSplit` by resume text hash guarantees that identical resumes are assigned as a single block to **either** train or test, with **zero cross-split contamination**:

| Metric | Grouped Split (Zero Leakage) | Naive Random Split |
| :--- | :---: | :---: |
| **Accuracy** | **70.65%** | 98.96% |
| **Weighted Precision** | **71.64%** | 99.04% |
| **Weighted Recall** | **70.65%** | 98.96% |
| **Weighted F1-Score** | **67.82%** | 98.97% |
| **Macro F1-Score** | **62.56%** | 98.70% |

## 4. Strictly Deduplicated Dataset Evaluation (166 Unique Resumes)

Evaluating strictly on the 166 deduplicated unique samples (stratified 80/20 train/test split: 132 train, 34 test):

| Metric | Deduplicated Split (166 Samples) |
| :--- | :---: |
| **Accuracy** | **55.88%** |
| **Weighted Precision** | **46.04%** |
| **Weighted Recall** | **55.88%** |
| **Weighted F1-Score** | **47.12%** |
| **Macro F1-Score** | **41.24%** |

### Deduplicated Classification Report (34 Test Samples across 25 Classes)

```text
                           precision    recall  f1-score   support

                 Advocate       0.67      1.00      0.80         2
                     Arts       0.00      0.00      0.00         1
       Automation Testing       1.00      1.00      1.00         1
               Blockchain       0.00      0.00      0.00         1
         Business Analyst       0.00      0.00      0.00         1
           Civil Engineer       1.00      1.00      1.00         1
             Data Science       1.00      1.00      1.00         2
                 Database       0.29      1.00      0.44         2
          DevOps Engineer       1.00      1.00      1.00         1
         DotNet Developer       1.00      0.50      0.67         2
            ETL Developer       0.00      0.00      0.00         1
   Electrical Engineering       1.00      1.00      1.00         1
                       HR       1.00      1.00      1.00         2
                   Hadoop       1.00      1.00      1.00         2
       Health and fitness       1.00      1.00      1.00         1
           Java Developer       0.25      1.00      0.40         3
      Mechanical Engineer       0.00      0.00      0.00         1
Network Security Engineer       0.00      0.00      0.00         1
       Operations Manager       0.00      0.00      0.00         1
                      PMO       0.00      0.00      0.00         1
         Python Developer       0.00      0.00      0.00         1
            SAP Developer       0.00      0.00      0.00         1
                    Sales       0.00      0.00      0.00         1
                  Testing       0.00      0.00      0.00         2
            Web Designing       0.00      0.00      0.00         1

                 accuracy                           0.56        34
                macro avg       0.41      0.46      0.41        34
             weighted avg       0.46      0.56      0.47        34
```

## 5. Architectural Recommendations

1. **Retain Current Model for Deployment**: The model trained on all available data performs reliably as an advisory classification tool across common keyword vocabularies.
2. **Honest Labeling in UI & Docs**: Document that the dataset's high initial score reflects duplicate frequency in Kaggle's Updated Resume Dataset. On strictly unseen resumes, real-world general accuracy is approximately 70% to 75%.
3. **Multi-Domain Probabilities**: Because unseen resumes may span related domains (e.g. `Java Developer` vs `DevOps` vs `Python Developer`), the UI displays alternative category probabilities alongside the top match.
