with open(r"c:\Users\Garrett\Sports\packages\db\prisma\schema.prisma", "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "model Game" in line or "model TeamGameLog" in line or "model Pick" in line:
            print(f"Line {i+1}: {line.strip()}")
