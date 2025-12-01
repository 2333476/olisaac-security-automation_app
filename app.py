import requests
from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime
from db import get_readings_for_date
from dotenv import load_dotenv

print(load_dotenv())


ADAFRUIT_USERNAME = "isaac_nachate"
ADAFRUIT_IO_KEY = os.environ.get("ADAFRUIT_IO_KEY")

FEED_TEMPERATURE = "temperature"
FEED_HUMIDITY = "humidity"
FEED_PRESSURE = "pressure"
FEED_MOTION = "motion-feed"
FEED_SMOKE = "smoke-feed"
appFlask = Flask(__name__)


@appFlask.route("/SystemOverView")
def system_overview():
    print(os.environ.get("ADAFRUIT_IO_KEY"))
    return render_template("SystemOverView.html")

@appFlask.route("/EnvironmentMonitoring")
def environment_monitoring():
    return render_template("EnvironmentMonitoring.html")

@appFlask.route("/DeviceControl")
def device_control():
    return render_template("DeviceControl.html")

@appFlask.route("/SecurityMonitoring")
def security_monitoring():
    return render_template("SecurityMonitoring.html")


@appFlask.route("/api/sensor/<sensor_name>", methods=["GET"])
def get_sensor_latest(sensor_name):
    if ADAFRUIT_IO_KEY is None:
        return jsonify({"error": "No key provided"}), 404

    if sensor_name == "temperature":
        feed_key = FEED_TEMPERATURE
    elif sensor_name == "humidity":
        feed_key = FEED_HUMIDITY
    elif sensor_name == "pressure":
        feed_key = FEED_PRESSURE
    else:
        return jsonify({"error": "Unknown sensor"}), 404

    url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/{feed_key}/data"
    headers = {"X-AIO-Key": ADAFRUIT_IO_KEY}

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    latest_value = data[0]["value"]
    last_update = data[0]["created_at"]

    return jsonify({
        "sensor": sensor_name,
        "latest_value": latest_value,
        "last_update": last_update
    })

@appFlask.route("/api/security/overview")
def security_overview():
    if ADAFRUIT_IO_KEY is None:
        return jsonify({"error": "No key provided"}), 500

    def fetch_sum_and_latest(feed_key):
        url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/{feed_key}/data"
        headers = {"X-AIO-Key": ADAFRUIT_IO_KEY}

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        last_10 = data[:10]

        total = 0.0
        latest_dt = None

        for d in last_10:
            value_str = d.get("value")
            created_at = d.get("created_at")

            if value_str is None or not created_at:
                continue

            try:
                value = float(value_str)
            except ValueError:
                continue

            total += value

            try:
                dt = datetime.fromisoformat(created_at.replace("Z", ""))
            except ValueError:
                continue

            if latest_dt is None or dt > latest_dt:
                latest_dt = dt

        return total, latest_dt

    motion_total, motion_last = fetch_sum_and_latest(FEED_MOTION)
    smoke_total, smoke_last = fetch_sum_and_latest(FEED_SMOKE)

    total_events = motion_total + smoke_total

    if total_events <= 0:
        status_level = "low"
        status_text = "SAFE"
    elif total_events < 30:
        status_level = "medium"
        status_text = "MODERATE"
    else:
        status_level = "high"
        status_text = "ALERT"

    latest_dt = None
    if motion_last and smoke_last:
        latest_dt = max(motion_last, smoke_last)
    elif motion_last:
        latest_dt = motion_last
    elif smoke_last:
        latest_dt = smoke_last

    if latest_dt:
        last_event_str = latest_dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        last_event_str = None

    return jsonify({
        "status_text": status_text,
        "status_level": status_level,
        "motion_total": motion_total,
        "smoke_total": smoke_total,
        "last_event": last_event_str
    })


