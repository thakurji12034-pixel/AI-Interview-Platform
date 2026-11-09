"""
IntelliPrep AI - Resume Category Predictor
Accepts resume text via stdin or command line, cleans text, and runs inference
against the saved Scikit-Learn TF-IDF + Logistic Regression pipeline.
Outputs calibrated prediction probabilities and handles invalid/empty inputs.
"""

import os
import sys
import re
import json
import argparse
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'models', 'resume_classifier.joblib')
METADATA_PATH = os.path.join(BASE_DIR, 'ml', 'models', 'metadata.json')


def clean_resume_text(text: str) -> str:
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


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def predict(raw_text: str):
    if not raw_text or not isinstance(raw_text, str) or not raw_text.strip():
        return {
            "success": False,
            "error": "EMPTY_INPUT",
            "message": "Resume text is empty or contains no extractable characters"
        }

    cleaned = clean_resume_text(raw_text)
    words = cleaned.split()
    if len(cleaned) < 15 or len(words) < 3:
        return {
            "success": False,
            "error": "INSUFFICIENT_TEXT",
            "message": "Resume text contains insufficient descriptive content for classification (minimum 3 words required)"
        }

    try:
        pipeline = load_model()
    except Exception as e:
        return {
            "success": False,
            "error": "MODEL_LOAD_FAILED",
            "message": f"Failed to load trained classification model: {str(e)}"
        }

    try:
        probas = pipeline.predict_proba([cleaned])[0]
        classes = pipeline.classes_

        # Pair and sort predictions descending by probability
        ranked = sorted(
            [{"category": cls_name, "confidence": round(float(prob), 4)} for cls_name, prob in zip(classes, probas)],
            key=lambda item: item["confidence"],
            reverse=True
        )

        top_prediction = ranked[0]
        top_k = ranked[:5]

        return {
            "success": True,
            "predictedCategory": top_prediction["category"],
            "confidence": top_prediction["confidence"],
            "topPredictions": top_k,
            "modelInfo": {
                "algorithm": "TF-IDF + Multinomial Logistic Regression",
                "trainedClasses": len(classes),
                "advisory": "Automated role category prediction for profile matching. Does not indicate interview outcome."
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": "PREDICTION_FAILED",
            "message": f"Inference execution failed: {str(e)}"
        }


def main():
    parser = argparse.ArgumentParser(description="Predict resume category from text.")
    parser.add_argument("--text", type=str, nargs='?', default=None, help="Resume text string to classify")
    parser.add_argument("--file", type=str, help="Path to text file containing resume content")
    args = parser.parse_args()

    input_text = ""
    if args.text:
        input_text = args.text
    elif args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                input_text = f.read()
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": "FILE_READ_ERROR",
                "message": f"Could not read input file: {str(e)}"
            }))
            sys.exit(0)
    else:
        # Read from stdin
        if not sys.stdin.isatty():
            input_text = sys.stdin.read()

    result = predict(input_text)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
