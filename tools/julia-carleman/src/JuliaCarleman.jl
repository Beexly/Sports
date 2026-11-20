module JuliaCarleman

using LinearAlgebra

export CaseIIIBenchmarkParams,
    CarlemanOperators,
    ManifoldConsistencyStats,
    CaseIIITrajectoryBundle,
    ErrorPairMetrics,
    FiveLevelErrorAudit,
    assemble_carleman_operators,
    run_case_iii_benchmark,
    reconstruct_backward_velocity,
    compare_trajectories,
    compute_manifold_consistency,
    audit_five_level_errors,
    boundary_reduced_bcow_propagator,
    spd_energy_objective

"""
    CaseIIIBenchmarkParams{T<:AbstractFloat}

Physical and discretization parameters for the Chen and Xiao (2026) Case III
three-atom one-dimensional Lennard-Jones molecular dynamics benchmark.
Units: length in nm, time in ps, energy in aJ, mass in m0 = 1e-24 kg.
"""
struct CaseIIIBenchmarkParams{T<:AbstractFloat}
    a::T
    eps::T
    sigma::T
    m_a::T
    c1::T
    c2::T
    q0::Vector{T}
    v0::Vector{T}
    dt::T
    n_steps::Int
end

function CaseIIIBenchmarkParams(;
    a::Real=1.0,
    eps::Real=1.65,
    m_a::Real=1.993,
    q0::AbstractVector{<:Real}=[0.01, 0.0, 0.0],
    v0::AbstractVector{<:Real}=[0.0, 0.0, 0.0],
    dt::Real=0.002,
    n_steps::Int=150,
)
    length(q0) == 3 || throw(DimensionMismatch("Case III requires length(q0) == 3"))
    length(v0) == 3 || throw(DimensionMismatch("Case III requires length(v0) == 3"))
    dt > 0 || throw(ArgumentError("dt must be positive"))
    n_steps >= 1 || throw(ArgumentError("n_steps must be >= 1"))

    T = float(
        promote_type(
            typeof(a), typeof(eps), typeof(m_a), typeof(dt), eltype(q0), eltype(v0)
        ),
    )
    a_t = T(a)
    eps_t = T(eps)
    m_a_t = T(m_a)
    dt_t = T(dt)
    sigma_t = a_t / (T(2)^(one(T) / T(6)))
    c1_t = T(72) * eps_t / (a_t^2)
    c2_t = -T(756) * eps_t / (a_t^3)
    return CaseIIIBenchmarkParams{T}(
        a_t, eps_t, sigma_t, m_a_t, c1_t, c2_t, Vector{T}(q0), Vector{T}(v0), dt_t, n_steps
    )
end

"""
    CarlemanOperators{T<:AbstractFloat}

Assembled linear, quadratic, second-order Carleman lifted (42x42), backward-Euler
step (M_C), and 6-qubit power-of-two padded (64x64) operators for Case III.
"""
struct CarlemanOperators{T<:AbstractFloat}
    T_op::Matrix{T}
    Sb::Matrix{T}
    L1::Matrix{T}
    L2::Matrix{T}
    Eq::Matrix{T}
    Pqq::Matrix{T}
    B1::Matrix{T}
    B2::Matrix{T}
    A_C::Matrix{T}
    M_C::Matrix{T}
    M_pad::Matrix{T}
end

"""
    ManifoldConsistencyStats{T<:AbstractFloat}

Trajectory norms of the Carleman lifting defect eta_n = ||Y_{2,n} - z_n kron z_n||_2.
"""
struct ManifoldConsistencyStats{T<:AbstractFloat}
    eta::Vector{T}
    rel_eta::Vector{T}
    max_eta::T
    terminal_eta::T
    max_rel_eta::T
    terminal_rel_eta::T
end

"""
    ErrorPairMetrics{T<:AbstractFloat}

Displacement and Eq. 55 backward-difference velocity comparison metrics between two
trajectory matrices.
"""
struct ErrorPairMetrics{T<:AbstractFloat}
    max_abs_dq::T
    rms_dq::T
    max_abs_dv::T
    rms_dv::T
end