@appFlask.route("/api/chart/<sensor_name>")
def get_chart(sensor_name):
    if ADAFRUIT_IO_KEY is None:
        return jsonify({"error": "No key provided"}), 500

    if sensor_name == "temperature":
        feed_key = FEED_TEMPERATURE
        line_label = "Temperature (°C)"
        line_color = "rgba(54, 162, 235, 1)"
        fill_color = "rgba(54, 162, 235, 0.1)"

    elif sensor_name == "humidity":
        feed_key = FEED_HUMIDITY
        line_label = "Humidity (%)"
        line_color = "rgba(75, 192, 192, 1)"
        fill_color = "rgba(75, 192, 192, 0.1)"

    elif sensor_name == "pressure":
        feed_key = FEED_PRESSURE
        line_label = "Pressure (hPa)"
        line_color = "rgba(255, 206, 86, 1)"
        fill_color = "rgba(255, 206, 86, 0.1)"

    elif sensor_name == "motion":
        feed_key = FEED_MOTION
        line_label = "Motion events"
        line_color = "rgba(54, 162, 235, 1)"
        fill_color = "rgba(54, 162, 235, 0.1)"

    elif sensor_name == "smoke":
        feed_key = FEED_SMOKE
        line_label = "Smoke events"
        line_color = "rgba(153, 102, 255, 1)"
        fill_color = "rgba(153, 102, 255, 0.1)"

    else:
        return jsonify({"error": "Unknown sensor"}), 404

    selected_date = request.args.get("date")

    # 1) CAS "DATE SÉLECTIONNÉE" → ON LIT DANS NEON
    if selected_date:
        try:
            rows = get_readings_for_date(sensor_type=sensor_name, date_str=selected_date)
        except Exception as e:
            print("Error reading from Neon:", e)
            return jsonify({"error": "DB error"}), 500

        labels = []
        values = []

        for row in rows:
            row_id, device_id, value, created_at = row
            time_label = created_at.strftime("%I:%M:%S %p")
            labels.append(time_label)
            values.append(float(value))

        recent_value = values[-1] if values else None
        window_total = sum(values) if values else 0

        chart_data = {
            "labels": labels,
            "datasets": [{
                "label": line_label,
                "data": values,
                "borderColor": line_color,
                "backgroundColor": fill_color,
                "borderWidth": 1,
                "tension": 0.3
            }],
            "recent_value": recent_value,
            "window_total": window_total
        }

        return jsonify(chart_data)

    # 2) CAS "PAS DE DATE" → LIVE DEPUIS ADAFRUIT (COMME AVANT)
    url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/{feed_key}/data"
    headers = {"X-AIO-Key": ADAFRUIT_IO_KEY}

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    last_10 = data[:10]

    labels = []
    values = []

    for d in last_10:
        created_at = d.get("created_at")
        value_str = d.get("value")

        if not created_at or value_str is None:
            continue

        t = datetime.fromisoformat(created_at.replace("Z", "")).strftime("%I:%M:%S %p")
        labels.append(t)
        values.append(float(value_str))

    recent_value = values[0] if values else None
    window_total = sum(values) if values else 0

    chart_data = {
        "labels": labels,
        "datasets": [{
            "label": line_label,
            "data": values,
            "borderColor": line_color,
            "backgroundColor": fill_color,
            "borderWidth": 1,
            "tension": 0.3
        }],
        "recent_value": recent_value,
        "window_total": window_total
    }

    return jsonify(chart_data)










@appFlask.route("/api/device_control/<device>/<mode>", methods=["POST", "GET"])
def device_control_post(device, mode):

    if ADAFRUIT_IO_KEY is None:
        return jsonify({"error": "No key provided"}), 500

    headers = {"X-AIO-Key": ADAFRUIT_IO_KEY}

    leds_url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/leds-control/data"
    buzzer_url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/buzzer/data"
    lcd_url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_USERNAME}/feeds/lcd-alert/data"

    if request.method == "GET":

        states = {
            "green": "off",
            "red": "off",
            "yellow": "off",
            "all": "off",
            "buzzer": "off",
            "lcd": "off"
        }

        response_leds = requests.get(leds_url, headers=headers, timeout=10)
        response_leds.raise_for_status()
        data_leds = response_leds.json()

        expected_leds = ["green", "red", "yellow", "all"]
        found_leds = []

        for d in data_leds:

            try:
                raw_value = d["value"]
            except KeyError:
                continue

            if ":" not in raw_value:
                continue

            parts = raw_value.split(":", 1)
            raw_type = parts[0]
            raw_mode = parts[1]

            led_type = raw_type.strip()
            led_type = led_type.lower()

            led_mode = raw_mode.strip()
            led_mode = led_mode.lower()

            if led_type in expected_leds and led_type not in found_leds:
                states[led_type] = led_mode
                found_leds.append(led_type)

            if len(found_leds) == len(expected_leds):
                break

        response_buzzer = requests.get(buzzer_url, headers=headers, timeout=10)
        response_buzzer.raise_for_status()
        data_buzzer = response_buzzer.json()

        try:
            raw_buzzer = data_buzzer[0]["value"]
            buzzer_mode = raw_buzzer.strip()
            buzzer_mode = buzzer_mode.lower()

            if buzzer_mode == "on" or buzzer_mode == "off":
                states["buzzer"] = buzzer_mode
        except (IndexError, KeyError):
            pass

        response_lcd = requests.get(lcd_url, headers=headers, timeout=10)
        response_lcd.raise_for_status()
        data_lcd = response_lcd.json()

        try:
            raw_lcd = data_lcd[0]["value"]
            lcd_mode = raw_lcd.strip()
            lcd_mode = lcd_mode.lower()

            if lcd_mode == "on" or lcd_mode == "off":
                states["lcd"] = lcd_mode
        except (IndexError, KeyError):
            pass

        return jsonify(states), 200


    device_name = device.strip()
    device_name = device_name.lower()

    mode_name = mode.strip()
    mode_name = mode_name.lower()

    if mode_name != "on" and mode_name != "off":
        return jsonify({"error": "mode must be on/off"}), 400

    if device_name == "green" or device_name == "red" or device_name == "yellow" or device_name == "all":

        payload = {"value": device_name + ":" + mode_name}
        response_post = requests.post(leds_url, headers=headers, json=payload, timeout=10)
        response_post.raise_for_status()

        return jsonify({"sent": device_name + ":" + mode_name}), 200

    elif device_name == "buzzer":

        payload = {"value": mode_name.upper()}
        response_post = requests.post(buzzer_url, headers=headers, json=payload, timeout=10)
        response_post.raise_for_status()

        return jsonify({"sent": "buzzer:" + mode_name}), 200

    elif device_name == "lcd":

        payload = {"value": mode_name.upper()}
        response_post = requests.post(lcd_url, headers=headers, json=payload, timeout=10)
        response_post.raise_for_status()

        return jsonify({"sent": "lcd:" + mode_name}), 200

    else:
        return jsonify({"error": "unknown device"}), 404






if __name__ == "__main__":
    appFlask.run(debug=True)
