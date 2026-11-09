"""
IntelliPrep AI - Resume Category Classifier Training Script
Trains a TF-IDF + Logistic Regression classification pipeline on the Updated Resume Dataset.
Generates evaluation metrics, classification reports, confusion matrix, and saves the trained model.
"""

import os
import sys
import re
import json
import zipfile
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(BASE_DIR, 'ml', 'models')
DOCS_ML_DIR = os.path.join(ROOT_DIR, 'docs', 'ml')
ZIP_DATASET_PATH = os.path.join(ROOT_DIR, 'archive (5).zip')
CSV_DATASET_PATH = os.path.join(BASE_DIR, 'ml', 'data', 'UpdatedResumeDataSet.csv')
ROOT_CSV_PATH = os.path.join(ROOT_DIR, 'UpdatedResumeDataSet.csv')

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DOCS_ML_DIR, exist_ok=True)


def clean_resume_text(text: str) -> str:
    """
    Cleans raw resume text:
    - Removes URLs
    - Removes RT/cc markings
    - Removes hashtags and mentions
    - Removes special symbols/punctuation
    - Strips non-ASCII characters
    - Normalizes whitespace and converts to lowercase
    """
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+\s*', ' ', text)
    text = re.sub(r'RT|cc', ' ', text)
    text = re.sub(r'#\S+', ' ', text)
    text = re.sub(r'@\S+', ' ', text)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'[^\x00-\x7f]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


def load_dataset() -> pd.DataFrame:
    """Loads dataset from CSV or ZIP file while preserving original files."""
    if os.path.exists(CSV_DATASET_PATH):
        print(f"[Dataset] Loading from csv file: {CSV_DATASET_PATH}")
        return pd.read_csv(CSV_DATASET_PATH)
    elif os.path.exists(ROOT_CSV_PATH):
        print(f"[Dataset] Loading from root csv file: {ROOT_CSV_PATH}")
        return pd.read_csv(ROOT_CSV_PATH)
    elif os.path.exists(ZIP_DATASET_PATH):
        print(f"[Dataset] Loading from zip file: {ZIP_DATASET_PATH}")
        with zipfile.ZipFile(ZIP_DATASET_PATH, 'r') as z:
            csv_names = [n for n in z.namelist() if n.endswith('.csv')]
            if not csv_names:
                raise FileNotFoundError("No CSV file found inside archive (5).zip")
            with z.open(csv_names[0]) as f:
                df = pd.read_csv(f)
                return df
    else:
        raise FileNotFoundError(
            f"Dataset not found at {CSV_DATASET_PATH}, {ROOT_CSV_PATH}, or {ZIP_DATASET_PATH}"
        )