"""
    FiveLevelErrorAudit{T<:AbstractFloat}

Five-level Chen and Xiao (2026) error decomposition across force expansion, Carleman
truncation, backward-Euler time discretization, end-to-end unprojected BE, and
stepwise re-lifted BE alongside manifold drift statistics.
"""
struct FiveLevelErrorAudit{T<:AbstractFloat}
    force_expansion::ErrorPairMetrics{T}
    carleman_truncation::ErrorPairMetrics{T}
    time_discretization::ErrorPairMetrics{T}
    unprojected_total::ErrorPairMetrics{T}
    relifted_total::ErrorPairMetrics{T}
    projection_shift::ErrorPairMetrics{T}
    projection_degrades_accuracy::Bool
    cont_drift::ManifoldConsistencyStats{T}
    be_drift::ManifoldConsistencyStats{T}
    max_relift_pre_eta::T
    terminal_relift_pre_eta::T
    max_relift_pre_rel_eta::T
    terminal_relift_pre_rel_eta::T
end

"""
    CaseIIITrajectoryBundle{T<:AbstractFloat}

Complete 5-trajectory simulation bundle for Chen and Xiao (2026) Case III:
1) Full Lennard-Jones ODE
2) Quadratic-force nonlinear ODE
3) Continuous K=2 Carleman ODE
4) Unprojected backward-Euler K=2 Carleman
5) Stepwise re-lifted backward-Euler K=2 Carleman
"""
struct CaseIIITrajectoryBundle{T<:AbstractFloat}
    params::CaseIIIBenchmarkParams{T}
    ops::CarlemanOperators{T}
    times::Vector{T}
    q_full::Matrix{T}
    v_full::Matrix{T}
    q_poly::Matrix{T}
    v_poly::Matrix{T}
    q_carleman_cont::Matrix{T}
    v_carleman_cont::Matrix{T}
    q_carleman_be::Matrix{T}
    v_carleman_be::Matrix{T}
    q_carleman_relift::Matrix{T}
    v_carleman_relift::Matrix{T}
    Y_cont::Matrix{T}
    Y_be::Matrix{T}
    Y_relift::Matrix{T}
    z_relift::Matrix{T}
    eta_relift_pre::Vector{T}
    rel_eta_relift_pre::Vector{T}
end

"""
    assemble_carleman_operators(params::CaseIIIBenchmarkParams{T}) -> CarlemanOperators{T}

Build the 3-atom 1D chain incidence operators, quadratic ODE blocks B1/B2,
second-order lifted matrix A_C (42x42), backward-Euler matrix M_C = I - dt*A_C,
and 6-qubit padded matrix M_pad (64x64).
"""
function assemble_carleman_operators(
    params::CaseIIIBenchmarkParams{T}
)::CarlemanOperators{T} where {T<:AbstractFloat}
    T_op = T[-1 1 0; 0 -1 1]
    Sb = Matrix{T}(-transpose(T_op))
    L1 = Sb * T_op

    L2 = zeros(T, 3, 9)
    for i in 1:2
        row_i = vec(T_op[i, :])
        L2 .+= Sb[:, i] * transpose(kron(row_i, row_i))
    end

    I3 = Matrix{T}(I, 3, 3)
    I6 = Matrix{T}(I, 6, 6)
    I42 = Matrix{T}(I, 42, 42)
    I22 = Matrix{T}(I, 22, 22)

    Eq = [I3 zeros(T, 3, 3)]
    Pqq = kron(Eq, Eq)

    inv_m = one(T) / params.m_a
    B1 = [zeros(T, 3, 3) I3; (params.c1 * inv_m) .* L1 zeros(T, 3, 3)]
    B2 = [zeros(T, 3, 36); (params.c2 * inv_m) .* (L2 * Pqq)]

    zero_36_6 = zeros(T, 36, 6)
    A_lower = kron(I6, B1) + kron(B1, I6)
    A_C = [B1 B2; zero_36_6 A_lower]
    M_C = I42 .- params.dt .* A_C

    M_pad = [M_C zeros(T, 42, 22); zeros(T, 22, 42) I22]

    return CarlemanOperators{T}(T_op, Sb, L1, L2, Eq, Pqq, B1, B2, A_C, M_C, M_pad)
end

@inline function _lj_pair_force(r::T, eps::T, sigma::T)::T where {T<:AbstractFloat}
    inv_r = one(T) / r
    sr = sigma * inv_r
    sr6 = sr^6
    sr12 = sr6 * sr6
    return T(4) * eps * (-T(12) * sr12 * inv_r + T(6) * sr6 * inv_r)
end

