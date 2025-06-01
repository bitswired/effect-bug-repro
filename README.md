# Effect HttpApiMiddleware Bug Reproduction

This repository demonstrates a bug in Effect's `HttpApiMiddleware` where closures from previous layer instances are executed despite proper layer recreation in test environments.

## Bug Description

When running multiple tests that create fresh database connections and HTTP server layers, `HttpApiMiddleware` closures from previous test runs are being executed instead of the newly created middleware instances, despite logs confirming that the middleware layers are being properly recreated.

**Related GitHub Issue**: [Link to your Effect issue here]

## The Problem

- ✅ New middleware layers are created correctly (confirmed by logs)
- ✅ New database services are created with unique file paths  
- ✅ Fresh HTTP server layers are instantiated for each test
- ❌ **BUG**: Old middleware closures execute instead of new ones

This causes tests to fail because the second test attempts to authenticate against the database from the first test, leading to "User not found" errors.

## Reproduction Steps

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd effect-bug-repro
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Run the test to reproduce the bug**:
   ```bash
   bun test
   ```

## Expected Behavior

Each test should:
1. Create a new `DatabaseService` with unique file path (e.g., `.volumes/uuid1`)
2. Create a new `AuthorizationLive` middleware instance
3. Execute the NEW middleware's closures during HTTP requests

## Actual Behavior

**Test 1:**
```
Creating middleware 0.41260833894960913 with DB .../uuid1
```

**Test 2:**
```
Creating middleware 0.1647645200653125 with DB .../uuid2
```

**When Test 2 middleware executes:**
```
Executing middleware 0.41260833894960913 with DB .../uuid1  # ❌ OLD closure!
```

The middleware from Test 1 (`0.41260833894960913`) executes instead of the new one (`0.1647645200653125`), causing the authentication to query the wrong database.

## Key Files

- **`tests/auth.test.ts`** - Demonstrates the bug with sequential test runs
- **`src/domains/auth/service.ts`** - Contains the `AuthorizationLive` middleware with debugging output
- **`src/db/index.ts`** - Database service that should be recreated for each test

## Evidence

The logs clearly show that while new middleware instances are created, the execution uses old closures:

```
# Test 1 middleware creation
0.41260833894960913 /path/to/db1

# Test 2 middleware creation  
0.1647645200653125 /path/to/db2

# Test 2 middleware execution (WRONG!)
UU 0.41260833894960913 /path/to/db1
```

## Environment

- **Bun**: v1.2.12
- **Effect**: 3.15.4
- **@effect/platform**: 0.82.7
- **@effect/platform-bun**: 0.65.4

