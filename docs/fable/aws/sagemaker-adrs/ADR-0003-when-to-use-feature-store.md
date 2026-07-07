# ADR-0003: When To Use Feature Store

Decision: Hold.

Use when:
- feature definitions are stable
- source rights allow storage
- online/offline consistency matters

Why not now:
- feature contracts are still being formalized.
- no AWS storage approval exists.

Rollback path: local feature files and schema docs.

Owner approval needed: yes.

Additional gates:
- feature volume justifies managed storage
- deletion/retention rules are approved
- offline/online parity is a real requirement

Reject now because local feature schemas are enough until volume proves need.