function _rhs_full_lj!(
    dz::Vector{T}, z::Vector{T}, params::CaseIIIBenchmarkParams{T}
)::Nothing where {T<:AbstractFloat}
    q1, q2, q3, v1, v2, v3 = z[1], z[2], z[3], z[4], z[5], z[6]
    r1 = params.a + q2 - q1
    r2 = params.a + q3 - q2
    f1 = _lj_pair_force(r1, params.eps, params.sigma)
    f2 = _lj_pair_force(r2, params.eps, params.sigma)
    inv_m = one(T) / params.m_a
    dz[1] = v1
    dz[2] = v2
    dz[3] = v3
    dz[4] = f1 * inv_m
    dz[5] = (-f1 + f2) * inv_m
    dz[6] = -f2 * inv_m
    return nothing
end

function _rhs_quadratic!(
    dz::Vector{T}, z::Vector{T}, ops::CarlemanOperators{T}, z_kron::Vector{T}
)::Nothing where {T<:AbstractFloat}
    idx = 0
    @inbounds for i in 1:6
        zi = z[i]
        for j in 1:6
            idx += 1
            z_kron[idx] = zi * z[j]
        end
    end
    mul!(dz, ops.B1, z)
    mul!(dz, ops.B2, z_kron, one(T), one(T))
    return nothing
end

function _step_rk4!(
    z::Vector{T},
    h::T,
    n_sub::Int,
    k1::Vector{T},
    k2::Vector{T},
    k3::Vector{T},
    k4::Vector{T},
    tmp::Vector{T},
    rhs!::F,
)::Nothing where {T<:AbstractFloat,F}
    half_h = h * T(0.5)
    sixth_h = h / T(6)
    for _ in 1:n_sub
        rhs!(k1, z)
        @inbounds for i in eachindex(z)
            tmp[i] = z[i] + half_h * k1[i]
        end
        rhs!(k2, tmp)
        @inbounds for i in eachindex(z)
            tmp[i] = z[i] + half_h * k2[i]
        end
        rhs!(k3, tmp)
        @inbounds for i in eachindex(z)
            tmp[i] = z[i] + h * k3[i]
        end
        rhs!(k4, tmp)
        @inbounds for i in eachindex(z)
            z[i] += sixth_h * (k1[i] + T(2) * k2[i] + T(2) * k3[i] + k4[i])
        end
    end
    return nothing
end

"""
    integrate_rk_high_accuracy(
        params::CaseIIIBenchmarkParams{T},
        ops::CarlemanOperators{T};
        rk_substeps::Int=200,
    ) -> Tuple{Matrix{T}, Matrix{T}}

Integrate the 6-state full Lennard-Jones ODE and quadratic-force ODE across all
`params.n_steps` output steps using classic sub-stepped RK4 (effective step
dt / rk_substeps, exceeding reltol=1e-12 and abstol=1e-14).
"""
function integrate_rk_high_accuracy(
    params::CaseIIIBenchmarkParams{T}, ops::CarlemanOperators{T}; rk_substeps::Int=200
)::Tuple{Matrix{T},Matrix{T}} where {T<:AbstractFloat}
    rk_substeps >= 1 || throw(ArgumentError("rk_substeps must be >= 1"))
    n_frames = params.n_steps + 1
    z_full_traj = Matrix{T}(undef, 6, n_frames)
    z_poly_traj = Matrix{T}(undef, 6, n_frames)

    z0 = T[params.q0; params.v0]
    z_full = copy(z0)
    z_poly = copy(z0)
    z_full_traj[:, 1] = z_full
    z_poly_traj[:, 1] = z_poly

    k1 = Vector{T}(undef, 6)
    k2 = Vector{T}(undef, 6)
    k3 = Vector{T}(undef, 6)
    k4 = Vector{T}(undef, 6)
    tmp = Vector{T}(undef, 6)
    z_kron = Vector{T}(undef, 36)
    h = params.dt / T(rk_substeps)

    full_rhs! = (dz, state) -> _rhs_full_lj!(dz, state, params)
    poly_rhs! = (dz, state) -> _rhs_quadratic!(dz, state, ops, z_kron)

    for step in 1:params.n_steps
        _step_rk4!(z_full, h, rk_substeps, k1, k2, k3, k4, tmp, full_rhs!)
        _step_rk4!(z_poly, h, rk_substeps, k1, k2, k3, k4, tmp, poly_rhs!)
        z_full_traj[:, step + 1] = z_full
        z_poly_traj[:, step + 1] = z_poly
    end

    return z_full_traj, z_poly_traj
end

