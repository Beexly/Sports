import sys

def parse_failures(log_content):
    failures = []
    capture = False
    current_failure = []
    for line in log_content.split('\n'):
        if line.startswith('FAILED '):
            capture = True
            current_failure.append(line)
        elif capture and (line.startswith('FAILED ') or line.startswith('======') or 'failed,' in line):
            if current_failure:
                failures.append('\n'.join(current_failure))
                current_failure = []
            if line.startswith('FAILED '):
                current_failure.append(line)
            else:
                capture = False
        elif capture:
            current_failure.append(line)
    return failures

print("Parsing CI output...")
failures = parse_failures(sys.stdin.read())
for f in failures:
    print(f)
    print('-' * 40)
