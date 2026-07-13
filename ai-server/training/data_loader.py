import pandas as pd
import os

def load_data(file_path: str = None) -> pd.DataFrame:
    """
    Load training data from a parquet file.
    
    Args:
        file_path (str, optional): The path to the parquet file. 
            Defaults to the dynamically calculated absolute path to ai-server/data/processed/training_data.parquet.
        
    Returns:
        pd.DataFrame: The loaded data as a pandas DataFrame.
    """
    if file_path is None:
        # 현재 파일(data_loader.py)의 위치를 기준으로 절대 경로 동적 계산
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.abspath(os.path.join(current_dir, '..', 'data', 'processed', 'training_data.parquet'))

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Data file not found at: {os.path.abspath(file_path)}")
    
    return pd.read_parquet(file_path)
