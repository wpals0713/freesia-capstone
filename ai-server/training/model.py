from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from data_loader import load_data

import pandas as pd

def train_model(df: pd.DataFrame = None, text_col: str = 'text', label_col: str = 'label') -> Pipeline:
    """
    Load data, vectorize text, and train a Logistic Regression model.
    
    Args:
        df (pd.DataFrame, optional): Dataframe to train on. If None, it will be loaded.
        text_col (str): The column name in the DataFrame containing the text data.
        label_col (str): The column name in the DataFrame containing the target labels.
        
    Returns:
        Pipeline: A scikit-learn pipeline containing the trained vectorizer and model.
    """
    # 1. Load data using the data_loader module if df is not provided
    if df is None:
        df = load_data()
    
    if text_col not in df.columns or label_col not in df.columns:
        raise ValueError(f"Columns '{text_col}' and/or '{label_col}' not found in the data.")
        
    X = df[text_col]
    y = df[label_col]
    
    # 2. Define the pipeline with TfidfVectorizer and LogisticRegression
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer()),
        ('classifier', LogisticRegression(max_iter=1000))
    ])
    
    # 3. Train the model
    print("Training model...")
    pipeline.fit(X, y)
    print("Model training completed.")
    
    return pipeline
