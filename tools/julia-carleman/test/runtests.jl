using Aqua
using InteractiveUtils
using JuliaCarleman
using JuliaFormatter
using LinearAlgebra
using Test

function _has_any_return_type(fn, argtypes)::Bool
    io = IOBuffer()
    InteractiveUtils.code_warntype(io, fn, argtypes)
    txt = String(take!(io))
    return occursin(r"::Any\b", txt)
end

function _synthetic_quadratic_audit()
    dt = 0.01
    n_steps = 20
    n_frames = n_steps + 1
    B1 = [-0.2 0.1; 0.05 -0.3]
    B2 = [0.02 0.0 0.0 -0.01; 0.0 0.01 0.01 0.0]
    I2 = Matrix{Float64}(I, 2, 2)
    A_C = [B1 B2; zeros(4, 2) (kron(I2, B1) + kron(B1, I2))]
    M_C = Matrix{Float64}(I, 6, 6) .- dt .* A_C
    F_M = lu(M_C)
    E_step = exp(dt .* A_C)

    z0 = [0.4, -0.2]
    Y0 = [z0; kron(z0, z0)]

    z_full = Matrix{Float64}(undef, 2, n_frames)
    z_poly = Matrix{Float64}(undef, 2, n_frames)
    Y_cont = Matrix{Float64}(undef, 6, n_frames)
    Y_be = Matrix{Float64}(undef, 6, n_frames)
    Y_relift = Matrix{Float64}(undef, 6, n_frames)
    z_relift = Matrix{Float64}(undef, 2, n_frames)
    eta_pre = zeros(Float64, n_frames)

    z_full[:, 1] = z0
    z_poly[:, 1] = z0
    Y_cont[:, 1] = Y0
    Y_be[:, 1] = Y0
    Y_relift[:, 1] = Y0
    z_relift[:, 1] = z0

    h = dt / 50
    for step in 1:n_steps
        zf = copy(z_full[:, step])
        zp = copy(z_poly[:, step])
        for _ in 1:50
            df = B1 * zf + B2 * kron(zf, zf) + [-0.05 * zf[1]^3, 0.0]
            zf .+= h .* df
            dp = B1 * zp + B2 * kron(zp, zp)
            zp .+= h .* dp
        end
        z_full[:, step + 1] = zf
        z_poly[:, step + 1] = zp
        Y_cont[:, step + 1] = E_step * Y_cont[:, step]
        Y_be[:, step + 1] = F_M \ Y_be[:, step]

        Y_raw = F_M \ Y_relift[:, step]
        zr = Y_raw[1:2]
        z2r = kron(zr, zr)
        eta_pre[step + 1] = norm(Y_raw[3:6] .- z2r)
        z_relift[:, step + 1] = zr
        Y_relift[1:2, step + 1] = zr
        Y_relift[3:6, step + 1] = z2r
    end

    return audit_five_level_errors(
        z_full,
        z_poly,
        Y_cont[1:2, :],
        Y_be[1:2, :],
        Y_relift[1:2, :],
        Y_cont,
        Y_be,
        eta_pre,
        z_relift,
        dt,
    )
end

