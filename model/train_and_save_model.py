import os
import io
import sys
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
import joblib


def load_csv_flexible(path):
    """Read CSV while skipping descriptive lines and handling variable column counts.
    Returns a DataFrame where first column is label and remaining columns are numeric features.
    """
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_lines = f.readlines()

    # Remove any lines that are empty or start with a known descriptive prefix (like "Type:")
    filtered = []
    for line in raw_lines:
        s = line.strip()
        if not s:
            continue
        # skip descriptive lines (case-insensitive)
        if s.lower().startswith('type:'):
            continue
        # skip header line if present (e.g. "label,ax,ay,az")
        first_token = s.split(',')[0].strip().lower()
        if first_token == 'label':
            continue
        # Some files may contain stray prompts like 'Stopped by user.' - skip non-data lines that don't start with a label char
        # We'll keep lines that start with an alphabetic label followed by comma
        if ',' not in s:
            continue
        filtered.append(s + '\n')

    if not filtered:
        raise ValueError(f"No data lines found in {path}")

    # Use pandas to read from the filtered text
    txt = io.StringIO(''.join(filtered))
    # Read without header (we'll set our own column names)
    # read from the StringIO we built so pandas sees consistent rows
    df = pd.read_csv(txt, header=None, engine='python')

    # Ensure at least 2 columns
    if df.shape[1] < 2:
        raise ValueError('Parsed CSV must have at least a label column and one feature column')

    # Rename columns: first is 'label', rest s1..sN
    cols = ['label'] + [f's{i+1}' for i in range(df.shape[1] - 1)]
    df.columns = cols

    # Convert feature columns to numeric (coerce errors)
    for c in cols[1:]:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    # Drop rows with any NA in features
    df = df.dropna(axis=0, subset=cols[1:])

    return df


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'activity_log_20250730_235902.csv')

    if not os.path.exists(csv_path):
        print(f"CSV file not found at {csv_path}")
        sys.exit(1)

    print(f"Loading data from {csv_path}...")
    df = load_csv_flexible(csv_path)
    print(f"Parsed data shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")

    X = df.drop(columns=['label']).values
    y_raw = df['label'].astype(str).values

    # Encode labels
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"Found classes: {list(le.classes_)}")

    # Split
    if len(np.unique(y)) < 2:
        raise ValueError('Need at least 2 classes to train')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Build pipeline
    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('pca', PCA(n_components=0.95)),
        ('svc', SVC(probability=True))
    ])

    param_grid = {
        'svc__C': [1, 10],
        'svc__kernel': ['rbf', 'linear'],
        'svc__gamma': ['scale']
    }

    print('Starting grid search (this may take a little while)...')
    grid = GridSearchCV(pipe, param_grid, cv=3, n_jobs=-1, scoring='accuracy')
    grid.fit(X_train, y_train)

    best = grid.best_estimator_
    print('Best parameters:', grid.best_params_)

    # Evaluate
    y_pred = best.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f'Test accuracy: {acc:.4f}')
    print('\nClassification report:\n')
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save model and label encoder together
    out_path = os.path.join(base_dir, 'model.joblib')
    joblib.dump({'pipeline': best, 'label_encoder': le}, out_path)
    print(f'Saved trained pipeline + label encoder to: {out_path}')


if __name__ == '__main__':
    main()
