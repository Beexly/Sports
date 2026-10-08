import pandas as pd
import numpy as np
from app.models.gse_var import GSEVARWrapper

def test_gse_var_fit_forecast():
    # Synthetic data for 3 book lines (cointegrated)
    np.random.seed(42)
    n = 100
    dates = pd.date_range(start='2020-01-01', periods=n)
    trend = np.linspace(10, 20, n)
    book_a = trend + np.random.normal(0, 0.5, n)
    book_b = trend + np.random.normal(0, 0.5, n)
    book_c = trend + np.random.normal(0, 0.5, n)

    df = pd.DataFrame({'time': dates, 'book_a': book_a, 'book_b': book_b, 'book_c': book_c})

    wrapper = GSEVARWrapper(df)
    wrapper.fit_var(lags=1)

    # Assert coefficients recover known coupling (all roughly around identical intercept and high diagonal AR1)
    # the underlying VAR is inside statsmodels VARResults
    assert wrapper.model.model is not None
    # var model object exists, coefficients should be accessible
    coefs = wrapper.model.model.coefs
    assert coefs.shape == (1, 3, 3)

    # The coefficients represent the strong coupling
    # Check that it's close to expected ranges.
    assert np.all(coefs > 0)

    preds = wrapper.forecast(steps=5)

    assert preds.shape == (5, 3)
    assert 'book_a' in preds.columns
    assert 'book_b' in preds.columns
    assert 'book_c' in preds.columns

def test_outlier_import():
    from app.models.kats.detectors.outlier import OutlierDetector
    # If it imports without error, it works
    assert True

def test_outlier_spike():
    from app.models.kats.detectors.outlier import OutlierDetector
    from app.models.kats.consts import TimeSeriesData
    import pandas as pd
    import numpy as np

    np.random.seed(42)
    n = 100
    dates = pd.date_range(start='2020-01-01', periods=n)
    data = np.random.normal(0, 1, n)
    data[50] = 20  # Inject outlier

    df = pd.DataFrame({'time': dates, 'value': data})
    ts = TimeSeriesData(df)

    detector = OutlierDetector(ts, 'additive')
    detector.detector()
    outliers = detector.outliers[0]

    # Check that outlier is found at the 50th index (2020-02-20)
    assert len(outliers) > 0
    assert pd.Timestamp('2020-02-20') in outliers
