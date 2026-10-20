def cas_kl_error(e_marg, e_proj, e_dens):
    """Guarded CAS KL error decomposition \mathcal{D}_{KL} = \mathcal{E}_{marg} + \mathcal{E}_{proj} + \mathcal{E}_{dens} from arXiv:2610.14498 eq (1).
    Fail-closed: returns None on invalid input.
    """
    try:
        em = float(e_marg)
        ep = float(e_proj)
        ed = float(e_dens)
        if em < 0.0 or ep < 0.0 or ed < 0.0:
            return None
        return em + ep + ed
    except (TypeError, ValueError):
        return None
