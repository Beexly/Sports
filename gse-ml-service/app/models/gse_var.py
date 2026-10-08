import numpy as np
import pandas as pd
from app.models.kats.consts import TimeSeriesData
from app.models.kats.models.var import VARParams, VARModel

class GSEVARWrapper:
    def __init__(self, data: pd.DataFrame, time_col: str = 'time'):
        self.time_col = time_col
        self.data = data
        self.ts_data = TimeSeriesData(df=data, time_col_name=time_col)
        self.model = None

    def fit_var(self, lags: int = 1) -> None:
        params = VARParams(maxlags=lags)
        self.model = VARModel(data=self.ts_data, params=params)
        self.model.fit()

    def forecast(self, steps: int) -> pd.DataFrame:
        if self.model is None:
            raise ValueError("Model must be fitted before calling forecast.")
        forecast_res = self.model.predict(steps=steps)
        # forecast_res is a dict, keys are endog variables, values are TimeSeriesData objects
        # The 'value' attribute of TimeSeriesData is a DataFrame containing 'fcst', 'fcst_lower', 'fcst_upper'
        # Return a dataframe with the shape (steps, num_vars) containing the point forecasts
        preds = {k: v.value['fcst'].values for k, v in forecast_res.items()}
        return pd.DataFrame(preds)