"""
    reconstruct_backward_velocity(q_traj::AbstractMatrix{T}, dt::T) -> Matrix{T}

Reconstruct velocities via Chen and Xiao (2026) Eq. 55 first-order backward difference:
v_tilde[:, 1] = 0 and v_tilde[:, n+1] = (q_traj[:, n+1] - q_traj[:, n]) / dt.
"""
function reconstruct_backward_velocity(
    q_traj::AbstractMatrix{T}, dt::T
)::Matrix{T} where {T<:AbstractFloat}
    dt > 0 || throw(ArgumentError("dt must be positive"))
    n_atoms, n_frames = size(q_traj)
    v_tilde = zeros(T, n_atoms, n_frames)
    inv_dt = one(T) / dt
    @inbounds for frame in 2:n_frames
        for i in 1:n_atoms
            v_tilde[i, frame] = (q_traj[i, frame] - q_traj[i, frame - 1]) * inv_dt
        end
    end
    return v_tilde
end

"""
    compare_trajectories(
        q_a::AbstractMatrix{T},
        q_b::AbstractMatrix{T},
        dt::T,
    ) -> ErrorPairMetrics{T}

Compute max |dq|, RMS dq, max |dv_tilde|, and RMS dv_tilde across all atoms and
time frames between trajectories `q_a` and `q_b`.
"""
function compare_trajectories(
    q_a::AbstractMatrix{T}, q_b::AbstractMatrix{T}, dt::T
)::ErrorPairMetrics{T} where {T<:AbstractFloat}
    size(q_a) == size(q_b) || throw(DimensionMismatch("Trajectory sizes must match"))
    dq = q_a .- q_b
    va = reconstruct_backward_velocity(q_a, dt)
    vb = reconstruct_backward_velocity(q_b, dt)
    dv = va .- vb
    n_entries = length(dq)
    max_dq = maximum(abs, dq)
    rms_dq = sqrt(sum(abs2, dq) / T(n_entries))
    max_dv = maximum(abs, dv)
    rms_dv = sqrt(sum(abs2, dv) / T(n_entries))
    return ErrorPairMetrics{T}(max_dq, rms_dq, max_dv, rms_dv)
end

"""
    compute_manifold_consistency(Y_traj::AbstractMatrix{T}, state_dim::Int) -> ManifoldConsistencyStats{T}

Compute eta_n = ||Y_{2,n} - z_n kron z_n||_2 and rel_eta_n = eta_n / ||z_n kron z_n||_2
across every column of lifted trajectory `Y_traj` with linear block dimension `state_dim`.
"""
function compute_manifold_consistency(
    Y_traj::AbstractMatrix{T}, state_dim::Int
)::ManifoldConsistencyStats{T} where {T<:AbstractFloat}
    expected_rows = state_dim + state_dim^2
    size(Y_traj, 1) == expected_rows ||
        throw(DimensionMismatch("Expected $(expected_rows) rows in lifted trajectory"))
    n_frames = size(Y_traj, 2)
    eta = Vector{T}(undef, n_frames)
    rel_eta = Vector{T}(undef, n_frames)

    for k in 1:n_frames
        z_k = @view Y_traj[1:state_dim, k]
        y2_k = @view Y_traj[(state_dim + 1):expected_rows, k]
        z2_k = kron(z_k, z_k)
        denom = norm(z2_k)
        defect = norm(y2_k .- z2_k)
        eta[k] = defect
        rel_eta[k] = denom > zero(T) ? defect / denom : zero(T)
    end

    return ManifoldConsistencyStats{T}(
        eta, rel_eta, maximum(eta), eta[end], maximum(rel_eta), rel_eta[end]
    )
end