def train_and_evaluate():
    print("=" * 60)
    print("IntelliPrep AI - Resume Category Classifier Training")
    print("=" * 60)

    # 1. Load Dataset
    df = load_dataset()
    print(f"Loaded {len(df)} total records with columns: {list(df.columns)}")

    # Dataset profile
    total_records = len(df)
    unique_categories = df['Category'].nunique()
    category_counts = df['Category'].value_counts().to_dict()
    missing_vals = df.isnull().sum().to_dict()
    dup_rows = int(df.duplicated().sum())

    print(f"Unique categories: {unique_categories}")
    print(f"Duplicate records: {dup_rows}")
    print(f"Missing values: {missing_vals}")

    # 2. Text Preprocessing
    print("\n[Preprocessing] Cleaning resume texts...")
    df['clean_text'] = df['Resume'].apply(clean_resume_text)

    # Filter out empty texts if any
    valid_df = df[df['clean_text'].str.len() > 10].copy()
    print(f"Valid records after cleaning: {len(valid_df)} / {len(df)}")

    # 3. Stratified Train/Test Split
    X = valid_df['clean_text']
    y = valid_df['Category']

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(f"Train samples: {len(X_train)} ({len(X_train)/len(X):.1%})")
    print(f"Test samples:  {len(X_test)} ({len(X_test)/len(X):.1%})")

    # 4. Pipeline Setup: TF-IDF + Logistic Regression
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=2500,
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True
        )),
        ('classifier', LogisticRegression(
            C=1.0,
            max_iter=1000,
            random_state=42,
            solver='lbfgs'
        ))
    ])

    print("\n[Training] Fitting TF-IDF Vectorizer and Logistic Regression...")
    pipeline.fit(X_train, y_train)
    print("[Training] Model training completed successfully.")

    # 5. Model Evaluation
    print("\n[Evaluation] Generating predictions on test set...")
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_weighted = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    prec_macro = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average='macro', zero_division=0))

    classes = sorted(list(pipeline.classes_))
    clf_report_dict = classification_report(y_test, y_pred, zero_division=0, output_dict=True)
    clf_report_text = classification_report(y_test, y_pred, zero_division=0)
    conf_matrix = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    print(f"\n--- Model Performance Summary ---")
    print(f"Accuracy:           {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision (Weighted): {prec_weighted:.4f}")
    print(f"Recall (Weighted):    {rec_weighted:.4f}")
    print(f"F1-Score (Weighted):  {f1_weighted:.4f}")
    print(f"F1-Score (Macro):     {f1_macro:.4f}")
    print("\nClassification Report:\n", clf_report_text)

    # 6. Save Model Artifacts
    model_path = os.path.join(MODELS_DIR, 'resume_classifier.joblib')
    print(f"\n[Persistence] Saving model pipeline to: {model_path}")
    joblib.dump(pipeline, model_path)

    metadata = {
        "modelName": "IntelliPrep Resume Category Classifier",
        "algorithm": "TF-IDF + Multinomial Logistic Regression",
        "trainedAt": datetime.utcnow().isoformat() + "Z",
        "classes": classes,
        "numClasses": len(classes),
        "totalDatasetRows": total_records,
        "trainSamples": len(X_train),
        "testSamples": len(X_test),
        "vocabularySize": len(pipeline.named_steps['tfidf'].vocabulary_),
        "metrics": {
            "accuracy": acc,
            "precisionWeighted": prec_weighted,
            "precisionMacro": prec_macro,
            "recallWeighted": rec_weighted,
            "recallMacro": rec_macro,
            "f1Weighted": f1_weighted,
            "f1Macro": f1_macro,
        },
        "categoryDistribution": category_counts
    }

    metadata_path = os.path.join(MODELS_DIR, 'metadata.json')
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"[Persistence] Saved metadata to: {metadata_path}")

    # 7. Write Markdown Evaluation Report
    report_md_path = os.path.join(DOCS_ML_DIR, 'EVALUATION_REPORT.md')
    with open(report_md_path, 'w', encoding='utf-8') as f:
        f.write("# IntelliPrep AI – Resume Category Classifier Evaluation Report\n\n")
        f.write(f"**Generated**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
        f.write(f"**Dataset**: Updated Resume Dataset (`UpdatedResumeDataSet.csv`)\n\n")
        f.write(f"**Total Records**: {total_records} | **Classes**: {len(classes)}\n\n")
        f.write("## 1. Executive Summary\n\n")
        f.write("A multiclass text classification pipeline was built and trained using Scikit-Learn to automatically categorize candidate resumes into 25 engineering and professional roles. ")
        f.write("The pipeline leverages sublinear TF-IDF unigram/bigram tokenization followed by L2-regularized multinomial Logistic Regression.\n\n")
        f.write("| Metric | Score |\n")
        f.write("| :--- | :--- |\n")
        f.write(f"| **Overall Accuracy** | **{acc * 100:.2f}%** |\n")
        f.write(f"| **Weighted Precision** | **{prec_weighted * 100:.2f}%** |\n")
        f.write(f"| **Weighted Recall** | **{rec_weighted * 100:.2f}%** |\n")
        f.write(f"| **Weighted F1-Score** | **{f1_weighted * 100:.2f}%** |\n")
        f.write(f"| **Macro F1-Score** | **{f1_macro * 100:.2f}%** |\n\n")

        f.write("## 2. Dataset Split & Class Distribution\n\n")
        f.write(f"- **Train Set**: {len(X_train)} samples (80.0%)\n")
        f.write(f"- **Test Set**: {len(X_test)} samples (20.0%)\n")
        f.write(f"- **Stratification**: Preserved class ratios across all 25 categories.\n\n")

        f.write("### Per-Category Class Distribution\n\n")
        f.write("| Category | Total Count | Test Samples | Precision | Recall | F1-Score |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: |\n")
        for cat in classes:
            cnt = category_counts.get(cat, 0)
            c_metrics = clf_report_dict.get(cat, {})
            support = int(c_metrics.get('support', 0))
            p = c_metrics.get('precision', 0.0)
            r = c_metrics.get('recall', 0.0)
            f1 = c_metrics.get('f1-score', 0.0)
            f.write(f"| {cat} | {cnt} | {support} | {p:.2f} | {r:.2f} | {f1:.2f} |\n")

        f.write("\n## 3. Detailed Classification Report\n\n")
        f.write("```text\n")
        f.write(clf_report_text)
        f.write("```\n\n")

        f.write("## 4. Confusion Matrix (25x25)\n\n")
        f.write(f"Classes: `{', '.join(classes)}`\n\n")
        f.write("```json\n")
        f.write(json.dumps(conf_matrix))
        f.write("\n```\n\n")

        f.write("## 5. Architectural Boundaries & Usage Guidelines\n\n")
        f.write("- **Advisory Categorization Only**: The model predicts resume professional role categorization. It does **not** evaluate candidate competence, predict interview success, or determine hiring decisions.\n")
        f.write("- **Deterministic Skill Matching Preserved**: Real-time keyword overlap matching against canonical taxonomies in `skillTaxonomy.js` remains intact and independent.\n")
        f.write("- **Deterministic PDF Extraction Preserved**: The binary `%PDF-` validation and `unpdf` text extraction remains the primary document ingestion pipeline.\n")

    print(f"[Documentation] Saved evaluation report to: {report_md_path}")
    print("\nTraining and evaluation pipeline completed successfully!")


if __name__ == '__main__':
    train_and_evaluate()

