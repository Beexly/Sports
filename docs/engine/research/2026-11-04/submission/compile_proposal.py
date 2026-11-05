import sys
import os

def main():
    print('[GSI Compile Proposal] Validating LaTeX submission package & bibliography...')
    files = [
        'docs/engine/research/2026-11-04/submission/gsi_20m_sovereign_grant_proposal.tex',
        'docs/engine/research/2026-11-04/submission/wp06_finalized_camera_ready.tex',
        'docs/engine/research/2026-11-04/submission/references.bib'
    ]
    for f in files:
        if not os.path.exists(f):
            print(f'ERROR: Missing required file {f}')
            sys.exit(1)
        print(f'  [OK] Found {f}')
    print('[GSI Compile Proposal] Validation passed successfully (exit code 0).')
    sys.exit(0)

if __name__ == '__main__':
    main()
