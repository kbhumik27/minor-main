This folder contains a script to train an SVM activity classifier from the provided CSV and save the trained pipeline.

Files added:
- `train_and_save_model.py`: Loads `activity_log_20250730_235902.csv`, preprocesses, trains an SVM with PCA, and saves `model.joblib`.
- `requirements.txt`: Minimal Python package list.

How to run (Windows PowerShell):

```powershell
cd "C:\Users\kapoor\OneDrive\Desktop\bkk 7 sem\minor\model"
python .\train_and_save_model.py
```

The script will create `model.joblib` in the same folder. This contains a dict with keys `pipeline` and `label_encoder`.

To load the model in Python:

```python
import joblib
m = joblib.load('model.joblib')
pipeline = m['pipeline']
le = m['label_encoder']
# example: predict
# preds = pipeline.predict(X_new)
# labels = le.inverse_transform(preds)
```