"""
    run_case_iii_benchmark(
        params::CaseIIIBenchmarkParams{T}=CaseIIIBenchmarkParams();
        rk_substeps::Int=200,
    ) -> CaseIIITrajectoryBundle{T}

Execute all 5 Chen and Xiao (2026) Case III trajectories over [0, n_steps * dt].
"""
function run_case_iii_benchmark(
    params::CaseIIIBenchmarkParams{T}=CaseIIIBenchmarkParams(); rk_substeps::Int=200
)::CaseIIITrajectoryBundle{T} where {T<:AbstractFloat}
    ops = assemble_carleman_operators(params)
    n_frames = params.n_steps + 1
    times = T[T(k - 1) * params.dt for k in 1:n_frames]

    z_full_traj, z_poly_traj = integrate_rk_high_accuracy(
        params, ops; rk_substeps=rk_substeps
    )

    z0 = T[params.q0; params.v0]
    Y0 = T[z0; kron(z0, z0)]

    Y_cont = Matrix{T}(undef, 42, n_frames)
    Y_be = Matrix{T}(undef, 42, n_frames)
    Y_relift = Matrix{T}(undef, 42, n_frames)
    z_relift = Matrix{T}(undef, 6, n_frames)
    eta_relift_pre = zeros(T, n_frames)
    rel_eta_relift_pre = zeros(T, n_frames)

    Y_cont[:, 1] = Y0
    Y_be[:, 1] = Y0
    Y_relift[:, 1] = Y0
    z_relift[:, 1] = z0

    E_step = exp(params.dt .* ops.A_C)
    F_M = lu(ops.M_C)

    for step in 1:params.n_steps
        Y_cont[:, step + 1] = E_step * (@view Y_cont[:, step])
        Y_be[:, step + 1] = F_M \ (@view Y_be[:, step])

        Y_raw = F_M \ (@view Y_relift[:, step])
        z_raw = Y_raw[1:6]
        z2_raw = kron(z_raw, z_raw)
        defect = norm(Y_raw[7:42] .- z2_raw)
        denom = norm(z2_raw)
        eta_relift_pre[step + 1] = defect
        rel_eta_relift_pre[step + 1] = denom > zero(T) ? defect / denom : zero(T)

        z_relift[:, step + 1] = z_raw
        Y_relift[1:6, step + 1] = z_raw
        Y_relift[7:42, step + 1] = z2_raw
    end

    q_full = Matrix{T}(z_full_traj[1:3, :])
    v_full = Matrix{T}(z_full_traj[4:6, :])
    q_poly = Matrix{T}(z_poly_traj[1:3, :])
    v_poly = Matrix{T}(z_poly_traj[4:6, :])
    q_carleman_cont = Matrix{T}(Y_cont[1:3, :])
    v_carleman_cont = Matrix{T}(Y_cont[4:6, :])
    q_carleman_be = Matrix{T}(Y_be[1:3, :])
    v_carleman_be = Matrix{T}(Y_be[4:6, :])
    q_carleman_relift = Matrix{T}(Y_relift[1:3, :])
    v_carleman_relift = Matrix{T}(Y_relift[4:6, :])

    return CaseIIITrajectoryBundle{T}(
        params,
        ops,
        times,
        q_full,
        v_full,
        q_poly,
        v_poly,
        q_carleman_cont,
        v_carleman_cont,
        q_carleman_be,
        v_carleman_be,
        q_carleman_relift,
        v_carleman_relift,
        Y_cont,
        Y_be,
        Y_relift,
        z_relift,
        eta_relift_pre,
        rel_eta_relift_pre,
    )
end

"""
    audit_five_level_errors(
        q_full::AbstractMatrix{T},
        q_poly::AbstractMatrix{T},
        q_carleman_cont::AbstractMatrix{T},
        q_carleman_be::AbstractMatrix{T},
        q_carleman_relift::AbstractMatrix{T},
        Y_cont::AbstractMatrix{T},
        Y_be::AbstractMatrix{T},
        eta_relift_pre::AbstractVector{T},
        z_relift::AbstractMatrix{T},
        dt::T,
    ) -> FiveLevelErrorAudit{T}

Reusable 5-level error decomposition function for Chen and Xiao Carleman workflows
as well as GSI fluid/spectral and GSE nonlinear dynamical state-propagation models.
"""
function audit_five_level_errors(
    q_full::AbstractMatrix{T},
    q_poly::AbstractMatrix{T},
    q_carleman_cont::AbstractMatrix{T},
    q_carleman_be::AbstractMatrix{T},
    q_carleman_relift::AbstractMatrix{T},
    Y_cont::AbstractMatrix{T},
    Y_be::AbstractMatrix{T},
    eta_relift_pre::AbstractVector{T},
    z_relift::AbstractMatrix{T},
    dt::T,
)::FiveLevelErrorAudit{T} where {T<:AbstractFloat}
    state_dim = size(z_relift, 1)
    n_frames = size(z_relift, 2)
    length(eta_relift_pre) == n_frames ||
        throw(DimensionMismatch("eta_relift_pre length must match z_relift column count"))

    force_exp = compare_trajectories(q_poly, q_full, dt)
    carleman_trunc = compare_trajectories(q_carleman_cont, q_poly, dt)
    time_disc = compare_trajectories(q_carleman_be, q_carleman_cont, dt)
    unproj_tot = compare_trajectories(q_carleman_be, q_full, dt)
    relift_tot = compare_trajectories(q_carleman_relift, q_full, dt)
    proj_shift = compare_trajectories(q_carleman_relift, q_carleman_be, dt)

    cont_drift = compute_manifold_consistency(Y_cont, state_dim)
    be_drift = compute_manifold_consistency(Y_be, state_dim)

    rel_pre = Vector{T}(undef, n_frames)
    for k in 1:n_frames
        zk = @view z_relift[:, k]
        denom = norm(kron(zk, zk))
        rel_pre[k] = denom > zero(T) ? eta_relift_pre[k] / denom : zero(T)
    end

    degrades = relift_tot.max_abs_dq > unproj_tot.max_abs_dq

    return FiveLevelErrorAudit{T}(
        force_exp,
        carleman_trunc,
        time_disc,
        unproj_tot,
        relift_tot,
        proj_shift,
        degrades,
        cont_drift,
        be_drift,
        maximum(eta_relift_pre),
        eta_relift_pre[end],
        maximum(rel_pre),
        rel_pre[end],
    )
