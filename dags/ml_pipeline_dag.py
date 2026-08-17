"""
Apache Airflow DAG: ML Retraining & Profit Analytics Pipeline
Description: Trains demand forecast models, return risk classifiers, calculates expected SKU net profits,
and updates RAG vector embeddings.
"""

from datetime import datetime, timedelta
import urllib.request
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

default_args = {
    'owner': 'profit_copilot',
    'depends_on_past': False,
    'start_date': datetime(2026, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def trigger_rag_embedding_refresh():
    url = "http://localhost:8080/api/rag/ingest"
    try:
        req = urllib.request.Request(url, method='POST')
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"RAG Embeddings Refresh triggered: Status {response.status}")
    except Exception as e:
        print(f"RAG Refresh Note: Backend service at {url} not reachable ({e}). Skipping online embedding update.")

with DAG(
    'ml_retraining_and_profit_dag',
    default_args=default_args,
    description='Automated ML Model Retraining & Profit Insights Pipeline',
    schedule_interval='0 2 * * 0',  # Every Sunday at 2:00 AM
    catchup=False,
) as dag:

    t1_train_demand = BashOperator(
        task_id='train_demand_model',
        bash_command='python ml-service/train_demand_forecast.py',
    )

    t2_train_return_risk = BashOperator(
        task_id='train_return_model',
        bash_command='python ml-service/train_return_risk.py',
    )

    t3_compute_profit = BashOperator(
        task_id='compute_sku_profit',
        bash_command='python ml-service/compute_profit_summary.py',
    )

    t4_refresh_rag = PythonOperator(
        task_id='trigger_rag_embeddings',
        python_callable=trigger_rag_embedding_refresh,
    )

    [t1_train_demand, t2_train_return_risk] >> t3_compute_profit >> t4_refresh_rag
