from datetime import datetime
from db import insert_reading

insert_reading("temperature", 21.5, created_at=datetime.utcnow(), device_id="test-pc")

print("Done: inserted one temperature row into Neon.")
