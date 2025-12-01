import os
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

print(load_dotenv())

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_connection():
    if DATABASE_URL is None:
        raise RuntimeError("DATABASE_URL is not set")

    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    return conn


def insert_reading(sensor_type, value, created_at=None, device_id=None):
    if sensor_type == "temperature":
        table_name = "temperature_readings"
    elif sensor_type == "humidity":
        table_name = "humidity_readings"
    elif sensor_type == "pressure":
        table_name = "pressure_readings"
    elif sensor_type == "motion":
        table_name = "motion_readings"
    elif sensor_type == "smoke":
        table_name = "smoke_readings"
    else:
        raise ValueError(f"Unknown sensor_type: {sensor_type}")

    if created_at is None:
        created_at = datetime.utcnow()

    sql = f"""
        INSERT INTO {table_name} (device_id, value, created_at)
        VALUES (%s, %s, %s)
    """

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, (device_id, float(value), created_at))
    conn.commit()
    cur.close()
    conn.close()


def get_readings_for_date(sensor_type, date_str):
    if sensor_type == "temperature":
        table_name = "temperature_readings"
    elif sensor_type == "humidity":
        table_name = "humidity_readings"
    elif sensor_type == "pressure":
        table_name = "pressure_readings"
    elif sensor_type == "motion":
        table_name = "motion_readings"
    elif sensor_type == "smoke":
        table_name = "smoke_readings"
    else:
        raise ValueError(f"Unknown sensor_type: {sensor_type}")

    sql = f"""
        SELECT id, device_id, value, created_at
        FROM {table_name}
        WHERE created_at::date = %s
        ORDER BY created_at ASC
    """

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, (date_str,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return rows
