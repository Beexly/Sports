# Hawkes process sketch (univariate, exponential kernel).
# STATUS: not executed here — R is not installed on this host. The Python
# implementation in hawkes.py is the verified one.

# lambda(t) = mu + sum_{t_i < t} alpha * exp(-beta * (t - t_i))
# n = alpha / beta   (expected direct offspring per event; n < 1 stable)

# ---------------------------------------------------------------------------
# Ogata thinning simulation
# ---------------------------------------------------------------------------
simulate_hawkes <- function(mu, alpha, beta, T, seed = 0) {
  set.seed(seed)
  events <- numeric(0)
  t <- 0
  while (t < T) {
    lam <- mu + alpha * sum(exp(-beta * (t - events)))
    dt <- rexp(1, rate = max(lam, 1e-8))
    t <- t + dt
    if (t >= T) break
    lam_new <- mu + alpha * sum(exp(-beta * (t - events)))
    if (runif(1) < lam_new / max(lam, 1e-12)) events <- c(events, t)
  }
  events
}

# ---------------------------------------------------------------------------
# Negative log-likelihood
#   ell = sum log(lambda(t_i)) - mu*T
#         - (alpha/beta) * sum(1 - exp(-beta*(T - t_i)))
# with A_i = exp(-beta*(t_i - t_{i-1})) * (1 + A_{i-1})
# ---------------------------------------------------------------------------
hawkes_negloglik <- function(params, events, T) {
  mu <- params[1]; alpha <- params[2]; beta <- params[3]
  if (mu <= 0 || alpha <= 0 || beta <= 0 || alpha >= beta) return(1e10)

  n <- length(events)
  if (n == 0) return(mu * T)

  A <- numeric(n)
  if (n > 1) {
    for (i in 2:n) {
      A[i] <- exp(-beta * (events[i] - events[i - 1])) * (1 + A[i - 1])
    }
  }

  lam <- mu + alpha * A
  if (any(lam <= 0)) return(1e10)

  ll <- sum(log(lam))
  ll <- ll - (alpha / beta) * sum(1 - exp(-beta * (T - events)))
  ll <- ll - mu * T
  -ll
}

# ---------------------------------------------------------------------------
# Multi-start Nelder-Mead
# ---------------------------------------------------------------------------
fit_hawkes <- function(events, T, starts = 8, seed = 0) {
  set.seed(seed)
  best <- NULL
  for (s in seq_len(starts)) {
    x0 <- c(runif(1, 0.01, 1.0), runif(1, 0.01, 0.9), runif(1, 0.1, 2.0))
    res <- optim(
      par = x0, fn = hawkes_negloglik, events = events, T = T,
      method = "Nelder-Mead",
      control = list(maxit = 5000, reltol = 1e-8)
    )
    if (is.null(best) || res$value < best$value) best <- res
  }
  mu <- best$par[1]; alpha <- best$par[2]; beta <- best$par[3]
  list(
    mu = mu, alpha = alpha, beta = beta,
    n = alpha / beta,
    half_life = log(2) / beta,
    neg_loglik = best$value,
    converged = best$convergence == 0
  )
}

# ---------------------------------------------------------------------------
# Synthetic validation (known n = 0.6)
# ---------------------------------------------------------------------------
if (sys.nframe() == 0) {
  true <- list(mu = 0.2, alpha = 0.6, beta = 1.0)
  ev <- simulate_hawkes(true$mu, true$alpha, true$beta, T = 200, seed = 1)
  fit <- fit_hawkes(ev, T = 200, seed = 1)
  cat("events:", length(ev), "\n")
  cat("true n:", true$alpha / true$beta, "\n")
  cat("fit n: ", fit$n, " (short-window MLE biased low)\n")
  print(fit)
}

# ---------------------------------------------------------------------------
# Multivariate extension (sketch)
#   lambda_k(t) = mu_k + sum_j sum_{t_i^j < t} alpha[k,j] * exp(-beta[k,j]*(t - t_i^j))
#   criticality: spectral radius of A %*% diag(1/beta)
#   alpha is K x K, so the parameter count grows K^2; needs many more events.
# ---------------------------------------------------------------------------
