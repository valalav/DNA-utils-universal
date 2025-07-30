# c:\projects\DNA-utils-universal\ystr_predictor\models\csv_handler.py
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
import logging
import re

class CsvHandler:
    # Маркеры, которые могут иметь множественные значения
    MULTI_VALUE_MARKERS = {
        'DYS385': 2,
        'DYS464': 4,
        'DYF395S1': 2,
        'CDY': 2,
        'YCAII': 2,
        'DYS413': 2,
        'DYS459': 2
    }

    @staticmethod
    def parse_multi_values(value: str) -> List[int]:
        if pd.isna(value):
            return []
            
        # Очищаем строку и разбиваем по всем возможным разделителям
        values = re.split(r'[-,/\s]+', str(value))
        
        # Преобразуем в числа, пропуская некорректные значения
        result = []
        for v in values:
            try:
                result.append(int(v.strip()))
            except (ValueError, TypeError):
                continue
                
        return sorted(result) if result else []

    @staticmethod
    def load_data(file_path: str, sample_size: int = None) -> Tuple[pd.DataFrame, str, List[str]]:
        """Загрузка данных из CSV"""
        # Читаем CSV с разделителем ";"
        df = pd.read_csv(file_path, sep=';')
        logging.info(f"Initial rows: {len(df)}")

        # Если задан размер выборки, берем случайную выборку
        if sample_size and sample_size < len(df):
            df = df.sample(n=sample_size, random_state=42)
            logging.info(f"Sampled {sample_size} rows")

        haplo_column = 'Haplogroup'
        if haplo_column not in df.columns:
            raise ValueError(f"Required column '{haplo_column}' not found")

        # Создаем новый DataFrame для обработанных данных
        processed_data = {haplo_column: df[haplo_column]}

        # Сначала обрабатываем мультизначные маркеры
        for column, num_values in CsvHandler.MULTI_VALUE_MARKERS.items():
            if column in df.columns:
                values_lists = df[column].apply(CsvHandler.parse_multi_values)
                
                # Создаем колонки для каждой позиции
                for i in range(num_values):
                    new_col = f"{column}_{i+1}"
                    processed_data[new_col] = values_lists.apply(
                        lambda x: x[i] if i < len(x) else 0
                    )

        # Затем обрабатываем остальные маркеры
        for column in df.columns:
            if column != haplo_column and column not in CsvHandler.MULTI_VALUE_MARKERS:
                try:
                    processed_data[column] = pd.to_numeric(df[column], errors='coerce').fillna(0)
                except Exception as e:
                    logging.warning(f"Error processing column {column}: {str(e)}")
                    continue

        # Создаем новый DataFrame с обработанными данными
        processed_df = pd.DataFrame(processed_data)
        
        # Получаем список всех маркеров (колонок кроме гаплогруппы)
        markers = [col for col in processed_df.columns if col != haplo_column]

        logging.info(f"Processed rows: {len(processed_df)}")
        logging.info(f"Total markers: {len(markers)}")
        
        # Выводим примеры обработанных данных
        logging.info("\nFirst few rows of processed data:")
        logging.info(processed_df.head().to_string())

        return processed_df, haplo_column, markers