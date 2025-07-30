# c:\projects\DNA-utils-universal\ystr_predictor\models\logger.py
import logging
from pathlib import Path
from datetime import datetime
import json
from typing import Dict, Any
import sqlite3
import pandas as pd
import plotly.graph_objs as go

class ModelLogger:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger("ModelLogger")
        self.logger.setLevel(logging.INFO)
        
        fh = logging.FileHandler(self.log_dir / "model.log")
        fh.setLevel(logging.INFO)
        
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        
        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

        self.db_path = self.log_dir / "logs.db"
        self.initialize_db()
        
    def initialize_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    level TEXT,
                    category TEXT,
                    message TEXT,
                    metadata TEXT
                )
            """)
            
    def log(self, message: str, level: str = "INFO", 
            category: str = "general", metadata: Dict[str, Any] = None):

        if level == "INFO":
            self.logger.info(message)
        elif level == "WARNING":
            self.logger.warning(message)
        elif level == "ERROR":
            self.logger.error(message)
        elif level == "DEBUG":
            self.logger.debug(message)
            
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO model_logs (timestamp, level, category, message, metadata)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    datetime.now().isoformat(),
                    level,
                    category,
                    message,
                    json.dumps(metadata) if metadata else None
                )
            )
            
    def get_logs(self, 
                 level: str = None, 
                 category: str = None, 
                 start_time: datetime = None, 
                 end_time: datetime = None) -> list:
        query = "SELECT * FROM model_logs WHERE 1=1"
        params = []
        
        if level:
            query += " AND level = ?"
            params.append(level)
            
        if category:
            query += " AND category = ?"
            params.append(category)
            
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())
            
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            return cursor.fetchall()
            
    def export_logs(self, path: str):
        """Экспортирует логи в JSON"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM model_logs")
            logs = cursor.fetchall()
            
        log_list = [
            {
                'timestamp': log[1],
                'level': log[2],
                'category': log[3],
                'message': log[4],
                'metadata': json.loads(log[5]) if log[5] else None
            }
            for log in logs
        ]
        
        with open(path, 'w') as f:
            json.dump(log_list, f, indent=2)
            
    def analyze_logs(self) -> Dict:
        """Анализирует логи и возвращает статистику"""
        # Общая статистика по уровням
        level_stats = pd.read_sql(
            "SELECT level, COUNT(*) as count FROM model_logs GROUP BY level",
            conn
        ).set_index('level')['count'].to_dict()
        
        # Статистика по категориям
        category_stats = pd.read_sql(
            "SELECT category, COUNT(*) as count FROM model_logs GROUP BY category",
            conn
        ).set_index('category')['count'].to_dict()
        
        # Временная статистика
        time_stats = pd.read_sql(
            """
            SELECT 
                strftime('%Y-%m-%d', timestamp) as date,
                COUNT(*) as count
            FROM model_logs 
            GROUP BY date
            ORDER BY date
            """,
            conn
        ).set_index('date')['count'].to_dict()
        
        # Анализ ошибок
        error_stats = pd.read_sql(
            """
            SELECT message, COUNT(*) as count 
            FROM model_logs 
            WHERE level = 'ERROR'
            GROUP BY message
            ORDER BY count DESC
            LIMIT 10
            """,
            conn
        ).to_dict('records')
        
        return {
            'level_distribution': level_stats,
            'category_distribution': category_stats,
            'time_series': time_stats,
            'top_errors': error_stats
        }
        
    def create_report(self, output_path: str):
        """Создает HTML отчет по логам"""
        stats = self.analyze_logs()
        
        # Создаем визуализации с plotly
        fig1 = go.Figure(data=[
            go.Bar(x=list(stats['level_distribution'].keys()),
                  y=list(stats['level_distribution'].values()))
        ])
        fig1.update_layout(title='Log Levels Distribution')
        
        fig2 = go.Figure(data=[
            go.Bar(x=list(stats['category_distribution'].keys()),
                  y=list(stats['category_distribution'].values()))
        ])
        fig2.update_layout(title='Categories Distribution')
        
        fig3 = go.Figure(data=[
            go.Scatter(x=list(stats['time_series'].keys()),
                      y=list(stats['time_series'].values()),
                      mode='lines+markers')
        ])
        fig3.update_layout(title='Logs Time Series')
        
        # Создаем HTML отчет
        html = f"""
        <html>
        <head>
            <title>Model Logs Report</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
                .chart {{ margin-bottom: 40px; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ padding: 8px; text-align: left; border: 1px solid #ddd; }}
                th {{ background-color: #f5f5f5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Model Logs Report</h1>
                <div class="chart">
                    {fig1.to_html(full_html=False)}
                </div>
                <div class="chart">
                    {fig2.to_html(full_html=False)}
                </div>
                <div class="chart">
                    {fig3.to_html(full_html=False)}
                </div>
                
                <h2>Top Errors</h2>
                <table>
                    <tr>
                        <th>Error Message</th>
                        <th>Count</th>
                    </tr>
                    {''.join(f'<tr><td>{err["message"]}</td><td>{err["count"]}</td></tr>' 
                            for err in stats['top_errors'])}
                </table>
            </div>
        </body>
        </html>
        """
        
        with open(output_path, 'w') as f:
            f.write(html)