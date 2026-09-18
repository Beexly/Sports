#!/usr/bin/env python3
"""GSE Bayesian Hierarchical Model

Alternative to logistic regression for gate analysis.
Uses PyMC for Bayesian inference with season-level random effects.
"""
import pymc as pm
import arviz as az
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

# ============================================================
# BAYESIAN HIERARCHICAL MODEL
# ============================================================
def bayesian_gate_model(data, compound_col, outcome_col='home_win'):
    """
    Bayesian hierarchical model for gate analysis.
    
    Parameters:
    - data: DataFrame with compound and outcome columns
    - compound_col: Column name for the compound flag
    - outcome_col: Column name for the outcome (home_win)
    
    Returns:
    - Posterior samples, summary statistics
    """
    # Prepare data
    X = data[compound_col].values.astype(float)
    y = data[outcome_col].values.astype(float)
    seasons = data['season'].values
    
    # Hierarchical model with season-level random effects
    with pm.Model() as model:
        # Hyperpriors for season-level effects
        mu_alpha = pm.Normal('mu_alpha', mu=0, sigma=1)
        sigma_alpha = pm.HalfNormal('sigma_alpha', sigma=1)
        
        # Season-level random effects
        unique_seasons = np.unique(seasons)
        alpha_season = pm.Normal('alpha_season', mu=mu_alpha, sigma=sigma_alpha, shape=len(unique_seasons))
        
        # Fixed effects
        beta = pm.Normal('beta', mu=0, sigma=1)
        beta_season = pm.Normal('beta_season', mu=0, sigma=1)
        
        # Intercept
        alpha = pm.Normal('alpha', mu=0, sigma=1)
        
        # Linear predictor
        season_idx = np.searchsorted(unique_seasons, seasons)
        logits = alpha + alpha_season[season_idx] + beta * X + beta_season * X * (seasons > 2020)
        
        # Likelihood
        p = pm.math.sigmoid(logits)
        y_obs = pm.Bernoulli('y_obs', p=p, observed=y)
        
        # Sample from posterior
        trace = pm.sample(2000, tune=1000, cores=2, return_inferencedata=True)
    
    return trace, model

# ============================================================
# MODEL COMPARISON
# ============================================================
def compare_models(logistic_model, bayesian_model, data):
    """
    Compare logistic regression vs Bayesian hierarchical model.
    
    Parameters:
    - logistic_model: Fitted logistic regression model
    - bayesian_model: Fitted Bayesian hierarchical model
    - data: DataFrame with outcome column
    
    Returns:
    - Comparison metrics (AUC, WAIC, LOO)
    """
    y = data['home_win'].values
    
    # Logistic regression metrics
    logistic_pred = logistic_model.predict(data)
    logistic_auc = roc_auc_score(y, logistic_pred)
    
    # Bayesian model metrics
    bayesian_pred = bayesian_model.predict(data)
    bayesian_auc = roc_auc_score(y, bayesian_pred)
    
    # WAIC and LOO
    logistic_waic = waic(logistic_model)
    bayesian_waic = waic(bayesian_model)
    
    logistic_loo = loo(logistic_model)
    bayesian_loo = loo(bayesian_model)
    
    comparison = pd.DataFrame({
        'model': ['Logistic', 'Bayesian'],
        'AUC': [logistic_auc, bayesian_auc],
        'WAIC': [logistic_waic, bayesian_waic],
        'LOO': [logistic_loo, bayesian_loo]
    })
    
    return comparison

# ============================================================
# POSTERIOR PREDICTIVE CHECKS
# ============================================================
def posterior_predictive_check(trace, model, data):
    """
    Perform posterior predictive checks for Bayesian model.
    
    Parameters:
    - trace: PyMC trace object
    - model: PyMC model object
    - data: DataFrame with outcome column
    
    Returns:
    - Posterior predictive samples, diagnostic plots
    """
    with model:
        ppc = pm.sample_posterior_predictive(trace, var_names=['y_obs'])
    
    return ppc

# ============================================================
# MODEL DIAGNOSTICS
# ============================================================
def model_diagnostics(trace):
    """
    Generate model diagnostics for Bayesian model.
    
    Parameters:
    - trace: PyMC trace object
    
    Returns:
    - Summary statistics, convergence diagnostics
    """
    summary = az.summary(trace, var_names=['alpha', 'beta', 'alpha_season', 'beta_season'])
    rhat = az.rhat(trace)
    ess = az.ess(trace)
    
    return summary, rhat, ess
