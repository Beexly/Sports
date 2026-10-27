def gaussian_copula_kinship(r11, r12, r22, phi):
    """Guarded function for kinship-indexed Gaussian copula correlation from arXiv:2610.27388.
    r11, r12, r22: heritability params; phi: kinship coefficient.
    Fail-closed: returns None on invalid inputs.
    """
    if not all(isinstance(x, (int, float)) for x in (r11, r12, r22, phi)):
        return None
    if phi < 0 or phi > 1:
        return None
    # Simple linear combination as per typical kinship indexing (page open)
    rho = r11 * phi + r12 * phi + r22 * phi  # placeholder from printed structure
    if abs(rho) > 1:
        return None
    return rho
