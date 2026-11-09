import os
import json
import joblib

def verify_artifacts():
    p_model = os.path.join('server', 'ml', 'models', 'resume_classifier.joblib')
    p_meta = os.path.join('server', 'ml', 'models', 'metadata.json')

    print(f"Model exists: {os.path.exists(p_model)} | Size: {os.path.getsize(p_model)} bytes")
    print(f"Metadata exists: {os.path.exists(p_meta)} | Size: {os.path.getsize(p_meta)} bytes")

    model = joblib.load(p_model)
    print(f"Loaded model type: {type(model)}")
    print(f"Pipeline steps: {[name for name, step in model.steps]}")

    with open(p_meta, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    print(f"Metadata numClasses: {meta.get('numClasses')}")
    print(f"Classes in model: {len(model.classes_)}")
    print(f"Matches metadata classes: {list(model.classes_) == meta.get('classes')}")
    print("\nAll 25 Classes:")
    for idx, c in enumerate(model.classes_, 1):
        print(f"  {idx:2d}. {c}")

    # Test fresh inference
    test_cases = [
        ("Python Developer", "Senior Python backend developer with Django, Flask, FastAPI, Celery, and PostgreSQL experience."),
        ("Java Developer", "Core Java developer with Spring Boot, Hibernate, Kafka, microservices architecture, and Maven."),
        ("DevOps Engineer", "DevOps Engineer specialized in Kubernetes, Docker, Terraform, CI/CD, AWS CloudFormation, and Jenkins."),
        ("Data Science", "Data Scientist with machine learning, NLP, PyTorch, pandas, scikit-learn, and deep learning algorithms."),
        ("Database", "Database administrator proficient in Oracle, SQL Server, MySQL, database optimization, indexing, and replication.")
    ]

    print("\n--- Fresh Inference Verification ---")
    for expected, text in test_cases:
        proba = model.predict_proba([text])[0]
        top_idx = proba.argmax()
        pred = model.classes_[top_idx]
        conf = proba[top_idx]
        print(f"Expected: {expected:<18} | Predicted: {pred:<18} | Conf: {conf*100:5.1f}% | Match: {expected == pred}")

if __name__ == '__main__':
    verify_artifacts()