end

function audit_five_level_errors(
    bundle::CaseIIITrajectoryBundle{T}
)::FiveLevelErrorAudit{T} where {T<:AbstractFloat}
    audit = audit_five_level_errors(
        bundle.q_full,
        bundle.q_poly,
        bundle.q_carleman_cont,
        bundle.q_carleman_be,
        bundle.q_carleman_relift,
        bundle.Y_cont,
        bundle.Y_be,
        bundle.eta_relift_pre,
        bundle.z_relift,
        bundle.params.dt,
    )
    return FiveLevelErrorAudit{T}(
        audit.force_expansion,
        audit.carleman_truncation,
        audit.time_discretization,
        audit.unprojected_total,
        audit.relifted_total,
        audit.projection_shift,
        audit.projection_degrades_accuracy,
        audit.cont_drift,
        audit.be_drift,
        audit.max_relift_pre_eta,
        audit.terminal_relift_pre_eta,
        maximum(bundle.rel_eta_relift_pre),
        bundle.rel_eta_relift_pre[end],
    )
end

"""
    boundary_reduced_bcow_propagator(
        G_blocks::AbstractVector{<:AbstractMatrix{T}},
        w_hist::AbstractVector{<:AbstractVector{T}},
    ) -> Vector{T}

Evaluate the Primitive 3 boundary-reduced BCOW discrete convolution sum
sum_j G_blocks[j] * w_hist[j], reducing state dimension from [m*(k+1)+p+1]*n_y to (m+1)*n_y.
"""
function boundary_reduced_bcow_propagator(
    G_blocks::AbstractVector{<:AbstractMatrix{T}},
    w_hist::AbstractVector{<:AbstractVector{T}},
)::Vector{T} where {T<:AbstractFloat}
    length(G_blocks) == length(w_hist) ||
        throw(DimensionMismatch("G_blocks and w_hist must have the same length"))
    isempty(G_blocks) && throw(ArgumentError("G_blocks must be non-empty"))
    n_out = size(G_blocks[1], 1)
    y = zeros(T, n_out)
    for j in eachindex(G_blocks)
        mul!(y, G_blocks[j], w_hist[j], one(T), one(T))
    end
    return y
end

"""
    spd_energy_objective(
        K_ff::AbstractMatrix{T},
        f_f::AbstractVector{T},
        x::AbstractVector{T},
    ) -> T

Evaluate the Chen and Xiao Primitive 3 scale-invariant symmetric positive-definite
Rayleigh energy objective E(x) = -0.5 * (f_f' * x)^2 / (x' * K_ff * x).
"""
function spd_energy_objective(
    K_ff::AbstractMatrix{T}, f_f::AbstractVector{T}, x::AbstractVector{T}
)::T where {T<:AbstractFloat}
    size(K_ff, 1) == size(K_ff, 2) || throw(DimensionMismatch("K_ff must be square"))
    size(K_ff, 1) == length(f_f) == length(x) ||
        throw(DimensionMismatch("K_ff, f_f, and x dimensions must match"))
    denom = dot(x, K_ff * x)
    denom > zero(T) || throw(DomainError(denom, "x' * K_ff * x must be positive"))
    num = dot(f_f, x)
    return -T(0.5) * (num * num) / denom
end

end # module JuliaCarleman