@testset "JuliaCarleman Chen & Xiao (2026)" begin
    @testset "Package quality & formatting" begin
        Aqua.test_all(
            JuliaCarleman;
            stale_deps=(ignore=[:JuliaFormatter, :Aqua, :Test, :InteractiveUtils],),
        )
        pkg_root = dirname(@__DIR__)
        @test JuliaFormatter.format(pkg_root, JuliaFormatter.BlueStyle(); overwrite=false)
    end

    @testset "Type stability (@code_warntype)" begin
        @test !_has_any_return_type(
            assemble_carleman_operators, (CaseIIIBenchmarkParams{Float64},)
        )
        @test !_has_any_return_type(
            run_case_iii_benchmark, (CaseIIIBenchmarkParams{Float64},)
        )
        @test !_has_any_return_type(
            audit_five_level_errors, (CaseIIITrajectoryBundle{Float64},)
        )
        @test !_has_any_return_type(
            spd_energy_objective, (Matrix{Float64}, Vector{Float64}, Vector{Float64})
        )
    end

    @testset "Case III operators & Table 4 conditioning" begin
        params = CaseIIIBenchmarkParams()
        ops = assemble_carleman_operators(params)
        @test size(ops.A_C) == (42, 42)
        @test size(ops.M_C) == (42, 42)
        @test size(ops.M_pad) == (64, 64)
        @test isapprox(params.c1, 118.8; atol=1e-12)
        @test isapprox(params.c2, -1247.4; atol=1e-12)
        @test isapprox(cond(ops.M_pad), 16.287; atol=1e-3)
        @test isapprox(cond(transpose(ops.M_pad) * ops.M_pad), 265.267; atol=1e-2)
    end

    @testset "Tables 7 & 8 five-level parity and manifold drift" begin
        bundle = run_case_iii_benchmark()
        audit = audit_five_level_errors(bundle)

        @test size(bundle.q_full) == (3, 151)
        @test isapprox(bundle.times[end], 0.300; atol=1e-12)

        # Table 7: Force expansion
        @test isapprox(audit.force_expansion.max_abs_dq, 1.94e-5; rtol=5e-3)
        @test isapprox(audit.force_expansion.rms_dq, 1.09e-5; rtol=5e-3)
        @test isapprox(audit.force_expansion.max_abs_dv, 2.71e-4; rtol=5e-3)
        @test isapprox(audit.force_expansion.rms_dv, 1.27e-4; rtol=5e-3)

        # Table 7: Carleman truncation
        @test isapprox(audit.carleman_truncation.max_abs_dq, 1.80e-5; rtol=5e-3)
        @test isapprox(audit.carleman_truncation.rms_dq, 7.92e-6; rtol=5e-3)
        @test isapprox(audit.carleman_truncation.max_abs_dv, 5.39e-4; rtol=5e-3)
        @test isapprox(audit.carleman_truncation.rms_dv, 1.83e-4; rtol=5e-3)

        # Table 7: Time discretization (BE vs continuous Carleman)
        @test isapprox(audit.time_discretization.max_abs_dq, 1.40e-4; rtol=5e-3)
        @test isapprox(audit.time_discretization.rms_dq, 6.19e-5; rtol=5e-3)
        @test isapprox(audit.time_discretization.max_abs_dv, 1.50e-3; rtol=5e-3)
        @test isapprox(audit.time_discretization.rms_dv, 7.16e-4; rtol=5e-3)

        # Table 8: Stepwise re-lifting degrades physical accuracy against full LJ
        @test isapprox(audit.unprojected_total.max_abs_dq, 1.33e-4; rtol=5e-3)
        @test isapprox(audit.relifted_total.max_abs_dq, 1.52e-4; rtol=5e-3)
        @test audit.projection_degrades_accuracy
        @test audit.relifted_total.max_abs_dq > audit.unprojected_total.max_abs_dq

        # Table 8: Unprojected BE manifold drift
        @test isapprox(audit.be_drift.max_eta, 5.38e-4; rtol=5e-3)
        @test isapprox(audit.be_drift.max_rel_eta, 0.154; rtol=5e-3)
        @test audit.be_drift.terminal_eta > 3.0e-4
        @test audit.max_relift_pre_eta < 2.0e-5
    end

    @testset "Reusable GSI/GSE five-level audit & Primitive 3 BCOW helpers" begin
        syn = _synthetic_quadratic_audit()
        @test syn.force_expansion.max_abs_dq > 0
        @test syn.be_drift.max_eta > 0

        G1 = [1.0 0.5; 0.0 1.0]
        G2 = [0.25 0.0; -0.5 0.25]
        y = boundary_reduced_bcow_propagator([G1, G2], [[2.0, 4.0], [4.0, 8.0]])
        @test isapprox(y, [5.0, 4.0]; atol=1e-12)

        K_ff = [4.0 1.0; 1.0 3.0]
        f_f = [1.0, 2.0]
        x_star = K_ff \ f_f
        e_opt = -0.5 * dot(f_f, x_star)
        @test isapprox(spd_energy_objective(K_ff, f_f, 3.7 .* x_star), e_opt; atol=1e-12)
    end
end
