FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# schema.sql を参照するため sql/ もコピー
COPY ../../sql /app/sql

CMD ["python", "ingest.py"]
