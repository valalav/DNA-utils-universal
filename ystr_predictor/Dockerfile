# c:\projects\DNA-utils-universal\ystr_predictor\Dockerfile
FROM python:3.11-slim

WORKDIR /app

# ��������� ��������� ������������
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ����������� ������ ������������
COPY requirements.txt .

# ��������� Python ������������
RUN pip install --no-cache-dir -r requirements.txt

# ����������� ��������� ����
COPY . .

# �������� ����������� ����������
RUN mkdir -p /app/data /app/logs /app/models

# ��������� ���������� ���������
ENV PYTHONPATH=/app
ENV MODEL_PATH=/app/models
ENV DATA_PATH=/app/data
ENV LOG_PATH=/app/logs

# ������ ����������
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# c:\projects\DNA-utils-universal\ystr_predictor\docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    container_name: ystr-predictor
    restart: always
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./models:/app/models
      - ./logs:/app/logs
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - prometheus
      
  redis:
    image: redis:alpine
    container_name: ystr-predictor-redis
    ports:
      - "6379:6379"
      
  prometheus:
    image: prom/prometheus
    container_name: ystr-predictor-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    container_name: ystr-predictor-grafana
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data: