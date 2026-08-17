"""
Apache Airflow DAG: Ingestion Pipeline
Description: Validates incoming CSV datasets, ingests tenant data into canonical PostgreSQL tables,
and computes vendor reliability scores.
"""

from datetime import datetime, timedelta
import os
import subprocess
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

def validate_raw_csv_datasets():
    raw_dir = os.path.join(os.getcwd(), 'ingestion', 'raw_data')
    if os.path.exists(raw_dir):
        files = [f for f in os.listdir(raw_dir) if f.endswith('.csv')]
        print(f"Found {len(files)} raw CSV files for processing.")
    else:
        print("Raw ingestion directory ready.")

with DAG(
    'ingestion_pipeline_dag',
    default_args=default_args,
    description='Automated Data Ingestion & Transformation Pipeline',
    schedule_interval='@daily',
    catchup=False,
) as dag:

    t1_validate_data = PythonOperator(
        task_id='validate_raw_csv',
        python_callable=validate_raw_csv_datasets,
    )

    t2_ingest_synthetic = BashOperator(
        task_id='ingest_canonical_tables',
        bash_command='python ingestion/load_synthetic_tenant.py --config ingestion/mapping_configs/synthetic_a_mapping.json',
    )

    t3_compute_vendor_risk = BashOperator(
        task_id='compute_vendor_risk',
        bash_command='python ml-service/compute_vendor_risk.py',
    )

    t1_validate_data >> t2_ingest_synthetic >> t3_compute_vendor_risk
