# AI-Assisted Smart Energy Management System

Streamlit dashboard for monitoring energy consumption, forecasting demand,
detecting unusual readings, getting saving recommendations and chatting with
an energy assistant.

## Folder structure

```
smart_energy_app/
├── app.py                      <- the whole application
├── requirements.txt
├── README.md
├── data/
│   └── AI_Smart_Energy_Consumption_Dataset.csv   <- your dataset (loaded automatically)
└── .streamlit/
    └── secrets.toml.example    <- optional, for the Claude chatbot key
```

## How to run (on your own laptop)

1. Install Python 3.10 or newer from python.org (tick "Add Python to PATH").
2. Open a terminal / Command Prompt **inside the `smart_energy_app` folder**.
3. Create and activate a virtual environment (recommended):
   - Windows: `python -m venv venv` then `venv\Scripts\activate`
   - Mac/Linux: `python3 -m venv venv` then `source venv/bin/activate`
4. Install packages: `pip install -r requirements.txt`
5. Start the app: `streamlit run app.py`
6. Your browser opens at http://localhost:8501

To change the dataset, replace the CSV in `data/` or use the sidebar uploader.
Required column: `Energy_kWh`. Used if present: `Timestamp, Device_Name,
Device_Type, Location, Power_kW`.

## Chatbot

* **Built-in assistant (default):** answers from the filtered data with no
  internet and no key. Ask: "Which device uses the most energy?", "When is peak
  demand?", "Forecast tomorrow", "Show anomalies", "How much is used at night?",
  "How can we save energy?", or "Tell me about AC-01".
* **Claude AI mode (optional):** adds natural-language answers grounded in a
  summary of your data. Provide a key by any ONE of:
  - pasting it in the sidebar "Claude API key" box (session only), or
  - copying `.streamlit/secrets.toml.example` to `.streamlit/secrets.toml`, or
  - setting the environment variable `ANTHROPIC_API_KEY`.

  Never put the key inside `app.py` or upload it to GitHub.

## Free online deployment (Streamlit Community Cloud)

1. Push this folder to a GitHub repository (without `secrets.toml`).
2. Go to share.streamlit.io, sign in with GitHub, choose the repo and `app.py`.
3. Add `ANTHROPIC_API_KEY` under App settings → Secrets if you want Claude mode.

## Method notes (for your report)

| Feature | Method |
|---|---|
| Forecast | Same-weekday average (≥14 days) or last-7-day average; back-tested on the last 7 days |
| Anomalies | Reading > mean + k·std for the same device at the same hour of day |
| Recommendations | Rules on top consumers, off-hours use (outside 08:00–18:00), peaks, weekends |
| Savings | Estimate assuming ≤50% of off-hours use is avoidable; not guaranteed |

Limitations: forecasts depend on data quality (the sample has only 30 days);
anomaly rules can give false positives; the system is advisory and never
switches equipment off automatically.

## Testing checklist (mark only after you run it)

- [ ] App starts and the dataset loads
- [ ] Filters change every chart and metric
- [ ] Negative / missing `Energy_kWh` rows are dropped (try an edited CSV)
- [ ] Totals match a manual sum in Excel
- [ ] Anomaly slider changes the flagged count
- [ ] Chatbot answers the example questions correctly
